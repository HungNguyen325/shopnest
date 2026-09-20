import Link from "next/link";
import { Logo } from "./logo";

export function Footer({
  siteName,
  footerNote,
}: {
  siteName: string;
  footerNote?: string | null;
}) {
  return (
    <footer className="mt-16 border-t border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-nest gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[color:var(--nest-muted)]">
            {footerNote || `${siteName} — thư viện sản phẩm cá nhân.`}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Khám phá</p>
          <ul className="mt-3 space-y-2 text-sm text-[color:var(--nest-muted)]">
            <li>
              <Link href="/" className="hover:text-[color:var(--nest-primary)]">
                Trang chủ
              </Link>
            </li>
            <li>
              <Link href="/#danh-muc" className="hover:text-[color:var(--nest-primary)]">
                Danh mục
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[color:var(--nest-primary)]">
                Giới thiệu
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Hỗ trợ</p>
          <ul className="mt-3 space-y-2 text-sm text-[color:var(--nest-muted)]">
            <li>
              <Link href="/contact" className="hover:text-[color:var(--nest-primary)]">
                Liên hệ
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="hover:text-[color:var(--nest-primary)]">
                Quản trị
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--nest-border)] py-4 text-center text-xs text-[color:var(--nest-muted)]">
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </div>
    </footer>
  );
}
