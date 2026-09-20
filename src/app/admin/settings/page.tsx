"use client";

import { FormEvent, useEffect, useState } from "react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    siteName: "",
    tagline: "",
    heroTitle: "",
    heroSubtitle: "",
    heroDescription: "",
    aboutText: "",
    contactEmail: "",
    contactPhone: "",
    footerNote: "",
  });
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setForm((f) => ({ ...f, ...d.item })));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaved("Đã lưu cài đặt.");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Cài đặt</h1>
      <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4 sm:p-6">
        {(
          [
            ["siteName", "Tên website"],
            ["tagline", "Khẩu hiệu"],
            ["heroTitle", "Tiêu đề hero"],
            ["heroSubtitle", "Phụ đề hero"],
            ["contactEmail", "Email liên hệ"],
            ["contactPhone", "Điện thoại"],
            ["footerNote", "Ghi chú chân trang"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm font-medium">
            {label}
            <input
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 text-sm"
            />
          </label>
        ))}
        <label className="block text-sm font-medium">
          Mô tả hero
          <textarea
            value={form.heroDescription}
            onChange={(e) => setForm((f) => ({ ...f, heroDescription: e.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] p-3 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Giới thiệu
          <textarea
            value={form.aboutText}
            onChange={(e) => setForm((f) => ({ ...f, aboutText: e.target.value }))}
            rows={5}
            className="mt-1 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] p-3 text-sm"
          />
        </label>
        <button type="submit" className="h-11 rounded-xl bg-[color:var(--nest-primary)] px-5 text-sm font-semibold text-white dark:text-[#1a1410]">
          Lưu cài đặt
        </button>
        {saved && <p className="text-sm text-[#1f7a4d]">{saved}</p>}
      </form>
    </div>
  );
}
