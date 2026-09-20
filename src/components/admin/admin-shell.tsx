"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Plus,
  Layers,
  FolderTree,
  Palette,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/products/new", label: "Thêm sản phẩm", icon: Plus },
  { href: "/admin/products/bulk", label: "Nhập hàng loạt", icon: Layers },
  { href: "/admin/categories", label: "Danh mục", icon: FolderTree },
  { href: "/admin/appearance", label: "Giao diện", icon: Palette },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
];

export function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {LINKS.map((l) => {
        const active =
          l.href === "/admin"
            ? pathname === "/admin"
            : pathname === l.href || (l.href !== "/admin/products/new" && l.href !== "/admin/products/bulk" && pathname.startsWith(l.href) && l.href !== "/admin/products"
              ? pathname.startsWith(l.href)
              : l.href === "/admin/products"
                ? pathname === "/admin/products" || (pathname.startsWith("/admin/products/") && !pathname.includes("/new") && !pathname.includes("/bulk"))
                : false);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[color:var(--nest-primary)] text-white dark:text-[#1a1410]"
                : "text-[color:var(--nest-text)] hover:bg-[color:var(--nest-bg)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[color:var(--nest-bg)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4 lg:block">
          <Link href="/" className="mb-6 block">
            <Logo />
          </Link>
          {nav}
          <button
            type="button"
            onClick={logout}
            className="mt-6 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[color:var(--nest-muted)] hover:bg-[color:var(--nest-bg)]"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] px-4 py-3 lg:px-8">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm text-[color:var(--nest-muted)]">
              Xin chào, <span className="font-medium text-[color:var(--nest-text)]">{username}</span>
            </p>
            <Link href="/" className="text-sm text-[color:var(--nest-primary)]">
              Xem website
            </Link>
          </header>
          <div className="flex-1 px-4 py-6 lg:px-8">{children}</div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/30" aria-label="Đóng" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-[color:var(--nest-surface)] p-4 pt-[env(safe-area-inset-top)] shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            <button
              type="button"
              onClick={logout}
              className="mt-6 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
