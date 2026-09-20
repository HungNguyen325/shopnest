import { assertPublicUrl } from "./ssrf";
import {
  choosePurchaseUrl,
  detectLinkType,
  detectPlatform,
  fingerprintUrl,
  parseUrl,
  validateHttpUrl,
} from "./normalize";
import type { ResolveResult } from "./types";
import { extractPlatformIds } from "../extract/adapters";

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000;

export const BROWSER_UA =
  "ShopNestBot/1.0 (Personal Product Library; metadata extraction)";

export async function resolveUrl(raw: string): Promise<ResolveResult> {
  const originalUrl = validateHttpUrl(raw);
  await assertPublicUrl(originalUrl);

  const parsed = parseUrl(originalUrl);
  const redirectChain: string[] = [originalUrl];
  let current = originalUrl;
  let resolvedUrl = originalUrl;

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const next = await peekRedirect(current);
    if (!next || next === current) break;
    await assertPublicUrl(next);
    redirectChain.push(next);
    current = next;
    resolvedUrl = next;
  }

  const platform = detectPlatform(new URL(resolvedUrl).hostname, resolvedUrl);
  const ids = extractPlatformIds(resolvedUrl, originalUrl);
  let linkType = detectLinkType(originalUrl, resolvedUrl);
  if (linkType === "direct" && resolvedUrl !== originalUrl && redirectChain.length > 1) {
    linkType = detectLinkType(originalUrl) === "affiliate" ? "affiliate" : "redirect";
  }

  const purchaseUrl = choosePurchaseUrl(originalUrl, linkType);

  return {
    originalUrl,
    normalizedUrl: parsed.href,
    resolvedUrl,
    purchaseUrl,
    linkType,
    platform: ids.platform || platform,
    productId: ids.productId,
    shopId: ids.shopId,
    redirectChain,
    fingerprint: fingerprintUrl(originalUrl, resolvedUrl, ids.productId, ids.platform || platform),
  };
}

async function peekRedirect(href: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(href, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      return new URL(loc, href).href;
    }
    return null;
  } catch {
    try {
      const res = await fetch(href, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return null;
        return new URL(loc, href).href;
      }
      return null;
    } catch {
      return null;
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchHtml(href: string): Promise<{ html: string; finalUrl: string }> {
  await assertPublicUrl(href);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(href, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      throw new Error(
        res.status === 403 || res.status === 401
          ? "Nền tảng đang giới hạn truy cập."
          : `Không thể truy cập liên kết (${res.status}).`,
      );
    }
    const ctype = res.headers.get("content-type") || "";
    if (ctype && !/text\/html|application\/xhtml|text\/plain|application\/xml|text\/xml/i.test(ctype)) {
      throw new Error("Liên kết không phải trang sản phẩm HTML.");
    }
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { html: text.slice(0, MAX_BYTES), finalUrl: res.url || href };
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        break;
      }
      chunks.push(value);
    }
    const html = new TextDecoder("utf-8").decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    return { html, finalUrl: res.url || href };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Hết thời gian chờ khi truy cập liên kết.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
