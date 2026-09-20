import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PublicShell } from "@/components/public-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Liên hệ" };

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <PublicShell siteName={s.siteName} footerNote={s.footerNote}>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm font-medium text-[color:var(--nest-muted)]">Liên hệ</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Kết nối với {s.siteName}</h1>
        <div className="mt-8 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-6">
          {s.contactEmail && (
            <p className="text-sm">
              Email:{" "}
              <a className="font-medium text-[color:var(--nest-primary)]" href={`mailto:${s.contactEmail}`}>
                {s.contactEmail}
              </a>
            </p>
          )}
          {s.contactPhone && <p className="mt-2 text-sm">Điện thoại: {s.contactPhone}</p>}
          {!s.contactEmail && !s.contactPhone && (
            <p className="text-sm text-[color:var(--nest-muted)]">
              Thông tin liên hệ sẽ được quản trị viên cập nhật.
            </p>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
