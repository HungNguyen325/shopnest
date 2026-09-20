import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { getSettings, settingsToCssVars } from "@/lib/settings";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  let name = "ShopNest";
  let tagline = "Sản phẩm chất lượng cho cuộc sống tốt đẹp hơn";
  try {
    const s = await getSettings();
    name = s.siteName;
    tagline = s.tagline;
  } catch {
    /* db may not be ready during build */
  }
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: name, template: `%s · ${name}` },
    description: tagline,
    icons: { icon: "/favicon.svg" },
    openGraph: {
      title: name,
      description: tagline,
      images: ["/og.jpg"],
      locale: "vi_VN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description: tagline,
      images: ["/og.jpg"],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let css: Record<string, string> = settingsToCssVars({
    primaryColor: "#6B4226",
    secondaryColor: "#C4A484",
    backgroundColor: "#F3E8DC",
    surfaceColor: "#FFFFFF",
    textColor: "#3D2B22",
    mutedColor: "#8A7468",
    borderColor: "#E8DDD0",
  });
  try {
    const s = await getSettings();
    css = settingsToCssVars(s);
  } catch {
    /* ignore */
  }

  return (
    <html lang="vi" className={beVietnam.variable} style={css} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
