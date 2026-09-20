import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword, assertSameOrigin } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { error, json } from "@/lib/api";

const schema = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
  } catch {
    return error("Yêu cầu không hợp lệ.", 403);
  }

  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return error(`Thử lại sau ${rl.retryAfter} giây.`, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Dữ liệu không hợp lệ.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Vui lòng nhập tài khoản và mật khẩu.");

  const user = await prisma.adminUser.findFirst({
    where: {
      OR: [
        { username: parsed.data.username },
        { email: parsed.data.username },
      ],
    },
  });

  const dummy =
    "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
  const ok = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, dummy);

  if (!user || !ok) {
    return error("Tài khoản hoặc mật khẩu không đúng.", 401);
  }

  await createSession(user.id, user.username);
  return json({ ok: true, username: user.username });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
