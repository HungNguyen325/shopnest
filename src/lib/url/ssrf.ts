import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.internal.",
]);

function ipv4ToInt(ip: string): number {
  const p = ip.split(".").map((n) => Number(n));
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return -1;
  }
  return ((p[0]! << 24) >>> 0) + (p[1]! << 16) + (p[2]! << 8) + p[3]!;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n < 0) return true;
  const inRange = (start: string, end: string) =>
    n >= ipv4ToInt(start) && n <= ipv4ToInt(end);
  return (
    inRange("0.0.0.0", "0.255.255.255") ||
    inRange("10.0.0.0", "10.255.255.255") ||
    inRange("127.0.0.0", "127.255.255.255") ||
    inRange("169.254.0.0", "169.254.255.255") ||
    inRange("172.16.0.0", "172.31.255.255") ||
    inRange("192.168.0.0", "192.168.255.255") ||
    inRange("224.0.0.0", "255.255.255.255")
  );
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::" || v.startsWith("fe80:") || v.startsWith("fc") || v.startsWith("fd")) {
    return true;
  }
  if (v.startsWith("::ffff:")) {
    const mapped = v.slice("::ffff:".length);
    if (isIP(mapped) === 4) return isPrivateIPv4(mapped);
  }
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return true;
  }
  const ipVersion = isIP(host);
  if (ipVersion === 4) return isPrivateIPv4(host);
  if (ipVersion === 6) return isPrivateIPv6(host.replace(/^\[|\]$/g, ""));
  return false;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL không hợp lệ.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Chỉ hỗ trợ liên kết http/https.");
  }
  if (url.username || url.password) {
    throw new Error("URL không được chứa thông tin đăng nhập.");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error("Không được truy cập địa chỉ nội bộ.");
  }
  try {
    const results = await lookup(url.hostname, { all: true });
    for (const r of results) {
      if (r.family === 4 && isPrivateIPv4(r.address)) {
        throw new Error("Không được truy cập địa chỉ nội bộ.");
      }
      if (r.family === 6 && isPrivateIPv6(r.address)) {
        throw new Error("Không được truy cập địa chỉ nội bộ.");
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("nội bộ")) throw err;
    throw new Error("Không thể phân giải tên miền của liên kết.");
  }
  return url;
}
