"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  FileText,
  Link2,
  Pencil,
  Pin,
  Plus,
  Star,
  Trash2,
  Wand2,
} from "lucide-react";
import { api, errorMessage, useToast } from "@/components/providers";
import { Badge, Card, CardBody, CardHeader, EmptyState, SkeletonRows, StatusBadge } from "@/components/ui";
import { Button } from "@/components/ui";
import { ConfirmDialog, Drawer } from "@/components/ui";
import { CopyButton } from "@/components/ui";
import { Field, Input, Select } from "@/components/ui";
import { ProductForm, type ProductRecord } from "@/components/product-form";
import { ImageUploader, type ProductImage } from "@/components/product-form";
import { formatDateTime, formatRelativeDay } from "@/lib/utils";
import { formatVND } from "@/lib/utils";
import { AFFILIATE_PROGRAMS, contentTypeLabel, platformLabel } from "@/lib/constants";

interface ProductDetail {
  product: ProductRecord & {
    images: ProductImage[];
    affiliateLinks: {
      id: string;
      label: string;
      url: string;
      program: string | null;
      isDefault: boolean;
      clickCount: number;
    }[];
    _count: { posts: number };
    isFavorite: boolean;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
  };
  posts: {
    id: string;
    title: string | null;
    platform: string;
    contentType: string;
    status: string;
    scheduledAt: string | null;
    publishedAt: string | null;
    createdAt: string;
  }[];
}

