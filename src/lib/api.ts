import { NextResponse } from "next/server";
import { requireAdmin, assertSameOrigin } from "./auth";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAdmin(req: Request) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      assertSameOrigin(req);
    }
  } catch {
    return { user: null, response: error("Yêu cầu không hợp lệ.", 403) };
  }
  const user = await requireAdmin();
  if (!user) return { user: null, response: error("Bạn cần đăng nhập quản trị.", 401) };
  return { user, response: null };
}
