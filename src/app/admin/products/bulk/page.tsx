"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProductImage } from "@/components/product-image";

type Category = { id: string; name: string };
type Row = {
  originalUrl: string;
  purchaseUrl: string;
  resolvedUrl?: string;
  name?: string;
  imageUrl?: string;
  linkType?: string;
  platform?: string;
  productId?: string;
  shopId?: string;
  ok?: boolean;
  warning?: boolean;
  error?: string;
  duplicate?: boolean;
  categoryId?: string;
  duplicateAction?: "skip" | "update" | "create";
  removed?: boolean;
};

export default function BulkPage() {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.items || []));
  }, []);

  async function processAll(e: FormEvent) {
    e.preventDefault();
    const urls = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (!urls.length) return;
    setRows([]);
    setProgress({ done: 0, total: urls.length });
    const out: Row[] = [];
    const concurrency = 3;
    let index = 0;
    async function worker() {
      while (index < urls.length) {
        const i = index++;
        const url = urls[i]!;
        try {
          const res = await fetch("/api/admin/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          const data = await res.json();
          out[i] = res.ok
            ? {
                ...data,
                categoryId: "",
                duplicateAction: data.duplicate ? "skip" : "create",
              }
            : {
                originalUrl: url,
                purchaseUrl: url,
                ok: false,
                error: data.error || "Lỗi",
                duplicateAction: "create",
              };
        } catch {
          out[i] = {
            originalUrl: url,
            purchaseUrl: url,
            ok: false,
            error: "Không thể xử lý liên kết.",
            duplicateAction: "create",
          };
        }
        setProgress({ done: out.filter(Boolean).length, total: urls.length });
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()));
    setRows(out.filter(Boolean));
    setProgress(null);
  }

  const visible = rows.filter((r) => !r.removed);
  const success = visible.filter((r) => r.ok).length;
  const warn = visible.filter((r) => r.warning || (!r.ok && r.error)).length;
  const fail = visible.filter((r) => !r.ok).length;

  async function saveAll() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: visible
            .filter((r) => r.name && r.purchaseUrl && r.duplicateAction !== "skip")
            .map((r) => ({
              name: r.name,
              imageUrl: r.imageUrl,
              originalUrl: r.originalUrl,
              resolvedUrl: r.resolvedUrl,
              purchaseUrl: r.purchaseUrl,
              sourcePlatform: r.platform,
              linkType: r.linkType,
              productId: r.productId,
              shopId: r.shopId,
              categoryId: r.categoryId || null,
              extractStatus: r.ok ? (r.warning ? "warning" : "success") : "error",
              extractMessage: r.error,
              duplicateAction: r.duplicateAction || "create",
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Không thể lưu.");
        return;
      }
      setMessage(`Đã lưu ${data.saved} sản phẩm. Bỏ qua ${data.skipped}. Lỗi ${data.failed?.length || 0}.`);
    } catch {
      setMessage("Không thể lưu hàng loạt.");
    } finally {
      setSaving(false);
    }
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Nhập hàng loạt</h1>
      <p className="mt-1 text-sm text-[color:var(--nest-muted)]">Dán nhiều link, mỗi link một dòng.</p>

      <form onSubmit={processAll} className="mt-6 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4 sm:p-6">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          placeholder={"https://...\nhttps://...\nhttps://..."}
          className="w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] p-3 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!!progress}
          className="mt-3 h-11 rounded-xl bg-[color:var(--nest-primary)] px-5 text-sm font-semibold text-white disabled:opacity-60 dark:text-[#1a1410]"
        >
          {progress ? `Đang xử lý ${progress.done} / ${progress.total}` : "Xử lý tất cả"}
        </button>
      </form>

      {visible.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="text-[#1f7a4d]">✓ {success} thành công</span>
            <span className="text-[#8a5b12]">⚠ {warn} cần kiểm tra</span>
            <span className="text-[#a13344]">✕ {fail} thất bại</span>
          </div>
          <div className="mt-4 space-y-3">
            {rows.map((r, i) =>
              r.removed ? null : (
                <div key={r.originalUrl + i} className="rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-3 sm:p-4">
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                      <ProductImage src={r.imageUrl} alt={r.name || ""} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        value={r.name || ""}
                        onChange={(e) => updateRow(i, { name: e.target.value })}
                        placeholder="Tên sản phẩm"
                        className="h-10 w-full rounded-lg border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-2 text-sm"
                      />
                      <p className="break-all text-xs text-[color:var(--nest-muted)]">
                        {r.linkType || "—"} · {r.originalUrl}
                      </p>
                      {r.error && <p className="text-xs text-[#a13344]">{r.error}</p>}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          value={r.categoryId || ""}
                          onChange={(e) => updateRow(i, { categoryId: e.target.value })}
                          className="h-10 rounded-lg border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-2 text-sm"
                        >
                          <option value="">Danh mục</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {r.duplicate && (
                          <select
                            value={r.duplicateAction}
                            onChange={(e) =>
                              updateRow(i, { duplicateAction: e.target.value as Row["duplicateAction"] })
                            }
                            className="h-10 rounded-lg border border-[color:var(--nest-border)] px-2 text-sm"
                          >
                            <option value="skip">Bỏ qua</option>
                            <option value="update">Cập nhật</option>
                            <option value="create">Lưu mới</option>
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => updateRow(i, { removed: true })}
                          className="h-10 text-sm text-[#a13344]"
                        >
                          Xóa dòng
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="mt-4 h-11 rounded-xl bg-[color:var(--nest-primary)] px-5 text-sm font-semibold text-white dark:text-[#1a1410]"
          >
            {saving ? "Đang lưu..." : "Lưu tất cả"}
          </button>
          {message && <p className="mt-3 text-sm">{message}</p>}
        </>
      )}
    </div>
  );
}
