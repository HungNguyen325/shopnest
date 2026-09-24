"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FileText,
  Lightbulb,
  Link2,
  MessageSquareText,
  Package,
  Wand2,
} from "lucide-react";
import { api } from "@/components/providers";
import { Card, CardBody, CardHeader, EmptyState, Skeleton, StatCard, StatusBadge } from "@/components/ui";
import { Button } from "@/components/ui";
import { PlatformGlyph } from "@/components/app-shell";
import { formatDateTime, formatRelativeDay } from "@/lib/utils";
import { contentTypeLabel, platformLabel } from "@/lib/constants";

interface DashboardData {
  stats: {
    products: number;
    unusedProducts: number;
    productsWithoutAffiliate: number;
    draft: number;
    planned: number;
    ready: number;
    published: number;
    failed: number;
    archived: number;
    total: number;
    dueToday: number;
  };
  dueToday: PostRow[];
  upcoming: PostRow[];
  recentPosts: PostRow[];
  activePlans: { id: string; name: string; postsPerDay: number; _count: { slots: number } }[];
  ai: { usedToday: number; remainingToday: number; dailyLimit: number; provider: string; model: string };
  suggestions: { id: string; name: string; category: string | null; painPoints: string | null }[];
  lastActivity: { id: string; action: string; entityType: string; createdAt: string }[];
}

interface PostRow {
  id: string;
  title: string | null;
  caption: string | null;
  platform: string;
  contentType: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt?: string | null;
  product: { id: string; name: string } | null;
}

