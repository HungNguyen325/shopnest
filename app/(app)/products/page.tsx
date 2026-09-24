"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpDown,
  FileText,
  Link2,
  Package,
  Pin,
  Plus,
  Search,
  Star,
  Wand2,
  X,
} from "lucide-react";
import { api, errorMessage, useToast } from "@/components/providers";
import { Badge, Card, CardBody, EmptyState, SkeletonRows } from "@/components/ui";
import { Button } from "@/components/ui";
import { Drawer, ConfirmDialog } from "@/components/ui";
import { Input, Select } from "@/components/ui";
import { ProductForm, type ProductRecord } from "@/components/product-form";
import { formatVND } from "@/lib/utils";
import { PRODUCT_STATUSES } from "@/lib/constants";

interface ProductItem extends ProductRecord {
  images: { id: string; url: string; isCover: boolean }[];
  affiliateLinks: { id: string; label: string; url: string; isDefault: boolean }[];
  _count: { posts: number };
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductListResponse {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
  tags: string[];
  stats: { total: number; unused: number; withoutAffiliate: number };
}

const SORTS = [
  { id: "newest", label: "Mới tạo nhất" },
  { id: "updated", label: "Mới cập nhật" },
  { id: "name", label: "Tên A–Z" },
  { id: "posts", label: "Nhiều bài nhất" },
  { id: "oldest", label: "Cũ nhất" },
];

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ProductsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { success, error: toastError } = useToast();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [quick, setQuick] = useState<{ favorite?: boolean; pinned?: boolean; missingAffiliate?: boolean; unused?: boolean }>(
    {
      favorite: params.get("favorite") === "1",
      pinned: params.get("pinned") === "1",
      missingAffiliate: params.get("missingAffiliate") === "1",
      unused: params.get("unused") === "1",
    },
  );

  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [deleting, setDeleting] = useState<ProductItem | null>(null);

