import { prisma } from "@/lib/prisma";
import { affiliateLinkSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string; linkId: string }> };

async function ensureOwned(userId: string, productId: string, linkId: string) {
  const link = await prisma.affiliateLink.findFirst({
    where: { id: linkId, product: { id: productId, userId } },
  });
  if (!link) throw new ApiError("NOT_FOUND");
  return link;
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, linkId } = await ctx.params;
    await ensureOwned(user.id, id, linkId);

    const parsed = affiliateLinkSchema.partial().safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Link không hợp lệ.");
    }
    const data = parsed.data;

    if (data.isDefault) {
      await prisma.affiliateLink.updateMany({ where: { productId: id }, data: { isDefault: false } });
    }

    const link = await prisma.affiliateLink.update({
      where: { id: linkId },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.program !== undefined ? { program: data.program || null } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      },
    });

    if (link.isDefault) {
      await prisma.product.update({ where: { id }, data: { affiliateUrl: link.url } });
    }
    return apiOk(link);
  } catch (err) {
    return apiFail(err, "affiliate-links/[linkId]/PATCH");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, linkId } = await ctx.params;
    const link = await ensureOwned(user.id, id, linkId);
    await prisma.affiliateLink.delete({ where: { id: linkId } });

    if (link.isDefault) {
      const next = await prisma.affiliateLink.findFirst({ where: { productId: id } });
      if (next) {
        await prisma.affiliateLink.update({ where: { id: next.id }, data: { isDefault: true } });
        await prisma.product.update({ where: { id }, data: { affiliateUrl: next.url } });
      } else {
        await prisma.product.update({ where: { id }, data: { affiliateUrl: null } });
      }
    }
    return apiOk({ deleted: true });
  } catch (err) {
    return apiFail(err, "affiliate-links/[linkId]/DELETE");
  }
}
