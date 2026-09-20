import * as cheerio from "cheerio";
import type { ExtractedMetadata } from "@/lib/url/types";

function absUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (!v) return undefined;
  try {
    return new URL(v, base).href;
  } catch {
    return undefined;
  }
}

function pick(...values: Array<string | undefined | null>): string | undefined {
  for (const v of values) {
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

function parseJsonLd($: cheerio.CheerioAPI): { title?: string; image?: string } {
  const out: { title?: string; image?: string } = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const node of nodes) {
        walkJsonLd(node, out);
      }
    } catch {
      /* ignore invalid json-ld */
    }
  });
  return out;
}

function walkJsonLd(node: unknown, out: { title?: string; image?: string }) {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const types = Array.isArray(type) ? type : type ? [type] : [];
  const isProduct = types.some((t) =>
    typeof t === "string" && /product|offer|productgroup/i.test(t),
  );
  if (isProduct || types.length === 0) {
    if (!out.title && typeof obj.name === "string") out.title = obj.name;
    if (!out.image) {
      const img = obj.image;
      if (typeof img === "string") out.image = img;
      else if (Array.isArray(img) && typeof img[0] === "string") out.image = img[0];
      else if (img && typeof img === "object" && typeof (img as { url?: string }).url === "string") {
        out.image = (img as { url: string }).url;
      }
    }
  }
  if (obj.offers) walkJsonLd(obj.offers, out);
}

export function parseMetadata(html: string, baseUrl: string): ExtractedMetadata {
  const $ = cheerio.load(html);
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content") ||
    $('meta[property="og:image:url"]').attr("content");
  const twTitle = $('meta[name="twitter:title"]').attr("content");
  const twImage = $('meta[name="twitter:image"]').attr("content") ||
    $('meta[name="twitter:image:src"]').attr("content");
  const jsonLd = parseJsonLd($);
  const titleTag = $("title").first().text();
  const h1 = $("h1").first().text();
  const itempropName = $('[itemprop="name"]').first().attr("content") || $('[itemprop="name"]').first().text();
  const itempropImage = $('[itemprop="image"]').first().attr("content") ||
    $('[itemprop="image"]').first().attr("src");

  const title = pick(ogTitle, twTitle, jsonLd.title, itempropName, titleTag, h1);
  const image = absUrl(
    pick(ogImage, twImage, jsonLd.image, itempropImage),
    baseUrl,
  );

  let source = "none";
  if (ogTitle || ogImage) source = "opengraph";
  else if (twTitle || twImage) source = "twitter";
  else if (jsonLd.title || jsonLd.image) source = "jsonld";
  else if (titleTag) source = "title";
  else if (h1) source = "h1";

  const description = pick(
    $('meta[property="og:description"]').attr("content"),
    $('meta[name="description"]').attr("content"),
  );

  return {
    title: title ? cleanTitle(title) : undefined,
    image,
    description,
    source,
  };
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001F]/g, "")
    .trim()
    .slice(0, 240);
}
