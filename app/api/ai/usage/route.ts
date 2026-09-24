import { apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getAISettings } from "@/lib/ai";
import { getUsageSummary } from "@/lib/ai";
import { getQuotaState } from "@/lib/ai";
import { providerLabel } from "@/lib/ai";

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await getAISettings();
    const [summary, quota] = await Promise.all([
      getUsageSummary(user.id, settings.dailyLimit),
      getQuotaState(user.id, settings.dailyLimit, settings.perMinuteLimit),
    ]);

    const configuredProviders = (["groq", "gemini", "openrouter"] as const).filter(
      (p) => settings.keys[p].configured,
    );

    return apiOk({
      ...summary,
      quota,
      status:
        configuredProviders.length === 0 && settings.enabled.mock
          ? "offline-engine"
          : configuredProviders.length === 0
            ? "not-configured"
            : "ready",
      currentProvider: settings.provider,
      currentProviderLabel: providerLabel(settings.provider),
      currentModel: settings.model,
      fallbackProvider: settings.fallbackProvider,
      fallbackProviderLabel: providerLabel(settings.fallbackProvider),
      fallbackModel: settings.fallbackModel,
      configuredProviders: configuredProviders.map((p) => ({
        id: p,
        label: providerLabel(p),
        source: settings.keys[p].source,
      })),
      keys: {
        groq: { configured: settings.keys.groq.configured, masked: settings.keys.groq.masked },
        gemini: { configured: settings.keys.gemini.configured, masked: settings.keys.gemini.masked },
        openrouter: {
          configured: settings.keys.openrouter.configured,
          masked: settings.keys.openrouter.masked,
        },
      },
    });
  } catch (err) {
    return apiFail(err, "ai/usage");
  }
}
