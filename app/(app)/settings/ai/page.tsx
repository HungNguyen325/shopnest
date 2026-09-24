"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api, errorMessage, useToast } from "@/components/providers";
import { Badge, Card, CardBody, CardHeader, EmptyState, Skeleton } from "@/components/ui";
import { Button } from "@/components/ui";
import { Field, Input, Select, Switch } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

interface AISettings {
  provider: string;
  model: string;
  fallbackProvider: string;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  dailyLimit: number;
  perMinuteLimit: number;
  enabled: { groq: boolean; gemini: boolean; openrouter: boolean; mock: boolean };
  keys: {
    groq: { configured: boolean; source: "env" | "database" | "none"; masked: string };
    gemini: { configured: boolean; source: "env" | "database" | "none"; masked: string };
    openrouter: { configured: boolean; source: "env" | "database" | "none"; masked: string };
  };
}

interface UsageData {
  usedToday: number;
  dailyLimit: number;
  totalRequests: number;
  totalErrors: number;
  rateLimitErrors: number;
  avgLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  last7Days: { date: string; count: number; errors: number }[];
  byProvider: { provider: string; model: string; count: number; errors: number; avgLatencyMs: number }[];
  recentErrors: { createdAt: string; provider: string; model: string; requestType: string; errorCode: string | null }[];
  status: string;
}

const PROVIDERS = [
  { id: "groq", label: "Groq", hint: "Nhanh, có free tier. Model gợi ý: openai/gpt-oss-120b", placeholder: "openai/gpt-oss-120b" },
  { id: "gemini", label: "Google Gemini", hint: "Dự phòng. Model gợi ý: gemini-2.5-flash-lite", placeholder: "gemini-2.5-flash-lite" },
  { id: "openrouter", label: "OpenRouter", hint: "Chỉ dùng để thử nghiệm thêm", placeholder: "openai/gpt-4o-mini" },
  { id: "mock", label: "ContentFlow Engine", hint: "Engine nội bộ, luôn khả dụng, không cần API key", placeholder: "contentflow-engine-v1" },
];

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  groq: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  gemini: ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"],
  openrouter: ["openai/gpt-4o-mini", "google/gemini-2.5-flash"],
  mock: ["contentflow-engine-v1"],
};

