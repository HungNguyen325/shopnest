import { prisma } from "@/lib/prisma";
import { affiliateLinkSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!product) throw new ApiError("NOT_FOUND");
    const links = await prisma.affiliateLink.findMany({
      where: { productId: id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return apiOk(links);
  } catch (err) {
    return apiFail(err, "affiliate-links/GET");
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!product) throw new ApiError("NOT_FOUND");

    const parsed = affiliateLinkSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Link không hợp lệ.");
    }
    const data = parsed.data;

    const count = await prisma.affiliateLink.count({ where: { productId: id } });
    const link = await prisma.affiliateLink.create({
      data: {
        productId: id,
        label: data.label,
        url: data.url,
        program: data.program || null,
        isDefault: data.isDefault ?? count === 0,
      },
    });

    if (link.isDefault) {
      await prisma.affiliateLink.updateMany({
        where: { productId: id, id: { not: link.id } },
        data: { isDefault: false },
      });
      // Keep the product's primary affiliate link in sync (we never rewrite an
      // existing link automatically — only when the user marks one as default).
      await prisma.product.update({ where: { id }, data: { affiliateUrl: link.url } });
    }

    await audit(user.id, "affiliate_link", link.id, "create", { productId: id });
    return apiOk(link, { status: 201 });
  } catch (err) {
    return apiFail(err, "affiliate-links/POST");
  }
}
