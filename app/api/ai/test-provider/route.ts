import { z } from "zod";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getAISettings, getSecretKeys } from "@/lib/ai";
import { GroqProvider } from "@/lib/ai";
import { GeminiProvider } from "@/lib/ai";
import { OpenRouterProvider } from "@/lib/ai";
import { MockProvider } from "@/lib/ai";
import { providerLabel } from "@/lib/ai";

const schema = z.object({
  provider: z.enum(["groq", "gemini", "openrouter", "mock"]).optional(),
  model: z.string().trim().max(120).optional(),
});

export async function POST(req: Request) {
  try {
    await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Yêu cầu kiểm tra không hợp lệ.");

    const settings = await getAISettings();
    const keys = await getSecretKeys();
    const providerId = parsed.data.provider ?? settings.provider;
    const timeoutMs = Math.min(settings.timeoutMs, 20000);

    const build = () => {
      switch (providerId) {
        case "groq":
          return new GroqProvider(keys.groq, parsed.data.model ?? settings.model);
        case "gemini":
          return new GeminiProvider(keys.gemini, parsed.data.model ?? settings.model);
        case "openrouter":
          return new OpenRouterProvider(keys.openrouter, parsed.data.model ?? settings.model);
        case "mock":
        default:
          return new MockProvider();
      }
    };

    const provider = build();
    if (!provider.isConfigured) {
      return apiOk({
        ok: false,
        provider: providerId,
        providerLabel: providerLabel(providerId),
        message: "Chưa có khóa API cho nhà cung cấp này. Hãy thêm khóa trong AI Settings.",
      });
    }

    const result = await provider.testConnection({
      model: parsed.data.model || provider.defaultModel,
      timeoutMs,
    });

    return apiOk({
      ...result,
      provider: providerId,
      providerLabel: providerLabel(providerId),
      testedModel: parsed.data.model || provider.defaultModel,
      message: result.ok
        ? `Kết nối ${providerLabel(providerId)} thành công với model ${result.model}.`
        : result.message,
    });
  } catch (err) {
    return apiFail(err, "ai/test-provider");
  }
}
