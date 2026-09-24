import { ideaSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { runAI, aiSchemas } from "@/lib/ai";
import { buildGenerateRequest } from "@/lib/ai";
import { providerLabel } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = ideaSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Yêu cầu chưa hợp lệ.");
    }
    const input = parsed.data;

    const aiReq = await buildGenerateRequest(user.id, {
      requestType: "generate-ideas",
      productIds: input.productIds,
      platform: input.platform || "tiktok",
      contentType: input.contentType || "review",
      tone: "natural",
      goal: "awareness",
      length: "short",
      extraInstructions: input.focus,
      count: input.count,
    });

    const result = await runAI<{ ideas: unknown[] }>({
      userId: user.id,
      req: aiReq,
      rawSchema: aiSchemas.IDEAS_SCHEMA as never,
    });

    const raw = (result.raw as { ideas: Array<Record<string, unknown>> } | undefined)?.ideas ?? [];
    const ideas = raw.map((idea, index) => ({
      id: `idea-${index}-${Date.now()}`,
      angle: String(idea.angle ?? ""),
      title: String(idea.title ?? idea.hook ?? "Ý tưởng mới"),
      hook: String(idea.hook ?? ""),
      contentType: String(idea.content_type ?? input.contentType ?? "review"),
      platform: String(idea.platform ?? input.platform ?? "tiktok"),
      reason: String(idea.reason ?? ""),
    }));

    return apiOk({
      ideas,
      meta: {
        provider: result.provider,
        providerLabel: providerLabel(result.provider),
        model: result.model,
        isFallbackEngine: result.isFallbackEngine,
        warnings: result.warnings,
      },
    });
  } catch (err) {
    return apiFail(err, "ai/generate-ideas");
  }
}
