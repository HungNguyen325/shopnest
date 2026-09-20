"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/product-image";

type Product = {
  id: string;
  name: string;
  imageUrl: string | null;
  purchaseUrl: string;
  linkType: string;
  isDemo: boolean;
  category: { name: string } | null;
};

type Category = { id: string; name: string };

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    const res = await fetch(`/api/admin/products?${params}`);
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.items || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoryId]);

  async function remove(id: string) {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setPendingDelete(null);
    load();
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Sản phẩm</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/products/new"
            className="inline-flex h-10 items-center rounded-xl bg-[color:var(--nest-primary)] px-4 text-sm font-semibold text-white dark:text-[#1a1410]"
          >
            Thêm
          </Link>
          <Link
            href="/admin/products/bulk"
            className="inline-flex h-10 items-center rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] px-4 text-sm font-semibold"
          >
            Nhập hàng loạt
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm sản phẩm..."
          className="h-11 flex-1 rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] px-3 text-sm outline-none"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-11 rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] px-3 text-sm"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[color:var(--nest-border)] text-[color:var(--nest-muted)]">
            <tr>
              <th className="p-3">Sản phẩm</th>
              <th className="p-3">Danh mục</th>
              <th className="p-3">Loại</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-[color:var(--nest-border)] last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg">
                      <ProductImage src={p.imageUrl} alt={p.name} className="h-full w-full" />
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.isDemo && <span className="text-xs text-[color:var(--nest-muted)]">Demo</span>}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-[color:var(--nest-muted)]">{p.category?.name || "—"}</td>
                <td className="p-3 text-[color:var(--nest-muted)]">{p.linkType}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="mr-3 text-[color:var(--nest-primary)]">
                    Sửa
                  </Link>
                  <button type="button" onClick={() => setPendingDelete(p.id)} className="text-[#a13344]">
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="p-6 text-sm text-[color:var(--nest-muted)]">Chưa có sản phẩm nào.</p>}
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {items.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-3">
            <div className="h-16 w-16 overflow-hidden rounded-xl">
              <ProductImage src={p.imageUrl} alt={p.name} className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="mt-1 text-xs text-[color:var(--nest-muted)]">
                {p.category?.name || "Chưa có danh mục"} · {p.linkType}
              </p>
              <div className="mt-2 flex gap-3 text-sm">
                <Link href={`/admin/products/${p.id}`} className="text-[color:var(--nest-primary)]">
                  Sửa
                </Link>
                <button type="button" onClick={() => setPendingDelete(p.id)} className="text-[#a13344]">
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-[color:var(--nest-surface)] p-5">
            <p className="font-semibold">Bạn có chắc muốn xóa sản phẩm này?</p>
            <p className="mt-1 text-sm text-[color:var(--nest-muted)]">Thao tác này không thể hoàn tác.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="h-10 flex-1 rounded-xl border border-[color:var(--nest-border)]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => remove(pendingDelete)}
                className="h-10 flex-1 rounded-xl bg-[#a13344] text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
