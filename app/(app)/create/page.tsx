"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  ThumbsDown,
  Info,
  ThumbsUp,
  Link2,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { api, errorMessage, useToast } from "@/components/providers";
import { Badge, Card, CardBody, CardHeader, EmptyState, SkeletonRows } from "@/components/ui";
import { Button } from "@/components/ui";
import { Input, Segmented, Select, Textarea } from "@/components/ui";
import { Dialog } from "@/components/ui";
import { CopyButton } from "@/components/ui";
import {
  CONTENT_TYPES,
  GOALS,
  LENGTHS,
  PLATFORMS,
  TONES,
  platformLabel,
  type ContentTypeId,
  type GoalId,
  type LengthId,
  type PlatformId,
  type ToneId,
} from "@/lib/constants";
import { cn, formatVND } from "@/lib/utils";

interface ProductOption {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  affiliateUrl: string | null;
  actualExperience: string | null;
  images: { id: string; url: string; isCover: boolean }[];
  _count: { posts: number };
}

interface VideoScene {
  duration_seconds: number;
  visual: string;
  voiceover: string;
  on_screen_text: string;
}

interface GeneratedContent {
  title?: string;
  hook?: string;
  caption?: string;
  body?: string;
  call_to_action?: string;
  hashtags?: string[];
  pinned_comment?: string;
  content_angle?: string;
  target_audience?: string;
  suggested_platform?: string;
  suggested_posting_time?: string;
  compliance_notes?: string[];
  missing_information?: string[];
  alternative_versions?: { style: string; caption: string }[];
  video_script?: { duration_seconds: number; scenes: VideoScene[] };
}

interface GenerateResponse {
  content: GeneratedContent;
  post: { id: string; status: string } | null;
  meta: {
    provider: string;
    providerLabel: string;
    model: string;
    isFallbackEngine: boolean;
    cached: boolean;
    warnings: { code: string; message: string }[];
    latencyMs: number;
  };
}

interface RewriteResponse {
  content: GeneratedContent;
  meta: GenerateResponse["meta"];
}

const STEPS = ["Sản phẩm", "Nền tảng", "Loại nội dung", "Giọng văn", "Mục tiêu", "Độ dài"];

