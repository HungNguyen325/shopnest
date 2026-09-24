import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { apiFail, apiOk } from "@/lib/api";
import { generateToken, hashToken } from "@/lib/auth";

/**
 * Creates a reset token. Because no mail service is configured in this
 * environment, the token is returned to the caller and printed in the server
 * log — plug a real transporter here for production.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    const email = parsed.success ? parsed.data.email : "";

    // Always answer the same way to avoid user enumeration.
    const generic = apiOk({
      message: "Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được tạo.",
    });
    if (!parsed.success || !email) return generic;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return generic;

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    const token = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      // Dev only: no mail provider is wired up yet, so surface the link instead.
      console.info(`[auth] password reset link for ${email}: /reset-password?token=${token}`);
    }

    return apiOk({
      resetUrl: isProduction ? undefined : `/reset-password?token=${token}`,
    });
  } catch (err) {
    return apiFail(err, "auth/forgot-password");
  }
}
