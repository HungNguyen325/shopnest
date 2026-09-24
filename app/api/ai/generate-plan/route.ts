import { addDays } from "date-fns";
import { planSchema } from "@/lib/validations";
import { ApiError, apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { runAI, aiSchemas } from "@/lib/ai";
import { buildGenerateRequest, loadOwnedProducts } from "@/lib/ai";
import { providerLabel } from "@/lib/ai";
import { createPostFromAI } from "@/lib/posts";
import { combineDateTime, dateKey } from "@/lib/utils";
import { GOALS, labelOf } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = planSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Yêu cầu lập kế hoạch chưa hợp lệ.");
    }
    const input = parsed.data;

    const products = await loadOwnedProducts(user.id, input.productIds);
    const startDate = new Date(`${input.startDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) {
      throw new ApiError("VALIDATION_ERROR", "Ngày bắt đầu không hợp lệ.");
    }

    const times =
      input.times.length > 0
        ? input.times
        : Array.from({ length: input.postsPerDay }, (_, i) => (i === 0 ? "11:30" : i === 1 ? "19:00" : `${10 + i * 2}:00`));

    const aiReq = await buildGenerateRequest(user.id, {
      requestType: "generate-plan",
      productIds: input.productIds,
      platform: input.platforms[0],
      contentType: "review",
      tone: input.tone,
      goal: input.goal,
      length: "medium",
      extraInstructions: [
        input.topics ? `Chủ đề ưu tiên: ${input.topics}` : "",
        input.excludeTopics ? `Chủ đề KHÔNG dùng: ${input.excludeTopics}` : "",
        `Nền tảng có thể dùng: ${input.platforms.join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n"),
      planMeta: {
        days: input.days,
        postsPerDay: input.postsPerDay,
        times,
        restDays: input.restDays,
      },
    });

    const result = await runAI<{ plan: unknown[] }>({
      userId: user.id,
      req: aiReq,
      rawSchema: aiSchemas.PLAN_SCHEMA as never,
    });

    const rawPlan =
      (result.raw as { plan: Array<Record<string, unknown>> } | undefined)?.plan ?? [];

    const productById = new Map(products.map((p) => [p.id, p]));
    const name = input.name?.trim() || `Kế hoạch ${input.days} ngày – ${input.postsPerDay} bài/ngày`;

    const plan = await prisma.contentPlan.create({
      data: {
        userId: user.id,
        name,
        startDate,
        endDate: addDays(startDate, input.days - 1),
        postsPerDay: input.postsPerDay,
        platforms: JSON.stringify(input.platforms),
        status: "active",
        createdBy: result.provider === "mock" ? "manual" : "ai",
        notes: input.topics ? `Ưu tiên: ${input.topics}` : null,
      },
    });

    let createdPosts = 0;
    const slots = rawPlan.slice(0, input.days * input.postsPerDay).map((item, index) => {
      const dayIndex = Math.max(1, Number(item.day_index) || Math.floor(index / input.postsPerDay) + 1);
      const slotDate = addDays(startDate, dayIndex - 1);
      const time = String(item.time ?? times[index % times.length] ?? "19:00");
      const productId = String(item.product_id ?? "");
      const validProduct = productById.get(productId) ? productId : (products[index % Math.max(1, products.length)]?.id ?? "");

      return {
        planId: plan.id,
        productId: validProduct || null,
        slotDate,
        slotTime: time,
        platform: String(item.platform ?? input.platforms[dayIndex % input.platforms.length]),
        topic: String(item.topic ?? ""),
        contentAngle: String(item.content_angle ?? ""),
        contentType: String(item.content_type ?? "review"),
        hook: String(item.hook ?? ""),
        caption: String(item.caption ?? ""),
        callToAction: String(item.call_to_action ?? ""),
        hashtags: JSON.stringify(Array.isArray(item.hashtags) ? item.hashtags : []),
        notes: String(item.notes ?? ""),
      };
    });

    await prisma.planSlot.createMany({ data: slots });

    if (input.autoCreatePosts) {
      const savedSlots = await prisma.planSlot.findMany({ where: { planId: plan.id } });
      for (const slot of savedSlots) {
        const product = slot.productId ? productById.get(slot.productId) : undefined;
        const affiliateUrl = product?.affiliateUrl ?? null;
        const rawCaption = slot.caption ?? "";
        const caption = rawCaption.replace(/\{\{AFFILIATE_LINK\}\}/g, affiliateUrl ?? "");

        await createPostFromAI({
          userId: user.id,
          productId: slot.productId,
          platform: slot.platform ?? input.platforms[0],
          contentType: slot.contentType ?? "review",
          tone: input.tone,
          goal: input.goal,
          status: "planned",
          scheduledAt: combineDateTime(dateKey(slot.slotDate), slot.slotTime),
          generatedBy: `${result.provider}:${result.model}`,
          content: {
            title: slot.topic ?? "",
            hook: slot.hook ?? "",
            caption,
            body: "",
            call_to_action: slot.callToAction ?? "",
            hashtags: JSON.parse(slot.hashtags || "[]") as string[],
            content_angle: slot.contentAngle ?? "",
            suggested_posting_time: slot.slotTime,
            compliance_notes: [],
            missing_information: [],
            alternative_versions: [],
          },
        });
        await prisma.planSlot.update({
          where: { id: slot.id },
          data: { status: "converted" },
        });
        createdPosts += 1;
      }
    }

    await audit(user.id, "content_plan", plan.id, "ai_plan", {
      days: input.days,
      postsPerDay: input.postsPerDay,
      slots: slots.length,
      provider: result.provider,
    });

    return apiOk({
      plan: { ...plan, _count: { slots: slots.length } },
      slots: slots.length,
      createdPosts,
      meta: {
        provider: result.provider,
        providerLabel: providerLabel(result.provider),
        model: result.model,
        isFallbackEngine: result.isFallbackEngine,
        warnings: result.warnings,
      },
      goalLabel: labelOf(GOALS, input.goal),
    });
  } catch (err) {
    return apiFail(err, "ai/generate-plan");
  }
}
