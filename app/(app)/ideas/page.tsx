"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { api, errorMessage, useToast } from "@/components/providers";
import { Badge, Card, CardBody, CardHeader, EmptyState, SkeletonRows } from "@/components/ui";
import { Button } from "@/components/ui";
import { Checkbox, Input, Select, Textarea } from "@/components/ui";
import { CONTENT_TYPES, PLATFORMS, contentTypeLabel, platformLabel } from "@/lib/constants";

interface Idea {
  id: string;
  angle: string;
  title: string;
  hook: string;
  contentType: string;
  platform: string;
  reason: string;
}

const STORAGE_KEY = "contentflow.ideas.v1";

const EMPTY_IDEAS: Idea[] = [];
let ideasCache: Idea[] = EMPTY_IDEAS;
let ideasCacheRaw: string | null = null;

function readStoredIdeas(): Idea[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === ideasCacheRaw) return ideasCache;
    ideasCacheRaw = raw;
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    ideasCache = Array.isArray(parsed) ? (parsed as Idea[]) : EMPTY_IDEAS;
  } catch {
    ideasCache = EMPTY_IDEAS;
    ideasCacheRaw = null;
  }
  return ideasCache;
}

/** Ideas survive a reload through localStorage; the server always renders empty. */
function useStoredIdeas(): [Idea[], (value: Idea[] | ((prev: Idea[]) => Idea[])) => void] {
  const stored = useSyncExternalStore(
    () => () => {},
    readStoredIdeas,
    () => EMPTY_IDEAS,
  );

  const setValue = useCallback((value: Idea[] | ((prev: Idea[]) => Idea[])) => {
    const next = typeof value === "function" ? value(readStoredIdeas()) : value;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage full or unavailable — ideas stay in memory for this session.
    }
    ideasCache = next;
    ideasCacheRaw = JSON.stringify(next);
  }, []);

  return [stored, setValue];
}

export default function IdeasPage() {
  const { success, error: toastError } = useToast();
  const [count, setCount] = useState(8);
  const [platform, setPlatform] = useState("tiktok");
  const [contentType, setContentType] = useState("");
  const [focus, setFocus] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ providerLabel: string; isFallbackEngine: boolean } | null>(null);

  const { data: products } = useQuery({
    queryKey: ["products", "picker", ""],
    queryFn: () => api.get<{ items: { id: string; name: string; affiliateUrl: string | null }[] }>("/api/products?pageSize=40"),
  });

  // localStorage is an external store: `useSyncExternalStore` reads it without
  // touching `window` during SSR and without a hydration-time setState.
  const [ideas, setIdeas] = useStoredIdeas();

  async function generate() {
    setBusy(true);
    try {
      const res = await api.post<{ ideas: Idea[]; meta: { providerLabel: string; isFallbackEngine: boolean } }>(
        "/api/ai/generate-ideas",
        { count, productIds, platform, contentType, focus },
      );
      setIdeas((prev) => [...res.ideas, ...prev].slice(0, 60));
      setMeta(res.meta);
      success(
        `Đã tạo ${res.ideas.length} ý tưởng`,
        res.meta.isFallbackEngine ? "Dùng engine nội bộ (chưa có API key)." : res.meta.providerLabel,
      );
    } catch (err) {
      toastError("Tạo ý tưởng thất bại", errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="lg:hidden">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Ý tưởng AI</h1>
        <p className="mt-0.5 text-sm text-slate-500">Gợi ý góc nội dung từ sản phẩm trong kho</p>
      </header>

      <div className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ý tưởng AI</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mỗi ý tưởng là một góc tiếp cận khác nhau cho cùng một sản phẩm. Bấm “Tạo bài” để đưa ý tưởng vào trình tạo nội dung.
        </p>
      </div>

      <Card>
        <CardHeader title="Thiết lập gợi ý" icon={<Lightbulb className="h-4 w-4" />} />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="label-text">Số ý tưởng</span>
              <Input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </label>
            <label className="space-y-1.5">
              <span className="label-text">Nền tảng ưu tiên</span>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="label-text">Loại nội dung (không bắt buộc)</span>
              <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                <option value="">Tự động chọn</option>
                {CONTENT_TYPES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="label-text">Định hướng thêm</span>
            <Textarea
              rows={2}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Ví dụ: tập trung quà tặng cuối năm, tránh nội dung giảm cân, ưu tiên video ngắn"
            />
          </label>

          <div>
            <p className="label-text mb-2">Sản phẩm tham chiếu</p>
            {products?.items?.length ? (
              <div className="flex flex-wrap gap-2">
                {products.items.map((product) => (
                  <Checkbox
                    key={product.id}
                    label={product.name}
                    checked={productIds.includes(product.id)}
                    onChange={(event) =>
                      setProductIds((prev) =>
                        event.target.checked ? [...prev, product.id] : prev.filter((id) => id !== product.id),
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-slate-500">
                Chưa có sản phẩm — ý tưởng sẽ tập trung vào thương hiệu cá nhân.
              </p>
            )}
          </div>

          <Button onClick={generate} loading={busy} icon={<Sparkles className="h-4 w-4" />}>
            Tạo ý tưởng
          </Button>
        </CardBody>
      </Card>

      {busy ? (
        <Card>
          <CardBody>
            <p className="flex items-center gap-2 text-[13px] text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> AI đang phân tích sản phẩm và đề xuất góc nội dung…
            </p>
            <div className="mt-4">
              <SkeletonRows rows={3} />
            </div>
          </CardBody>
        </Card>
      ) : null}

      {ideas.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {ideas.length} ý tưởng{meta ? ` · ${meta.providerLabel}` : ""}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setIdeas([])} icon={<Trash2 className="h-3.5 w-3.5" />}>
              Xóa tất cả
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ideas.map((idea) => (
              <Card key={idea.id} className="flex flex-col transition duration-150 hover:shadow-md">
                <CardBody className="flex flex-1 flex-col gap-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="brand">{idea.angle || "Góc mới"}</Badge>
                    <Badge tone="neutral">{platformLabel(idea.platform)}</Badge>
                    <Badge tone="neutral">{contentTypeLabel(idea.contentType)}</Badge>
                  </div>
                  <h3 className="text-[14.5px] leading-snug font-semibold text-slate-900">{idea.title}</h3>
                  {idea.hook ? <p className="text-[13px] leading-relaxed text-slate-600">“{idea.hook}”</p> : null}
                  {idea.reason ? <p className="text-xs text-slate-500">{idea.reason}</p> : null}
                  <div className="mt-auto flex gap-2 pt-1.5">
                    <Link
                      href={`/create?contentType=${idea.contentType}&platform=${idea.platform}`}
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full" icon={<Wand2 className="h-3.5 w-3.5" />}>
                        Tạo bài
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Xóa ý tưởng"
                      onClick={() => setIdeas((prev) => prev.filter((i) => i.id !== idea.id))}
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                    />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      ) : !busy ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Lightbulb className="h-5 w-5" />}
              title="Chưa có ý tưởng nào"
              description="Chọn sản phẩm rồi bấm Tạo ý tưởng. Mỗi lần tạo tính 1 lượt AI."
              action={
                <Button onClick={generate} icon={<Plus className="h-4 w-4" />}>
                  Tạo ý tưởng ngay
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
