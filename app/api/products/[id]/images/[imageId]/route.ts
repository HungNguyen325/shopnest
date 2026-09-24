import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

const patchSchema = z.object({
  altText: z.string().trim().max(200).optional(),
  isCover: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(99).optional(),
});

async function ensureOwned(userId: string, productId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, product: { id: productId, userId } },
  });
  if (!image) throw new ApiError("NOT_FOUND");
  return image;
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, imageId } = await ctx.params;
    await ensureOwned(user.id, id, imageId);

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Dữ liệu ảnh chưa hợp lệ.");
    const data = parsed.data;

    if (data.isCover) {
      await prisma.productImage.updateMany({ where: { productId: id }, data: { isCover: false } });
    }

    const image = await prisma.productImage.update({
      where: { id: imageId },
      data: {
        ...(data.altText !== undefined ? { altText: data.altText || null } : {}),
        ...(data.isCover !== undefined ? { isCover: data.isCover } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
    return apiOk(image);
  } catch (err) {
    return apiFail(err, "images/[imageId]/PATCH");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, imageId } = await ctx.params;
    const image = await ensureOwned(user.id, id, imageId);
    await prisma.productImage.delete({ where: { id: imageId } });

    // Promote the first remaining image to cover if we just removed it.
    if (image.isCover) {
      const next = await prisma.productImage.findFirst({
        where: { productId: id },
        orderBy: { sortOrder: "asc" },
      });
      if (next) await prisma.productImage.update({ where: { id: next.id }, data: { isCover: true } });
    }
    return apiOk({ deleted: true });
  } catch (err) {
    return apiFail(err, "images/[imageId]/DELETE");
  }
}
