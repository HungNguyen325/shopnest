import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { parseJsonArray } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().trim().max(64).optional(),
  avatar: z.string().trim().max(400).nullable().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, role: true, timezone: true, avatar: true, createdAt: true },
    });
    const brand = await prisma.userBrandProfile.findUnique({ where: { userId: user.id } });
    const sessions = await prisma.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, userAgent: true, ipAddress: true },
      take: 10,
    });
    return apiOk({
      user: profile,
      brand: brand
        ? {
            ...brand,
            preferredHashtags: parseJsonArray(brand.preferredHashtags).join(", "),
            bannedWords: parseJsonArray(brand.bannedWords).join(", "),
          }
        : null,
      sessions,
    });
  } catch (err) {
    return apiFail(err, "account/GET");
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, timezone: true, avatar: true },
    });
    await audit(user.id, "user", user.id, "update", { fields: Object.keys(parsed.data) });
    return apiOk(updated);
  } catch (err) {
    return apiFail(err, "account/PATCH");
  }
}
