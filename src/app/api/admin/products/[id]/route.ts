import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAdmin, json, error } from "@/lib/api";
import { validateHttpUrl } from "@/lib/url/normalize";

const updateSchema = z.object({
  name: z.string().min(1).max(240).optional(),
  imageUrl: z.string().max(2000).optional().nullable(),
  originalUrl: z.string().min(4).max(4000).optional(),
  resolvedUrl: z.string().max(4000).optional().nullable(),
  purchaseUrl: z.string().min(4).max(4000).optional(),
  sourcePlatform: z.string().max(40).optional().nullable(),
  linkType: z.string().max(40).optional(),
  productId: z.string().max(80).optional().nullable(),
  shopId: z.string().max(80).optional().nullable(),
  categoryId: z.string().max(40).optional().nullable(),
  extractStatus: z.string().max(20).optional(),
  extractMessage: z.string().max(400).optional().nullable(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { response } = await withAdmin(req);
  if (response) return response;
  const item = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true },
  });
  if (!item) return error("Không tìm thấy sản phẩm.", 404);
  return json({ item });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { response } = await withAdmin(req);
  if (response) return response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Dữ liệu không hợp lệ.");
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error("Dữ liệu không hợp lệ.");

  const data: Record<string, unknown> = { ...parsed.data };
  try {
    if (parsed.data.originalUrl) data.originalUrl = validateHttpUrl(parsed.data.originalUrl);
    if (parsed.data.purchaseUrl) data.purchaseUrl = validateHttpUrl(parsed.data.purchaseUrl);
  } catch (err) {
    return error(err instanceof Error ? err.message : "URL không hợp lệ.");
  }
  if (parsed.data.categoryId === "") data.categoryId = null;

  try {
    const item = await prisma.product.update({
      where: { id: params.id },
      data,
      include: { category: true },
    });
    return json({ item });
  } catch {
    return error("Không tìm thấy sản phẩm.", 404);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { response } = await withAdmin(req);
  if (response) return response;
  try {
    await prisma.product.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch {
    return error("Không tìm thấy sản phẩm.", 404);
  }
}
