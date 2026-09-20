import { describe, expect, it } from "vitest";
import { isBlockedHostname } from "./ssrf";

describe("isBlockedHostname", () => {
  it("blocks localhost and loopback", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("127.0.0.1")).toBe(true);
    expect(isBlockedHostname("0.0.0.0")).toBe(true);
  });
  it("blocks private ranges and metadata", () => {
    expect(isBlockedHostname("10.0.0.8")).toBe(true);
    expect(isBlockedHostname("192.168.1.1")).toBe(true);
    expect(isBlockedHostname("172.16.0.1")).toBe(true);
    expect(isBlockedHostname("169.254.169.254")).toBe(true);
    expect(isBlockedHostname("metadata.google.internal")).toBe(true);
  });
  it("allows public hostnames", () => {
    expect(isBlockedHostname("example.com")).toBe(false);
    expect(isBlockedHostname("shopee.vn")).toBe(false);
  });
});
