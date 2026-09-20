import { describe, expect, it } from "vitest";
import { cleanTitle, parseMetadata } from "./metadata";

describe("parseMetadata", () => {
  it("prefers open graph", () => {
    const html = `
      <html><head>
        <title>Ignore</title>
        <meta property="og:title" content="OG Product" />
        <meta property="og:image" content="/img.jpg" />
      </head><body><h1>H1</h1></body></html>
    `;
    const meta = parseMetadata(html, "https://shop.example.com/p/1");
    expect(meta.title).toBe("OG Product");
    expect(meta.image).toBe("https://shop.example.com/img.jpg");
    expect(meta.source).toBe("opengraph");
  });

  it("falls back to twitter then json-ld then title", () => {
    const twitter = parseMetadata(
      `<html><head><meta name="twitter:title" content="TW" /><meta name="twitter:image" content="https://cdn.example.com/a.png" /></head></html>`,
      "https://x.com",
    );
    expect(twitter.title).toBe("TW");
    expect(twitter.source).toBe("twitter");

    const jsonld = parseMetadata(
      `<html><head><script type="application/ld+json">{"@type":"Product","name":"JSONLD Bag","image":"https://cdn.example.com/bag.jpg"}</script></head></html>`,
      "https://x.com",
    );
    expect(jsonld.title).toBe("JSONLD Bag");
    expect(jsonld.image).toBe("https://cdn.example.com/bag.jpg");

    const title = parseMetadata(
      `<html><head><title>Plain Title</title></head><body><h1>Heading</h1></body></html>`,
      "https://x.com",
    );
    expect(title.title).toBe("Plain Title");
  });

  it("does not invent fake data", () => {
    const meta = parseMetadata(`<html><head></head><body></body></html>`, "https://x.com");
    expect(meta.title).toBeUndefined();
    expect(meta.image).toBeUndefined();
  });
});

describe("cleanTitle", () => {
  it("collapses whitespace and trims", () => {
    expect(cleanTitle("  Hello   world \n")).toBe("Hello world");
  });
});
