"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { CategoryIcon } from "./category-icons";
import { ProductCard, ProductCardSkeleton, type PublicProduct } from "./product-card";

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  productCount?: number;
};

export function Catalog({
  initialProducts,
  categories,
  initialQuery = "",
  initialCategory = "all",
}: {
  initialProducts: PublicProduct[];
  categories: PublicCategory[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [cat, setCat] = useState(initialCategory || "all");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(initialProducts);
  const skipFirst = useRef(
    !initialQuery && (!initialCategory || initialCategory === "all"),
  );

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debounced) params.set("q", debounced);
        if (cat && cat !== "all") params.set("category", cat);
        params.set("limit", "100");
        const res = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setItems(data.items || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, cat]);

  const emptyMessage = useMemo(() => {
    if (debounced) return "Không tìm thấy sản phẩm phù hợp.";
    if (cat !== "all") return "Danh mục này chưa có sản phẩm.";
    return "Chưa có sản phẩm nào.";
  }, [debounced, cat]);

  return (
    <>
      <section id="danh-muc" className="mx-auto max-w-nest scroll-mt-24 px-4 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold sm:text-2xl">Danh mục nổi bật</h2>
          <Link href="/#san-pham" className="text-sm text-[color:var(--nest-muted)] hover:text-[color:var(--nest-primary)]">
            Xem tất cả →
          </Link>
        </div>

        <div className="mt-5 hidden grid-cols-4 gap-4 sm:grid lg:grid-cols-8">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.slug === cat ? "all" : c.slug)}
              className={`flex flex-col items-center gap-2 rounded-2xl border bg-[color:var(--nest-surface)] px-2 py-4 transition-all duration-200 ${
                cat === c.slug
                  ? "border-[color:var(--nest-primary)] text-[color:var(--nest-primary)]"
                  : "border-[color:var(--nest-border)] text-[color:var(--nest-text)] hover:-translate-y-0.5"
              }`}
            >
              <CategoryIcon name={c.icon} className="h-7 w-7" />
              <span className="text-xs font-medium">{c.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar sm:hidden">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            Tất cả
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={cat === c.slug} onClick={() => setCat(c.slug)}>
              {c.name}
            </Chip>
          ))}
        </div>
      </section>

      <section id="san-pham" className="mx-auto mt-10 max-w-nest scroll-mt-24 px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold sm:text-2xl">Sản phẩm nổi bật</h2>
          <label className="flex h-11 w-full items-center gap-2 rounded-full border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] px-4 sm:max-w-sm">
            <Search className="h-4 w-4 text-[color:var(--nest-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="h-full w-full bg-transparent text-sm outline-none"
              aria-label="Tìm sản phẩm"
            />
          </label>
        </div>

        <div className="mt-3 hidden gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            Tất cả
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={cat === c.slug} onClick={() => setCat(c.slug)}>
              {c.name}
            </Chip>
          ))}
        </div>

        <div className="product-grid mt-5">
          {loading && items.length === 0
            ? Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {!loading && items.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] px-6 py-16 text-center">
            <p className="text-sm text-[color:var(--nest-muted)]">{emptyMessage}</p>
          </div>
        )}
      </section>
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
        active
          ? "bg-[color:var(--nest-primary)] text-white dark:text-[#1a1410]"
          : "bg-[color:var(--nest-surface)] text-[color:var(--nest-muted)] ring-1 ring-inset ring-[color:var(--nest-border)]"
      }`}
    >
      {children}
    </button>
  );
}
