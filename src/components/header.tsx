"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Moon, Search, Sun, UserRound, X } from "lucide-react";
import { Logo } from "./logo";
import { useTheme } from "./theme-provider";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/#san-pham", label: "Sản phẩm" },
  { href: "/#danh-muc", label: "Danh mục" },
  { href: "/about", label: "Giới thiệu" },
  { href: "/contact", label: "Liên hệ" },
];

export function Header({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolved, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) {
      router.push("/#san-pham");
      return;
    }
    router.push(`/?q=${encodeURIComponent(query)}#san-pham`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--nest-border)] bg-[color:var(--nest-surface)]/92 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-nest items-center gap-3 px-4 sm:h-[72px] sm:px-6">
        <Link href="/" aria-label={siteName} className="shrink-0">
          <Logo />
        </Link>

        <nav className="mx-auto hidden items-center gap-7 lg:flex" aria-label="Chính">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "text-[color:var(--nest-primary)]"
                    : "text-[color:var(--nest-text)]/80 hover:text-[color:var(--nest-primary)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <form
            onSubmit={submitSearch}
            className="hidden items-center rounded-full border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3 md:flex"
          >
            <Search className="h-4 w-4 text-[color:var(--nest-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="h-9 w-44 bg-transparent px-2 text-sm outline-none placeholder:text-[color:var(--nest-muted)] lg:w-56"
              aria-label="Tìm sản phẩm"
            />
          </form>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--nest-text)] md:hidden"
            aria-label="Tìm kiếm"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--nest-text)]"
            aria-label={resolved === "dark" ? "Bật giao diện sáng" : "Bật giao diện tối"}
            onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          >
            {resolved === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <Link
            href="/admin/login"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--nest-text)]"
            aria-label="Đăng nhập quản trị"
          >
            <UserRound className="h-5 w-5" />
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submitSearch} className="border-t border-[color:var(--nest-border)] px-4 py-3 md:hidden">
          <label className="flex items-center gap-2 rounded-full border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] px-3">
            <Search className="h-4 w-4 text-[color:var(--nest-muted)]" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="h-11 w-full bg-transparent text-base outline-none"
              aria-label="Tìm sản phẩm"
            />
          </label>
        </form>
      )}

      {open && (
        <div className="border-t border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-base font-medium text-[color:var(--nest-text)] hover:bg-[color:var(--nest-bg)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