const DETAIL_FIELDS: { key: keyof ProductRecord; label: string }[] = [
  { key: "description", label: "Mô tả" },
  { key: "highlights", label: "Điểm nổi bật" },
  { key: "pros", label: "Ưu điểm" },
  { key: "cons", label: "Nhược điểm" },
  { key: "targetAudience", label: "Đối tượng khách hàng" },
  { key: "painPoints", label: "Nỗi đau giải quyết" },
  { key: "usageGuide", label: "Hướng dẫn sử dụng" },
  { key: "cautions", label: "Thông tin cần lưu ý" },
  { key: "actualExperience", label: "Trải nghiệm thực tế" },
  { key: "notes", label: "Ghi chú cá nhân" },
];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.get<ProductDetail>(`/api/products/${id}`),
  });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("upload") === "1") {
      window.history.replaceState({}, "", `/products/${id}`);
      document.getElementById("product-images")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [id]);

  const handleImagesChange = useCallback(() => refetch(), [refetch]);

  async function toggleFlag(flag: "isFavorite" | "isPinned") {
    if (!data) return;
    try {
      await api.patch(`/api/products/${id}`, { [flag]: !data.product[flag] });
      refetch();
      success("Đã cập nhật");
    } catch (err) {
      toastError("Cập nhật thất bại", errorMessage(err));
    }
  }

  async function removeProduct() {
    try {
      await api.delete(`/api/products/${id}`);
      success("Đã xóa sản phẩm");
      router.push("/products");
    } catch (err) {
      toastError("Xóa thất bại", errorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <SkeletonRows rows={6} />
        </CardBody>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description="Sản phẩm có thể đã bị xóa hoặc không thuộc tài khoản của bạn."
            action={
              <Link href="/products">
                <Button variant="outline">Về kho sản phẩm</Button>
              </Link>
            }
          />
        </CardBody>
      </Card>
    );
  }

  const { product, posts } = data;

  return (
    <div className="space-y-5">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Kho sản phẩm
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">{product.name}</h1>
            {product.isPinned ? (
              <Badge tone="brand">
                <Pin className="h-3 w-3" /> Đã ghim
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[product.brand, product.category].filter(Boolean).join(" · ") || "Chưa có danh mục"} · Tạo lúc{" "}
            {formatDateTime(product.createdAt)} · {product._count.posts} bài đã tạo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFlag("isFavorite")}
            icon={<Star className={`h-4 w-4 ${product.isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />}
          >
            {product.isFavorite ? "Đã yêu thích" : "Yêu thích"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} icon={<Pencil className="h-3.5 w-3.5" />}>
            Sửa
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} icon={<Trash2 className="h-3.5 w-3.5" />}>
            Xóa
          </Button>
          <Link href={`/create?product=${product.id}`}>
            <Button icon={<Wand2 className="h-4 w-4" />}>Tạo bài đăng</Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card id="product-images">
            <CardHeader title="Ảnh sản phẩm" description="Upload, kéo thả, dán ảnh (Ctrl+V) hoặc dán URL" />
            <CardBody>
              <ImageUploader productId={product.id} images={product.images} onChange={handleImagesChange} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Thông tin chi tiết" description="Dữ liệu AI được phép sử dụng" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow label="Giá bán" value={formatVND(product.price)} />
                <InfoRow label="Hoa hồng / ghi chú giá" value={product.commission ?? "—"} />
                <InfoRow label="Trạng thái" value={product.status} />
                <InfoRow label="Cập nhật lần cuối" value={formatDateTime(product.updatedAt)} />
              </div>

              <dl className="divide-y divide-slate-100">
                {DETAIL_FIELDS.map((field) => {
                  const value = product[field.key];
                  if (!value) return null;
                  return (
                    <div key={field.key} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                      <dt className="text-[13px] font-medium text-slate-500">{field.label}</dt>
                      <dd className="text-[13.5px] leading-relaxed whitespace-pre-line text-slate-800">{String(value)}</dd>
                    </div>
                  );
                })}
              </dl>

              {DETAIL_FIELDS.every((f) => !product[f.key]) ? (
                <EmptyState
                  compact
                  title="Chưa có thông tin chi tiết"
                  description="Bổ sung mô tả, ưu – nhược điểm và trải nghiệm thật để AI viết chính xác hơn."
                  action={<Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>Bổ sung ngay</Button>}
                />
              ) : null}

              {!product.actualExperience ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
                  Chưa có trải nghiệm thực tế. AI sẽ viết ở góc độ thông tin và ghi chú trong missing_information.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`Bài đăng từ sản phẩm này (${posts.length})`}
              action={
                <Link href={`/create?product=${product.id}`} className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
                  Tạo thêm
                </Link>
              }
            />
            <CardBody className="space-y-2">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts?open=${encodeURIComponent(post.id)}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition hover:border-brand-200 hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-slate-900">
                        {post.title || "Bài chưa có tiêu đề"}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {platformLabel(post.platform)} · {contentTypeLabel(post.contentType)} ·{" "}
                        {formatRelativeDay(post.publishedAt ?? post.scheduledAt ?? post.createdAt)}
                      </span>
                    </span>
                    <StatusBadge status={post.status} />
                  </Link>
                ))
              ) : (
                <EmptyState
                  compact
                  icon={<FileText className="h-5 w-5" />}
                  title="Chưa có bài đăng nào"
                  description="Tạo bài đầu tiên cho sản phẩm này."
                  action={
                    <Link href={`/create?product=${product.id}`}>
                      <Button size="sm">Tạo bài đăng</Button>
                    </Link>
                  }
                />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Link affiliate"
              icon={<Link2 className="h-4 w-4" />}
              action={
                <button
                  type="button"
                  onClick={() => setLinkOpen(true)}
                  className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  Thêm link
                </button>
              }
            />
            <CardBody className="space-y-2.5">
              {product.affiliateLinks.length > 0 ? (
                product.affiliateLinks.map((link) => (
                  <div key={link.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-900">{link.label}</p>
                        <p className="truncate text-xs text-slate-500">{link.program ?? "Không rõ chương trình"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {link.isDefault ? <Badge tone="brand">Mặc định</Badge> : null}
                        <CopyButton value={link.url} label="" showLabel={false} size="icon" variant="ghost" />
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={`Mở ${link.label}`}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          aria-label={`Xóa ${link.label}`}
                          onClick={async () => {
                            try {
                              await api.delete(`/api/products/${product.id}/affiliate-links/${link.id}`);
                              success("Đã xóa link");
                              refetch();
                            } catch (err) {
                              toastError("Xóa link thất bại", errorMessage(err));
                            }
                          }}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 truncate text-[11px] text-slate-400">{link.url}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
                  Chưa có link affiliate. AI sẽ chỉ viết CTA hướng dẫn chung.
                </p>
              )}
              {product.originalUrl ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-[11px] text-slate-500">Link gốc</span>
                    <span className="block truncate text-xs text-slate-700">{product.originalUrl}</span>
                  </span>
                  <CopyButton value={product.originalUrl} label="" showLabel={false} size="icon" variant="ghost" />
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Lịch đăng liên quan" icon={<CalendarClock className="h-4 w-4" />} />
            <CardBody className="space-y-2">
              {posts.filter((p) => p.scheduledAt).length > 0 ? (
                posts
                  .filter((p) => p.scheduledAt)
                  .slice(0, 5)
                  .map((post) => (
                    <div key={post.id} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="min-w-0 truncate text-slate-700">{post.title || "Bài chưa có tiêu đề"}</span>
                      <span className="shrink-0 text-xs text-slate-500">{formatDateTime(post.scheduledAt)}</span>
                    </div>
                  ))
              ) : (
                <p className="py-2 text-center text-[13px] text-slate-500">Chưa lên lịch bài nào.</p>
              )}
              <Link href="/calendar">
                <Button variant="outline" size="sm" className="w-full">
                  Mở lịch nội dung
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title={`Sửa: ${product.name}`}>
        <ProductForm
          product={product}
          onCancel={() => setEditOpen(false)}
          onDone={() => {
            setEditOpen(false);
            refetch();
          }}
        />
      </Drawer>

      <AffiliateLinkDialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        productId={product.id}
        onSaved={() => {
          setLinkOpen(false);
          refetch();
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={removeProduct}
        title="Xóa sản phẩm?"
        description={`“${product.name}” cùng ảnh và link affiliate sẽ bị xóa vĩnh viễn. Bài đăng đã tạo vẫn được giữ.`}
        confirmLabel="Xóa sản phẩm"
        destructive
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-[13.5px] font-medium text-slate-800">{value}</p>
    </div>
  );
}

function AffiliateLinkDialog({
  open,
  onClose,
  productId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  onSaved: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [program, setProgram] = useState<string>(AFFILIATE_PROGRAMS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!label.trim()) {
      setError("Vui lòng đặt tên cho link.");
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(url.trim())) {
      setError("Link phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/products/${productId}/affiliate-links`, { label, url, program });
      success("Đã thêm link affiliate");
      setLabel("");
      setUrl("");
      onSaved();
    } catch (err) {
      toastError("Thêm link thất bại", errorMessage(err));
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Thêm link affiliate"
      description="Một sản phẩm có thể có nhiều link từ nhiều chương trình khác nhau."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={save} loading={saving} icon={<Plus className="h-4 w-4" />}>
            Thêm link
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tên link" required error={error && !label ? error : undefined}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Shopee Affiliate – chiến dịch 9/9" />
        </Field>
        <Field label="URL" required error={error && label ? error : undefined}>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" type="url" />
        </Field>
        <Field label="Chương trình">
          <Select value={program} onChange={(e) => setProgram(e.target.value)}>
            {AFFILIATE_PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          Link đầu tiên được thêm sẽ tự đặt làm mặc định. Hệ thống không bao giờ tự chỉnh sửa link affiliate của bạn.
        </p>
      </div>
    </Drawer>
  );
}
