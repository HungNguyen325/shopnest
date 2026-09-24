import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { Prisma } from "@prisma/client";

const MAX_PAGE_SIZE = 60;

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const search = url.searchParams.get("q")?.trim() ?? "";
    const category = url.searchParams.get("category") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const tag = url.searchParams.get("tag") ?? "";
    const favoriteOnly = url.searchParams.get("favorite") === "1";
    const pinnedOnly = url.searchParams.get("pinned") === "1";
    const missingAffiliate = url.searchParams.get("missingAffiliate") === "1";
    const unusedOnly = url.searchParams.get("unused") === "1";
    const sort = url.searchParams.get("sort") ?? "newest";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get("pageSize") ?? 24)));

    const where: Prisma.ProductWhereInput = {
      userId: user.id,
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(favoriteOnly ? { isFavorite: true } : {}),
      ...(pinnedOnly ? { isPinned: true } : {}),
      ...(missingAffiliate
        ? { OR: [{ affiliateUrl: null }, { affiliateUrl: "" }] }
        : {}),
      ...(tag ? { tags: { contains: tag } } : {}),
      ...(unusedOnly ? { posts: { none: {} } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { brand: { contains: search } },
              { description: { contains: search } },
              { tags: { contains: search } },
            ],
          }
        : {}),
    };

    const include: Prisma.ProductInclude = {
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      affiliateLinks: true,
      _count: { select: { posts: true } },
    };

    const sortMap: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
      newest: [{ isPinned: "desc" }, { createdAt: "desc" }],
      oldest: [{ isPinned: "desc" }, { createdAt: "asc" }],
      name: [{ isPinned: "desc" }, { name: "asc" }],
      updated: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include,
        ...(sort === "posts"
          ? {}
          : { orderBy: sortMap[sort] ?? sortMap.newest, skip: (page - 1) * pageSize, take: pageSize }),
      }),
      prisma.product.count({ where }),
    ]);

    // Sorting by post count needs an in-memory pass (SQLite has no relation-count ORDER BY).
    let result = items;
    if (sort === "posts") {
      result = [...items]
        .sort((a, b) => b._count.posts - a._count.posts || a.name.localeCompare(b.name))
        .slice((page - 1) * pageSize, page * pageSize);
    }

    const categories = await prisma.product.findMany({
      where: { userId: user.id, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
    });

    const allTags = await prisma.product.findMany({
      where: { userId: user.id, tags: { not: null } },
      select: { tags: true },
    });
    const tagSet = new Set<string>();
    allTags.forEach((p) =>
      (p.tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => tagSet.add(t)),
    );

    const stats = await prisma.product.aggregate({
      where: { userId: user.id },
      _count: { _all: true },
    });
    const unused = await prisma.product.count({ where: { userId: user.id, posts: { none: {} } } });
    const withoutAffiliate = await prisma.product.count({
      where: { userId: user.id, OR: [{ affiliateUrl: null }, { affiliateUrl: "" }] },
    });

    return apiOk({
      items: result,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      categories: categories.map((c) => c.category).filter(Boolean),
      tags: Array.from(tagSet).sort(),
      stats: {
        total: stats._count._all,
        unused,
        withoutAffiliate,
      },
    });
  } catch (err) {
    return apiFail(err, "products/GET");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
    }
    const data = parsed.data;

    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name: data.name,
        brand: data.brand || null,
        description: data.description || null,
        category: data.category || null,
        originalUrl: data.originalUrl || null,
        affiliateUrl: data.affiliateUrl || null,
        price: data.price === "" || data.price === undefined ? null : Number(data.price),
        currency: data.currency || "VND",
        commission: data.commission || null,
        highlights: data.highlights || null,
        pros: data.pros || null,
        cons: data.cons || null,
        targetAudience: data.targetAudience || null,
        painPoints: data.painPoints || null,
        usageGuide: data.usageGuide || null,
        cautions: data.cautions || null,
        actualExperience: data.actualExperience || null,
        tags: data.tags || null,
        notes: data.notes || null,
        status: data.status ?? "active",
        isFavorite: data.isFavorite ?? false,
        isPinned: data.isPinned ?? false,
      },
      include: { images: true, affiliateLinks: true },
    });

    if (data.affiliateUrl) {
      await prisma.affiliateLink.create({
        data: {
          productId: product.id,
          label: "Link mặc định",
          url: data.affiliateUrl,
          isDefault: true,
        },
      });
    }

    await audit(user.id, "product", product.id, "create", { name: product.name });
    return apiOk(product, { status: 201 });
  } catch (err) {
    return apiFail(err, "products/POST");
  }
}
