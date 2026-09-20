import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    return json({
      items: items.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        sortOrder: c.sortOrder,
        productCount: c._count.products,
      })),
    });
  } catch {
    return error("Không thể tải danh mục.", 500);
  }
}
