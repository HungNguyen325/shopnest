import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 40) || 40));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (q) {
    where.name = { contains: q };
  }
  if (category && category !== "all") {
    where.category = { slug: category };
  }

  try {
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return json({
      items: items.map(publicProduct),
      total,
      page,
      limit,
    });
  } catch {
    return error("Không thể tải sản phẩm.", 500);
  }
}

function publicProduct(p: {
  id: string;
  name: string;
  imageUrl: string | null;
  purchaseUrl: string;
  category: { id: string; name: string; slug: string } | null;
  isDemo: boolean;
}) {
  return {
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl,
    purchaseUrl: p.purchaseUrl,
    category: p.category,
    isDemo: p.isDemo,
  };
}
