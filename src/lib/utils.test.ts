import { describe, expect, it } from "vitest";
import { mapLimit, slugify } from "./utils";

describe("slugify", () => {
  it("handles vietnamese", () => {
    expect(slugify("Điện thoại")).toBe("dien-thoai");
    expect(slugify("Túi xách")).toBe("tui-xach");
  });
});

describe("mapLimit", () => {
  it("keeps order and isolates failures when wrapped", async () => {
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });
});
