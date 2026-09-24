"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  MousePointerClick,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { api } from "@/components/providers";
import { Badge, Card, CardBody, CardHeader, EmptyState, Skeleton, StatCard, StatusBadge } from "@/components/ui";
import { Select } from "@/components/ui";
import { PLATFORMS, platformLabel } from "@/lib/constants";
import { formatNumber, formatPercent, formatVND } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

interface Analytics {
  range: { days: number; since: string };
  kpi: {
    totalPosts: number;
    published: number;
    planned: number;
    publishRate: number;
    onTimeRate: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    orders: number;
    revenue: number;
    ctr: number;
    aiRequests: number;
    aiTokens: number;
  };
  series: { date: string; created: number; published: number }[];
  byStatus: { status: string; count: number }[];
  byPlatform: { platform: string; label: string; count: number }[];
  byContentType: { contentType: string; label: string; count: number }[];
  byProduct: {
    productId: string | null;
    name: string;
    posts: number;
    views: number;
    clicks: number;
    orders: number;
    revenue: number;
  }[];
  topPosts: {
    id: string;
    title: string | null;
    platform: string;
    views: number;
    likes: number;
    clicks: number;
    publishedAt: string | null;
    product: { name: string } | null;
  }[];
}

export default function AnalyticsPage() {
  const [days, setDays] = useState("30");
  const [platform, setPlatform] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", days, platform],
    queryFn: () =>
      api.get<Analytics>(`/api/analytics?days=${days}${platform ? `&platform=${platform}` : ""}`),
  });

  const maxSeries = useMemo(
    () => Math.max(1, ...(data?.series ?? []).map((s) => Math.max(s.created, s.published))),
    [data],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">Phân tích hiệu quả</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Số liệu do bạn nhập khi xác nhận đã đăng. Không có cam kết về kết quả kinh doanh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onChange={(e) => setDays(e.target.value)} aria-label="Khoảng thời gian" className="h-9 w-auto">
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
            <option value="90">90 ngày</option>
          </Select>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Lọc nền tảng" className="h-9 w-auto">
            <option value="">Mọi nền tảng</option>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Tổng bài" value={data?.kpi.totalPosts ?? 0} icon={<BarChart3 className="h-4.5 w-4.5" />} loading={isLoading} />
        <StatCard
          label="Đã đăng"
          value={data?.kpi.published ?? 0}
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          tone="success"
          loading={isLoading}
          hint={`Tỷ lệ đăng ${formatPercent(data?.kpi.publishRate ?? 0)}`}
        />
        <StatCard
          label="Đăng đúng lịch"
          value={formatPercent(data?.kpi.onTimeRate ?? 0)}
          icon={<Clock className="h-4.5 w-4.5" />}
          tone="info"
          loading={isLoading}
        />
        <StatCard label="Lượt xem" value={formatNumber(data?.kpi.views)} icon={<Eye className="h-4.5 w-4.5" />} loading={isLoading} />
        <StatCard
          label="Click link"
          value={formatNumber(data?.kpi.clicks)}
          icon={<MousePointerClick className="h-4.5 w-4.5" />}
          tone="brand"
          loading={isLoading}
          hint={`CTR ${formatPercent(data?.kpi.ctr ?? 0, 1)}`}
        />
        <StatCard
          label="Doanh thu ghi nhận"
          value={formatVND(data?.kpi.revenue)}
          icon={<ShoppingBag className="h-4.5 w-4.5" />}
          tone="warning"
          loading={isLoading}
          hint={`${data?.kpi.orders ?? 0} đơn`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Nhịp đăng bài"
            description={`Số bài tạo mới và số bài đã đăng trong ${data?.range.days ?? 30} ngày`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : data && data.series.length > 0 ? (
              <>
                <div className="flex h-48 items-end gap-[3px]">
                  {data.series.map((point) => (
                    <div key={point.date} className="group relative flex h-full flex-1 flex-col justify-end gap-0.5">
                      <div
                        className="w-full rounded-t bg-brand-200 transition-all duration-200 group-hover:bg-brand-300"
                        style={{ height: `${(point.created / maxSeries) * 100}%` }}
                        title={`Tạo mới: ${point.created}`}
                      />
                      <div
                        className="w-full rounded-t bg-emerald-400 transition-all duration-200 group-hover:bg-emerald-500"
                        style={{ height: `${(point.published / maxSeries) * 100}%` }}
                        title={`Đã đăng: ${point.published}`}
                      />
                      <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] whitespace-nowrap text-white group-hover:block">
                        {point.date}: {point.created} tạo · {point.published} đăng
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-brand-200" /> Tạo mới
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" /> Đã đăng
                    </span>
                  </div>
                  <span>{data.series[0]?.date} → {data.series[data.series.length - 1]?.date}</span>
                </div>
              </>
            ) : (
              <EmptyState compact title="Chưa có dữ liệu" description="Tạo và đăng vài bài để xem nhịp đăng." />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Theo trạng thái" />
          <CardBody className="space-y-2.5">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : data && data.byStatus.length > 0 ? (
              data.byStatus.map((row) => {
                const max = Math.max(...data.byStatus.map((r) => r.count), 1);
                return (
                  <div key={row.status}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <StatusBadge status={row.status} />
                      <span className="font-medium text-slate-700 tabular-nums">{row.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-400" style={{ width: `${(row.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-[13px] text-slate-500">Chưa có dữ liệu.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Theo nền tảng" />
          <CardBody className="space-y-2.5">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : data && data.byPlatform.length > 0 ? (
              data.byPlatform.map((row) => {
                const max = Math.max(...data.byPlatform.map((r) => r.count), 1);
                return (
                  <div key={row.platform}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="text-slate-700">{row.label}</span>
                      <span className="font-medium text-slate-700 tabular-nums">{row.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-400" style={{ width: `${(row.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-[13px] text-slate-500">Chưa có dữ liệu.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Theo loại nội dung" />
          <CardBody className="space-y-2.5">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : data && data.byContentType.length > 0 ? (
              data.byContentType.slice(0, 8).map((row) => {
                const max = Math.max(...data.byContentType.map((r) => r.count), 1);
                return (
                  <div key={row.contentType}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="text-slate-700">{row.label}</span>
                      <span className="font-medium text-slate-700 tabular-nums">{row.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: `${(row.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-[13px] text-slate-500">Chưa có dữ liệu.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Sản phẩm hiệu quả nhất" description="Xếp theo số bài đã tạo từ sản phẩm" />
        <CardBody className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : data && data.byProduct.length > 0 ? (
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] tracking-wide text-slate-500 uppercase">
                  <th className="py-2 pr-3 font-medium">Sản phẩm</th>
                  <th className="py-2 pr-3 font-medium">Bài</th>
                  <th className="py-2 pr-3 font-medium">Xem</th>
                  <th className="py-2 pr-3 font-medium">Click</th>
                  <th className="py-2 pr-3 font-medium">Đơn</th>
                  <th className="py-2 font-medium">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.byProduct.map((row) => (
                  <tr key={row.productId ?? row.name} className="transition hover:bg-slate-50/70">
                    <td className="max-w-[240px] truncate py-2.5 pr-3 font-medium text-slate-800">{row.name}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-600">{row.posts}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-600">{formatNumber(row.views)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-600">{formatNumber(row.clicks)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-600">{row.orders}</td>
                    <td className="py-2.5 font-medium tabular-nums text-slate-800">{formatVND(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-6 text-center text-[13px] text-slate-500">Chưa có dữ liệu sản phẩm.</p>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bài đăng nổi bật" description="Xếp theo lượt xem" />
          <CardBody className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : data && data.topPosts.length > 0 ? (
              data.topPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-slate-900">{post.title || "Không có tiêu đề"}</p>
                    <p className="truncate text-xs text-slate-500">
                      {platformLabel(post.platform)}
                      {post.product ? ` · ${post.product.name}` : ""}
                      {post.publishedAt ? ` · ${formatDateTime(post.publishedAt)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-500 tabular-nums">
                    <p>{formatNumber(post.views)} xem</p>
                    <p>{formatNumber(post.clicks)} click</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-[13px] text-slate-500">Chưa có bài đã đăng.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Sử dụng AI" icon={<Sparkles className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] text-slate-500">Yêu cầu AI</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
                      {formatNumber(data?.kpi.aiRequests)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] text-slate-500">Token đã dùng</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
                      {formatNumber(data?.kpi.aiTokens)}
                    </p>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-600">
                  Lượt AI được tính theo yêu cầu thành công. Giới hạn mặc định 20 lượt/ngày — quản trị viên có thể thay
                  đổi trong AI Settings.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="neutral">Tương tác: {formatNumber(data?.kpi.likes)} thích</Badge>
                  <Badge tone="neutral">{formatNumber(data?.kpi.comments)} bình luận</Badge>
                  <Badge tone="neutral">{formatNumber(data?.kpi.shares)} chia sẻ</Badge>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <p className="text-center text-xs text-slate-400">
        Dữ liệu hiển thị theo nội dung bạn tự nhập. ContentFlow AI không cam kết hiệu quả kinh doanh hay thu nhập.
      </p>
    </div>
  );
}
