"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Copy, Trash2, Wand2 } from "lucide-react";
import { api, errorMessage, useToast } from "@/components/providers";
import { Badge, Card, CardBody, EmptyState, SkeletonRows } from "@/components/ui";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui";
import { CopyButton } from "@/components/ui";
import { contentTypeLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: string | null;
  content: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplateContent {
  title?: string;
  hook?: string;
  caption?: string;
  body?: string;
  call_to_action?: string;
  hashtags?: string[];
}

function parse(template: Template): TemplateContent {
  try {
    return JSON.parse(template.content) as TemplateContent;
  } catch {
    return { caption: template.content };
  }
}

export default function TemplatesPage() {
  const { success, error: toastError } = useToast();
  const [removing, setRemoving] = useState<Template | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<Template[]>("/api/templates"),
  });

  async function trackUsage(template: Template) {
    try {
      await api.patch(`/api/templates/${template.id}`, {});
    } catch {
      // Non-critical: usage counter only.
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      await api.delete(`/api/templates/${removing.id}`);
      success("Đã xóa mẫu");
      setRemoving(null);
      refetch();
    } catch (err) {
      toastError("Xóa thất bại", errorMessage(err));
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">Bộ sưu tập mẫu</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Những nội dung bạn đã lưu làm mẫu để tái sử dụng cho sản phẩm khác.
          </p>
        </div>
        <Link href="/create">
          <Button icon={<Wand2 className="h-4 w-4" />}>Tạo bài mới</Button>
        </Link>
      </header>

      {isLoading ? (
        <Card>
          <CardBody>
            <SkeletonRows rows={4} />
          </CardBody>
        </Card>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((template) => {
            const content = parse(template);
            const isOpen = expanded === template.id;
            const text = [content.hook, content.caption, content.call_to_action]
              .filter(Boolean)
              .join("\n\n");
            return (
              <Card key={template.id} className="flex flex-col">
                <CardBody className="flex flex-1 flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 truncate text-[14.5px] font-semibold text-slate-900">{template.name}</h2>
                    <Bookmark className="h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.category ? <Badge tone="neutral">{contentTypeLabel(template.category)}</Badge> : null}
                    <Badge tone="brand">Dùng {template.usageCount} lần</Badge>
                  </div>

                  <p className={`text-[13px] leading-relaxed text-slate-600 ${isOpen ? "" : "line-clamp-3"}`}>
                    {text || "Mẫu chưa có nội dung."}
                  </p>

                  {content.hashtags?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {content.hashtags.slice(0, 5).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <p className="text-[11px] text-slate-400">Lưu lúc {formatDateTime(template.createdAt)}</p>

                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : template.id)}>
                      {isOpen ? "Thu gọn" : "Xem đầy đủ"}
                    </Button>
                    <CopyButton value={text} label="Copy" variant="ghost" />
                    <Link href="/create" onClick={() => void trackUsage(template)} className="flex-1">
                      <Button size="sm" className="w-full">
                        Dùng mẫu
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Xóa ${template.name}`}
                      onClick={() => setRemoving(template)}
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                    />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Copy className="h-5 w-5" />}
              title="Chưa có mẫu nào"
              description="Sau khi AI tạo nội dung ưng ý, bấm “Lưu thành mẫu” để tái sử dụng cho sản phẩm khác."
              action={
                <Link href="/create">
                  <Button>Tạo nội dung</Button>
                </Link>
              }
            />
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title="Xóa mẫu?"
        description={`Mẫu “${removing?.name ?? ""}” sẽ bị xóa vĩnh viễn.`}
        confirmLabel="Xóa mẫu"
        destructive
      />
    </div>
  );
}
