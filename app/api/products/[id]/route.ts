import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

async function findOwned(userId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: { id, userId },
    include: {
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      affiliateLinks: true,
      _count: { select: { posts: true } },
    },
  });
  if (!product) throw new ApiError("NOT_FOUND");
  return product;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const product = await findOwned(user.id, id);
    const posts = await prisma.contentPost.findMany({
      where: { productId: id, userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        platform: true,
        contentType: true,
        status: true,
        scheduledAt: true,
        publishedAt: true,
        createdAt: true,
      },
    });
    return apiOk({ product, posts });
  } catch (err) {
    return apiFail(err, "products/[id]/GET");
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await findOwned(user.id, id);

    const body = await req.json().catch(() => null);
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
    }
    const d = parsed.data;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.brand !== undefined ? { brand: d.brand || null } : {}),
        ...(d.description !== undefined ? { description: d.description || null } : {}),
        ...(d.category !== undefined ? { category: d.category || null } : {}),
        ...(d.originalUrl !== undefined ? { originalUrl: d.originalUrl || null } : {}),
        ...(d.affiliateUrl !== undefined ? { affiliateUrl: d.affiliateUrl || null } : {}),
        ...(d.price !== undefined
          ? { price: d.price === "" ? null : Number(d.price) }
          : {}),
        ...(d.currency !== undefined ? { currency: d.currency || "VND" } : {}),
        ...(d.commission !== undefined ? { commission: d.commission || null } : {}),
        ...(d.highlights !== undefined ? { highlights: d.highlights || null } : {}),
        ...(d.pros !== undefined ? { pros: d.pros || null } : {}),
        ...(d.cons !== undefined ? { cons: d.cons || null } : {}),
        ...(d.targetAudience !== undefined ? { targetAudience: d.targetAudience || null } : {}),
        ...(d.painPoints !== undefined ? { painPoints: d.painPoints || null } : {}),
        ...(d.usageGuide !== undefined ? { usageGuide: d.usageGuide || null } : {}),
        ...(d.cautions !== undefined ? { cautions: d.cautions || null } : {}),
        ...(d.actualExperience !== undefined ? { actualExperience: d.actualExperience || null } : {}),
        ...(d.tags !== undefined ? { tags: d.tags || null } : {}),
        ...(d.notes !== undefined ? { notes: d.notes || null } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.isFavorite !== undefined ? { isFavorite: d.isFavorite } : {}),
        ...(d.isPinned !== undefined ? { isPinned: d.isPinned } : {}),
      },
      include: { images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] }, affiliateLinks: true },
    });

    await audit(user.id, "product", id, "update");
    return apiOk(product);
  } catch (err) {
    return apiFail(err, "products/[id]/PATCH");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({ where: { id, userId: user.id }, select: { name: true } });
    if (!product) throw new ApiError("NOT_FOUND");

    await prisma.product.delete({ where: { id } });
    await audit(user.id, "product", id, "delete", { name: product.name });
    return apiOk({ deleted: true });
  } catch (err) {
    return apiFail(err, "products/[id]/DELETE");
  }
}
