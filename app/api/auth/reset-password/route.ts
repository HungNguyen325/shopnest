import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { hashPassword, hashToken } from "@/lib/auth";
import { audit } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new ApiError("VALIDATION_ERROR", "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    await audit(record.userId, "user", record.userId, "reset_password");
    return apiOk({ message: "Đặt lại mật khẩu thành công. Hãy đăng nhập lại." });
  } catch (err) {
    return apiFail(err, "auth/reset-password");
  }
}
