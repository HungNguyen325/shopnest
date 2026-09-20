import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAdmin, json, error } from "@/lib/api";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  icon: z.string().max(40).optional(),
  sortOrder: z.number().int().optional(),
  reassignTo: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { response } = await withAdmin(req);
  if (response) return response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Dữ liệu không hợp lệ.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Dữ liệu không hợp lệ.");

  const data: Record<string, unknown> = {};
  if (parsed.data.name) {
    data.name = parsed.data.name.trim();
    data.slug = slugify(parsed.data.name);
  }
  if (parsed.data.icon) data.icon = parsed.data.icon;
  if (typeof parsed.data.sortOrder === "number") data.sortOrder = parsed.data.sortOrder;

  try {
    const item = await prisma.category.update({ where: { id: params.id }, data });
    return json({ item });
  } catch {
    return error("Không tìm thấy danh mục.", 404);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { response } = await withAdmin(req);
  if (response) return response;
  const { searchParams } = new URL(req.url);
  const reassignTo = searchParams.get("reassignTo");

  const count = await prisma.product.count({ where: { categoryId: params.id } });
  if (count > 0 && !reassignTo) {
    return error(
      "Danh mục đang có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước khi xóa.",
      409,
    );
  }
  if (count > 0 && reassignTo) {
    if (reassignTo === params.id) return error("Danh mục đích không hợp lệ.");
    const dest = await prisma.category.findUnique({ where: { id: reassignTo } });
    if (!dest) return error("Danh mục đích không tồn tại.");
    await prisma.product.updateMany({
      where: { categoryId: params.id },
      data: { categoryId: reassignTo },
    });
  }
  try {
    await prisma.category.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch {
    return error("Không tìm thấy danh mục.", 404);
  }
}
