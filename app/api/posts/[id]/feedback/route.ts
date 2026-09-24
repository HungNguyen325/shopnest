import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireOwnedPost } from "@/lib/posts";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  feedbackType: z.enum([
    "like",
    "dislike",
    "regenerate",
    "save_template",
    "effective",
    "not_suitable",
    "use_tone",
  ]),
  rating: z.coerce.number().int().min(-1).max(1).optional(),
  comment: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await requireOwnedPost(user.id, id);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Dữ liệu phản hồi chưa hợp lệ.");
    const { feedbackType, rating, comment } = parsed.data;

    const feedback = await prisma.aIFeedback.create({
      data: {
        userId: user.id,
        contentPostId: id,
        feedbackType,
        rating:
          rating ??
          (feedbackType === "like" || feedbackType === "effective"
            ? 1
            : feedbackType === "dislike" || feedbackType === "not_suitable"
              ? -1
              : null),
        comment: comment ?? null,
      },
    });

    // "Dùng giọng văn này" writes the post's tone into the brand profile so the
    // next generation follows it — no model training involved.
    if (feedbackType === "use_tone") {
      const post = await prisma.contentPost.findUnique({ where: { id }, select: { tone: true } });
      if (post?.tone) {
        await prisma.userBrandProfile.upsert({
          where: { userId: user.id },
          update: { defaultTone: post.tone },
          create: { userId: user.id, defaultTone: post.tone },
        });
      }
    }

    return apiOk(feedback, { status: 201 });
  } catch (err) {
    return apiFail(err, "posts/[id]/feedback");
  }
}
