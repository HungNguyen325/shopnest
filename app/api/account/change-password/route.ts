import { changePasswordSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser, hashPassword, verifyPassword, destroySession, createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = changePasswordSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Mật khẩu chưa hợp lệ.");
    }

    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record?.passwordHash) {
      throw new ApiError("VALIDATION_ERROR", "Tài khoản này đăng nhập bằng nhà cung cấp ngoài, không có mật khẩu.");
    }
    if (!(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
      throw new ApiError("VALIDATION_ERROR", "Mật khẩu hiện tại không đúng.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });

    // Rotate sessions: sign out everywhere else, keep the current device signed in.
    await destroySession();
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await createSession(user.id);

    await audit(user.id, "user", user.id, "update", { action: "change_password" });
    return apiOk({ ok: true });
  } catch (err) {
    return apiFail(err, "account/change-password");
  }
}
