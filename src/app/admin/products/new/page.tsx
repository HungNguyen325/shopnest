"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductImage } from "@/components/product-image";

type Category = { id: string; name: string };
type ExtractResult = {
  ok: boolean;
  warning?: boolean;
  error?: string;
  name?: string;
  imageUrl?: string;
  originalUrl: string;
  resolvedUrl?: string;
  purchaseUrl: string;
  linkType: string;
  platform: string;
  productId?: string;
  shopId?: string;
  duplicate?: boolean;
};

export default function NewProductPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success" | "warn"; text: string } | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [dupAction, setDupAction] = useState<"create" | "update" | "skip">("create");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.items || []))
      .catch(() => {});
  }, []);

  async function extract(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/admin/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Không thể xử lý liên kết." });
        setResult(null);
        return;
      }
      setResult(data);
      setName(data.name || "");
      setImageUrl(data.imageUrl || "");
      setPurchaseUrl(data.purchaseUrl || data.originalUrl);
      if (data.duplicate) {
        setMessage({ type: "warn", text: "Sản phẩm này có thể đã tồn tại." });
      } else if (!data.ok) {
        setMessage({
          type: "warn",
          text: data.error || "Không thể tự động lấy thông tin từ liên kết này.",
        });
      } else if (data.warning) {
        setMessage({ type: "warn", text: data.error || "Cần kiểm tra thông tin trước khi lưu." });
      } else {
        setMessage({ type: "success", text: "Đã lấy thông tin sản phẩm." });
      }
    } catch {
      setMessage({ type: "error", text: "Không thể kết nối máy chủ." });
    } finally {
      setExtracting(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !purchaseUrl.trim()) {
      setMessage({ type: "error", text: "Cần có tên sản phẩm và URL mua hàng." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          imageUrl: imageUrl || null,
          originalUrl: result?.originalUrl || url,
          resolvedUrl: result?.resolvedUrl || null,
          purchaseUrl,
          sourcePlatform: result?.platform,
          linkType: result?.linkType,
          productId: result?.productId,
          shopId: result?.shopId,
          categoryId: categoryId || null,
          extractStatus: result?.ok ? (result.warning ? "warning" : "success") : "error",
          extractMessage: result?.error,
          duplicateAction: result?.duplicate ? dupAction : "create",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Không thể lưu sản phẩm." });
        return;
      }
      if (data.skipped) {
        setMessage({ type: "success", text: "Đã bỏ qua sản phẩm trùng." });
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Không thể lưu sản phẩm." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Thêm sản phẩm</h1>
      <p className="mt-1 text-sm text-[color:var(--nest-muted)]">
        Dán link sản phẩm. Hệ thống sẽ tự lấy tên và ảnh.
      </p>

      <form onSubmit={extract} className="mt-6 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4 sm:p-6">
        <label className="text-sm font-medium">
          Dán link sản phẩm
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            required
            className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={extracting}
          className="mt-4 h-11 rounded-xl bg-[color:var(--nest-primary)] px-5 text-sm font-semibold text-white disabled:opacity-60 dark:text-[#1a1410]"
        >
          {extracting ? "Đang xử lý liên kết..." : "Lấy thông tin"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-[#fde8ec] text-[#a13344]"
              : message.type === "warn"
                ? "bg-[#fff4d6] text-[#8a5b12]"
                : "bg-[#e5f7ee] text-[#1f7a4d]"
          }`}
        >
          {message.text}
        </p>
      )}

      {result && (
        <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="h-40 w-40 overflow-hidden rounded-2xl">
              <ProductImage src={imageUrl} alt={name || "Ảnh sản phẩm"} className="h-full w-full" />
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-xs uppercase tracking-wide text-[color:var(--nest-muted)]">
                Loại link: {result.linkType} · Nền tảng: {result.platform}
              </p>
              <label className="block text-sm font-medium">
                Tên sản phẩm
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm outline-none"
                />
              </label>
              <label className="block text-sm font-medium">
                URL ảnh
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1 h-11 w-full break-all rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm outline-none"
                />
              </label>
            </div>
          </div>
          <label className="block text-sm font-medium">
            Danh mục
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm outline-none"
            >
              <option value="">Chọn danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            URL mua hàng
            <input
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              className="mt-1 h-11 w-full break-all rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm outline-none"
            />
            <span className="mt-1 block text-xs text-[color:var(--nest-muted)]">
              Mặc định giữ nguyên URL bạn dán, kể cả affiliate.
            </span>
          </label>
          {result.duplicate && (
            <fieldset className="text-sm">
              <legend className="font-medium">Sản phẩm có thể đã tồn tại</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {(["skip", "update", "create"] as const).map((a) => (
                  <label key={a} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="dup"
                      checked={dupAction === a}
                      onChange={() => setDupAction(a)}
                    />
                    {a === "skip" ? "Bỏ qua" : a === "update" ? "Cập nhật" : "Lưu mới"}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-xl bg-[color:var(--nest-primary)] px-5 text-sm font-semibold text-white disabled:opacity-60 dark:text-[#1a1410]"
          >
            {saving ? "Đang lưu..." : "Lưu sản phẩm"}
          </button>
        </form>
      )}
    </div>
  );
}
