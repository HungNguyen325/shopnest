import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.", {
        field: parsed.error.issues[0]?.path?.[0],
      });
    }
    const { name, email, password, timezone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError("DUPLICATE", "Email này đã được đăng ký. Bạn hãy đăng nhập hoặc lấy lại mật khẩu.");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh",
        // First account becomes admin so AI Settings is reachable out of the box.
        role: (await prisma.user.count()) === 0 ? "admin" : "user",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await prisma.userBrandProfile.create({ data: { userId: user.id } });
    await createSession(user.id);
    await audit(user.id, "user", user.id, "register", { email });

    return apiOk({ user });
  } catch (err) {
    return apiFail(err, "auth/register");
  }
}
