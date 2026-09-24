import { z } from "zod";
import { generateContentSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { runAI } from "@/lib/ai";
import { buildGenerateRequest, injectAffiliateLink, loadOwnedProducts } from "@/lib/ai";
import { createPostFromAI } from "@/lib/posts";
import { providerLabel } from "@/lib/ai";

const bodySchema = generateContentSchema.extend({
  save: z.boolean().optional(),
  status: z.enum(["draft", "planned", "ready"]).optional(),
  scheduledAt: z.string().max(40).nullable().optional(),
  productId: z.string().max(64).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Yêu cầu tạo nội dung chưa hợp lệ.");
    }
    const input = parsed.data;

    const aiReq = await buildGenerateRequest(user.id, {
      requestType: "generate-content",
      productIds: input.productIds,
      platform: input.platform,
      contentType: input.contentType,
      tone: input.tone,
      goal: input.goal,
      length: input.length,
      customChars: input.customChars,
      extraInstructions: input.extraInstructions,
      preferVideoScript: ["video_script", "live_script", "story"].includes(input.contentType),
      regenerate: input.regenerate,
    });

    const result = await runAI({ userId: user.id, req: aiReq });
    const content = result.content;

    // Replace the placeholder with the real affiliate link — never rewritten.
    const product = input.productId
      ? (await loadOwnedProducts(user.id, [input.productId]))[0]
      : (await loadOwnedProducts(user.id, input.productIds))[0];
    const affiliateUrl = product?.affiliateUrl ?? null;

    content.caption = injectAffiliateLink(content.caption, affiliateUrl);
    content.body = injectAffiliateLink(content.body, affiliateUrl);
    content.call_to_action = injectAffiliateLink(content.call_to_action, affiliateUrl);
    content.pinned_comment = injectAffiliateLink(content.pinned_comment, affiliateUrl);

    if (!content.caption && !content.body) {
      throw new ApiError("AI_INVALID_RESPONSE", "AI không tạo được nội dung. Vui lòng thử lại.");
    }

    let post = null;
    if (input.save !== false) {
      const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
      post = await createPostFromAI({
        userId: user.id,
        productId: input.productId ?? input.productIds[0] ?? null,
        platform: input.platform,
        contentType: input.contentType,
        tone: input.tone,
        goal: input.goal,
        content,
        status: input.status ?? (scheduledAt ? "planned" : "draft"),
        scheduledAt,
        generatedBy: `${result.provider}:${result.model}`,
      });
      await audit(user.id, "content_post", post.id, "ai_generate", {
        provider: result.provider,
        model: result.model,
      });
    }

    return apiOk({
      content,
      post,
      meta: {
        provider: result.provider,
        providerLabel: providerLabel(result.provider),
        model: result.model,
        chain: result.chain,
        isFallbackEngine: result.isFallbackEngine,
        cached: result.cached ?? false,
        warnings: result.warnings,
        latencyMs: result.usage.latencyMs,
        tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
      },
    });
  } catch (err) {
    return apiFail(err, "ai/generate-content");
  }
}
