import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().max(120).optional(),
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
  postsPerDay: z.coerce.number().int().min(1).max(6).optional(),
});

async function findOwned(userId: string, id: string) {
  const plan = await prisma.contentPlan.findFirst({ where: { id, userId } });
  if (!plan) throw new ApiError("NOT_FOUND");
  return plan;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await findOwned(user.id, id);
    const [plan, slots] = await Promise.all([
      prisma.contentPlan.findUnique({ where: { id }, include: { _count: { select: { slots: true } } } }),
      prisma.planSlot.findMany({
        where: { planId: id },
        orderBy: [{ slotDate: "asc" }, { slotTime: "asc" }],
        include: { product: { select: { id: true, name: true } } },
      }),
    ]);
    return apiOk({ plan, slots });
  } catch (err) {
    return apiFail(err, "plans/[id]/GET");
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await findOwned(user.id, id);
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Dữ liệu kế hoạch chưa hợp lệ.");

    const plan = await prisma.contentPlan.update({ where: { id }, data: parsed.data });
    await audit(user.id, "content_plan", id, "update", parsed.data);
    return apiOk(plan);
  } catch (err) {
    return apiFail(err, "plans/[id]/PATCH");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await findOwned(user.id, id);
    await prisma.contentPlan.delete({ where: { id } });
    await audit(user.id, "content_plan", id, "delete");
    return apiOk({ deleted: true });
  } catch (err) {
    return apiFail(err, "plans/[id]/DELETE");
  }
}
