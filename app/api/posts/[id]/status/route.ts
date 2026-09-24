import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { requireOwnedPost } from "@/lib/posts";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["draft", "planned", "ready", "published", "failed", "archived"]),
  scheduledAt: z.string().max(40).nullable().optional(),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const before = await requireOwnedPost(user.id, id);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Trạng thái không hợp lệ.");
    const { status, scheduledAt, reason } = parsed.data;

    if ((status as string) === "published") {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Không thể chuyển thẳng sang Đã đăng. Hãy dùng nút Xác nhận đã đăng để nhập link bài thật.",
      );
    }
    if (status === "planned") {
      const target = scheduledAt ? new Date(scheduledAt) : before.scheduledAt;
      if (!target || Number.isNaN(target.getTime())) {
        throw new ApiError("VALIDATION_ERROR", "Bài ở trạng thái Đã lên lịch cần có ngày giờ đăng.");
      }
    }

    const data: Record<string, unknown> = { status };
    if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (status !== "published") data.publishedAt = null;

    const post = await prisma.contentPost.update({ where: { id }, data });
    await audit(user.id, "content_post", id, status === "archived" ? "update" : "reschedule", {
      from: before.status,
      to: status,
      reason: reason ?? null,
    });

    return apiOk(post);
  } catch (err) {
    return apiFail(err, "posts/[id]/status");
  }
}
