import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(2, "Tên mẫu tối thiểu 2 ký tự").max(120),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  content: z.record(z.string(), z.unknown()),
});

export async function GET() {
  try {
    const user = await requireUser();
    const templates = await prisma.savedTemplate.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return apiOk(templates);
  } catch (err) {
    return apiFail(err, "templates/GET");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Mẫu chưa hợp lệ.");
    }
    const d = parsed.data;
    const template = await prisma.savedTemplate.create({
      data: {
        userId: user.id,
        name: d.name,
        category: d.category || null,
        content: JSON.stringify(d.content),
      },
    });
    return apiOk(template, { status: 201 });
  } catch (err) {
    return apiFail(err, "templates/POST");
  }
}
