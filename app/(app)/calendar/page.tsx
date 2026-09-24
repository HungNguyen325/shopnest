"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { api, errorMessage, useToast } from "@/components/providers";
import { Badge, Card, CardBody, CardHeader, EmptyState, SkeletonRows, StatusBadge } from "@/components/ui";
import { Button } from "@/components/ui";
import { Checkbox, Input, Segmented, Select } from "@/components/ui";
import { ConfirmDialog, Dialog, Drawer } from "@/components/ui";
import { PLATFORMS, PLAN_STATUSES, platformLabel, type PlatformId } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { dateKey } from "@/lib/utils";

type ViewMode = "month" | "week" | "day" | "list";

interface CalendarPost {
  id: string;
  title: string | null;
  hook: string | null;
  platform: string;
  contentType: string;
  status: string;
  scheduledAt: string;
  product: { id: string; name: string; images: { id: string; url: string }[] } | null;
}

interface PlanItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  postsPerDay: number;
  status: string;
  createdBy: string;
  _count: { slots: number };
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEKDAY_LABELS = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 0, label: "Chủ nhật" },
];

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<CalendarPost | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);

  const range = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
      return { start, end };
    }
    if (view === "week") {
      return {
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
      };
    }
    return { start: cursor, end: cursor };
  }, [view, cursor]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["calendar", range.start.toISOString(), range.end.toISOString(), statusFilter, platformFilter],
    queryFn: async () => {
      const qs = new URLSearchParams({ pageSize: "200", sort: "scheduled" });
      if (statusFilter) qs.set("status", statusFilter);
      if (platformFilter) qs.set("platform", platformFilter);
      const res = await api.get<{ items: CalendarPost[] }>(`/api/posts?${qs.toString()}`);
      return res.items.filter((post) => {
        if (!post.scheduledAt) return false;
        const at = new Date(post.scheduledAt);
        return at >= range.start && at <= addDays(range.end, 1);
      });
    },
  });

  const { data: plans, refetch: refetchPlans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get<PlanItem[]>("/api/plans"),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    (posts ?? []).forEach((post) => {
      const key = dateKey(new Date(post.scheduledAt));
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
    return map;
  }, [posts]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["calendar"] });
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);

  async function moveTo(post: CalendarPost, target: Date) {
    const original = new Date(post.scheduledAt);
    const next = new Date(target);
    next.setHours(original.getHours(), original.getMinutes(), 0, 0);
    try {
      await api.post(`/api/posts/${post.id}/status`, {
        status: post.status === "published" ? "ready" : "planned",
        scheduledAt: next.toISOString(),
      });
      success("Đã đổi lịch", `${format(next, "dd/MM/yyyy HH:mm", { locale: vi })}`);
      invalidate();
    } catch (err) {
      toastError("Kéo thả thất bại", errorMessage(err));
    }
  }

  function navigate(direction: -1 | 1) {
    if (view === "month") setCursor((c) => addMonths(c, direction));
    else if (view === "week") setCursor((c) => addDays(c, direction * 7));
    else setCursor((c) => addDays(c, direction));
  }

  const heading =
    view === "month"
      ? format(cursor, "MMMM yyyy", { locale: vi })
      : view === "week"
        ? `${format(range.start, "dd/MM", { locale: vi })} – ${format(range.end, "dd/MM/yyyy", { locale: vi })}`
        : format(cursor, "EEEE, dd/MM/yyyy", { locale: vi });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">Lịch nội dung</h1>
          <p className="mt-0.5 text-sm text-slate-500">Kéo thả bài sang ngày khác để đổi lịch. Bấm bài để mở chi tiết.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" icon={<CalendarDays className="h-4 w-4" />} onClick={() => setPlansOpen(true)}>
            Kế hoạch ({plans?.length ?? 0})
          </Button>
          <Button icon={<Sparkles className="h-4 w-4" />} onClick={() => setPlanOpen(true)}>
            Tạo kế hoạch
          </Button>
        </div>
      </header>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Trước"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              aria-label="Sau"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="text-[15px] font-semibold text-slate-900 capitalize">{heading}</h2>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
              Hôm nay
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              size="sm"
              value={view}
              onChange={(value) => setView(value)}
              options={[
                { id: "month" as const, label: "Tháng" },
                { id: "week" as const, label: "Tuần" },
                { id: "day" as const, label: "Ngày" },
                { id: "list" as const, label: "Danh sách" },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc trạng thái"
              className="h-8 w-auto text-xs"
            >
              <option value="">Mọi trạng thái</option>
              <option value="planned">Đã lên lịch</option>
              <option value="ready">Sẵn sàng</option>
              <option value="published">Đã đăng</option>
              <option value="draft">Bản nháp</option>
              <option value="failed">Đăng lỗi</option>
            </Select>
            <Select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              aria-label="Lọc nền tảng"
              className="h-8 w-auto text-xs"
            >
              <option value="">Mọi nền tảng</option>
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <Card>
          <CardBody>
            <SkeletonRows rows={8} />
          </CardBody>
        </Card>
      ) : (posts ?? []).length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="Khoảng thời gian này chưa có bài nào"
              description="Tạo kế hoạch 7 ngày với 1–2 bài mỗi ngày để lấp đầy lịch, hoặc kéo bài từ tuần khác sang."
              action={
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setPlanOpen(true)} icon={<Sparkles className="h-3.5 w-3.5" />}>
                    Tạo kế hoạch
                  </Button>
                  <Link href="/create">
                    <Button size="sm" variant="outline" icon={<Wand2 className="h-3.5 w-3.5" />}>
                      Tạo bài lẻ
                    </Button>
                  </Link>
                </div>
              }
            />
          </CardBody>
        </Card>
      ) : view === "list" ? (
        <ListView posts={posts ?? []} onOpen={setMoveTarget} />
      ) : (
        <GridView
          view={view}
          range={range}
          cursor={cursor}
          byDay={byDay}
          dragId={dragId}
          onDragStart={setDragId}
          onDropOnDay={(day) => {
            const post = (posts ?? []).find((p) => p.id === dragId);
            setDragId(null);
            if (post) void moveTo(post, day);
          }}
          onOpen={setMoveTarget}
        />
      )}

      <PlanWizard
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        onDone={() => {
          setPlanOpen(false);
          refetchPlans();
          invalidate();
        }}
      />

      <PlansManager
        open={plansOpen}
        plans={plans ?? []}
        onClose={() => setPlansOpen(false)}
        onChanged={() => {
          refetchPlans();
          invalidate();
        }}
      />

      {moveTarget ? (
        <MoveDrawer
          post={moveTarget}
          onClose={() => setMoveTarget(null)}
          onMoved={(date) => {
            void moveTo(moveTarget, date);
            setMoveTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grid views                                                          */
/* ------------------------------------------------------------------ */

function GridView({
  view,
  range,
  cursor,
  byDay,
  dragId,
  onDragStart,
  onDropOnDay,
  onOpen,
}: {
  view: ViewMode;
  range: { start: Date; end: Date };
  cursor: Date;
  byDay: Map<string, CalendarPost[]>;
  dragId: string | null;
  onDragStart: (id: string | null) => void;
  onDropOnDay: (day: Date) => void;
  onOpen: (post: CalendarPost) => void;
}) {
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const [dropKey, setDropKey] = useState<string | null>(null);

  if (view === "day") {
    const key = dateKey(cursor);
    const dayPosts = byDay.get(key) ?? [];
    return (
      <Card>
        <CardHeader title={format(cursor, "EEEE, dd/MM/yyyy", { locale: vi })} description={`${dayPosts.length} bài trong ngày`} />
        <CardBody className="space-y-2">
          {dayPosts.length > 0 ? (
            dayPosts.map((post) => <PostRow key={post.id} post={post} onOpen={onOpen} draggable onDragStart={onDragStart} />)
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">Chưa có bài nào trong ngày này.</p>
          )}
        </CardBody>
      </Card>
    );
  }

  const columns = view === "week" ? 7 : 7;

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
        {WEEKDAYS.map((label, index) => (
          <div key={label} className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500 sm:text-xs">
            {view === "week" ? WEEKDAY_LABELS[index].label : label}
          </div>
        ))}
      </div>

      <div className={cn("grid grid-cols-7", view === "week" ? "min-h-[420px]" : "")}>
        {days.map((day) => {
          const key = dateKey(day);
          const dayPosts = byDay.get(key) ?? [];
          const outside = view === "month" && !isSameMonth(day, cursor);
          const isDrop = dropKey === key;
          return (
            <div
              key={key}
              onDragOver={(event) => {
                event.preventDefault();
                setDropKey(key);
              }}
              onDragLeave={() => setDropKey((current) => (current === key ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                setDropKey(null);
                onDropOnDay(day);
              }}
              className={cn(
                "min-h-[92px] border-b border-r border-slate-100 p-1.5 transition-colors sm:min-h-[116px]",
                outside && "bg-slate-50/60",
                isDrop && "bg-brand-50 ring-1 ring-brand-300 ring-inset",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums",
                    isToday(day) ? "bg-brand-600 text-white" : outside ? "text-slate-400" : "text-slate-700",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayPosts.length > 2 ? (
                  <span className="text-[10px] text-slate-400 tabular-nums">{dayPosts.length}</span>
                ) : null}
              </div>

              <div className="space-y-1">
                {dayPosts.slice(0, view === "week" ? 6 : 3).map((post) => (
                  <PostChip
                    key={post.id}
                    post={post}
                    onOpen={onOpen}
                    onDragStart={onDragStart}
                    dragging={dragId === post.id}
                  />
                ))}
                {dayPosts.length > (view === "week" ? 6 : 3) ? (
                  <p className="px-1 text-[10px] text-slate-400">+{dayPosts.length - (view === "week" ? 6 : 3)} bài nữa</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="sr-only">{columns} cột</p>
    </div>
  );
}

function PostChip({
  post,
  onOpen,
  onDragStart,
  dragging,
}: {
  post: CalendarPost;
  onOpen: (post: CalendarPost) => void;
  onDragStart: (id: string | null) => void;
  dragging?: boolean;
}) {
  const time = format(new Date(post.scheduledAt), "HH:mm");
  const tone =
    post.status === "published"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : post.status === "ready"
        ? "border-violet-200 bg-violet-50 text-violet-800"
        : post.status === "failed"
          ? "border-red-200 bg-red-50 text-red-800"
          : post.status === "draft"
            ? "border-slate-200 bg-slate-100 text-slate-600"
            : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(post.id)}
      onDragEnd={() => onDragStart(null)}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(post);
        }
      }}
      className={cn(
        "group flex cursor-grab items-start gap-1 rounded-md border px-1.5 py-1 text-left transition active:cursor-grabbing",
        tone,
        dragging && "opacity-40 ring-1 ring-brand-400 ring-inset",
      )}
      title={`${time} · ${post.title ?? post.hook ?? ""}`}
    >
      <span className="shrink-0 text-[10px] font-semibold tabular-nums opacity-70">{time}</span>
      <span className="min-w-0 flex-1 truncate text-[11px] leading-tight font-medium">
        {post.title || post.hook || "Chưa có tiêu đề"}
      </span>
      <GripVertical className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-60" />
    </div>
  );
}

function PostRow({
  post,
  onOpen,
  draggable,
  onDragStart,
}: {
  post: CalendarPost;
  onOpen: (post: CalendarPost) => void;
  draggable?: boolean;
  onDragStart?: (id: string | null) => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={() => onDragStart?.(post.id)}
      className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition hover:border-brand-200"
    >
      <span className="w-12 shrink-0 text-xs font-semibold text-slate-500 tabular-nums">
        {format(new Date(post.scheduledAt), "HH:mm")}
      </span>
      <button type="button" onClick={() => onOpen(post)} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[13.5px] font-medium text-slate-900">
          {post.title || post.hook || "Chưa có tiêu đề"}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {platformLabel(post.platform)}
          {post.product ? ` · ${post.product.name}` : ""}
        </span>
      </button>
      <StatusBadge status={post.status} />
    </div>
  );
}

function ListView({ posts, onOpen }: { posts: CalendarPost[]; onOpen: (post: CalendarPost) => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    posts.forEach((post) => {
      const key = dateKey(new Date(post.scheduledAt));
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [posts]);

  return (
    <div className="space-y-4">
      {grouped.map(([key, dayPosts]) => (
        <Card key={key}>
          <CardHeader
            title={format(new Date(`${key}T00:00:00`), "EEEE, dd/MM/yyyy", { locale: vi })}
            description={`${dayPosts.length} bài`}
          />
          <CardBody className="space-y-2">
            {dayPosts.map((post) => (
              <PostRow key={post.id} post={post} onOpen={onOpen} />
            ))}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Move drawer (mobile friendly)                                       */
/* ------------------------------------------------------------------ */

function MoveDrawer({
  post,
  onClose,
  onMoved,
}: {
  post: CalendarPost;
  onClose: () => void;
  onMoved: (date: Date) => void;
}) {
  const current = new Date(post.scheduledAt);
  const [date, setDate] = useState(dateKey(current));
  const [time, setTime] = useState(format(current, "HH:mm"));

  return (
    <Drawer
      open
      onClose={onClose}
      title="Đổi lịch bài đăng"
      description={post.title || post.hook || "Chưa có tiêu đề"}
      side="bottom"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onMoved(new Date(`${date}T${time}:00`))}>Lưu lịch mới</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="label-text">Ngày</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="label-text">Giờ</span>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 7].map((offset) => {
            const day = addDays(new Date(), offset);
            return (
              <button
                key={offset}
                type="button"
                onClick={() => setDate(dateKey(day))}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
              >
                {offset === 0 ? "Hôm nay" : format(day, "dd/MM", { locale: vi })}
              </button>
            );
          })}
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          <p className="font-medium text-slate-700">{platformLabel(post.platform)}</p>
          {post.product ? <p className="mt-0.5">{post.product.name}</p> : null}
          <p className="mt-1">Mẹo: trên desktop bạn có thể kéo thả bài trực tiếp trên lịch tháng/tuần.</p>
        </div>
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Plan wizard                                                         */
/* ------------------------------------------------------------------ */

function PlanWizard({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { success, error: toastError } = useToast();
  const [days, setDays] = useState(7);
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [start, setStart] = useState(() => dateKey(addDays(new Date(), 1)));
  const [platforms, setPlatforms] = useState<PlatformId[]>(["tiktok"]);
  const [goal, setGoal] = useState("conversion");
  const [tone, setTone] = useState("natural");
  const [restDays, setRestDays] = useState<number[]>([0]);
  const [topics, setTopics] = useState("");
  const [excludeTopics, setExcludeTopics] = useState("");
  const [autoCreatePosts, setAutoCreatePosts] = useState(true);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products", "picker", ""],
    queryFn: () => api.get<{ items: { id: string; name: string; affiliateUrl: string | null }[] }>("/api/products?pageSize=40"),
    enabled: open,
  });

  async function create() {
    setBusy(true);
    setProgress("Đang gửi yêu cầu tới AI…");
    try {
      const res = await api.post<{
        plan: { name: string };
        slots: number;
        createdPosts: number;
        meta: { providerLabel: string; isFallbackEngine: boolean };
      }>("/api/ai/generate-plan", {
        days,
        postsPerDay,
        startDate: start,
        platforms,
        goal,
        tone,
        productIds,
        topics,
        excludeTopics,
        restDays,
        autoCreatePosts,
      });
      success(
        "Đã tạo kế hoạch",
        `${res.slots} slot · ${res.createdPosts} bài nháp · ${res.meta.isFallbackEngine ? "engine nội bộ" : res.meta.providerLabel}`,
      );
      onDone();
    } catch (err) {
      toastError("Tạo kế hoạch thất bại", errorMessage(err));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const totalSlots = days * postsPerDay - restDays.length * postsPerDay * Math.floor(days / 7);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Tạo kế hoạch nội dung"
      description="AI phân bổ sản phẩm, góc nội dung và giờ đăng, tránh lặp lại cùng một sản phẩm liên tiếp."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={create} loading={busy} icon={<Sparkles className="h-4 w-4" />} disabled={platforms.length === 0}>
            Tạo kế hoạch
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="label-text">Số ngày</span>
            <Input type="number" min={1} max={60} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </label>
          <label className="space-y-1.5">
            <span className="label-text">Bài mỗi ngày</span>
            <Select value={String(postsPerDay)} onChange={(e) => setPostsPerDay(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} bài/ngày
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="label-text">Bắt đầu từ</span>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Dự kiến khoảng <span className="font-semibold text-slate-800">{Math.max(0, totalSlots)}</span> bài trong kế hoạch
          (đã trừ ngày nghỉ).
        </p>

        <div>
          <p className="label-text mb-2">Nền tảng</p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((platform) => {
              const active = platforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setPlatforms((prev) =>
                      prev.includes(platform.id) ? prev.filter((p) => p !== platform.id) : [...prev, platform.id],
                    )
                  }
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    active ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 ring-inset hover:bg-slate-50",
                  )}
                >
                  {platform.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="label-text">Mục tiêu</span>
            <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="conversion">Tăng chuyển đổi</option>
              <option value="clicks">Tăng lượt click</option>
              <option value="awareness">Tăng nhận diện</option>
              <option value="comments">Tăng bình luận</option>
              <option value="saves">Tăng lượt lưu</option>
              <option value="followers">Tăng người theo dõi</option>
              <option value="trust">Xây dựng niềm tin</option>
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="label-text">Giọng văn</span>
            <Select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="natural">Tự nhiên</option>
              <option value="friendly">Gần gũi</option>
              <option value="honest_review">Review chân thật</option>
              <option value="expert">Chuyên gia</option>
              <option value="humorous">Hài hước</option>
              <option value="concise">Ngắn gọn</option>
              <option value="genz">Gen Z</option>
              <option value="persuasive">Thuyết phục</option>
            </Select>
          </label>
        </div>

        <div>
          <p className="label-text mb-2">Ngày nghỉ (không xếp bài)</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((day) => (
              <Checkbox
                key={day.value}
                label={day.label}
                checked={restDays.includes(day.value)}
                onChange={(event) =>
                  setRestDays((prev) =>
                    event.target.checked ? [...prev, day.value] : prev.filter((d) => d !== day.value),
                  )
                }
              />
            ))}
          </div>
        </div>

        <div>
          <p className="label-text mb-2">Sản phẩm đưa vào kế hoạch</p>
          {products?.items?.length ? (
            <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {products.items.map((product) => (
                <Checkbox
                  key={product.id}
                  label={`${product.name}${product.affiliateUrl ? "" : " (thiếu affiliate)"}`}
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
            <p className="text-[13px] text-slate-500">Chưa có sản phẩm. Kế hoạch sẽ dùng nội dung thương hiệu cá nhân.</p>
          )}
        </div>

        <label className="block space-y-1.5">
          <span className="label-text">Chủ đề ưu tiên</span>
          <Input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Ví dụ: chăm da mùa hanh khô, quà tặng cuối năm" />
        </label>
        <label className="block space-y-1.5">
          <span className="label-text">Chủ đề không muốn dùng</span>
          <Input value={excludeTopics} onChange={(e) => setExcludeTopics(e.target.value)} placeholder="Ví dụ: không nhắc tới giá, không nói về giảm cân" />
        </label>

        <Checkbox
          label="Tạo luôn bài nháp cho từng slot (khuyến nghị)"
          checked={autoCreatePosts}
          onChange={(event) => setAutoCreatePosts(event.target.checked)}
        />

        {busy ? (
          <p className="flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-[13px] text-brand-800">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {progress}
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Plans manager                                                       */
/* ------------------------------------------------------------------ */

function PlansManager({
  open,
  plans,
  onClose,
  onChanged,
}: {
  open: boolean;
  plans: PlanItem[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [removing, setRemoving] = useState<PlanItem | null>(null);
  const [copyOpen, setCopyOpen] = useState<PlanItem | null>(null);

  async function toggle(plan: PlanItem) {
    const next = plan.status === "paused" ? "active" : "paused";
    try {
      await api.patch(`/api/plans/${plan.id}`, { status: next });
      success(next === "paused" ? "Đã tạm dừng kế hoạch" : "Đã kích hoạt lại");
      onChanged();
    } catch (err) {
      toastError("Cập nhật thất bại", errorMessage(err));
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      await api.delete(`/api/plans/${removing.id}`);
      success("Đã xóa kế hoạch");
      setRemoving(null);
      onChanged();
    } catch (err) {
      toastError("Xóa thất bại", errorMessage(err));
    }
  }

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Kế hoạch nội dung" description="Tạm dừng, xóa hoặc sao chép ngày trong kế hoạch.">
        {plans.length === 0 ? (
          <EmptyState compact title="Chưa có kế hoạch nào" description="Tạo kế hoạch 7 ngày để bắt đầu." />
        ) : (
          <ul className="space-y-2.5">
            {plans.map((plan) => {
              const meta = PLAN_STATUSES.find((s) => s.id === plan.status);
              return (
                <li key={plan.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-slate-900">{plan.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {format(new Date(plan.startDate), "dd/MM", { locale: vi })} –{" "}
                        {format(new Date(plan.endDate), "dd/MM/yyyy", { locale: vi })} · {plan.postsPerDay} bài/ngày ·{" "}
                        {plan._count.slots} slot
                      </p>
                    </div>
                    {meta ? (
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", meta.badge)}>
                        {meta.label}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge tone={plan.createdBy === "ai" ? "brand" : "neutral"}>
                      {plan.createdBy === "ai" ? "Tạo bằng AI" : "Tạo thủ công"}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => toggle(plan)} icon={plan.status === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}>
                      {plan.status === "paused" ? "Tiếp tục" : "Tạm dừng"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCopyOpen(plan)} icon={<Copy className="h-3.5 w-3.5" />}>
                      Sao chép ngày
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(plan)} icon={<Trash2 className="h-3.5 w-3.5" />}>
                      Xóa
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title="Xóa kế hoạch?"
        description={`Toàn bộ ${removing?._count.slots ?? 0} slot trong “${removing?.name ?? ""}” sẽ bị xóa. Bài đăng đã tạo từ kế hoạch vẫn được giữ.`}
        confirmLabel="Xóa kế hoạch"
        destructive
      />

      {copyOpen ? (
        <CopyDayDialog plan={copyOpen} onClose={() => setCopyOpen(null)} onDone={onChanged} />
      ) : null}
    </>
  );
}

function CopyDayDialog({ plan, onClose, onDone }: { plan: PlanItem; onClose: () => void; onDone: () => void }) {
  const { success, error: toastError } = useToast();
  const [from, setFrom] = useState(dateKey(new Date(plan.startDate)));
  const [to, setTo] = useState(dateKey(addDays(new Date(plan.startDate), 1)));
  const [busy, setBusy] = useState(false);

  async function copy() {
    setBusy(true);
    try {
      const res = await api.post<{ copied: number }>(`/api/plans/${plan.id}/copy-day`, { from, to });
      success(`Đã sao chép ${res.copied} slot`);
      onDone();
      onClose();
    } catch (err) {
      toastError("Sao chép thất bại", errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Sao chép kế hoạch ngày"
      description={`Nhân bản toàn bộ slot của một ngày sang ngày khác trong “${plan.name}”.`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={copy} loading={busy}>
            Sao chép
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="label-text">Từ ngày</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="label-text">Sang ngày</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">Ngày đích sẽ bị ghi đè nếu đã có slot.</p>
    </Dialog>
  );
}
