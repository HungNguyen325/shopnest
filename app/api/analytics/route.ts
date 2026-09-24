import { subDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { PLATFORMS, CONTENT_TYPES } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 30)));
    const platform = url.searchParams.get("platform") ?? "";
    const since = startOfDay(subDays(new Date(), days - 1));

    const where = {
      userId: user.id,
      createdAt: { gte: since },
      ...(platform ? { platform } : {}),
    };

    const [posts, byStatus, byPlatform, byType, byProduct, published, totals, aiUsage] =
      await Promise.all([
        prisma.contentPost.findMany({
          where,
          select: {
            id: true,
            title: true,
            platform: true,
            contentType: true,
            status: true,
            views: true,
            likes: true,
            comments: true,
            shares: true,
            clicks: true,
            orders: true,
            revenue: true,
            publishedAt: true,
            scheduledAt: true,
            createdAt: true,
            product: { select: { id: true, name: true } },
          },
        }),
        prisma.contentPost.groupBy({ by: ["status"], where, _count: { _all: true } }),
        prisma.contentPost.groupBy({ by: ["platform"], where, _count: { _all: true } }),
        prisma.contentPost.groupBy({ by: ["contentType"], where, _count: { _all: true } }),
        prisma.contentPost.groupBy({
          by: ["productId"],
          where,
          _count: { _all: true },
          _sum: { views: true, clicks: true, orders: true, revenue: true },
        }),
        prisma.contentPost.findMany({
          where: { ...where, status: "published" },
          select: { publishedAt: true, platform: true },
        }),
        prisma.contentPost.aggregate({
          where,
          _sum: { views: true, likes: true, comments: true, shares: true, clicks: true, orders: true, revenue: true },
          _count: { _all: true },
        }),
        prisma.aIUsage.aggregate({
          where: { userId: user.id, createdAt: { gte: since } },
          _sum: { inputTokens: true, outputTokens: true },
          _count: { _all: true },
        }),
      ]);

    const products = await prisma.product.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    });
    const productName = new Map(products.map((p) => [p.id, p.name]));

    // Time-series buckets for the last `days`.
    const series: { date: string; created: number; published: number }[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const day = subDays(new Date(), i);
      const key = `${day.getMonth() + 1}/${day.getDate()}`;
      const created = posts.filter((p) => p.createdAt.toDateString() === day.toDateString()).length;
      const publishedCount = published.filter(
        (p) => p.publishedAt?.toDateString() === day.toDateString(),
      ).length;
      series.push({ date: key, created, published: publishedCount });
    }

    const publishedCount = byStatus.find((s) => s.status === "published")?._count._all ?? 0;
    const plannedCount = byStatus.find((s) => s.status === "planned")?._count._all ?? 0;
    const onTimePublished = published.filter((p) => {
      const match = posts.find((x) => x.publishedAt?.getTime() === p.publishedAt?.getTime());
      if (!match?.scheduledAt || !p.publishedAt) return true;
      return Math.abs(p.publishedAt.getTime() - match.scheduledAt.getTime()) <= 2 * 3600 * 1000;
    }).length;

    const sum = totals._sum;
    const totalViews = sum.views ?? 0;
    const totalClicks = sum.clicks ?? 0;

    return apiOk({
      range: { days, since: since.toISOString() },
      kpi: {
        totalPosts: totals._count._all,
        published: publishedCount,
        planned: plannedCount,
        publishRate: totals._count._all ? publishedCount / totals._count._all : 0,
        onTimeRate: published.length ? onTimePublished / published.length : 0,
        views: totalViews,
        likes: sum.likes ?? 0,
        comments: sum.comments ?? 0,
        shares: sum.shares ?? 0,
        clicks: totalClicks,
        orders: sum.orders ?? 0,
        revenue: sum.revenue ?? 0,
        ctr: totalViews ? totalClicks / totalViews : 0,
        aiRequests: aiUsage._count._all,
        aiTokens: (aiUsage._sum.inputTokens ?? 0) + (aiUsage._sum.outputTokens ?? 0),
      },
      series,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byPlatform: byPlatform
        .map((p) => ({
          platform: p.platform,
          label: PLATFORMS.find((x) => x.id === p.platform)?.label ?? p.platform,
          count: p._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      byContentType: byType
        .map((t) => ({
          contentType: t.contentType,
          label: CONTENT_TYPES.find((x) => x.id === t.contentType)?.label ?? t.contentType,
          count: t._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      byProduct: byProduct
        .filter((p) => p.productId)
        .map((p) => ({
          productId: p.productId,
          name: productName.get(p.productId as string) ?? "Sản phẩm đã xóa",
          posts: p._count._all,
          views: p._sum.views ?? 0,
          clicks: p._sum.clicks ?? 0,
          orders: p._sum.orders ?? 0,
          revenue: p._sum.revenue ?? 0,
        }))
        .sort((a, b) => b.posts - a.posts)
        .slice(0, 10),
      topPosts: [...posts]
        .filter((p) => p.status === "published")
        .sort((a, b) => b.views - a.views || b.likes - a.likes)
        .slice(0, 8),
    });
  } catch (err) {
    return apiFail(err, "analytics/GET");
  }
}
