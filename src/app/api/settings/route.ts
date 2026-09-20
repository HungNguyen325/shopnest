import { getSettings } from "@/lib/settings";
import { json, error } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    return json({
      siteName: s.siteName,
      logo: s.logo,
      tagline: s.tagline,
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      backgroundColor: s.backgroundColor,
      surfaceColor: s.surfaceColor,
      textColor: s.textColor,
      mutedColor: s.mutedColor,
      borderColor: s.borderColor,
      heroTitle: s.heroTitle,
      heroSubtitle: s.heroSubtitle,
      heroDescription: s.heroDescription,
      aboutText: s.aboutText,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      footerNote: s.footerNote,
    });
  } catch {
    return error("Không thể tải cài đặt.", 500);
  }
}