function CreateInner() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { success, error: toastError, warning, info } = useToast();

  const [step, setStep] = useState(0);
  const [productIds, setProductIds] = useState<string[]>(params.get("product") ? [params.get("product")!] : []);
  const [noProduct, setNoProduct] = useState(false);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<PlatformId>("tiktok");
  const [contentType, setContentType] = useState<ContentTypeId>("review");
  const [tone, setTone] = useState<ToneId>("honest_review");
  const [goal, setGoal] = useState<GoalId>("conversion");
  const [length, setLength] = useState<LengthId>("medium");
  const [customChars, setCustomChars] = useState(800);
  const [extra, setExtra] = useState("");

  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [edited, setEdited] = useState<GeneratedContent | null>(null);
  const [rewriteBusy, setRewriteBusy] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const { data: productData, isLoading: loadingProducts } = useQuery({
    queryKey: ["products", "picker", search],
    queryFn: () =>
      api.get<{ items: ProductOption[] }>(`/api/products?pageSize=30&sort=newest${search ? `&q=${encodeURIComponent(search)}` : ""}`),
  });

  const products = productData?.items ?? [];
  const selectedProducts = products.filter((p) => productIds.includes(p.id));
  const missingAffiliate = selectedProducts.some((p) => !p.affiliateUrl);
  const missingExperience = selectedProducts.some((p) => !p.actualExperience);

  const canGenerate = (noProduct || productIds.length > 0) && !generating;

  const content = edited ?? result?.content ?? null;

  async function runGenerate(regenerate = false) {
    if (!canGenerate) return;
    setGenerating(true);
    setResult(null);
    setEdited(null);
    setStage("Đang đọc thông tin sản phẩm…");
    const stageTimers = [
      window.setTimeout(() => setStage("Đang phân tích góc nội dung…"), 700),
      window.setTimeout(() => setStage("AI đang viết nội dung…"), 1600),
      window.setTimeout(() => setStage("Đang kiểm tra tuân thủ & hashtag…"), 3200),
    ];
    try {
      const res = await api.post<GenerateResponse>("/api/ai/generate-content", {
        productIds: noProduct ? [] : productIds,
        platform,
        contentType,
        tone,
        goal,
        length,
        customChars: length === "custom" ? customChars : undefined,
        extraInstructions: extra,
        regenerate,
        save: true,
      });
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });

      if (res.meta.isFallbackEngine) {
        warning(
          "Đang dùng engine nội bộ",
          "Chưa cấu hình API AI (Groq/Gemini). Thêm khóa trong AI Settings để dùng mô hình thật.",
        );
      } else if (res.meta.warnings.some((w) => w.code === "FALLBACK_USED")) {
        info("Đã chuyển sang provider dự phòng", res.meta.providerLabel);
      } else {
        success(
          "Đã tạo nội dung",
          `${res.meta.providerLabel} · ${res.meta.model} · ${(res.meta.latencyMs / 1000).toFixed(1)}s`,
        );
      }
      if (selectedProducts.some((p) => !p.affiliateUrl)) {
        warning("Sản phẩm chưa có link affiliate", "CTA đang để hướng dẫn chung.");
      }
    } catch (err) {
      toastError("Tạo nội dung thất bại", errorMessage(err));
    } finally {
      stageTimers.forEach((t) => window.clearTimeout(t));
      setStage("");
      setGenerating(false);
    }
  }

  async function runRewrite(instruction: "shorter" | "more_natural" | "more_persuasive" | "change_tone" | "new_version") {
    if (!content) return;
    setRewriteBusy(instruction);
    try {
      const res = await api.post<RewriteResponse>("/api/ai/rewrite-content", {
        instruction,
        tone,
        platform,
        contentType,
        productIds: noProduct ? [] : productIds,
        content: {
          title: content.title,
          hook: content.hook,
          caption: content.caption,
          body: content.body,
          call_to_action: content.call_to_action,
          hashtags: content.hashtags,
        },
      });
      const next: GeneratedContent = { ...content, ...res.content };
      setEdited(next);
      if (result?.post?.id) {
        await api.patch(`/api/posts/${result.post.id}`, {
          title: next.title ?? null,
          hook: next.hook ?? null,
          caption: next.caption ?? null,
          body: next.body ?? null,
          callToAction: next.call_to_action ?? null,
          hashtags: next.hashtags ?? null,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
      success("Đã viết lại nội dung", "Bạn có thể tiếp tục chỉnh sửa.");
    } catch (err) {
      toastError("Viết lại thất bại", errorMessage(err));
    } finally {
      setRewriteBusy(null);
    }
  }

  async function sendFeedback(type: "like" | "dislike" | "effective" | "not_suitable" | "use_tone") {
    if (!result?.post?.id) {
      toastError("Chưa lưu bài", "Hãy lưu bản nháp trước khi gửi phản hồi.");
      return;
    }
    try {
      await api.post(`/api/posts/${result.post.id}/feedback`, { feedbackType: type });
      success(
        type === "like"
          ? "Đã ghi nhận nội dung tốt"
          : type === "dislike"
            ? "Đã ghi nhận nội dung chưa đạt"
            : type === "use_tone"
              ? "Đã đặt làm giọng văn mặc định"
              : "Đã ghi nhận phản hồi",
      );
    } catch (err) {
      toastError("Gửi phản hồi thất bại", errorMessage(err));
    }
  }

  async function setStatus(status: "ready" | "planned") {
    if (!result?.post?.id) return;
    try {
      await api.post(`/api/posts/${result.post.id}/status`, {
        status,
        ...(status === "planned" ? { scheduledAt: new Date().toISOString() } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      success(status === "ready" ? "Đã đánh dấu sẵn sàng đăng" : "Đã lên lịch");
    } catch (err) {
      toastError("Cập nhật thất bại", errorMessage(err));
    }
  }

  const fullText = useMemo(() => {
    if (!content) return "";
    return [
      content.hook,
      content.caption,
      content.call_to_action,
      content.hashtags?.length ? content.hashtags.map((h) => `#${h}`).join(" ") : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [content]);

  const patch = (changes: Partial<GeneratedContent>) =>
    setEdited((prev) => ({ ...(prev ?? result?.content ?? {}), ...changes }));

  return (
    <div className="space-y-5">
      <header className="lg:hidden">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Tạo bài đăng bằng AI</h1>
        <p className="mt-0.5 text-sm text-slate-500">6 bước chọn ngữ cảnh, AI viết phần còn lại</p>
      </header>

      <div className="hidden items-start justify-between gap-4 lg:flex">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tạo bài đăng bằng AI</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI chỉ dùng dữ liệu bạn nhập trong kho sản phẩm và hồ sơ thương hiệu.
          </p>
        </div>
        {result?.post?.id ? (
          <Link href={`/posts?open=${encodeURIComponent(result.post.id)}`}>
            <Button variant="outline" icon={<ChevronRight className="h-4 w-4" />}>
              Mở bài vừa tạo
            </Button>
          </Link>
        ) : null}
      </div>

      {/* Step indicator */}
      <ol className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1" aria-label="Các bước">
        {STEPS.map((label, index) => (
          <li key={label} className="shrink-0">
            <button
              type="button"
              onClick={() => setStep(index)}
              aria-current={step === index ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                step === index
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 ring-inset hover:bg-slate-50",
              )}
            >
              <span className={cn("tabular-nums", step === index ? "text-brand-100" : "text-slate-400")}>{index + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Left: steps */}
        <Card>
          <CardHeader
            title={`Bước ${step + 1}: ${STEPS[step]}`}
            description={
              step === 0
                ? "Chọn tối đa 5 sản phẩm, hoặc tạo nội dung thương hiệu cá nhân không gắn sản phẩm."
                : step === 1
                  ? "Nội dung sẽ được viết đúng đặc trưng của nền tảng."
                  : step === 2
                    ? "Chọn định dạng nội dung bạn muốn."
                    : step === 3
                      ? "Giọng văn quyết định cách diễn đạt, không làm thay đổi thông tin."
                      : step === 4
                        ? "Mục tiêu ảnh hưởng tới CTA và cách dẫn dắt."
                        : "Độ dài caption mong muốn."
            }
          />
          <CardBody className="space-y-4">
            {step === 0 ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm sản phẩm…"
                    aria-label="Tìm sản phẩm"
                    className="pl-9"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 transition hover:border-brand-200">
                  <input
                    type="checkbox"
                    checked={noProduct}
                    onChange={(e) => {
                      setNoProduct(e.target.checked);
                      if (e.target.checked) setProductIds([]);
                    }}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="text-[13px]">
                    <span className="block font-medium text-slate-800">Không gắn sản phẩm</span>
                    <span className="block text-xs text-slate-500">Dành cho nội dung thương hiệu cá nhân</span>
                  </span>
                </label>

                {loadingProducts ? (
                  <SkeletonRows rows={3} />
                ) : products.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Package className="h-5 w-5" />}
                    title="Chưa có sản phẩm"
                    description="Thêm sản phẩm vào kho để AI có dữ liệu viết bài."
                    action={
                      <Link href="/products?new=1">
                        <Button size="sm" variant="outline">
                          Thêm sản phẩm
                        </Button>
                      </Link>
                    }
                  />
                ) : (
                  <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {products.map((product) => {
                      const checked = productIds.includes(product.id);
                      const cover = product.images.find((i) => i.isCover) ?? product.images[0];
                      return (
                        <li key={product.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition",
                              checked ? "border-brand-300 bg-brand-50/60" : "border-slate-200 hover:border-brand-200",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 shrink-0 accent-brand-600"
                              checked={checked}
                              disabled={!checked && (productIds.length >= 5 || noProduct)}
                              onChange={(e) => {
                                setProductIds((prev) =>
                                  e.target.checked ? [...prev, product.id].slice(0, 5) : prev.filter((id) => id !== product.id),
                                );
                                setNoProduct(false);
                              }}
                            />
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover.url} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
                            ) : (
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300">
                                <Package className="h-5 w-5" />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-medium text-slate-900">{product.name}</span>
                              <span className="block truncate text-xs text-slate-500">
                                {formatVND(product.price)} · {product._count.posts} bài
                                {product.affiliateUrl ? "" : " · chưa có affiliate"}
                              </span>
                              {product.affiliateUrl ? (
                                <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-brand-600">
                                  <Link2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{product.affiliateUrl}</span>
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {selectedProducts.length > 0 ? (
                  <div className="space-y-1.5">
                    {missingAffiliate ? (
                      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Có sản phẩm chưa có link affiliate. AI sẽ viết CTA hướng dẫn chung và ghi chú trong
                        missing_information.
                      </p>
                    ) : null}
                    {missingExperience ? (
                      <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Có sản phẩm chưa có trải nghiệm thực tế — nội dung sẽ viết ở góc độ thông tin.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PLATFORMS.map((option) => (
                  <OptionCard
                    key={option.id}
                    active={platform === option.id}
                    title={option.label}
                    description={option.description}
                    onClick={() => setPlatform(option.id)}
                  />
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((option) => (
                  <Chip key={option.id} active={contentType === option.id} onClick={() => setContentType(option.id)}>
                    {option.label}
                  </Chip>
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-wrap gap-2">
                {TONES.map((option) => (
                  <Chip key={option.id} active={tone === option.id} onClick={() => setTone(option.id)}>
                    {option.label}
                  </Chip>
                ))}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {GOALS.map((option) => (
                  <OptionCard
                    key={option.id}
                    active={goal === option.id}
                    title={option.label}
                    onClick={() => setGoal(option.id)}
                  />
                ))}
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-4">
                <Segmented
                  value={length}
                  onChange={(value) => setLength(value)}
                  options={LENGTHS.map((l) => ({ id: l.id, label: l.label }))}
                />
                {length === "custom" ? (
                  <label className="flex items-center gap-3">
                    <span className="text-[13px] text-slate-600">Số ký tự</span>
                    <Input
                      type="number"
                      min={100}
                      max={5000}
                      value={customChars}
                      onChange={(e) => setCustomChars(Number(e.target.value))}
                      className="w-32"
                    />
                  </label>
                ) : (
                  <p className="text-[13px] text-slate-500">
                    {LENGTHS.find((l) => l.id === length)?.description}
                  </p>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="extra" className="label-text">
                    Yêu cầu thêm (không bắt buộc)
                  </label>
                  <Textarea
                    id="extra"
                    rows={3}
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    placeholder="Ví dụ: nhấn mạnh việc dùng cho da dầu, tránh nhắc tới giá, mở đầu bằng câu hỏi…"
                  />
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                ← Trước
              </Button>
              {step < STEPS.length - 1 ? (
                <Button variant="outline" onClick={() => setStep((s) => s + 1)}>
                  Tiếp theo
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>

        {/* Right: summary + generate */}
        <div className="space-y-5">
          <Card className="xl:sticky xl:top-6">
            <CardHeader title="Tóm tắt" icon={<Sparkles className="h-4 w-4" />} />
            <CardBody className="space-y-3">
              <dl className="space-y-1.5 text-[13px]">
                <SummaryRow label="Sản phẩm">
                  {noProduct
                    ? "Không gắn sản phẩm"
                    : selectedProducts.length > 0
                      ? selectedProducts.map((p) => p.name).join(", ")
                      : "Chưa chọn"}
                </SummaryRow>
                <SummaryRow label="Nền tảng">{platformLabel(platform)}</SummaryRow>
                <SummaryRow label="Loại nội dung">{CONTENT_TYPES.find((c) => c.id === contentType)?.label}</SummaryRow>
                <SummaryRow label="Giọng văn">{TONES.find((t) => t.id === tone)?.label}</SummaryRow>
                <SummaryRow label="Mục tiêu">{GOALS.find((g) => g.id === goal)?.label}</SummaryRow>
                <SummaryRow label="Độ dài">
                  {length === "custom" ? `${customChars} ký tự` : LENGTHS.find((l) => l.id === length)?.label}
                </SummaryRow>
              </dl>

              <Button
                className="w-full"
                size="lg"
                disabled={!canGenerate}
                onClick={() => runGenerate(false)}
                icon={<Wand2 className="h-4 w-4" />}
              >
                {generating ? "Đang tạo…" : "Tạo bài đăng"}
              </Button>

              {generating ? (
                <div className="space-y-2 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-brand-800">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {stage || "AI đang xử lý…"}
                  </p>
                  <ul className="space-y-1 text-xs text-brand-700">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Đọc dữ liệu sản phẩm &amp; hồ sơ thương hiệu
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Chọn góc nội dung chưa lặp
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Viết caption, CTA, hashtag
                    </li>
                  </ul>
                  <p className="text-[11px] text-brand-600">Nội dung bạn đang nhập sẽ không bị mất.</p>
                </div>
              ) : null}

              <p className="text-[11px] leading-relaxed text-slate-500">
                Mỗi lần tạo tính 1 lượt AI. Giới hạn mặc định 20 lượt/ngày — xem trong AI Settings.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Result */}
      {result && content ? (
        <ResultPanel
          content={content}
          meta={result.meta}
          postId={result.post?.id ?? null}
          onChange={patch}
          onCopyAll={fullText}
          onRewrite={runRewrite}
          rewriteBusy={rewriteBusy}
          onRegenerate={() => runGenerate(true)}
          onFeedback={sendFeedback}
          onReady={() => setStatus("ready")}
          onSchedule={() => setScheduleOpen(true)}
          onSaveTemplate={() => setTemplateOpen(true)}
          onOpenPost={() => router.push(`/posts?open=${result.post?.id}`)}
          generating={generating}
        />
      ) : null}

      <ScheduleDialog
        open={scheduleOpen}
        postId={result?.post?.id ?? null}
        suggestedTime={content?.suggested_posting_time || "19:00"}
        onClose={() => setScheduleOpen(false)}
        onDone={() => {
          setScheduleOpen(false);
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["posts"] });
        }}
      />

      <SaveTemplateDialog
        open={templateOpen}
        content={content}
        onClose={() => setTemplateOpen(false)}
      />
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words text-slate-800">{children}</dd>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1.5 text-[13px] font-medium transition duration-150",
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "bg-white text-slate-600 ring-1 ring-slate-200 ring-inset hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

function OptionCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3 text-left transition duration-150",
        active ? "border-brand-300 bg-brand-50/60 ring-1 ring-brand-200 ring-inset" : "border-slate-200 hover:border-brand-200",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          active ? "border-brand-600 bg-brand-600" : "border-slate-300",
        )}
      >
        {active ? <CheckCircle2 className="h-3 w-3 text-white" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-slate-900">{title}</span>
        {description ? <span className="mt-0.5 block text-xs text-slate-500">{description}</span> : null}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Result panel                                                        */
/* ------------------------------------------------------------------ */

function ResultPanel({
  content,
  meta,
  postId,
  onChange,
  onCopyAll,
  onRewrite,
  rewriteBusy,
  onRegenerate,
  onFeedback,
  onReady,
  onSchedule,
  onSaveTemplate,
  onOpenPost,
  generating,
}: {
  content: GeneratedContent;
  meta: GenerateResponse["meta"];
  postId: string | null;
  onChange: (changes: Partial<GeneratedContent>) => void;
  onCopyAll: string;
  onRewrite: (instruction: "shorter" | "more_natural" | "more_persuasive" | "change_tone" | "new_version") => void;
  rewriteBusy: string | null;
  onRegenerate: () => void;
  onFeedback: (type: "like" | "dislike" | "effective" | "not_suitable" | "use_tone") => void;
  onReady: () => void;
  onSchedule: () => void;
  onSaveTemplate: () => void;
  onOpenPost: () => void;
  generating: boolean;
}) {
  const hashtagText = (content.hashtags ?? []).map((h) => `#${h}`).join(" ");

  return (
    <div className="space-y-5">
      {/* Meta bar */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <Badge tone={meta.isFallbackEngine ? "warning" : "brand"}>
              <Sparkles className="h-3 w-3" />
              {meta.providerLabel}
            </Badge>
            <span className="truncate text-slate-500">{meta.model}</span>
            {meta.isFallbackEngine ? (
              <span className="text-xs text-amber-700">engine nội bộ (chưa có API key)</span>
            ) : (
              <span className="text-xs text-slate-400">{(meta.latencyMs / 1000).toFixed(1)}s</span>
            )}
            {meta.cached ? <Badge tone="neutral">Từ bộ nhớ đệm</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => onFeedback("like")} icon={<ThumbsUp className="h-3.5 w-3.5" />}>
              Hợp
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onFeedback("dislike")} icon={<ThumbsDown className="h-3.5 w-3.5" />}>
              Chưa hợp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRegenerate}
              disabled={generating}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Tạo lại
            </Button>
          </div>
        </CardBody>
      </Card>

      {meta.warnings.filter((w) => w.code !== "RETRY").length > 0 ? (
        <div className="space-y-1.5">
          {meta.warnings
            .filter((w) => w.code !== "RETRY")
            .map((warningItem, index) => (
              <p
                key={`${warningItem.code}-${index}`}
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {warningItem.message}
              </p>
            ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Nội dung chính"
              description="Chỉnh sửa trực tiếp, hệ thống tự lưu vào bài nháp"
              action={<CopyButton value={onCopyAll} label="Sao chép tất cả" />}
            />
            <CardBody className="space-y-4">
              <EditableField label="Tiêu đề" value={content.title ?? ""} onChange={(v) => onChange({ title: v })} />
              <EditableField label="Hook" value={content.hook ?? ""} onChange={(v) => onChange({ hook: v })} rows={2} />
              <EditableField
                label="Caption"
                value={content.caption ?? ""}
                onChange={(v) => onChange({ caption: v })}
                rows={10}
                counter
              />
              <EditableField label="CTA" value={content.call_to_action ?? ""} onChange={(v) => onChange({ call_to_action: v })} rows={2} />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="label-text">Hashtag</span>
                  <CopyButton value={hashtagText} label="Copy hashtag" variant="ghost" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(content.hashtags ?? []).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      #{tag}
                    </span>
                  ))}
                  {(content.hashtags ?? []).length === 0 ? (
                    <span className="text-xs text-slate-500">AI không đề xuất hashtag cho nội dung này.</span>
                  ) : null}
                </div>
              </div>

              <EditableField
                label="Comment ghim"
                value={content.pinned_comment ?? ""}
                onChange={(v) => onChange({ pinned_comment: v })}
                rows={2}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Viết lại nhanh" description="Không tốn lượt tạo mới cho cùng một bài trong 1 phút" />
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "shorter" as const, label: "Ngắn hơn", icon: <X className="h-3.5 w-3.5" /> },
                  { id: "more_natural" as const, label: "Tự nhiên hơn", icon: <RotateCcw className="h-3.5 w-3.5" /> },
                  { id: "more_persuasive" as const, label: "Thuyết phục hơn", icon: <Sparkles className="h-3.5 w-3.5" /> },
                  { id: "change_tone" as const, label: "Đổi giọng văn", icon: <Wand2 className="h-3.5 w-3.5" /> },
                  { id: "new_version" as const, label: "Phiên bản khác", icon: <RefreshCw className="h-3.5 w-3.5" /> },
                ].map((item) => (
                  <Button
                    key={item.id}
                    size="sm"
                    variant="outline"
                    loading={rewriteBusy === item.id}
                    onClick={() => onRewrite(item.id)}
                    icon={rewriteBusy === item.id ? undefined : item.icon}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Hành động" />
            <CardBody className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={onSaveTemplate} icon={<Save className="h-4 w-4" />}>
                  Lưu thành mẫu
                </Button>
                <Button variant="outline" onClick={onReady} icon={<CheckCircle2 className="h-4 w-4" />}>
                  Sẵn sàng đăng
                </Button>
                <Button onClick={onSchedule} icon={<Wand2 className="h-4 w-4" />}>
                  Lên lịch đăng
                </Button>
                <Button variant="secondary" onClick={onOpenPost} disabled={!postId}>
                  Mở trang bài đăng
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <Button size="sm" variant="ghost" onClick={() => onFeedback("use_tone")}>
                  Dùng giọng văn này
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onFeedback("effective")}>
                  Đánh dấu hiệu quả
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onFeedback("not_suitable")}>
                  Nội dung chưa phù hợp
                </Button>
              </div>
            </CardBody>
          </Card>

          {content.content_angle || content.target_audience || content.suggested_posting_time ? (
            <Card>
              <CardHeader title="Phân tích của AI" />
              <CardBody>
                <dl className="space-y-2 text-[13px]">
                  {content.content_angle ? <SummaryRow label="Góc nội dung">{content.content_angle}</SummaryRow> : null}
                  {content.target_audience ? <SummaryRow label="Đối tượng">{content.target_audience}</SummaryRow> : null}
                  {content.suggested_platform ? (
                    <SummaryRow label="Nền tảng gợi ý">{content.suggested_platform}</SummaryRow>
                  ) : null}
                  {content.suggested_posting_time ? (
                    <SummaryRow label="Giờ đăng gợi ý">{content.suggested_posting_time}</SummaryRow>
                  ) : null}
                </dl>
              </CardBody>
            </Card>
          ) : null}

          {content.video_script?.scenes?.length ? (
            <Card>
              <CardHeader
                title={`Kịch bản video (${content.video_script.duration_seconds}s)`}
                icon={<Clapperboard className="h-4 w-4" />}
                action={
                  <CopyButton
                    value={content.video_script.scenes
                      .map(
                        (scene, index) =>
                          `${index + 1}. [${scene.duration_seconds}s] ${scene.visual}\n   Lời đọc: ${scene.voiceover}\n   Chữ: ${scene.on_screen_text}`,
                      )
                      .join("\n\n")}
                    label="Copy kịch bản"
                  />
                }
              />
              <CardBody className="space-y-2.5">
                {content.video_script.scenes.map((scene, index) => (
                  <div key={index} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">Cảnh {index + 1}</span>
                      <Badge tone="neutral">{scene.duration_seconds}s</Badge>
                    </div>
                    <p className="mt-1.5 text-[13px] text-slate-700">
                      <span className="font-medium">Hình ảnh: </span>
                      {scene.visual}
                    </p>
                    <p className="mt-1 text-[13px] text-slate-700">
                      <span className="font-medium">Lời đọc: </span>
                      {scene.voiceover}
                    </p>
                    {scene.on_screen_text ? (
                      <p className="mt-1 text-[13px] text-slate-700">
                        <span className="font-medium">Chữ trên màn hình: </span>
                        {scene.on_screen_text}
                      </p>
                    ) : null}
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {content.alternative_versions?.length ? (
            <Card>
              <CardHeader title="Biến thể A/B" />
              <CardBody className="space-y-3">
                {content.alternative_versions.map((version, index) => (
                  <div key={index} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">{version.style}</span>
                      <div className="flex gap-1.5">
                        <CopyButton value={version.caption} label="Copy" variant="ghost" />
                        <Button size="sm" variant="ghost" onClick={() => onChange({ caption: version.caption })}>
                          Dùng bản này
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-slate-600">
                      {version.caption}
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {content.missing_information?.length || content.compliance_notes?.length ? (
            <Card>
              <CardHeader title="Lưu ý &amp; thông tin thiếu" icon={<Info className="h-4 w-4" />} />
              <CardBody className="space-y-3">
                {content.missing_information?.length ? (
                  <div>
                    <p className="label-text mb-1.5">Thông tin còn thiếu</p>
                    <ul className="space-y-1">
                      {content.missing_information.map((item, index) => (
                        <li key={index} className="flex gap-2 text-[13px] text-amber-800">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {content.compliance_notes?.length ? (
                  <div>
                    <p className="label-text mb-1.5">Ghi chú tuân thủ</p>
                    <ul className="space-y-1">
                      {content.compliance_notes.map((item, index) => (
                        <li key={index} className="flex gap-2 text-[13px] text-slate-600">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  rows = 2,
  counter,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  counter?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="label-text" htmlFor={`field-${label}`}>
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          {counter ? <span className="text-[11px] text-slate-400 tabular-nums">{value.length} ký tự</span> : null}
          <CopyButton value={value} label="Copy" variant="ghost" />
        </div>
      </div>
      <Textarea
        id={`field-${label}`}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Chưa có ${label.toLowerCase()}`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

function ScheduleDialog({
  open,
  postId,
  suggestedTime,
  onClose,
  onDone,
}: {
  open: boolean;
  postId: string | null;
  suggestedTime: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { success, error: toastError } = useToast();
  const today = new Date();
  const [date, setDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
  );
  const [time, setTime] = useState(suggestedTime);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!postId) return;
    setBusy(true);
    try {
      const scheduledAt = new Date(`${date}T${time}:00`);
      if (Number.isNaN(scheduledAt.getTime())) throw new Error("Thời gian không hợp lệ");
      await api.post(`/api/posts/${postId}/status`, { status: "planned", scheduledAt: scheduledAt.toISOString() });
      success("Đã lên lịch", `${date} lúc ${time}`);
      onDone();
    } catch (err) {
      toastError("Lên lịch thất bại", errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Lên lịch đăng bài"
      description="Bài sẽ chuyển sang trạng thái Đã lên lịch và hiện trên lịch nội dung."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={save} loading={busy}>
            Lên lịch
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="label-text">Ngày đăng</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="label-text">Giờ đăng</span>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Giờ hiển thị theo múi giờ thiết bị của bạn. Khi tới lịch, bạn vẫn cần tự đăng rồi xác nhận trong app.
      </p>
    </Dialog>
  );
}

function SaveTemplateDialog({
  open,
  content,
  onClose,
}: {
  open: boolean;
  content: GeneratedContent | null;
  onClose: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("review");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!content) return;
    setBusy(true);
    try {
      await api.post("/api/templates", { name: name.trim() || "Mẫu chưa đặt tên", category, content });
      success("Đã lưu mẫu", "Xem tại Bộ sưu tập mẫu.");
      setName("");
      onClose();
    } catch (err) {
      toastError("Lưu mẫu thất bại", errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Lưu thành mẫu"
      description="Mẫu giúp bạn tái sử dụng cấu trúc nội dung cho sản phẩm khác."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={save} loading={busy}>
            Lưu mẫu
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="space-y-1.5">
          <span className="label-text">Tên mẫu</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Review mỹ phẩm – góc nỗi đau" />
        </label>
        <label className="space-y-1.5">
          <span className="label-text">Nhóm</span>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CONTENT_TYPES.slice(0, 10).map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
    </Dialog>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardBody>
            <SkeletonRows rows={5} />
          </CardBody>
        </Card>
      }
    >
      <CreateInner />
    </Suspense>
  );
}
