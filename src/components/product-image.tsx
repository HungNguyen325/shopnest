"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";

export function ProductImage({
  src,
  alt,
  className = "",
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const show = src && !failed;

  return (
    <div className={`relative overflow-hidden bg-[#f4ebe3] dark:bg-[#2a211b] ${className}`}>
      {!loaded && show && <div className="absolute inset-0 skeleton" />}
      {show ? (
        // Native img: product URLs come from arbitrary hosts
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[#c4a484]">
          <ShoppingBag className="h-10 w-10" strokeWidth={1.25} />
        </div>
      )}
    </div>
  );
}
