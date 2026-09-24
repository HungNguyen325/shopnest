import { z } from "zod";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { runAI } from "@/lib/ai";
import { buildGenerateRequest } from "@/lib/ai";
import { providerLabel } from "@/lib/ai";

const schema = z.object({
  productIds: z.array(z.string().max(64)).max(5).default([]),
  platform: z.string().trim().max(40).default("tiktok"),
  contentType: z.string().trim().max(40).default("video_script"),
  tone: z.string().trim().max(40).default("natural"),
  goal: z.string().trim().max(40).default("conversion"),
  durationSeconds: z.coerce.number().int().min(10).max(300).default(30),
  extraInstructions: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Yêu cầu chưa hợp lệ.");
    }
    const input = parsed.data;

    const aiReq = await buildGenerateRequest(user.id, {
      requestType: "generate-video-script",
      productIds: input.productIds,
      platform: input.platform,
      contentType: input.contentType,
      tone: input.tone,
      goal: input.goal,
      length: "medium",
      preferVideoScript: true,
      extraInstructions: `${input.extraInstructions ?? ""}\nBắt buộc trả về trường video_script với tổng thời lượng khoảng ${input.durationSeconds} giây, chia thành các cảnh 3–6 giây.`.trim(),
      regenerate: true,
    });

    const result = await runAI({ userId: user.id, req: aiReq });

    if (!result.content.video_script?.scenes?.length) {
      throw new ApiError("AI_INVALID_RESPONSE", "AI chưa tạo được kịch bản video. Vui lòng thử lại.");
    }

    return apiOk({
      videoScript: result.content.video_script,
      title: result.content.title,
      hook: result.content.hook,
      meta: {
        provider: result.provider,
        providerLabel: providerLabel(result.provider),
        model: result.model,
        isFallbackEngine: result.isFallbackEngine,
        warnings: result.warnings,
      },
    });
  } catch (err) {
    return apiFail(err, "ai/generate-video-script");
  }
}
