import { addDays, endOfDay } from "date-fns";
import { startOfToday, endOfToday } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getAISettings } from "@/lib/ai";
import { getUsageSummary } from "@/lib/ai";

export async function GET() {
  try {
    const user = await requireUser();
    const today = startOfToday();
    const todayEnd = endOfToday();
    const weekEnd = endOfDay(addDays(today, 6));

    const [
      productTotal,
      productUnused,
      productWithoutAffiliate,
      statusGroups,
      dueToday,
      upcoming,
      recentPosts,
      plans,
      aiSettings,
      lastActivity,
    ] = await Promise.all([
      prisma.product.count({ where: { userId: user.id, status: { not: "archived" } } }),
      prisma.product.count({ where: { userId: user.id, posts: { none: {} }, status: { not: "archived" } } }),
      prisma.product.count({
        where: { userId: user.id, OR: [{ affiliateUrl: null }, { affiliateUrl: "" }] },
      }),
      prisma.contentPost.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } }),
      prisma.contentPost.findMany({
        where: {
          userId: user.id,
          status: { in: ["planned", "ready"] },
          scheduledAt: { gte: today, lte: todayEnd },
        },
        orderBy: { scheduledAt: "asc" },
        include: { product: { select: { id: true, name: true } } },
      }),
      prisma.contentPost.findMany({
        where: {
          userId: user.id,
          status: { in: ["planned", "ready"] },
          scheduledAt: { gt: todayEnd, lte: weekEnd },
        },
        orderBy: { scheduledAt: "asc" },
        take: 10,
        include: { product: { select: { id: true, name: true } } },
      }),
      prisma.contentPost.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { product: { select: { id: true, name: true } } },
      }),
      prisma.contentPlan.findMany({
        where: { userId: user.id, status: "active" },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { _count: { select: { slots: true } } },
      }),
      getAISettings(),
      prisma.auditLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    const usage = await getUsageSummary(user.id, aiSettings.dailyLimit);

    const counts: Record<string, number> = {
      draft: 0,
      planned: 0,
      ready: 0,
      published: 0,
      failed: 0,
      archived: 0,
      total: 0,
    };
    statusGroups.forEach((g) => {
      counts[g.status] = g._count._all;
      counts.total += g._count._all;
    });

    // AI idea suggestions from products that have never been used.
    const unusedProducts = await prisma.product.findMany({
      where: { userId: user.id, posts: { none: {} }, status: { not: "archived" } },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: { id: true, name: true, category: true, painPoints: true },
    });

    return apiOk({
      stats: {
        products: productTotal,
        unusedProducts: productUnused,
        productsWithoutAffiliate: productWithoutAffiliate,
        ...counts,
        dueToday: dueToday.length,
      },
      dueToday,
      upcoming,
      recentPosts,
      activePlans: plans,
      ai: {
        usedToday: usage.usedToday,
        remainingToday: usage.remainingToday,
        dailyLimit: aiSettings.dailyLimit,
        provider: aiSettings.provider,
        model: aiSettings.model,
        avgLatencyMs: usage.avgLatencyMs,
      },
      suggestions: unusedProducts,
      lastActivity: lastActivity.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    return apiFail(err, "dashboard/GET");
  }
}
