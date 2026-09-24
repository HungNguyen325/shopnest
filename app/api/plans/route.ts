import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.coerce.number().int().min(1).max(120),
  postsPerDay: z.coerce.number().int().min(1).max(6),
  platforms: z.array(z.string().max(40)).min(1).max(6).default(["tiktok"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function GET() {
  try {
    const user = await requireUser();
    const plans = await prisma.contentPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { slots: true } } },
      take: 100,
    });
    return apiOk(plans);
  } catch (err) {
    return apiFail(err, "plans/GET");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu kế hoạch chưa hợp lệ.");
    }
    const d = parsed.data;
    const startDate = new Date(`${d.startDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) throw new ApiError("VALIDATION_ERROR", "Ngày bắt đầu không hợp lệ.");

    const plan = await prisma.contentPlan.create({
      data: {
        userId: user.id,
        name: d.name,
        startDate,
        endDate: new Date(startDate.getTime() + (d.days - 1) * 86400000),
        postsPerDay: d.postsPerDay,
        platforms: JSON.stringify(d.platforms),
        status: "active",
        createdBy: "manual",
        notes: d.notes || null,
      },
    });

    await audit(user.id, "content_plan", plan.id, "create", { days: d.days, postsPerDay: d.postsPerDay });
    return apiOk(plan, { status: 201 });
  } catch (err) {
    return apiFail(err, "plans/POST");
  }
}
