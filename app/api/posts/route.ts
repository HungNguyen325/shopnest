import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { contentToData } from "@/lib/posts";

const createSchema = z.object({
  productId: z.string().max(64).nullable().optional(),
  platform: z.string().trim().min(1).max(40),
  contentType: z.string().trim().min(1).max(40),
  tone: z.string().trim().max(40).nullable().optional(),
  goal: z.string().trim().max(40).nullable().optional(),
  status: z.enum(["draft", "planned", "ready", "published", "failed", "archived"]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  content: z.object({
    title: z.string().max(300).optional(),
    hook: z.string().max(600).optional(),
    caption: z.string().max(8000).optional(),
    body: z.string().max(12000).optional(),
    call_to_action: z.string().max(600).optional(),
    hashtags: z.array(z.string().max(60)).max(30).optional(),
    pinned_comment: z.string().max(1000).optional(),
    video_script: z.unknown().optional(),
    content_angle: z.string().max(300).optional(),
    target_audience: z.string().max(400).optional(),
    compliance_notes: z.array(z.string().max(400)).optional(),
    missing_information: z.array(z.string().max(400)).optional(),
    alternative_versions: z.array(z.unknown()).optional(),
  }),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "";
    const platform = url.searchParams.get("platform") ?? "";
    const contentType = url.searchParams.get("contentType") ?? "";
    const productId = url.searchParams.get("productId") ?? "";
    const search = url.searchParams.get("q")?.trim() ?? "";
    const sort = url.searchParams.get("sort") ?? "updated";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(60, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));

    const where: Prisma.ContentPostWhereInput = {
      userId: user.id,
      ...(status ? { status } : {}),
      ...(platform ? { platform } : {}),
      ...(contentType ? { contentType } : {}),
      ...(productId ? { productId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { caption: { contains: search } },
              { hook: { contains: search } },
              { notes: { contains: search } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.ContentPostOrderByWithRelationInput[]> = {
      updated: [{ updatedAt: "desc" }],
      newest: [{ createdAt: "desc" }],
      scheduled: [{ scheduledAt: "asc" }],
      published: [{ publishedAt: "desc" }],
      title: [{ title: "asc" }],
    };

    const [items, total, counts] = await Promise.all([
      prisma.contentPost.findMany({
        where,
        orderBy: sortMap[sort] ?? sortMap.updated,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              affiliateUrl: true,
              images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], take: 1 },
            },
          },
        },
      }),
      prisma.contentPost.count({ where }),
      prisma.contentPost.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } }),
    ]);

    const statusCounts: Record<string, number> = { total: 0 };
    counts.forEach((c) => {
      statusCounts[c.status] = c._count._all;
      statusCounts.total += c._count._all;
    });

    return apiOk({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      statusCounts,
    });
  } catch (err) {
    return apiFail(err, "posts/GET");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu bài đăng chưa hợp lệ.");
    }
    const d = parsed.data;

    if (d.productId) {
      const product = await prisma.product.findFirst({
        where: { id: d.productId, userId: user.id },
        select: { id: true },
      });
      if (!product) throw new ApiError("NOT_FOUND", "Sản phẩm không thuộc tài khoản của bạn.");
    }

    const post = await prisma.contentPost.create({
      data: {
        userId: user.id,
        productId: d.productId ?? null,
        platform: d.platform,
        contentType: d.contentType,
        tone: d.tone ?? null,
        goal: d.goal ?? null,
        status: d.status ?? "draft",
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
        notes: d.notes ?? null,
        generatedBy: "manual",
        ...contentToData(d.content as never),
      },
      include: { product: { select: { id: true, name: true } } },
    });

    await prisma.contentVersion.create({
      data: { contentPostId: post.id, versionNumber: 1, content: JSON.stringify(d.content) },
    });
    await audit(user.id, "content_post", post.id, "create", { platform: post.platform });

    return apiOk(post, { status: 201 });
  } catch (err) {
    return apiFail(err, "posts/POST");
  }
}
