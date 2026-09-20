"use client";

import { FormEvent, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  _count?: { products: number };
  productCount?: number;
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("tag");
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const [reassign, setReassign] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setItems(data.items || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Không thể thêm.");
      return;
    }
    setName("");
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    await fetch(`/api/admin/categories/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editing.name, icon: editing.icon }),
    });
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    const params = reassign[id] ? `?reassignTo=${reassign[id]}` : "";
    const res = await fetch(`/api/admin/categories/${id}${params}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Không thể xóa.");
      return;
    }
    load();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Danh mục</h1>
      <form onSubmit={create} className="mt-6 flex flex-col gap-2 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên danh mục"
          required
          className="h-11 flex-1 rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm"
        />
        <select value={icon} onChange={(e) => setIcon(e.target.value)} className="h-11 rounded-xl border border-[color:var(--nest-border)] px-3 text-sm">
          {["phone", "laptop", "headphones", "watch", "bag", "shirt", "home", "sparkles", "tag"].map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <button type="submit" className="h-11 rounded-xl bg-[color:var(--nest-primary)] px-4 text-sm font-semibold text-white dark:text-[#1a1410]">
          Thêm
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-[#a13344]">{error}</p>}

      <div className="mt-4 space-y-3">
        {items.map((c) => {
          const count = c._count?.products ?? c.productCount ?? 0;
          return (
            <div key={c.id} className="rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4">
              {editing?.id === c.id ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="h-10 flex-1 rounded-lg border border-[color:var(--nest-border)] px-2 text-sm"
                  />
                  <button type="button" onClick={saveEdit} className="h-10 rounded-lg bg-[color:var(--nest-primary)] px-3 text-sm text-white dark:text-[#1a1410]">
                    Lưu
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-[color:var(--nest-muted)]">
                      {c.slug} · {count} sản phẩm
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {count > 0 && (
                      <select
                        value={reassign[c.id] || ""}
                        onChange={(e) => setReassign((s) => ({ ...s, [c.id]: e.target.value }))}
                        className="h-9 rounded-lg border border-[color:var(--nest-border)] px-2 text-xs"
                      >
                        <option value="">Chuyển sản phẩm tới...</option>
                        {items.filter((x) => x.id !== c.id).map((x) => (
                          <option key={x.id} value={x.id}>{x.name}</option>
                        ))}
                      </select>
                    )}
                    <button type="button" onClick={() => setEditing(c)} className="text-sm text-[color:var(--nest-primary)]">
                      Sửa
                    </button>
                    <button type="button" onClick={() => remove(c.id)} className="text-sm text-[#a13344]">
                      Xóa
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
