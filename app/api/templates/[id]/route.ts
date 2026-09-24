import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().max(60).nullable().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  // Accepted (and ignored) so "I used this template" can be sent as an empty body.
  usageCount: z.number().int().min(0).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const existing = await prisma.savedTemplate.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError("NOT_FOUND");

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Dữ liệu mẫu chưa hợp lệ.");
    const d = parsed.data;

    const edits = {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.content !== undefined ? { content: JSON.stringify(d.content) } : {}),
    };
    const template = await prisma.savedTemplate.update({
      where: { id },
      data: {
        ...edits,
        // Counting a use is the whole point of a bare PATCH; an edit is not a use.
        ...(Object.keys(edits).length === 0 ? { usageCount: { increment: 1 } } : {}),
      },
    });
    return apiOk(template);
  } catch (err) {
    return apiFail(err, "templates/[id]/PATCH");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const existing = await prisma.savedTemplate.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError("NOT_FOUND");
    await prisma.savedTemplate.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (err) {
    return apiFail(err, "templates/[id]/DELETE");
  }
}
