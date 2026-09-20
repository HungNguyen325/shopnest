export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--nest-primary)] text-white dark:text-[#1a1410]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
          <path d="M9 8V7a3 3 0 0 1 6 0v1" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-[color:var(--nest-primary)]">
        ShopNest
      </span>
    </span>
  );
}
