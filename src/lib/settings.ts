import { prisma } from "./db";

export const DEFAULT_SETTINGS = {
  id: "default",
  siteName: "ShopNest",
  logo: null as string | null,
  tagline: "Sản phẩm chất lượng cho cuộc sống tốt đẹp hơn",
  primaryColor: "#6B4226",
  secondaryColor: "#C4A484",
  backgroundColor: "#F3E8DC",
  surfaceColor: "#FFFFFF",
  textColor: "#3D2B22",
  mutedColor: "#8A7468",
  borderColor: "#E8DDD0",
  heroTitle: "Sản phẩm chất lượng",
  heroSubtitle: "Cho cuộc sống tốt đẹp hơn",
  heroDescription:
    "Khám phá những sản phẩm tuyệt vời, đa dạng ngành hàng với mức giá tốt nhất tại ShopNest.",
  aboutText:
    "ShopNest là thư viện sản phẩm cá nhân thông minh. Lưu link sản phẩm bạn muốn mua, tìm lại bất cứ lúc nào và mở trang mua hàng chỉ với một chạm.",
  contactEmail: "hello@shopnest.local",
  contactPhone: "",
  footerNote: "Thư viện sản phẩm cá nhân — không phải sàn thương mại điện tử.",
};

export async function getSettings() {
  const row = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return row;
}

export function settingsToCssVars(s: {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}) {
  return {
    "--nest-primary": s.primaryColor,
    "--nest-secondary": s.secondaryColor,
    "--nest-bg": s.backgroundColor,
    "--nest-surface": s.surfaceColor,
    "--nest-text": s.textColor,
    "--nest-muted": s.mutedColor,
    "--nest-border": s.borderColor,
    "--nest-hero": "#E8D4C4",
    "--nest-primary-hover": "#7E5233",
  } as Record<string, string>;
}
