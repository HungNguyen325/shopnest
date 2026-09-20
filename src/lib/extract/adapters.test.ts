import { describe, expect, it } from "vitest";
import { extractPlatformIds } from "./adapters";

describe("platform adapters", () => {
  it("parses shopee product path", () => {
    const ids = extractPlatformIds(
      "https://shopee.vn/some-name-i.123456.789012",
    );
    expect(ids.platform).toBe("shopee");
    expect(ids.shopId).toBe("123456");
    expect(ids.productId).toBe("789012");
  });
  it("parses tiki p-id", () => {
    const ids = extractPlatformIds("https://tiki.vn/san-pham-p12345.html");
    expect(ids.platform).toBe("tiki");
    expect(ids.productId).toBe("12345");
  });
  it("parses amazon dp", () => {
    const ids = extractPlatformIds("https://www.amazon.com/dp/B09ABCDEFG");
    expect(ids.platform).toBe("amazon");
    expect(ids.productId).toBe("B09ABCDEFG");
  });
});
