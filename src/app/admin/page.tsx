"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderTree, Link2, Package, TriangleAlert } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    extractSuccess: 0,
    extractFail: 0,
  });

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  const cards = [
    { label: "Tổng sản phẩm", value: stats.products, icon: Package, href: "/admin/products" },
    { label: "Tổng danh mục", value: stats.categories, icon: FolderTree, href: "/admin/categories" },
    { label: "Link xử lý thành công", value: stats.extractSuccess, icon: Link2, href: "/admin/products/new" },
    { label: "Link lỗi", value: stats.extractFail, icon: TriangleAlert, href: "/admin/products/bulk" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-[color:var(--nest-muted)]">
        Quản lý thư viện sản phẩm của bạn.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] p-4 transition-transform duration-150 hover:-translate-y-0.5"
          >
            <c.icon className="h-5 w-5 text-[color:var(--nest-primary)]" />
            <p className="mt-4 text-2xl font-semibold">{c.value}</p>
            <p className="mt-1 text-xs text-[color:var(--nest-muted)]">{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/products/new"
          className="inline-flex h-11 items-center rounded-xl bg-[color:var(--nest-primary)] px-5 text-sm font-semibold text-white dark:text-[#1a1410]"
        >
          Thêm sản phẩm
        </Link>
        <Link
          href="/admin/products/bulk"
          className="inline-flex h-11 items-center rounded-xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] px-5 text-sm font-semibold"
        >
          Nhập hàng loạt
        </Link>
      </div>
    </div>
  );
}
