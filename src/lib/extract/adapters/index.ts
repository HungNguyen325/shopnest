import type { PlatformId } from "@/lib/url/types";

export interface PlatformIds {
  platform?: PlatformId;
  productId?: string;
  shopId?: string;
}

type Adapter = (url: string) => PlatformIds | null;

const shopee: Adapter = (url) => {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.includes("shopee") && host !== "shope.ee") return null;
    const iMatch = u.pathname.match(/-i\.(\d+)\.(\d+)/);
    if (iMatch) {
      return { platform: "shopee", shopId: iMatch[1], productId: iMatch[2] };
    }
    const productMatch = u.pathname.match(/\/product\/(\d+)\/(\d+)/);
    if (productMatch) {
      return { platform: "shopee", shopId: productMatch[1], productId: productMatch[2] };
    }
    return { platform: "shopee" };
  } catch {
    return null;
  }
};

const lazada: Adapter = (url) => {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes("lazada")) return null;
    const iMatch = u.pathname.match(/-i(\d+)/i);
    if (iMatch) return { platform: "lazada", productId: iMatch[1] };
    const id = u.searchParams.get("itemId") || u.searchParams.get("id");
    if (id) return { platform: "lazada", productId: id };
    return { platform: "lazada" };
  } catch {
    return null;
  }
};

const tiki: Adapter = (url) => {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes("tiki")) return null;
    const p = u.pathname.match(/-p(\d+)/i);
    if (p) return { platform: "tiki", productId: p[1] };
    return { platform: "tiki" };
  } catch {
    return null;
  }
};

const tiktok: Adapter = (url) => {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.includes("tiktok") && !host.includes("tokopedia")) return null;
    const m = u.pathname.match(/\/product\/(\d+)/);
    if (m) return { platform: "tiktok", productId: m[1] };
    return { platform: "tiktok" };
  } catch {
    return null;
  }
};

const amazon: Adapter = (url) => {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes("amazon.")) return null;
    const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{8,})/i);
    if (m) return { platform: "amazon", productId: m[1] };
    return { platform: "amazon" };
  } catch {
    return null;
  }
};

const adapters: Adapter[] = [shopee, lazada, tiki, tiktok, amazon];

export function extractPlatformIds(resolvedUrl: string, originalUrl?: string): PlatformIds {
  for (const url of [resolvedUrl, originalUrl].filter(Boolean) as string[]) {
    for (const adapter of adapters) {
      const ids = adapter(url);
      if (ids?.productId || (ids && ids.platform && ids.platform !== "generic")) {
        if (ids.productId) return ids;
        const later = adapters
          .map((a) => a(url))
          .find((x) => x?.productId);
        return later || ids;
      }
    }
  }
  return {};
}
