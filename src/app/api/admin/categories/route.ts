import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAdmin, json, error } from "@/lib/api";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1).max(80),
  icon: z.string().max(40).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(req: Request) {
  const { response } = await withAdmin(req);
  if (response) return response;
  const items = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Tên danh mục không hợp lệ.");

  let slug = slugify(parsed.data.name);
  if (!slug) slug = "danh-muc";
  const exists = await prisma.category.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const item = await prisma.category.create({
    data: {
      name: parsed.data.name.trim(),
      slug,
      icon: parsed.data.icon || "tag",
      sortOrder: parsed.data.sortOrder ?? (max._max.sortOrder || 0) + 1,
    },
  });
  return json({ item }, 201);
}
