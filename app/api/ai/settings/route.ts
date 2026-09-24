import { aiConfigSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/api";
import { getAISettings, resetAISettings, saveAISettings } from "@/lib/ai";

function publicSettings(settings: Awaited<ReturnType<typeof getAISettings>>) {
  return {
    provider: settings.provider,
    model: settings.model,
    fallbackProvider: settings.fallbackProvider,
    fallbackModel: settings.fallbackModel,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    timeoutMs: settings.timeoutMs,
    dailyLimit: settings.dailyLimit,
    perMinuteLimit: settings.perMinuteLimit,
    enabled: settings.enabled,
    keys: settings.keys,
  };
}

export async function GET() {
  try {
    await requireAdmin();
    return apiOk(publicSettings(await getAISettings()));
  } catch (err) {
    return apiFail(err, "ai/settings/GET");
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = aiConfigSchema.partial().safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Cấu hình chưa hợp lệ.");
    }

    await saveAISettings(parsed.data);
    await audit(admin.id, "ai_config", "default", "config_update", {
      fields: Object.keys(parsed.data).filter((k) => !k.toLowerCase().includes("apikey")),
    });

    return apiOk(publicSettings(await getAISettings()));
  } catch (err) {
    return apiFail(err, "ai/settings/PATCH");
  }
}

export async function DELETE() {
  try {
    const admin = await requireAdmin();
    await resetAISettings();
    await audit(admin.id, "ai_config", "default", "config_update", { reset: true });
    return apiOk(publicSettings(await getAISettings()));
  } catch (err) {
    return apiFail(err, "ai/settings/DELETE");
  }
}
