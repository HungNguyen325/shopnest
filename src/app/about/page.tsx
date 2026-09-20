import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PublicShell } from "@/components/public-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Giới thiệu" };

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <PublicShell siteName={s.siteName} footerNote={s.footerNote}>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm font-medium text-[color:var(--nest-muted)]">Giới thiệu</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{s.siteName}</h1>
        <p className="mt-5 text-[15px] leading-relaxed text-[color:var(--nest-muted)]">
          {s.aboutText}
        </p>
        <div className="mt-8 space-y-4 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-6 text-sm leading-relaxed">
          <p>
            Đây không phải website bán hàng. {s.siteName} chỉ lưu các sản phẩm bạn muốn mua —
            từ link thường, link rút gọn đến link tiếp thị liên kết.
          </p>
          <p>
            Người xem có thể tìm theo tên, lọc danh mục và nhấn <strong>Mua ngay</strong> để
            mở đúng URL đã lưu.
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
