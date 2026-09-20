import { describe, expect, it } from "vitest";
import {
  choosePurchaseUrl,
  detectLinkType,
  detectPlatform,
  fingerprintUrl,
  parseUrl,
  stripTracking,
  validateHttpUrl,
} from "./normalize";

describe("validateHttpUrl", () => {
  it("accepts https urls", () => {
    expect(validateHttpUrl("https://shop.example.com/p/1")).toContain("https://");
  });
  it("adds https when missing", () => {
    expect(validateHttpUrl("example.com/a")).toBe("https://example.com/a");
  });
  it("rejects empty", () => {
    expect(() => validateHttpUrl("")).toThrow();
  });
  it("rejects non-http protocols", () => {
    expect(() => validateHttpUrl("javascript:alert(1)")).toThrow();
    expect(() => validateHttpUrl("ftp://x.com")).toThrow();
  });
});

describe("detectPlatform", () => {
  it("detects major marketplaces", () => {
    expect(detectPlatform("shopee.vn")).toBe("shopee");
    expect(detectPlatform("www.lazada.vn")).toBe("lazada");
    expect(detectPlatform("tiki.vn")).toBe("tiki");
    expect(detectPlatform("shop.tiktok.com")).toBe("tiktok");
    expect(detectPlatform("www.amazon.com")).toBe("amazon");
    expect(detectPlatform("example.com")).toBe("generic");
  });
});

describe("detectLinkType", () => {
  it("marks affiliate query as affiliate", () => {
    expect(
      detectLinkType("https://example.com/p/1?aff_id=99&click_id=abc"),
    ).toBe("affiliate");
  });
  it("marks shortener hosts as short", () => {
    expect(detectLinkType("https://bit.ly/abcd")).toBe("short");
  });
  it("marks utm-only as tracking", () => {
    expect(detectLinkType("https://example.com/p/1?utm_source=fb")).toBe("tracking");
  });
  it("marks same-host product url as direct", () => {
    expect(detectLinkType("https://shop.example.com/product/abc")).toBe("direct");
  });
  it("marks resolved different host as redirect", () => {
    expect(
      detectLinkType("https://rdir.example.com/x", "https://shop.example.com/p/1"),
    ).toBe("redirect");
  });
});

describe("affiliate preservation", () => {
  it("keeps original url as purchase url", () => {
    const original = "https://s.click.example.com/abc?aff_id=1";
    expect(choosePurchaseUrl(original, "affiliate")).toBe(original);
    expect(choosePurchaseUrl(original, "direct")).toBe(original);
  });
});

describe("fingerprint", () => {
  it("uses platform + product id when available", () => {
    expect(fingerprintUrl("https://a.com/x", "https://a.com/x", "99", "shopee")).toBe(
      "shopee:99",
    );
  });
  it("strips tracking from fingerprint", () => {
    const a = fingerprintUrl("https://a.com/p?utm_source=x");
    const b = fingerprintUrl("https://a.com/p");
    expect(a).toBe(b);
  });
});

describe("parseUrl + stripTracking", () => {
  it("parses hostname lowercase", () => {
    expect(parseUrl("https://ExAmPle.COM/Hi").hostname).toBe("example.com");
  });
  it("removes utm params", () => {
    expect(stripTracking("https://a.com/p?utm_source=x&keep=1")).toContain("keep=1");
    expect(stripTracking("https://a.com/p?utm_source=x&keep=1")).not.toContain("utm_source");
  });
});
