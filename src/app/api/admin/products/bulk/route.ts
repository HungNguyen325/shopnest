import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAdmin, json, error } from "@/lib/api";
import { validateHttpUrl } from "@/lib/url/normalize";

const itemSchema = z.object({
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
  existingId: z.string().optional().nullable(),
});

const schema = z.object({
  items: z.array(itemSchema).min(1).max(100),
});

export async function POST(req: Request) {
  const { response } = await withAdmin(req);
  if (response) return response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Dữ liệu không hợp lệ.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Danh sách sản phẩm không hợp lệ.");

  const saved: unknown[] = [];
  const skipped: unknown[] = [];
  const failed: { url: string; error: string }[] = [];

  for (const row of parsed.data.items) {
    try {
      const originalUrl = validateHttpUrl(row.originalUrl);
      const purchaseUrl = validateHttpUrl(row.purchaseUrl);
      const data = {
        name: row.name.trim(),
        imageUrl: row.imageUrl || null,
        originalUrl,
        resolvedUrl: row.resolvedUrl || null,
        purchaseUrl,
        sourcePlatform: row.sourcePlatform || null,
        linkType: row.linkType || "direct",
        productId: row.productId || null,
        shopId: row.shopId || null,
        categoryId: row.categoryId || null,
        extractStatus: row.extractStatus || "success",
        extractMessage: row.extractMessage || null,
      };
      if (row.duplicateAction === "skip") {
        skipped.push({ originalUrl });
        continue;
      }
      if (row.duplicateAction === "update" && row.existingId) {
        saved.push(
          await prisma.product.update({ where: { id: row.existingId }, data }),
        );
        continue;
      }
      saved.push(await prisma.product.create({ data }));
    } catch (err) {
      failed.push({
        url: row.originalUrl,
        error: err instanceof Error ? err.message : "Lỗi lưu",
      });
    }
  }

  return json({ saved: saved.length, skipped: skipped.length, failed, items: saved });
}
