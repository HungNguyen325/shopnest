"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Hero({
  title,
  subtitle,
  description,
}: {
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <section className="mx-auto max-w-nest px-4 pt-5 sm:px-6 sm:pt-8">
      <div className="relative overflow-hidden rounded-[28px] bg-[color:var(--nest-hero)]">
        <div className="grid items-center gap-6 px-6 py-8 sm:px-10 sm:py-12 lg:grid-cols-2 lg:px-14 lg:py-14">
          <div className="max-w-xl">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[color:var(--nest-text)] sm:text-4xl lg:text-[42px]">
              {title}
              <span className="mt-1 block">{subtitle}</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[color:var(--nest-muted)] sm:text-[15px]">
              {description}
            </p>
            <Link
              href="#san-pham"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[color:var(--nest-primary)] px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[color:var(--nest-primary-hover)] dark:text-[#1a1410]"
            >
              Mua sắm ngay →
            </Link>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero.jpg"
              alt="Sản phẩm nổi bật"
              className="h-[220px] w-full rounded-2xl object-cover object-center sm:h-[280px] lg:h-[320px]"
            />
          </div>
        </div>
        <button
          type="button"
          className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[color:var(--nest-primary)] shadow-sm sm:flex"
          aria-hidden
          tabIndex={-1}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[color:var(--nest-primary)] shadow-sm sm:flex"
          aria-hidden
          tabIndex={-1}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