const AI_QUICK = [
  { href: "/ideas", label: "Gợi ý chủ đề hot", icon: Lightbulb },
  { href: "/create", label: "Viết caption", icon: MessageSquareText },
  { href: "/create", label: "Tạo bài đăng", icon: Wand2 },
  { href: "/calendar?plan=week", label: "Lên kế hoạch tuần", icon: CalendarDays },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function todayLabel() {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });
  const { data: account } = useQuery({
    queryKey: ["account-lite"],
    queryFn: () => api.get<{ user: { name: string } }>("/api/account"),
    staleTime: 5 * 60_000,
  });

  const stats = data?.stats;
  const firstName = account?.user.name.split(" ")[0];

  return (
    <div className="space-y-5">
      {/* Greeting header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-2xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}! 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats?.dueToday
              ? stats.dueToday > 0
                ? `Hôm nay có ${stats.dueToday} bài tới hạn — cùng xử lý nhé!`
                : "Cùng tạo những nội dung thật chất và bứt phá nhé!"
              : "Đang tải dữ liệu…"}
          </p>
        </div>
        <p className="text-[13px] font-medium text-slate-400 first-letter:uppercase">{todayLabel()}</p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Tổng sản phẩm"
          value={stats?.products ?? 0}
          icon={<Package className="h-5 w-5" />}
          tone="info"
          loading={isLoading}
          hint={`${stats?.unusedProducts ?? 0} chưa có nội dung`}
        />
        <StatCard
          label="Bài đăng đã tạo"
          value={stats?.total ?? 0}
          icon={<FileText className="h-5 w-5" />}
          tone="brand"
          loading={isLoading}
          hint={`${stats?.draft ?? 0} bản nháp`}
        />
        <StatCard
          label="Đã đăng"
          value={stats?.published ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
          loading={isLoading}
          hint="Giữ nhịp đều đặn nhé"
        />
        <StatCard
          label="Bài sắp đăng"
          value={(stats?.planned ?? 0) + (stats?.ready ?? 0)}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="violet"
          loading={isLoading}
          hint={`${stats?.dueToday ?? 0} bài tới hạn hôm nay`}
        />
      </div>

      {isError ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Không tải được dữ liệu dashboard"
              description="Kiểm tra kết nối mạng rồi thử lại."
              action={
                <Button variant="outline" onClick={() => refetch()}>
                  Thử lại
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Upcoming posts */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Bài đăng sắp tới"
            description="Đã lên lịch trong 7 ngày tới"
            action={
              <Link href="/calendar" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
                Xem tất cả →
              </Link>
            }
          />
          <CardBody className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : data && [...data.dueToday, ...data.upcoming].length > 0 ? (
              [...data.dueToday, ...data.upcoming].slice(0, 6).map((post) => (
                <Link
                  key={post.id}
                  href={`/posts?open=${encodeURIComponent(post.id)}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <PlatformGlyph platform={post.platform} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-slate-800">
                      {post.title || post.caption?.slice(0, 60) || "Bài chưa có tiêu đề"}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {post.scheduledAt ? formatDateTime(post.scheduledAt) : "Chưa đặt lịch"} ·{" "}
                      {platformLabel(post.platform)} · {contentTypeLabel(post.contentType)}
                    </span>
                  </span>
                  <StatusBadge status={post.status} />
                </Link>
              ))
            ) : (
              <EmptyState
                compact
                title="Chưa có bài nào được lên lịch"
                description="Tạo kế hoạch tuần để lấp đầy lịch đăng của bạn."
                action={
                  <Link href="/calendar?plan=week">
                    <Button variant="outline" size="sm">
                      Tạo kế hoạch tuần
                    </Button>
                  </Link>
                }
              />
            )}
          </CardBody>
        </Card>

        {/* AI assistant */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[18px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky-50 shadow-sm">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
                  <Bot className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[15px] font-bold text-slate-900">AI Assistant</p>
                  <p className="text-xs text-slate-500">
                    Còn {data?.ai.remainingToday ?? "…"} lượt hôm nay · {data?.ai.provider ?? ""}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                Hỗ trợ bạn lên ý tưởng, viết caption, tạo bài đăng và lập kế hoạch nội dung.
              </p>
              <Link href="/create" className="mt-4 block">
                <span className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-medium text-white shadow-sm transition hover:bg-ink-hover">
                  Bắt đầu chat <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
            <ul className="border-t border-brand-100/80 bg-white/70 p-2">
              {AI_QUICK.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.label}>
                    <Link
                      href={a.href}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-800"
                    >
                      <Icon className="h-4 w-4 text-brand-500" />
                      {a.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <Card>
            <CardHeader
              title="Ý tưởng AI đề xuất"
              description="Từ sản phẩm chưa được dùng"
              icon={<Lightbulb className="h-4 w-4" />}
            />
            <CardBody className="space-y-2">
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : data && data.suggestions.length > 0 ? (
                data.suggestions.map((product) => (
                  <Link
                    key={product.id}
                    href={`/create?product=${product.id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 transition hover:border-brand-200 hover:bg-brand-50/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-slate-800">{product.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {product.painPoints?.split("\n")[0] || product.category || "Tạo nội dung cho sản phẩm này"}
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </Link>
                ))
              ) : (
                <p className="py-3 text-center text-[13px] text-slate-500">
                  Mọi sản phẩm đều đã có nội dung. Thêm sản phẩm mới để nhận gợi ý.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recent + warnings */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Hoạt động gần đây"
            action={
              <Link href="/posts" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
                Tất cả bài →
              </Link>
            }
          />
          <CardBody className="space-y-1.5">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : data && data.recentPosts.length > 0 ? (
              data.recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts?open=${encodeURIComponent(post.id)}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <PlatformGlyph platform={post.platform} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-slate-800">
                      {post.title || post.caption?.slice(0, 60) || "Bài chưa có tiêu đề"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {platformLabel(post.platform)} ·{" "}
                      {formatRelativeDay(post.publishedAt ?? post.scheduledAt ?? post.createdAt ?? null)}
                    </span>
                  </span>
                  <StatusBadge status={post.status} />
                </Link>
              ))
            ) : (
              <EmptyState
                compact
                title="Chưa có bài đăng nào"
                description="Tạo bài đầu tiên từ sản phẩm trong kho."
                action={
                  <Link href="/create">
                    <Button size="sm">Tạo bài đăng</Button>
                  </Link>
                }
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Cần bổ sung" icon={<AlertTriangle className="h-4 w-4" />} />
          <CardBody className="space-y-2.5">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <Link
                  href="/products?missingAffiliate=1"
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 transition hover:border-amber-200 hover:bg-amber-50/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-slate-800">
                      {stats?.productsWithoutAffiliate ?? 0} sản phẩm thiếu link affiliate
                    </span>
                    <span className="block text-xs text-slate-500">AI sẽ chỉ viết CTA chung</span>
                  </span>
                </Link>
                <Link
                  href="/products?unused=1"
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Package className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-slate-800">
                      {stats?.unusedProducts ?? 0} sản phẩm chưa có nội dung
                    </span>
                    <span className="block text-xs text-slate-500">Tạo bài để không bỏ sót</span>
                  </span>
                </Link>
                {data?.activePlans?.length ? (
                  <div className="rounded-xl border border-[var(--border)] px-3 py-2.5">
                    <p className="text-[13px] font-semibold text-slate-800">Kế hoạch đang chạy</p>
                    <ul className="mt-1.5 space-y-1">
                      {data.activePlans.map((plan) => (
                        <li key={plan.id} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="truncate">{plan.name}</span>
                          <span className="shrink-0 tabular-nums">
                            {plan._count.slots} slot · {plan.postsPerDay}/ngày
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
