import { brandProfileSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/api";
import { parseJsonArray } from "@/lib/utils";

const toArrayJson = (value?: string) => {
  if (!value) return "[]";
  return JSON.stringify(
    value
      .split(/[,\n]/)
      .map((s) => s.trim().replace(/^#/, ""))
      .filter(Boolean),
  );
};

export async function GET() {
  try {
    const user = await requireUser();
    const brand = await prisma.userBrandProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    return apiOk({
      ...brand,
      preferredHashtags: parseJsonArray(brand.preferredHashtags).join(", "),
      bannedWords: parseJsonArray(brand.bannedWords).join(", "),
    });
  } catch (err) {
    return apiFail(err, "brand-profile/GET");
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const parsed = brandProfileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Hồ sơ thương hiệu chưa hợp lệ.");
    }
    const d = parsed.data;

    const brand = await prisma.userBrandProfile.upsert({
      where: { userId: user.id },
      update: {
        brandName: d.brandName || null,
        industry: d.industry || null,
        targetAudience: d.targetAudience || null,
        defaultTone: d.defaultTone || "natural",
        defaultPlatform: d.defaultPlatform || "tiktok",
        defaultLanguage: d.defaultLanguage || "vi",
        preferredHashtags: toArrayJson(d.preferredHashtags),
        bannedWords: toArrayJson(d.bannedWords),
        brandRules: d.brandRules || null,
        preferredCTA: d.preferredCTA || null,
        personalStory: d.personalStory || null,
        dataConsent: d.dataConsent ?? false,
      },
      create: {
        userId: user.id,
        brandName: d.brandName || null,
        industry: d.industry || null,
        targetAudience: d.targetAudience || null,
        defaultTone: d.defaultTone || "natural",
        defaultPlatform: d.defaultPlatform || "tiktok",
        defaultLanguage: d.defaultLanguage || "vi",
        preferredHashtags: toArrayJson(d.preferredHashtags),
        bannedWords: toArrayJson(d.bannedWords),
        brandRules: d.brandRules || null,
        preferredCTA: d.preferredCTA || null,
        personalStory: d.personalStory || null,
        dataConsent: d.dataConsent ?? false,
      },
    });

    await audit(user.id, "brand_profile", user.id, "update");
    return apiOk(brand);
  } catch (err) {
    return apiFail(err, "brand-profile/PUT");
  }
}
