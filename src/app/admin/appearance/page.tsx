"use client";

import { FormEvent, useEffect, useState } from "react";
import { isLowContrast } from "@/lib/utils";

const FIELDS = [
  ["primaryColor", "Màu chính"],
  ["secondaryColor", "Màu phụ"],
  ["backgroundColor", "Nền"],
  ["surfaceColor", "Bề mặt"],
  ["textColor", "Chữ"],
  ["mutedColor", "Chữ phụ"],
  ["borderColor", "Viền"],
] as const;

export default function AppearancePage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setForm(d.item || {}));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setWarnings(data.warnings || []);
    setSaved("Đã lưu giao diện. Tải lại trang chủ để thấy thay đổi đầy đủ.");
  }

  const contrastWarn =
    form.backgroundColor && form.textColor && isLowContrast(form.backgroundColor, form.textColor);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Giao diện</h1>
      <p className="mt-1 text-sm text-[color:var(--nest-muted)]">
        Mặc định theo phong cách ShopNest ấm. Có thể tùy chỉnh màu.
      </p>
      <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4 sm:p-6">
        {FIELDS.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 text-sm">
            <span>{label}</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={normalizeHex(form[key])}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
              <input
                value={form[key] || ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="h-10 w-28 rounded-lg border border-[color:var(--nest-border)] px-2 text-xs"
              />
            </span>
          </label>
        ))}
        <div className="rounded-2xl p-4" style={{ background: form.backgroundColor, color: form.textColor }}>
          <p className="text-sm font-semibold">Xem trước</p>
          <button
            type="button"
            className="mt-3 h-10 rounded-xl px-4 text-sm font-semibold text-white"
            style={{ background: form.primaryColor }}
          >
            Mua ngay
          </button>
        </div>
        {contrastWarn && (
          <p className="text-sm text-[#8a5b12]">Độ tương phản giữa nền và chữ đang thấp, có thể khó đọc.</p>
        )}
        {warnings.map((w) => (
          <p key={w} className="text-sm text-[#8a5b12]">{w}</p>
        ))}
        <button type="submit" className="h-11 rounded-xl bg-[color:var(--nest-primary)] px-5 text-sm font-semibold text-white dark:text-[#1a1410]">
          Lưu giao diện
        </button>
        {saved && <p className="text-sm text-[#1f7a4d]">{saved}</p>}
      </form>
    </div>
  );
}

function normalizeHex(v?: string) {
  if (v && /^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return "#6B4226";
}
