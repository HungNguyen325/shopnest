import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Email hoặc mật khẩu chưa đúng định dạng.");

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    // Same message for unknown email and wrong password (no user enumeration).
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new ApiError("VALIDATION_ERROR", "Email hoặc mật khẩu không đúng.");
    }

    await createSession(user.id);
    await audit(user.id, "user", user.id, "login");

    return apiOk({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return apiFail(err, "auth/login");
  }
}
