import { prisma } from "@/lib/db";
import { fetchHtml, resolveUrl } from "@/lib/url/resolver";
import { fingerprintUrl } from "@/lib/url/normalize";
import { parseMetadata } from "./metadata";
import type { ProductExtractResult } from "@/lib/url/types";

export async function extractProductFromUrl(raw: string): Promise<ProductExtractResult> {
  const resolved = await resolveUrl(raw);
  let name: string | undefined;
  let imageUrl: string | undefined;
  let warning = false;
  let error: string | undefined;
  let ok = true;

  try {
    const { html, finalUrl } = await fetchHtml(resolved.resolvedUrl);
    const meta = parseMetadata(html, finalUrl || resolved.resolvedUrl);
    name = meta.title;
    imageUrl = meta.image;
    if (!name && !imageUrl) {
      ok = false;
      warning = true;
      error = "Không thể tự động lấy thông tin từ liên kết này.";
    } else if (!name || !imageUrl) {
      warning = true;
      error = !name
        ? "Không tìm thấy tên sản phẩm."
        : "Không tìm thấy hình ảnh.";
    }
  } catch (err) {
    ok = false;
    warning = true;
    error = err instanceof Error ? err.message : "Không thể truy cập liên kết.";
  }

  const fingerprint = fingerprintUrl(
    resolved.originalUrl,
    resolved.resolvedUrl,
    resolved.productId,
    resolved.platform,
  );

  const existing = await findDuplicate(fingerprint, resolved.originalUrl, resolved.resolvedUrl);

  try {
    await prisma.extractLog.create({
      data: {
        url: resolved.originalUrl,
        success: Boolean(name || imageUrl),
        message: error || (name ? "ok" : "empty"),
      },
    });
  } catch {
    /* logging must not break extraction */
  }

  return {
    ok: ok && Boolean(name || imageUrl),
    warning,
    error,
    name,
    imageUrl,
    originalUrl: resolved.originalUrl,
    resolvedUrl: resolved.resolvedUrl,
    purchaseUrl: resolved.purchaseUrl,
    linkType: resolved.linkType,
    platform: resolved.platform,
    productId: resolved.productId,
    shopId: resolved.shopId,
    fingerprint,
    duplicate: Boolean(existing),
  };
}

export async function findDuplicate(
  fingerprint: string,
  originalUrl: string,
  resolvedUrl?: string,
) {
  const or = [
    { originalUrl },
    { purchaseUrl: originalUrl },
  ] as Array<Record<string, string>>;
  if (resolvedUrl) {
    or.push({ resolvedUrl });
    or.push({ originalUrl: resolvedUrl });
  }
  const matches = await prisma.product.findMany({
    where: { OR: or },
    take: 5,
  });
  if (matches.length) return matches[0];

  if (fingerprint.includes(":")) {
    const [platform, productId] = fingerprint.split(":");
    if (platform && productId) {
      const byId = await prisma.product.findFirst({
        where: { sourcePlatform: platform, productId },
      });
      if (byId) return byId;
    }
  }
  return null;
}
