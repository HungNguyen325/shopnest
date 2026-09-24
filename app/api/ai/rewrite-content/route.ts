import { rewriteContentSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { runAI } from "@/lib/ai";
import { buildGenerateRequest, injectAffiliateLink, loadOwnedProducts } from "@/lib/ai";
import { providerLabel } from "@/lib/ai";
import { CONTENT_TYPES, TONES, GOALS, labelOf } from "@/lib/constants";

const INSTRUCTION_TEXT: Record<string, string> = {
  shorter: "Viết ngắn gọn hơn, giữ ý chính, bỏ phần thừa.",
  more_natural: "Viết lại tự nhiên hơn, như đang nói chuyện với bạn bè, bớt văn mẫu.",
  more_persuasive: "Viết thuyết phục hơn nhưng không phóng đại, dựa trên dữ liệu đã cho.",
  change_tone: "Đổi sang giọng văn được yêu cầu, giữ nguyên thông tin.",
  new_version: "Tạo một phiên bản hoàn toàn khác, góc tiếp cận mới, không lặp lại bản cũ.",
  custom: "Làm theo đúng chỉ dẫn riêng của người dùng.",
};

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = rewriteContentSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Yêu cầu viết lại chưa hợp lệ.");
    }
    const input = parsed.data;

    if (!input.content.caption && !input.content.body && !input.content.hook) {
      throw new ApiError("VALIDATION_ERROR", "Chưa có nội dung để viết lại.");
    }

    const products = await loadOwnedProducts(user.id, input.productIds);
    const instruction = [
      INSTRUCTION_TEXT[input.instruction] ?? INSTRUCTION_TEXT.new_version,
      input.tone ? `Giọng văn: ${labelOf(TONES, input.tone)}.` : "",
      input.customInstruction ? `Chỉ dẫn riêng: ${input.customInstruction}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const aiReq = await buildGenerateRequest(user.id, {
      requestType: "rewrite-content",
      productIds: input.productIds,
      platform: input.platform,
      contentType: input.contentType,
      tone: input.tone ?? "natural",
      goal: "conversion",
      length: "medium",
      previousContent: input.content,
      rewriteInstruction: instruction,
      regenerate: true,
    });

    const result = await runAI({ userId: user.id, req: aiReq });
    const affiliateUrl = products[0]?.affiliateUrl ?? null;

    const content = {
      ...result.content,
      caption: injectAffiliateLink(result.content.caption, affiliateUrl),
      call_to_action: injectAffiliateLink(result.content.call_to_action, affiliateUrl),
    };

    return apiOk({
      content,
      meta: {
        provider: result.provider,
        providerLabel: providerLabel(result.provider),
        model: result.model,
        chain: result.chain,
        isFallbackEngine: result.isFallbackEngine,
        warnings: result.warnings,
        latencyMs: result.usage.latencyMs,
      },
      appliedInstruction: instruction,
      contentTypeLabel: labelOf(CONTENT_TYPES, input.contentType),
      goalLabel: labelOf(GOALS, "conversion"),
    });
  } catch (err) {
    return apiFail(err, "ai/rewrite-content");
  }
}
