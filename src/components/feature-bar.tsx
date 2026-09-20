import { Clock3, RefreshCcw, ShieldCheck, Truck } from "lucide-react";

const ITEMS = [
  { icon: Truck, title: "Lưu link thông minh", desc: "Dán URL, hệ thống tự lấy tên và ảnh" },
  { icon: RefreshCcw, title: "Mở lại dễ dàng", desc: "Tìm sản phẩm đã lưu trong vài giây" },
  { icon: ShieldCheck, title: "Giữ nguyên link mua", desc: "Affiliate và tracking được bảo toàn" },
  { icon: Clock3, title: "Luôn sẵn sàng", desc: "Xem mọi lúc, mua ngay khi cần" },
];

export function FeatureBar() {
  return (
    <section className="mx-auto grid max-w-nest grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-0 lg:py-8">
      {ITEMS.map((item, i) => (
        <div
          key={item.title}
          className={`flex items-start gap-3 px-2 py-2 sm:px-4 ${
            i < ITEMS.length - 1 ? "lg:border-r lg:border-[color:var(--nest-border)]" : ""
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--nest-border)] bg-[color:var(--nest-surface)] text-[color:var(--nest-primary)]">
            <item.icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-0.5 text-xs text-[color:var(--nest-muted)]">{item.desc}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
