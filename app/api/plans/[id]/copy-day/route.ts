import { z } from "zod";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Copy one plan day onto another date inside the same plan. */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const plan = await prisma.contentPlan.findFirst({ where: { id, userId: user.id } });
    if (!plan) throw new ApiError("NOT_FOUND");

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Ngày không hợp lệ.");

    const from = new Date(`${parsed.data.from}T00:00:00`);
    const to = new Date(`${parsed.data.to}T00:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new ApiError("VALIDATION_ERROR", "Ngày không hợp lệ.");
    }

    const source = await prisma.planSlot.findMany({
      where: {
        planId: id,
        slotDate: { gte: from, lt: addDays(from, 1) },
      },
    });
    if (source.length === 0) {
      throw new ApiError("NOT_FOUND", "Ngày nguồn không có bài nào để sao chép.");
    }

    await prisma.planSlot.deleteMany({
      where: { planId: id, slotDate: { gte: to, lt: addDays(to, 1) } },
    });

    await prisma.planSlot.createMany({
      data: source.map((slot) => ({
        planId: id,
        productId: slot.productId,
        slotDate: to,
        slotTime: slot.slotTime,
        platform: slot.platform,
        topic: slot.topic,
        contentAngle: slot.contentAngle,
        contentType: slot.contentType,
        hook: slot.hook,
        caption: slot.caption,
        callToAction: slot.callToAction,
        hashtags: slot.hashtags,
        notes: slot.notes,
        status: "planned",
      })),
    });

    await audit(user.id, "content_plan", id, "update", {
      action: "copy-day",
      from: parsed.data.from,
      to: parsed.data.to,
      count: source.length,
    });

    return apiOk({ copied: source.length, date: parsed.data.to });
  } catch (err) {
    return apiFail(err, "plans/[id]/copy-day");
  }
}
