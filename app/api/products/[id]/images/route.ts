import { prisma } from "@/lib/prisma";
import { productImageSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const MAX_MB = Number(process.env.UPLOAD_MAX_MB || 5);
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_IMAGES_PER_PRODUCT = 12;

type Ctx = { params: Promise<{ id: string }> };

/** Detect real image type from magic bytes (the declared MIME can be forged). */
function sniffMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP")
    return "image/webp";
  if (buffer.subarray(0, 6).toString("latin1") === "GIF87a" || buffer.subarray(0, 6).toString("latin1") === "GIF89a")
    return "image/gif";
  if (buffer.subarray(4, 12).toString("latin1") === "ftypavif") return "image/avif";
  return null;
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const product = await prisma.product.findFirst({
      where: { id, userId: user.id },
      select: { id: true, _count: { select: { images: true } } },
    });
    if (!product) throw new ApiError("NOT_FOUND");
    if (product._count.images >= MAX_IMAGES_PER_PRODUCT) {
      throw new ApiError(
        "UPLOAD_ERROR",
        `Mỗi sản phẩm tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh. Hãy xóa bớt ảnh cũ.`,
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = productImageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("UPLOAD_ERROR", parsed.error.issues[0]?.message ?? "Ảnh không hợp lệ.");
    }

    const { dataUrl, altText, isCover } = parsed.data;
    const comma = dataUrl.indexOf(",");
    const declaredMime = dataUrl.slice(5, comma).split(";")[0];
    const base64 = dataUrl.slice(comma + 1);

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      throw new ApiError("UPLOAD_ERROR", "Không đọc được dữ liệu ảnh.");
    }

    const sniffed = sniffMime(buffer);
    if (!sniffed || !ALLOWED.includes(sniffed)) {
      throw new ApiError("UPLOAD_ERROR", "File không phải ảnh hợp lệ (hỗ trợ JPG, PNG, WEBP, GIF, AVIF).");
    }
    if (declaredMime !== sniffed) {
      throw new ApiError("UPLOAD_ERROR", "Định dạng khai báo không khớp với nội dung file.");
    }
    if (buffer.length > MAX_MB * 1024 * 1024) {
      throw new ApiError("UPLOAD_ERROR", `Ảnh vượt quá ${MAX_MB}MB. Hãy giảm kích thước trước khi tải lên.`);
    }

    const nextOrder = await prisma.productImage.count({ where: { productId: id } });
    const image = await prisma.productImage.create({
      data: {
        productId: id,
        url: `data:${sniffed};base64,${base64}`,
        altText: altText || null,
        sortOrder: nextOrder,
        isCover: isCover ?? nextOrder === 0,
      },
    });

    if (image.isCover && nextOrder > 0) {
      await prisma.productImage.updateMany({
        where: { productId: id, id: { not: image.id } },
        data: { isCover: false },
      });
    }

    return apiOk(image, { status: 201 });
  } catch (err) {
    return apiFail(err, "products/[id]/images");
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!product) throw new ApiError("NOT_FOUND");
    const images = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
    });
    return apiOk(images);
  } catch (err) {
    return apiFail(err, "products/[id]/images/GET");
  }
}