export default function AiSettingsPage() {
  const queryClient = useQueryClient();
  const { success, error: toastError, warning } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => api.get<AISettings>("/api/ai/settings"),
    retry: false,
  });

  const { data: usage, refetch: refetchUsage } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: () => api.get<UsageData>("/api/ai/usage"),
  });

  const [form, setForm] = useState({
    provider: "groq",
    model: "",
    fallbackProvider: "gemini",
    fallbackModel: "",
    temperature: 0.7,
    maxTokens: 2000,
    dailyLimit: 20,
    perMinuteLimit: 5,
    groqEnabled: true,
    geminiEnabled: true,
    openrouterEnabled: false,
    mockEnabled: true,
  });
  const [keys, setKeys] = useState({ groqApiKey: "", geminiApiKey: "", openrouterApiKey: "" });
  const [showKeys, setShowKeys] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      provider: settings.provider,
      model: settings.model,
      fallbackProvider: settings.fallbackProvider,
      fallbackModel: settings.fallbackModel,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      dailyLimit: settings.dailyLimit,
      perMinuteLimit: settings.perMinuteLimit,
      groqEnabled: settings.enabled.groq,
      geminiEnabled: settings.enabled.gemini,
      openrouterEnabled: settings.enabled.openrouter,
      mockEnabled: settings.enabled.mock,
    });
  }, [settings]);

  useEffect(() => {
    // Detect non-admin without breaking the page.
    const timer = window.setTimeout(() => {
      if (!settings) setForbidden(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [settings]);

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      // Only send keys the user actually typed.
      (Object.keys(keys) as (keyof typeof keys)[]).forEach((key) => {
        if (keys[key].trim()) payload[key] = keys[key].trim();
      });
      await api.patch("/api/ai/settings", payload);
      setKeys({ groqApiKey: "", geminiApiKey: "", openrouterApiKey: "" });
      success("Đã lưu cấu hình AI");
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    } catch (err) {
      toastError("Lưu thất bại", errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      await api.delete("/api/ai/settings");
      success("Đã khôi phục cấu hình mặc định");
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    } catch (err) {
      toastError("Khôi phục thất bại", errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function test(provider: string) {
    setTesting(provider);
    try {
      const res = await api.post<{ ok: boolean; message: string; latencyMs?: number }>("/api/ai/test-provider", {
        provider,
      });
      setTestResults((prev) => ({ ...prev, [provider]: { ok: res.ok, message: res.message } }));
      if (res.ok) success("Kết nối thành công", res.message);
      else warning("Kết nối thất bại", res.message);
      refetchUsage();
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [provider]: { ok: false, message: errorMessage(err) } }));
      toastError("Kiểm tra thất bại", errorMessage(err));
    } finally {
      setTesting(null);
    }
  }

  if (forbidden) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Chỉ quản trị viên mới xem được trang này"
            description="Tài khoản đầu tiên đăng ký trong hệ thống có quyền quản trị. Hãy đăng nhập bằng tài khoản đó."
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">AI Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Cấu hình nhà cung cấp, model dự phòng, nhiệt độ và hạn mức. Khóa API chỉ được dùng ở phía máy chủ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reset} loading={saving} icon={<RotateCcw className="h-4 w-4" />}>
            Khôi phục mặc định
          </Button>
          <Button onClick={save} loading={saving} icon={<Save className="h-4 w-4" />}>
            Lưu cấu hình
          </Button>
        </div>
      </header>

      {usage?.status === "offline-engine" ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Chưa có API key nào được cấu hình.</p>
            <p className="mt-0.5 text-amber-800">
              Hệ thống đang dùng engine nội bộ để toàn bộ luồng vẫn chạy được. Thêm khóa Groq hoặc Gemini bên dưới để
              dùng mô hình ngôn ngữ thật.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Nhà cung cấp &amp; model" icon={<Sparkles className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Provider chính">
                  <Select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                    {PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Model chính" hint="Model có thể thay đổi theo thời gian — kiểm tra trang nhà cung cấp.">
                  <Input
                    list="model-suggestions"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder={PROVIDERS.find((p) => p.id === form.provider)?.placeholder}
                  />
                  <datalist id="model-suggestions">
                    {(MODEL_SUGGESTIONS[form.provider] ?? []).map((model) => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Provider dự phòng">
                  <Select
                    value={form.fallbackProvider}
                    onChange={(e) => setForm({ ...form, fallbackProvider: e.target.value })}
                  >
                    {PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Model dự phòng">
                  <Input
                    value={form.fallbackModel}
                    onChange={(e) => setForm({ ...form, fallbackModel: e.target.value })}
                    placeholder={PROVIDERS.find((p) => p.id === form.fallbackProvider)?.placeholder}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Temperature" hint="0 = ổn định, 1+ = sáng tạo hơn.">
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Max tokens" hint="Giới hạn độ dài phản hồi.">
                  <Input
                    type="number"
                    min={200}
                    max={8000}
                    step={100}
                    value={form.maxTokens}
                    onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <div className="space-y-2.5 rounded-lg border border-slate-200 p-3">
                <p className="label-text">Bật / tắt provider</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Switch
                    checked={form.groqEnabled}
                    onChange={(value) => setForm({ ...form, groqEnabled: value })}
                    label="Groq"
                  />
                  <Switch
                    checked={form.geminiEnabled}
                    onChange={(value) => setForm({ ...form, geminiEnabled: value })}
                    label="Google Gemini"
                  />
                  <Switch
                    checked={form.openrouterEnabled}
                    onChange={(value) => setForm({ ...form, openrouterEnabled: value })}
                    label="OpenRouter (thử nghiệm)"
                  />
                  <Switch
                    checked={form.mockEnabled}
                    onChange={(value) => setForm({ ...form, mockEnabled: value })}
                    label="Engine nội bộ (fallback cuối)"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Chuỗi thử: provider chính → model dự phòng cùng provider → provider dự phòng → provider khác đã cấu
                  hình → engine nội bộ.
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Khóa API"
              icon={<KeyRound className="h-4 w-4" />}
              description="Ưu tiên: giá trị lưu ở đây → biến môi trường. Để trống và lưu sẽ xóa khóa đã lưu."
            />
            <CardBody className="space-y-4">
              {(["groq", "gemini", "openrouter"] as const).map((provider) => {
                const meta = settings?.keys[provider];
                const fieldKey = `${provider}ApiKey` as keyof typeof keys;
                return (
                  <div key={provider} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="label-text">
                        {PROVIDERS.find((p) => p.id === provider)?.label} API key
                      </span>
                      {meta?.configured ? (
                        <Badge tone={meta.source === "env" ? "neutral" : "brand"}>
                          {meta.source === "env" ? "Từ .env" : "Đã lưu trong DB"}
                        </Badge>
                      ) : (
                        <Badge tone="warning">Chưa cấu hình</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type={showKeys ? "text" : "password"}
                        value={keys[fieldKey]}
                        onChange={(e) => setKeys({ ...keys, [fieldKey]: e.target.value })}
                        placeholder={meta?.configured ? meta.masked : "Dán khóa API mới…"}
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => test(provider)}
                        loading={testing === provider}
                        icon={<PlugZap className="h-4 w-4" />}
                      >
                        Test
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {PROVIDERS.find((p) => p.id === provider)?.hint}
                      </p>
                      {testResults[provider] ? (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            testResults[provider].ok ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {testResults[provider].ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {testResults[provider].message}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">
                  Khóa không bao giờ được gửi xuống trình duyệt — chỉ hiển thị dạng che.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKeys((v) => !v)}
                  icon={showKeys ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                >
                  {showKeys ? "Ẩn khóa" : "Hiện khóa đang nhập"}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => test(form.provider)}
                loading={testing === form.provider}
                icon={<Activity className="h-4 w-4" />}
              >
                Test provider đang chọn ({PROVIDERS.find((p) => p.id === form.provider)?.label})
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Hạn mức sử dụng" description="Bảo vệ free tier khỏi bị dùng hết trong một ngày" />
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Lượt AI / người dùng / ngày">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={form.dailyLimit}
                  onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })}
                />
              </Field>
              <Field label="Lượt AI / người dùng / phút">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={form.perMinuteLimit}
                  onChange={(e) => setForm({ ...form, perMinuteLimit: Number(e.target.value) })}
                />
              </Field>
              <p className="text-xs text-slate-500 sm:col-span-2">
                Ngoài ra hệ thống giới hạn 2 lần tạo lại cho cùng một bài trong 1 phút, giới hạn độ dài input và có cache
                cho yêu cầu trùng lặp.
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Tình trạng sử dụng" icon={<Activity className="h-4 w-4" />} />
            <CardBody className="space-y-3">
              {isLoading || !usage ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <>
                  <dl className="grid grid-cols-2 gap-2 text-[13px]">
                    <Metric label="Hôm nay" value={`${usage.usedToday}/${usage.dailyLimit}`} />
                    <Metric label="7 ngày" value={formatNumber(usage.totalRequests)} />
                    <Metric label="Lỗi" value={formatNumber(usage.totalErrors)} tone={usage.totalErrors ? "danger" : "neutral"} />
                    <Metric label="Lỗi 429" value={formatNumber(usage.rateLimitErrors)} tone={usage.rateLimitErrors ? "warning" : "neutral"} />
                    <Metric label="Độ trễ TB" value={`${usage.avgLatencyMs}ms`} />
                    <Metric label="Token" value={formatNumber(usage.inputTokens + usage.outputTokens)} />
                  </dl>

                  <div>
                    <p className="label-text mb-1.5">7 ngày gần nhất</p>
                    <div className="flex h-20 items-end gap-1">
                      {usage.last7Days.map((day) => {
                        const max = Math.max(...usage.last7Days.map((d) => d.count), 1);
                        return (
                          <div key={day.date} className="group relative flex flex-1 flex-col justify-end gap-0.5">
                            <div
                              className="w-full rounded-t bg-brand-300"
                              style={{ height: `${(day.count / max) * 100}%` }}
                              title={`${day.date}: ${day.count} yêu cầu`}
                            />
                            {day.errors > 0 ? (
                              <div className="w-full rounded-t bg-red-300" style={{ height: `${(day.errors / max) * 100}%` }} />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>{usage.last7Days[0]?.date}</span>
                      <span>{usage.last7Days[usage.last7Days.length - 1]?.date}</span>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Theo provider / model" />
            <CardBody className="space-y-2">
              {usage && usage.byProvider.length > 0 ? (
                usage.byProvider.map((row) => (
                  <div key={`${row.provider}-${row.model}`} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-slate-800">{row.model}</span>
                      <Badge tone="neutral">{row.count}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {row.provider} · trung bình {row.avgLatencyMs}ms
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-[13px] text-slate-500">Chưa có lượt gọi nào.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Lỗi gần đây" description="Không ghi log khóa API" />
            <CardBody className="space-y-1.5">
              {usage && usage.recentErrors.length > 0 ? (
                usage.recentErrors.map((errorItem, index) => (
                  <div key={`${errorItem.createdAt}-${index}`} className="rounded-lg bg-red-50/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-red-700">{errorItem.errorCode ?? "UNKNOWN"}</span>
                      <span className="text-[11px] text-red-500">{formatDateTime(errorItem.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-red-600">
                      {errorItem.provider} · {errorItem.requestType}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-[13px] text-slate-500">Không có lỗi nào trong 7 ngày qua.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Mẹo vận hành" icon={<RefreshCw className="h-4 w-4" />} />
            <CardBody className="space-y-2 text-[13px] leading-relaxed text-slate-600">
              <p>• Model miễn phí thay đổi theo thời gian. Nếu gặp lỗi “Model không khả dụng”, đổi model ở trên.</p>
              <p>• Nếu Groq trả 429 liên tục, chuyển provider chính sang Gemini rồi thử lại.</p>
              <p>• Giữ engine nội bộ ở trạng thái bật để website không bao giờ chết vì hết quota AI.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" | "danger" }) {
  const tones = {
    neutral: "text-slate-900",
    warning: "text-amber-600",
    danger: "text-red-600",
  };
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-[15px] font-semibold tabular-nums ${tones[tone]}`}>{value}</dd>
    </div>
  );
}
