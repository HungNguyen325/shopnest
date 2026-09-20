import type { LinkType, NormalizedUrl, PlatformId } from "./types";

const SHORTENER_HOSTS = new Set([
  "bit.ly",
  "t.co",
  "tinyurl.com",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "s.id",
  "vn.s.id",
  "sp.s.id",
  "lazada.s.id",
]);

const AFFILIATE_HOST_HINTS = [
  "s.click",
  "affiliate",
  "aff.",
  "partner",
  "track.",
  "click.",
  "go.",
  "s.shopee",
  "shope.ee",
  "lazada.co",
  "s.lazada",
  "tiktok.com/t/",
];

const AFFILIATE_QUERY_KEYS = new Set([
  "aff",
  "aff_id",
  "affiliate",
  "affiliate_id",
  "aff_sub",
  "aff_sub2",
  "clickid",
  "click_id",
  "sub_id",
  "subid",
  "partner_id",
  "partnerid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "ttclid",
  "mc_cid",
  "mc_eid",
  "irclickid",
  "irgwc",
  "ranMID",
  "ranEAID",
  "ranSiteID",
  "tag",
  "ascsubtag",
  "smasac",
  "utm_id",
]);

const TRACKING_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "ttclid",
  "spm",
  "tracking",
  "trackid",
  "trace_id",
]);

export function validateHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("URL không được để trống.");
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) {
    throw new Error("Chỉ hỗ trợ liên kết http/https.");
  }
  let href = trimmed;
  if (!/^https?:\/\//i.test(href)) href = "https://" + href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    throw new Error("URL không hợp lệ.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Chỉ hỗ trợ liên kết http/https.");
  }
  return url.href;
}

export function parseUrl(raw: string): NormalizedUrl {
  const url = new URL(validateHttpUrl(raw));
  const searchParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });
  return {
    href: url.href,
    origin: url.origin,
    hostname: url.hostname.toLowerCase(),
    pathname: url.pathname,
    searchParams,
  };
}

export function detectPlatform(hostname: string, href = ""): PlatformId {
  const h = hostname.toLowerCase();
  const u = href.toLowerCase();
  if (h.includes("shopee") || h === "shope.ee" || h.endsWith(".shopee.vn")) return "shopee";
  if (h.includes("lazada")) return "lazada";
  if (h.includes("tiki")) return "tiki";
  if (h.includes("tiktok") || h.includes("tokopedia")) return "tiktok";
  if (h.includes("amazon.")) return "amazon";
  if (h.includes("aliexpress") || u.includes("aliexpress")) return "aliexpress";
  return "generic";
}

export function detectLinkType(raw: string, resolvedHref?: string): LinkType {
  const parsed = parseUrl(raw);
  const host = parsed.hostname;
  const keys = Object.keys(parsed.searchParams);

  if (SHORTENER_HOSTS.has(host) || host.startsWith("s.") && host.split(".").length <= 3) {
    if (isAffiliateHost(host) || hasAffiliateQuery(keys, parsed.searchParams)) {
      return "affiliate";
    }
    return "short";
  }

  if (isAffiliateHost(host) || hasAffiliateQuery(keys, parsed.searchParams, true)) {
    return "affiliate";
  }

  if (keys.some((k) => TRACKING_KEYS.has(k))) {
    return "tracking";
  }

  if (resolvedHref) {
    try {
      const a = new URL(parsed.href);
      const b = new URL(resolvedHref);
      if (a.hostname !== b.hostname || stripTracking(a.href) !== stripTracking(b.href)) {
        return "redirect";
      }
    } catch {
      /* ignore */
    }
  }

  return "direct";
}

function isAffiliateHost(host: string): boolean {
  return AFFILIATE_HOST_HINTS.some((hint) => host.includes(hint.replace(/\/$/, "")));
}

function hasAffiliateQuery(
  keys: string[],
  params: Record<string, string>,
  strict = false,
): boolean {
  const affiliateOnly = [
    "aff",
    "aff_id",
    "affiliate",
    "affiliate_id",
    "aff_sub",
    "clickid",
    "click_id",
    "partner_id",
    "irclickid",
    "ranMID",
    "tag",
  ];
  const list = strict ? affiliateOnly : Array.from(AFFILIATE_QUERY_KEYS);
  return keys.some((k) => list.includes(k) || list.includes(k.toLowerCase())) ||
    Object.values(params).some((v) => /affiliate|aff_/i.test(v));
}

export function stripTracking(href: string): string {
  try {
    const url = new URL(href);
    const toDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      if (TRACKING_KEYS.has(key) || key.toLowerCase().startsWith("utm_")) {
        toDelete.push(key);
      }
    });
    toDelete.forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    return url.href;
  } catch {
    return href;
  }
}

export function fingerprintUrl(original: string, resolved?: string, productId?: string, platform?: string): string {
  const base = stripTracking(resolved || original).toLowerCase();
  if (productId && platform) return `${platform}:${productId}`;
  try {
    const u = new URL(base);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, "");
  } catch {
    return base;
  }
}

export function choosePurchaseUrl(originalUrl: string, linkType: LinkType): string {
  // Always preserve the URL the admin pasted as the purchase destination.
  // Affiliate / tracking / short links must not be replaced by a resolved PDP URL.
  void linkType;
  return originalUrl;
}
