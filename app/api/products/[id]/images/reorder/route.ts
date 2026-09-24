import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ imageIds: z.array(z.string().min(1)).min(1).max(20) });

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!product) throw new ApiError("NOT_FOUND");

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Thứ tự ảnh không hợp lệ.");

    const images = await prisma.productImage.findMany({ where: { productId: id }, select: { id: true } });
    const owned = new Set(images.map((i) => i.id));
    if (parsed.data.imageIds.some((i) => !owned.has(i))) {
      throw new ApiError("NOT_FOUND", "Có ảnh không thuộc sản phẩm này.");
    }

    await prisma.$transaction(
      parsed.data.imageIds.map((imageId, index) =>
        prisma.productImage.update({ where: { id: imageId }, data: { sortOrder: index } }),
      ),
    );

    return apiOk({ ordered: parsed.data.imageIds.length });
  } catch (err) {
    return apiFail(err, "images/reorder");
  }
}
