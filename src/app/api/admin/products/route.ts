import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAdmin, json, error } from "@/lib/api";
import { findDuplicate } from "@/lib/extract";
import { fingerprintUrl, validateHttpUrl } from "@/lib/url/normalize";

const createSchema = z.object({
  name: z.string().min(1).max(240),
  imageUrl: z.string().max(2000).optional().nullable(),
  originalUrl: z.string().min(4).max(4000),
  resolvedUrl: z.string().max(4000).optional().nullable(),
  purchaseUrl: z.string().min(4).max(4000),
  sourcePlatform: z.string().max(40).optional().nullable(),
  linkType: z.string().max(40).optional(),
  productId: z.string().max(80).optional().nullable(),
  shopId: z.string().max(80).optional().nullable(),
  categoryId: z.string().max(40).optional().nullable(),
  extractStatus: z.string().max(20).optional(),
  extractMessage: z.string().max(400).optional().nullable(),
  duplicateAction: z.enum(["skip", "update", "create"]).optional(),
});

export async function GET(req: Request) {
  const { response } = await withAdmin(req);
  if (response) return response;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const categoryId = searchParams.get("categoryId") || "";

  const where: Record<string, unknown> = {};
  if (q) where.name = { contains: q };
  if (categoryId) where.categoryId = categoryId;

  const items = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return json({ items });
}

export async function POST(req: Request) {
  const { response } = await withAdmin(req);
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Dữ liệu không hợp lệ.");
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Thiếu tên sản phẩm hoặc URL mua hàng.");

  let originalUrl: string;
  let purchaseUrl: string;
  try {
    originalUrl = validateHttpUrl(parsed.data.originalUrl);
    purchaseUrl = validateHttpUrl(parsed.data.purchaseUrl);
  } catch (err) {
    return error(err instanceof Error ? err.message : "URL không hợp lệ.");
  }

  const fp = fingerprintUrl(
    originalUrl,
    parsed.data.resolvedUrl || undefined,
    parsed.data.productId || undefined,
    parsed.data.sourcePlatform || undefined,
  );
  const existing = await findDuplicate(fp, originalUrl, parsed.data.resolvedUrl || undefined);
  const action = parsed.data.duplicateAction || "create";

  if (existing && action === "skip") {
    return json({ skipped: true, item: existing });
  }

  const data = {
    name: parsed.data.name.trim(),
    imageUrl: parsed.data.imageUrl || null,
    originalUrl,
    resolvedUrl: parsed.data.resolvedUrl || null,
    purchaseUrl,
    sourcePlatform: parsed.data.sourcePlatform || null,
    linkType: parsed.data.linkType || "direct",
    productId: parsed.data.productId || null,
    shopId: parsed.data.shopId || null,
    categoryId: parsed.data.categoryId || null,
    extractStatus: parsed.data.extractStatus || "success",
    extractMessage: parsed.data.extractMessage || null,
  };

  if (existing && action === "update") {
    const item = await prisma.product.update({
      where: { id: existing.id },
      data,
      include: { category: true },
    });
    return json({ updated: true, item });
  }

  const item = await prisma.product.create({
    data,
    include: { category: true },
  });
  return json({ item }, 201);
}
