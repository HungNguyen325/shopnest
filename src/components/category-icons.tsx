import {
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  ShoppingBag,
  Shirt,
  House,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  phone: Smartphone,
  smartphone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  watch: Watch,
  bag: ShoppingBag,
  shirt: Shirt,
  home: House,
  house: House,
  sparkles: Sparkles,
  beauty: Sparkles,
  tag: Tag,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = MAP[(name || "tag").toLowerCase()] || Tag;
  return <Icon className={className || "h-6 w-6"} strokeWidth={1.5} />;
}