  const query = useMemo(() => {
    const qs = new URLSearchParams({ page: String(page), pageSize: "24", sort });
    if (debouncedSearch) qs.set("q", debouncedSearch);
    if (category) qs.set("category", category);
    if (status) qs.set("status", status);
    if (tag) qs.set("tag", tag);
    if (quick.favorite) qs.set("favorite", "1");
    if (quick.pinned) qs.set("pinned", "1");
    if (quick.missingAffiliate) qs.set("missingAffiliate", "1");
    if (quick.unused) qs.set("unused", "1");
    return qs.toString();
  }, [debouncedSearch, category, status, tag, sort, page, quick]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["products", query],
    queryFn: () => api.get<ProductListResponse>(`/api/products?${query}`),
    placeholderData: keepPreviousData,
  });

  // Reset pagination during render when filters change (avoids a cascading effect).
  const filterSignature = JSON.stringify({ debouncedSearch, category, status, tag, sort, quick });
  const [prevSignature, setPrevSignature] = useState(filterSignature);
  if (filterSignature !== prevSignature) {
    setPrevSignature(filterSignature);
    setPage(1);
  }

  const toggleQuick = useCallback((key: keyof typeof quick) => {
    setQuick((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  async function toggleFlag(product: ProductItem, flag: "isFavorite" | "isPinned") {
    try {
      await api.patch(`/api/products/${product.id}`, { [flag]: !product[flag] });
      refetch();
      success(flag === "isFavorite" ? (!product.isFavorite ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích") : !product.isPinned ? "Đã ghim sản phẩm" : "Đã bỏ ghim");
    } catch (err) {
      toastError("Cập nhật thất bại", errorMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api.delete(`/api/products/${deleting.id}`);
      success("Đã xóa sản phẩm", deleting.name);
      setDeleting(null);
      refetch();
    } catch (err) {
      toastError("Xóa thất bại", errorMessage(err));
    }
  }

  const hasFilters =
    Boolean(debouncedSearch) || Boolean(category) || Boolean(status) || Boolean(tag) ||
    Object.values(quick).some(Boolean);

  const activeFilters = [
    category && { key: "category", label: `Danh mục: ${category}`, clear: () => setCategory("") },
    status && { key: "status", label: `Trạng thái: ${status}`, clear: () => setStatus("") },
    tag && { key: "tag", label: `Tag: ${tag}`, clear: () => setTag("") },
    quick.favorite && { key: "fav", label: "Yêu thích", clear: () => toggleQuick("favorite") },
    quick.pinned && { key: "pin", label: "Đã ghim", clear: () => toggleQuick("pinned") },
    quick.missingAffiliate && { key: "aff", label: "Thiếu affiliate", clear: () => toggleQuick("missingAffiliate") },
    quick.unused && { key: "unused", label: "Chưa có bài", clear: () => toggleQuick("unused") },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 lg:text-2xl">Sản phẩm của tôi</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {data
              ? `Lưu trữ sản phẩm affiliate để tạo nội dung nhanh chóng · ${data.total} sản phẩm`
              : "Lưu trữ sản phẩm affiliate để tạo nội dung nhanh chóng"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/create">
            <Button variant="outline" icon={<Wand2 className="h-4 w-4" />}>
              Tạo bài đăng
            </Button>
          </Link>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Thêm sản phẩm
          </Button>
        </div>
      </header>

      {/* Filters */}
      <Card>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, thương hiệu, mô tả, tag…"
                aria-label="Tìm kiếm sản phẩm"
                className="pl-9"
              />
            </div>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Lọc theo danh mục">
              <option value="">Mọi danh mục</option>
              {(data?.categories ?? []).map((c) => (
                <option key={c} value={c ?? ""}>
                  {c}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Lọc theo trạng thái">
              <option value="">Mọi trạng thái</option>
              {PRODUCT_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
            <div className="relative">
              <ArrowUpDown className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sắp xếp" className="pl-9">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "favorite" as const, label: "Yêu thích", icon: Star },
              { key: "pinned" as const, label: "Đã ghim", icon: Pin },
              { key: "missingAffiliate" as const, label: "Thiếu affiliate", icon: Link2 },
              { key: "unused" as const, label: "Chưa có bài", icon: FileText },
            ].map((chip) => {
              const Icon = chip.icon;
              const active = quick[chip.key];
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => toggleQuick(chip.key)}
                  aria-pressed={Boolean(active)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {chip.label}
                </button>
              );
            })}
            {(data?.tags ?? []).length > 0 ? (
              <Select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                aria-label="Lọc theo tag"
                className="h-8 w-auto min-w-[140px] text-xs"
              >
                <option value="">Mọi tag</option>
                {data!.tags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </Select>
            ) : null}
            {activeFilters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={f.clear}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
                  >
                    {f.label}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                    setStatus("");
                    setTag("");
                    setQuick({});
                  }}
                  className="text-xs font-medium text-slate-500 underline hover:text-slate-800"
                >
                  Xóa tất cả
                </button>
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* List */}
      {isLoading ? (
        <Card>
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        </Card>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((product) => {
              const cover = product.images.find((i) => i.isCover) ?? product.images[0];
              const statusMeta = PRODUCT_STATUSES.find((s) => s.id === product.status);
              return (
                <Card key={product.id} className="group flex flex-col overflow-hidden transition duration-150 hover:shadow-md">
                  <div className="relative h-36 w-full bg-slate-100">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover.url}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      {product.isPinned ? (
                        <Badge tone="brand">
                          <Pin className="h-3 w-3" /> Đã ghim
                        </Badge>
                      ) : null}
                      {statusMeta && product.status !== "active" ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusMeta.badge}`}>
                          {statusMeta.label}
                        </span>
                      ) : null}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleFlag(product, "isFavorite")}
                        aria-label={product.isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                        aria-pressed={product.isFavorite}
                        className="rounded-lg bg-white/90 p-1.5 text-slate-500 shadow-sm transition hover:text-amber-500"
                      >
                        <Star className={`h-4 w-4 ${product.isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFlag(product, "isPinned")}
                        aria-label={product.isPinned ? "Bỏ ghim" : "Ghim sản phẩm"}
                        aria-pressed={product.isPinned}
                        className="rounded-lg bg-white/90 p-1.5 text-slate-500 shadow-sm transition hover:text-brand-600"
                      >
                        <Pin className={`h-4 w-4 ${product.isPinned ? "fill-brand-500 text-brand-600" : ""}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-2.5 p-4">
                    <div className="min-w-0">
                      <Link href={`/products/${encodeURIComponent(product.id)}`} className="block">
                        <h2 className="truncate text-[15px] font-semibold text-slate-900 hover:text-brand-700">
                          {product.name}
                        </h2>
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {[product.brand, product.category].filter(Boolean).join(" · ") || "Chưa có danh mục"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="font-semibold text-slate-900">{formatVND(product.price)}</span>
                      {product.commission ? <Badge tone="success">{product.commission}</Badge> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">
                        <FileText className="h-3 w-3" />
                        {product._count.posts} bài
                      </Badge>
                      {product.affiliateUrl ? (
                        <Badge tone="info">
                          <Link2 className="h-3 w-3" />
                          {product.affiliateLinks.length || 1} link
                        </Badge>
                      ) : (
                        <Badge tone="warning">
                          <AlertTriangle className="h-3 w-3" />
                          Thiếu affiliate
                        </Badge>
                      )}
                      {product._count.posts === 0 ? <Badge tone="neutral">Chưa có nội dung</Badge> : null}
                    </div>

                    {product.description ? (
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{product.description}</p>
                    ) : null}

                    <div className="mt-auto flex items-center gap-2 pt-1.5">
                      <Link href={`/products/${encodeURIComponent(product.id)}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          Xem &amp; sửa
                        </Button>
                      </Link>
                      <Link href={`/create?product=${product.id}`} className="flex-1">
                        <Button size="sm" className="w-full" icon={<Wand2 className="h-3.5 w-3.5" />}>
                          Tạo bài
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleting(product)}
                        aria-label={`Xóa ${product.name}`}
                        className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {data.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => p - 1)}>
                Trang trước
              </Button>
              <span className="text-[13px] text-slate-500">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Package className="h-5 w-5" />}
              title={hasFilters ? "Không tìm thấy sản phẩm phù hợp" : "Kho sản phẩm đang trống"}
              description={
                hasFilters
                  ? "Thử bỏ bớt bộ lọc hoặc từ khóa tìm kiếm."
                  : "Thêm sản phẩm đầu tiên: tên, mô tả, ưu – nhược điểm, trải nghiệm thật và link affiliate."
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setCategory("");
                      setStatus("");
                      setTag("");
                      setQuick({});
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                ) : (
                  <Button
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    Thêm sản phẩm
                  </Button>
                )
              }
            />
          </CardBody>
        </Card>
      )}

      {/* Create / edit drawer */}
      <Drawer
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? `Sửa: ${editing.name}` : "Thêm sản phẩm mới"}
        description="Thông tin càng đầy đủ, nội dung AI tạo càng đúng và ít phải sửa."
      >
        <ProductForm
          product={editing}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onDone={(saved) => {
            setFormOpen(false);
            setEditing(null);
            refetch();
            if (!editing) router.push(`/products/${saved.id}?upload=1`);
          }}
        />
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Xóa sản phẩm?"
        description={`“${deleting?.name ?? ""}” và toàn bộ ảnh, link affiliate của sản phẩm này sẽ bị xóa. Các bài đăng đã tạo vẫn được giữ nhưng mất liên kết sản phẩm.`}
        confirmLabel="Xóa sản phẩm"
        destructive
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Card><CardBody><SkeletonRows rows={6} /></CardBody></Card>}>
      <ProductsInner />
    </Suspense>
  );
}
