"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductImage } from "@/components/product-image";

type Category = { id: string; name: string };

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    imageUrl: "",
    originalUrl: "",
    resolvedUrl: "",
    purchaseUrl: "",
    categoryId: "",
    linkType: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${id}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([p, c]) => {
      if (p.item) {
        setForm({
          name: p.item.name || "",
          imageUrl: p.item.imageUrl || "",
          originalUrl: p.item.originalUrl || "",
          resolvedUrl: p.item.resolvedUrl || "",
          purchaseUrl: p.item.purchaseUrl || "",
          categoryId: p.item.categoryId || "",
          linkType: p.item.linkType || "",
        });
      } else setError("Không tìm thấy sản phẩm.");
      setCategories(c.items || []);
      setLoading(false);
    });
  }, [id]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function reextract() {
    setExtracting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.originalUrl || form.purchaseUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không lấy lại được thông tin.");
        return;
      }
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        imageUrl: data.imageUrl || f.imageUrl,
        resolvedUrl: data.resolvedUrl || f.resolvedUrl,
        purchaseUrl: f.purchaseUrl || data.purchaseUrl,
        linkType: data.linkType || f.linkType,
      }));
    } finally {
      setExtracting(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: form.categoryId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể lưu.");
        return;
      }
      router.push("/admin/products");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-[color:var(--nest-muted)]">Đang tải...</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Sửa sản phẩm</h1>
      <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4 sm:p-6">
        <div className="h-40 w-40 overflow-hidden rounded-2xl">
          <ProductImage src={form.imageUrl} alt={form.name} className="h-full w-full" />
        </div>
        <label className="block text-sm font-medium">
          Tên sản phẩm
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm" />
        </label>
        <label className="block text-sm font-medium">
          URL ảnh
          <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm" />
        </label>
        <label className="block text-sm font-medium">
          Danh mục
          <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm">
            <option value="">Không chọn</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          URL gốc
          <input value={form.originalUrl} onChange={(e) => set("originalUrl", e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm" />
        </label>
        <label className="block text-sm font-medium">
          URL mua hàng
          <input value={form.purchaseUrl} onChange={(e) => set("purchaseUrl", e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm" />
        </label>
        {error && <p className="text-sm text-[#a13344]">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reextract} disabled={extracting} className="h-11 rounded-xl border border-[color:var(--nest-border)] px-4 text-sm">
            {extracting ? "Đang lấy lại..." : "Lấy lại thông tin"}
          </button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-[color:var(--nest-primary)] px-5 text-sm font-semibold text-white dark:text-[#1a1410]">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
}
