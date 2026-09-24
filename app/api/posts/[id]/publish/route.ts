import { prisma } from "@/lib/prisma";
import { publishedSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { requireOwnedPost } from "@/lib/posts";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Manual publish confirmation.
 *
 * There is no official social API integration yet, so publishing is always an
 * explicit user action — the system never marks a post Published on its own.
 * The handler is shaped so an official publisher can be plugged in later.
 */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const before = await requireOwnedPost(user.id, id);

    const parsed = publishedSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
    }
    const d = parsed.data;

    let publishedAt = new Date();
    if (d.publishedAt) {
      const parsedDate = new Date(d.publishedAt);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new ApiError("VALIDATION_ERROR", "Thời gian đăng không hợp lệ.");
      }
      if (parsedDate.getTime() > Date.now() + 5 * 60 * 1000) {
        throw new ApiError("VALIDATION_ERROR", "Thời gian đăng không thể ở tương lai.");
      }
      publishedAt = parsedDate;
    }

    const post = await prisma.contentPost.update({
      where: { id },
      data: {
        status: "published",
        publishedAt,
        publishedUrl: d.publishedUrl || null,
        notes: d.notes !== undefined ? d.notes || null : before.notes,
        views: d.views ?? before.views,
        likes: d.likes ?? before.likes,
        comments: d.comments ?? before.comments,
        shares: d.shares ?? before.shares,
        clicks: d.clicks ?? before.clicks,
        orders: d.orders ?? before.orders,
        revenue: d.revenue ?? before.revenue,
      },
      include: { product: { select: { id: true, name: true } } },
    });

    await audit(user.id, "content_post", id, "publish", {
      publishedUrl: post.publishedUrl,
      publishedAt: post.publishedAt?.toISOString(),
      previousStatus: before.status,
    });

    return apiOk(post);
  } catch (err) {
    return apiFail(err, "posts/[id]/publish");
  }
}
