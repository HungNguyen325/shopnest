import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { combineDateTime } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string; slotId: string }> };

const schema = z.object({
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  productId: z.string().max(64).nullable().optional(),
  platform: z.string().trim().max(40).optional(),
  topic: z.string().trim().max(300).optional(),
  caption: z.string().max(8000).optional(),
  hook: z.string().max(600).optional(),
  status: z.enum(["planned", "converted", "skipped"]).optional(),
});

async function ensureOwned(userId: string, planId: string, slotId: string) {
  const slot = await prisma.planSlot.findFirst({
    where: { id: slotId, plan: { id: planId, userId } },
  });
  if (!slot) throw new ApiError("NOT_FOUND");
  return slot;
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, slotId } = await ctx.params;
    const before = await ensureOwned(user.id, id, slotId);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Dữ liệu lịch chưa hợp lệ.");
    const d = parsed.data;

    if (d.productId) {
      const product = await prisma.product.findFirst({
        where: { id: d.productId, userId: user.id },
        select: { id: true },
      });
      if (!product) throw new ApiError("NOT_FOUND", "Sản phẩm không thuộc tài khoản của bạn.");
    }

    const slot = await prisma.planSlot.update({
      where: { id: slotId },
      data: {
        ...(d.slotDate !== undefined ? { slotDate: new Date(`${d.slotDate}T00:00:00`) } : {}),
        ...(d.slotTime !== undefined ? { slotTime: d.slotTime } : {}),
        ...(d.productId !== undefined ? { productId: d.productId } : {}),
        ...(d.platform !== undefined ? { platform: d.platform } : {}),
        ...(d.topic !== undefined ? { topic: d.topic } : {}),
        ...(d.caption !== undefined ? { caption: d.caption } : {}),
        ...(d.hook !== undefined ? { hook: d.hook } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
      },
    });

    const moved = d.slotDate !== undefined || d.slotTime !== undefined;
    if (moved) {
      await audit(user.id, "plan_slot", slotId, "reschedule", {
        from: `${before.slotDate.toISOString().slice(0, 10)} ${before.slotTime}`,
        to: `${slot.slotDate.toISOString().slice(0, 10)} ${slot.slotTime}`,
      });
      // Keep a linked post in sync when the slot is dragged to another day/time.
      if (slot.contentPostId) {
        const post = await prisma.contentPost.findFirst({
          where: { id: slot.contentPostId, userId: user.id },
          select: { id: true },
        });
        if (post) {
          await prisma.contentPost.update({
            where: { id: post.id },
            data: {
              scheduledAt: combineDateTime(
                slot.slotDate.toISOString().slice(0, 10),
                slot.slotTime,
              ),
            },
          });
        }
      }
    }

    return apiOk(slot);
  } catch (err) {
    return apiFail(err, "plans/[id]/slots/[slotId]");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, slotId } = await ctx.params;
    await ensureOwned(user.id, id, slotId);
    await prisma.planSlot.delete({ where: { id: slotId } });
    await audit(user.id, "plan_slot", slotId, "delete");
    return apiOk({ deleted: true });
  } catch (err) {
    return apiFail(err, "plans/[id]/slots/[slotId]/DELETE");
  }
}
