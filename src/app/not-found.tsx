import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm text-[color:var(--nest-muted)]">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Không tìm thấy trang</h1>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-[color:var(--nest-primary)] px-5 text-sm font-semibold text-white dark:text-[#1a1410]"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
