import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { requireOwnedPost, snapshotVersion } from "@/lib/posts";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  productId: z.string().max(64).nullable().optional(),
  platform: z.string().trim().max(40).optional(),
  contentType: z.string().trim().max(40).optional(),
  tone: z.string().trim().max(40).nullable().optional(),
  goal: z.string().trim().max(40).nullable().optional(),
  title: z.string().trim().max(300).nullable().optional(),
  hook: z.string().trim().max(600).nullable().optional(),
  caption: z.string().max(8000).nullable().optional(),
  body: z.string().max(12000).nullable().optional(),
  callToAction: z.string().max(600).nullable().optional(),
  hashtags: z.array(z.string().max(60)).max(30).nullable().optional(),
  pinnedComment: z.string().max(1000).nullable().optional(),
  videoScript: z.unknown().nullable().optional(),
  contentAngle: z.string().max(300).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "planned", "ready", "published", "failed", "archived"]).optional(),
  scheduledAt: z.string().max(40).nullable().optional(),
  views: z.coerce.number().int().min(0).optional(),
  likes: z.coerce.number().int().min(0).optional(),
  comments: z.coerce.number().int().min(0).optional(),
  shares: z.coerce.number().int().min(0).optional(),
  clicks: z.coerce.number().int().min(0).optional(),
  orders: z.coerce.number().int().min(0).optional(),
  revenue: z.coerce.number().min(0).optional(),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const post = await prisma.contentPost.findFirst({
      where: { id, userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            affiliateUrl: true,
            category: true,
            images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
          },
        },
        versions: { orderBy: { versionNumber: "desc" }, take: 20 },
        feedbacks: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!post) throw new ApiError("NOT_FOUND");
    return apiOk(post);
  } catch (err) {
    return apiFail(err, "posts/[id]/GET");
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const before = await requireOwnedPost(user.id, id);

    const parsed = updateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
    }
    const d = parsed.data;

    if (d.productId) {
      const product = await prisma.product.findFirst({
        where: { id: d.productId, userId: user.id },
        select: { id: true },
      });
      if (!product) throw new ApiError("NOT_FOUND", "Sản phẩm không thuộc tài khoản của bạn.");
    }

    const data: Record<string, unknown> = {};
    const assign = <K extends keyof typeof d>(key: K, target: string) => {
      if (d[key] !== undefined) data[target] = d[key];
    };
    assign("productId", "productId");
    assign("platform", "platform");
    assign("contentType", "contentType");
    assign("tone", "tone");
    assign("goal", "goal");
    assign("title", "title");
    assign("hook", "hook");
    assign("caption", "caption");
    assign("body", "body");
    assign("callToAction", "callToAction");
    assign("pinnedComment", "pinnedComment");
    assign("contentAngle", "contentAngle");
    assign("notes", "notes");
    assign("views", "views");
    assign("likes", "likes");
    assign("comments", "comments");
    assign("shares", "shares");
    assign("clicks", "clicks");
    assign("orders", "orders");
    assign("revenue", "revenue");

    if (d.hashtags !== undefined) data.hashtags = d.hashtags ? JSON.stringify(d.hashtags) : null;
    if (d.videoScript !== undefined)
      data.videoScript = d.videoScript ? JSON.stringify(d.videoScript) : null;
    if (d.scheduledAt !== undefined)
      data.scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;
    if (d.status !== undefined) {
      data.status = d.status;
      if (d.status === "published" && !before.publishedAt) data.publishedAt = new Date();
      if (d.status === "planned" && !data.scheduledAt && !before.scheduledAt) {
        throw new ApiError("VALIDATION_ERROR", "Bài ở trạng thái Đã lên lịch cần có ngày giờ đăng.");
      }
    }

    const post = await prisma.contentPost.update({
      where: { id },
      data,
      include: { product: { select: { id: true, name: true } } },
    });

    const contentChanged =
      d.caption !== undefined ||
      d.hook !== undefined ||
      d.body !== undefined ||
      d.callToAction !== undefined;
    if (contentChanged) {
      await snapshotVersion(id, {
        title: post.title ?? "",
        hook: post.hook ?? "",
        caption: post.caption ?? "",
        body: post.body ?? "",
        call_to_action: post.callToAction ?? "",
      });
    }

    if (data.scheduledAt && String(data.scheduledAt) !== String(before.scheduledAt)) {
      await audit(user.id, "content_post", id, "reschedule", {
        from: before.scheduledAt?.toISOString() ?? null,
        to: String(data.scheduledAt),
      });
    } else {
      await audit(user.id, "content_post", id, "update", { fields: Object.keys(data) });
    }

    return apiOk(post);
  } catch (err) {
    return apiFail(err, "posts/[id]/PATCH");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await requireOwnedPost(user.id, id);
    await prisma.contentPost.delete({ where: { id } });
    await audit(user.id, "content_post", id, "delete");
    return apiOk({ deleted: true });
  } catch (err) {
    return apiFail(err, "posts/[id]/DELETE");
  }
}
