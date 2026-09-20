"use client";

import { ProductImage } from "./product-image";

export type PublicProduct = {
  id: string;
  name: string;
  imageUrl?: string | null;
  purchaseUrl: string;
  category?: { id: string; name: string; slug: string } | null;
  isDemo?: boolean;
};

export function ProductCard({ product }: { product: PublicProduct }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover">
      <a
        href={product.purchaseUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="block aspect-square w-full"
        aria-label={product.name}
      >
        <ProductImage src={product.imageUrl} alt={product.name} className="h-full w-full" />
      </a>
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-3.5">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[13px] font-medium leading-snug text-[color:var(--nest-text)] sm:text-sm">
          {product.name}
        </h3>
        <a
          href={product.purchaseUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-auto inline-flex h-10 items-center justify-center rounded-full bg-[color:var(--nest-primary)] px-3 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-[color:var(--nest-primary-hover)] dark:text-[#1a1410]"
        >
          Mua ngay
        </a>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)]">
      <div className="aspect-square skeleton" />
      <div className="space-y-3 p-3">
        <div className="h-4 w-5/6 rounded skeleton" />
        <div className="h-4 w-2/3 rounded skeleton" />
        <div className="h-10 rounded-full skeleton" />
      </div>
    </div>
  );
}
