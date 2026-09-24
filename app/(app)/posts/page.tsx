"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Wand2,
} from "lucide-react";
import { api, errorMessage, useToast } from "@/components/providers";
import { Badge, Card, CardBody, EmptyState, SkeletonRows, StatusBadge } from "@/components/ui";
import { Button } from "@/components/ui";
import { ConfirmDialog, Drawer } from "@/components/ui";
import { CopyButton } from "@/components/ui";
import { Input, Select, Textarea } from "@/components/ui";
import {
  CONTENT_TYPES,
  PLATFORMS,
  POST_STATUS_META,
  POST_STATUSES,
  contentTypeLabel,
  platformLabel,
  type PostStatus,
} from "@/lib/constants";
import { formatDateTime, formatRelativeDay } from "@/lib/utils";
import { parseJsonArray } from "@/lib/utils";

interface PostItem {
  id: string;
  title: string | null;
  hook: string | null;
  caption: string | null;
  body: string | null;
  callToAction: string | null;
  hashtags: string | null;
  pinnedComment: string | null;
  videoScript: string | null;
  contentAngle: string | null;
  notes: string | null;
  platform: string;
  contentType: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  publishedUrl: string | null;
  generatedBy: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  orders: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string; affiliateUrl: string | null; images: { id: string; url: string }[] } | null;
}

interface PostListResponse {
  items: PostItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: Record<string, number>;
}

function PostsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [platform, setPlatform] = useState("");
  const [contentType, setContentType] = useState("");
  const [search, setSearch] = useState("");
  const [sort] = useState("updated");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const [debounced, setDebounced] = useState(search);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filterSignature = JSON.stringify({ status, platform, contentType, debounced, sort });
  const [prevSignature, setPrevSignature] = useState(filterSignature);
  if (filterSignature !== prevSignature) {
    setPrevSignature(filterSignature);
    setPage(1);
  }

  const query = useMemo(() => {
    const qs = new URLSearchParams({ page: String(page), pageSize: "12", sort });
    if (status) qs.set("status", status);
    if (platform) qs.set("platform", platform);
    if (contentType) qs.set("contentType", contentType);
    if (debounced) qs.set("q", debounced);
    return qs.toString();
  }, [page, sort, status, platform, contentType, debounced]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["posts", query],
    queryFn: () => api.get<PostListResponse>(`/api/posts?${query}`),
    placeholderData: keepPreviousData,
  });

  const openPost = data?.items.find((p) => p.id === openId) ?? null;

  function invalidate() {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 lg:text-2xl">Bài đăng</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {data ? `Quản lý tất cả bài đăng của bạn · ${data.total} bài · ${data.statusCounts.published ?? 0} đã đăng · ${data.statusCounts.planned ?? 0} đã lên lịch` : "Đang tải…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/calendar">
            <Button variant="outline" icon={<CalendarClock className="h-4 w-4" />}>
              Lịch nội dung
            </Button>
          </Link>
          <Link href="/create">
            <Button icon={<Wand2 className="h-4 w-4" />}>Tạo bài đăng</Button>
          </Link>
        </div>
      </header>

      {/* Status tabs */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setStatus("")}
          aria-pressed={status === ""}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            status === "" ? "bg-ink text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-[var(--border)] ring-inset hover:bg-brand-50/60 hover:text-brand-800"
          }`}
        >
          Tất cả {data ? `(${data.statusCounts.total ?? 0})` : ""}
        </button>
        {POST_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              status === s ? "bg-ink text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-[var(--border)] ring-inset hover:bg-brand-50/60 hover:text-brand-800"
            }`}
          >
            {POST_STATUS_META[s].label} {data ? `(${data.statusCounts[s] ?? 0})` : ""}
          </button>
        ))}
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề, caption, ghi chú…"
              aria-label="Tìm bài đăng"
              className="pl-9"
            />
          </div>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Lọc nền tảng">
            <option value="">Mọi nền tảng</option>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          <Select value={contentType} onChange={(e) => setContentType(e.target.value)} aria-label="Lọc loại nội dung">
            <option value="">Mọi loại nội dung</option>
            {CONTENT_TYPES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {isLoading ? (
        <Card>
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        </Card>
      ) : data && data.items.length > 0 ? (
        <>
          <ul className="space-y-2.5">
            {data.items.map((post) => {
              const cover = post.product?.images?.[0];
              return (
                <li key={post.id}>
                  <Card className="transition duration-150 hover:shadow-md">
                    <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.url}
                          alt=""
                          loading="lazy"
                          className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20"
                        />
                      ) : (
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300 sm:h-20 sm:w-20">
                          <FileText className="h-6 w-6" />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenId(post.id)}
                            className="min-w-0 text-left"
                          >
                            <h2 className="truncate text-[15px] font-semibold text-slate-900 hover:text-brand-700">
                              {post.title || post.caption?.slice(0, 70) || "Bài chưa có tiêu đề"}
                            </h2>
                          </button>
                          <StatusBadge status={post.status} />
                        </div>

                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                          {post.hook || post.caption || "Chưa có nội dung."}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <Badge tone="neutral">{platformLabel(post.platform)}</Badge>
                          <Badge tone="neutral">{contentTypeLabel(post.contentType)}</Badge>
                          {post.product ? (
                            <Link href={`/products/${encodeURIComponent(post.product.id)}`}>
                              <Badge tone="brand">
                                <Package className="h-3 w-3" />
                                {post.product.name}
                              </Badge>
                            </Link>
                          ) : (
                            <Badge tone="neutral">Không gắn sản phẩm</Badge>
                          )}
                          {post.scheduledAt ? (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <CalendarClock className="h-3 w-3" />
                              {formatDateTime(post.scheduledAt)}
                            </span>
                          ) : null}
                          {post.publishedAt ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {formatRelativeDay(post.publishedAt)}
                            </span>
                          ) : null}
                          {post.generatedBy?.startsWith("mock") ? (
                            <Badge tone="warning">engine nội bộ</Badge>
                          ) : post.generatedBy ? (
                            <span className="truncate text-slate-400">{post.generatedBy}</span>
                          ) : null}
                        </div>

                        {post.status === "published" ? (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>{post.views.toLocaleString("vi-VN")} xem</span>
                            <span>{post.likes.toLocaleString("vi-VN")} thích</span>
                            <span>{post.clicks.toLocaleString("vi-VN")} click</span>
                            {post.orders ? <span>{post.orders} đơn</span> : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {post.publishedUrl ? (
                          <a
                            href={post.publishedUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label="Mở bài đã đăng"
                            className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-brand-200 hover:text-brand-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => setOpenId(post.id)} icon={<Pencil className="h-3.5 w-3.5" />}>
                          Mở
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>

          {data.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trước
              </Button>
              <span className="text-[13px] text-slate-500">
                {data.page} / {data.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Sau
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Card>
          <CardBody>
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title={status || debounced ? "Không có bài nào khớp bộ lọc" : "Chưa có bài đăng nào"}
              description={
                status || debounced
                  ? "Thử đổi trạng thái hoặc từ khóa tìm kiếm."
                  : "Tạo bài đầu tiên bằng AI từ sản phẩm trong kho của bạn."
              }
              action={
                <Link href="/create">
                  <Button icon={<Plus className="h-4 w-4" />}>Tạo bài đăng</Button>
                </Link>
              }
            />
          </CardBody>
        </Card>
      )}

      {openPost ? (
        <PostDrawer
          key={openPost.id}
          post={openPost}
          onClose={() => {
            setOpenId(null);
            const url = new URL(window.location.href);
            url.searchParams.delete("open");
            router.replace(url.pathname + url.search);
          }}
          onChanged={invalidate}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post detail drawer                                                  */
/* ------------------------------------------------------------------ */

function PostDrawer({
  post,
  onClose,
  onChanged,
}: {
  post: PostItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [draft, setDraft] = useState({
    title: post.title ?? "",
    hook: post.hook ?? "",
    caption: post.caption ?? "",
    body: post.body ?? "",
    callToAction: post.callToAction ?? "",
    notes: post.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hashtags = parseJsonArray(post.hashtags);
  const fullText = [draft.hook, draft.caption, draft.callToAction, hashtags.map((h) => `#${h}`).join(" ")]
    .filter(Boolean)
    .join("\n\n");

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/api/posts/${post.id}`, {
        title: draft.title,
        hook: draft.hook,
        caption: draft.caption,
        body: draft.body,
        callToAction: draft.callToAction,
        notes: draft.notes,
      });
      success("Đã lưu thay đổi");
      onChanged();
    } catch (err) {
      toastError("Lưu thất bại", errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(next: PostStatus) {
    try {
      await api.post(`/api/posts/${post.id}/status`, {
        status: next,
        ...(next === "planned" && !post.scheduledAt ? { scheduledAt: new Date().toISOString() } : {}),
      });
      success(`Đã chuyển sang ${POST_STATUS_META[next].label}`);
      onChanged();
    } catch (err) {
      toastError("Đổi trạng thái thất bại", errorMessage(err));
    }
  }

  async function feedback(type: "like" | "dislike" | "effective") {
    try {
      await api.post(`/api/posts/${post.id}/feedback`, { feedbackType: type });
      success("Đã ghi nhận phản hồi");
    } catch (err) {
      toastError("Gửi phản hồi thất bại", errorMessage(err));
    }
  }

  async function remove() {
    try {
      await api.delete(`/api/posts/${post.id}`);
      success("Đã xóa bài đăng");
      onChanged();
      onClose();
    } catch (err) {
      toastError("Xóa thất bại", errorMessage(err));
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={draft.title || "Chi tiết bài đăng"}
      description={`${platformLabel(post.platform)} · ${contentTypeLabel(post.contentType)} · ${POST_STATUS_META[post.status as PostStatus].label}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => setDeleteOpen(true)} icon={<Trash2 className="h-4 w-4" />}>
            Xóa
          </Button>
          <CopyButton value={fullText} label="Sao chép nội dung" variant="outline" />
          {post.status === "published" ? null : (
            <Button onClick={() => setPublishOpen(true)} icon={<CheckCircle2 className="h-4 w-4" />}>
              Xác nhận đã đăng
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* Status flow */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="label-text mb-2">Trạng thái</p>
          <div className="flex flex-wrap gap-1.5">
            {POST_STATUSES.filter((s) => s !== "published").map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeStatus(s)}
                disabled={post.status === s}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed ${
                  post.status === s
                    ? "bg-ink text-white"
                    : "bg-white text-slate-600 ring-1 ring-[var(--border)] ring-inset hover:bg-brand-50/60 hover:text-brand-800"
                }`}
              >
                {POST_STATUS_META[s].label}
              </button>
            ))}
          </div>
          {post.status === "published" ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Đã đăng {post.publishedAt ? formatDateTime(post.publishedAt) : ""}
              {post.publishedUrl ? " · có link bài thật" : " · chưa nhập link"}
            </p>
          ) : null}
        </div>

        {/* Editing */}
        <div className="space-y-3.5">
          <label className="block space-y-1.5">
            <span className="label-text">Tiêu đề</span>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="label-text">Hook</span>
            <Textarea rows={2} value={draft.hook} onChange={(e) => setDraft({ ...draft, hook: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="label-text flex items-center justify-between">
              Caption
              <span className="text-[11px] font-normal text-slate-400 tabular-nums">{draft.caption.length} ký tự</span>
            </span>
            <Textarea rows={9} value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="label-text">CTA</span>
            <Textarea rows={2} value={draft.callToAction} onChange={(e) => setDraft({ ...draft, callToAction: e.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="label-text">Ghi chú nội bộ</span>
            <Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </label>

          <div className="flex items-center justify-between gap-2">
            <Button onClick={save} loading={saving}>
              Lưu thay đổi
            </Button>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => feedback("like")} icon={<ThumbsUp className="h-3.5 w-3.5" />}>
                Hợp
              </Button>
              <Button size="sm" variant="ghost" onClick={() => feedback("dislike")} icon={<ThumbsDown className="h-3.5 w-3.5" />}>
                Chưa hợp
              </Button>
            </div>
          </div>
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label-text">Hashtag</span>
              <CopyButton value={hashtags.map((h) => `#${h}`).join(" ")} label="Copy" variant="ghost" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Product + links */}
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="label-text mb-2">Sản phẩm &amp; link</p>
          {post.product ? (
            <div className="flex items-start justify-between gap-2">
              <Link href={`/products/${encodeURIComponent(post.product.id)}`} className="min-w-0 text-[13px] font-medium text-brand-700 hover:underline">
                {post.product.name}
              </Link>
              {post.product.affiliateUrl ? (
                <CopyButton value={post.product.affiliateUrl} label="Copy affiliate" variant="ghost" />
              ) : (
                <Badge tone="warning">
                  <Link2 className="h-3 w-3" /> thiếu affiliate
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">Bài này không gắn sản phẩm.</p>
          )}
          {post.publishedUrl ? (
            <a
              href={post.publishedUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 flex items-center gap-1.5 truncate text-[13px] text-brand-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              {post.publishedUrl}
            </a>
          ) : null}
        </div>

        {/* Meta */}
        <dl className="grid grid-cols-2 gap-2 text-[13px]">
          <MetaItem label="Ngày đăng dự kiến" value={post.scheduledAt ? formatDateTime(post.scheduledAt) : "—"} />
          <MetaItem label="Ngày đăng thực tế" value={post.publishedAt ? formatDateTime(post.publishedAt) : "—"} />
          <MetaItem label="Tạo lúc" value={formatDateTime(post.createdAt)} />
          <MetaItem label="Nguồn tạo" value={post.generatedBy ?? "—"} />
        </dl>

        {post.generatedBy?.startsWith("mock") ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Bài này được tạo bằng engine nội bộ (chưa có API key AI). Thêm khóa Groq/Gemini trong AI Settings rồi tạo lại
            để dùng mô hình ngôn ngữ thật.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <Link href={`/create?product=${post.product?.id ?? ""}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full" icon={<RotateCcw className="h-3.5 w-3.5" />}>
              Tạo bài tương tự
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => changeStatus("archived")} icon={<Archive className="h-3.5 w-3.5" />}>
            Lưu trữ
          </Button>
        </div>
      </div>

      <PublishDialog
        open={publishOpen}
        postId={post.id}
        initialNotes={post.notes ?? ""}
        onClose={() => setPublishOpen(false)}
        onDone={() => {
          setPublishOpen(false);
          onChanged();
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        title="Xóa bài đăng?"
        description="Toàn bộ nội dung và lịch sử phiên bản của bài này sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa bài"
        destructive
      />
    </Drawer>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium text-slate-800">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Publish confirmation                                                */
/* ------------------------------------------------------------------ */

function PublishDialog({
  open,
  postId,
  initialNotes,
  onClose,
  onDone,
}: {
  open: boolean;
  postId: string;
  initialNotes: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [publishedUrl, setPublishedUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState(initialNotes);
  const [metrics, setMetrics] = useState({ views: "", likes: "", comments: "", shares: "", clicks: "", orders: "", revenue: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    if (publishedUrl && !/^https?:\/\/\S+$/i.test(publishedUrl.trim())) {
      setError("Link bài đăng phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/posts/${postId}/publish`, {
        publishedUrl: publishedUrl.trim(),
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
        notes,
        ...Object.fromEntries(
          Object.entries(metrics)
            .filter(([, value]) => value !== "")
            .map(([key, value]) => [key, Number(value)]),
        ),
      });
      success("Đã đánh dấu đã đăng", publishedUrl ? "Đã lưu link bài thật." : "Chưa nhập link bài đăng.");
      onDone();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toastError("Xác nhận thất bại", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Xác nhận đã đăng"
      description="Hệ thống không tự đánh dấu đã đăng — thao tác này là xác nhận thủ công của bạn."
      side="bottom"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="success" onClick={confirm} loading={busy} icon={<CheckCircle2 className="h-4 w-4" />}>
            Xác nhận đã đăng
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="label-text">Link bài đăng thực tế</span>
          <Input
            value={publishedUrl}
            onChange={(e) => setPublishedUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@ban/video/…"
            type="url"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="label-text">Thời gian đăng thực tế</span>
          <Input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="label-text">Ghi chú</span>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ví dụ: đăng lúc đang live, cần theo dõi comment" />
        </label>

        <div>
          <p className="label-text mb-2">Số liệu (không bắt buộc, cập nhật sau cũng được)</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {(
              [
                ["views", "Lượt xem"],
                ["likes", "Lượt thích"],
                ["comments", "Bình luận"],
                ["shares", "Chia sẻ"],
                ["clicks", "Click link"],
                ["orders", "Đơn hàng"],
                ["revenue", "Doanh thu"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block space-y-1">
                <span className="text-[11px] text-slate-500">{label}</span>
                <Input
                  inputMode="numeric"
                  value={metrics[key]}
                  onChange={(e) => setMetrics({ ...metrics, [key]: e.target.value })}
                  placeholder="0"
                />
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
            {error}
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}

export default function PostsPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        </Card>
      }
    >
      <PostsInner />
    </Suspense>
  );
}
