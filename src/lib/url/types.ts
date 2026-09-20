export type LinkType =
  | "direct"
  | "affiliate"
  | "short"
  | "redirect"
  | "tracking";

export type PlatformId =
  | "shopee"
  | "lazada"
  | "tiki"
  | "tiktok"
  | "amazon"
  | "aliexpress"
  | "generic";

export interface NormalizedUrl {
  href: string;
  origin: string;
  hostname: string;
  pathname: string;
  searchParams: Record<string, string>;
}

export interface ResolveResult {
  originalUrl: string;
  normalizedUrl: string;
  resolvedUrl: string;
  purchaseUrl: string;
  linkType: LinkType;
  platform: PlatformId;
  productId?: string;
  shopId?: string;
  redirectChain: string[];
  fingerprint: string;
}

export interface ExtractedMetadata {
  title?: string;
  image?: string;
  description?: string;
  source: string;
}

export interface ProductExtractResult {
  ok: boolean;
  warning?: boolean;
  error?: string;
  name?: string;
  imageUrl?: string;
  originalUrl: string;
  resolvedUrl?: string;
  purchaseUrl: string;
  linkType: LinkType;
  platform: PlatformId;
  productId?: string;
  shopId?: string;
  fingerprint: string;
  duplicate?: boolean;
}
