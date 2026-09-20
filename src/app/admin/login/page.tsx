"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại.");
        return;
      }
      router.replace(params.get("next") || "/admin");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-8 shadow-card">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">Đăng nhập quản trị</h1>
        <p className="mt-2 text-sm text-[color:var(--nest-muted)]">
          Chỉ tài khoản Admin mới có thể thêm và quản lý sản phẩm.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Tài khoản
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 outline-none"
            />
          </label>
          <label className="block text-sm font-medium">
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 h-11 w-full rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 outline-none"
            />
          </label>
          {error && (
            <p className="rounded-xl bg-[#fde8ec] px-3 py-2 text-sm text-[#a13344]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-[color:var(--nest-primary)] text-sm font-semibold text-white disabled:opacity-60 dark:text-[#1a1410]"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
