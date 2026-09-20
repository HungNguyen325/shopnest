import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAdmin, json, error } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { isLowContrast } from "@/lib/utils";

const schema = z.object({
  siteName: z.string().min(1).max(80).optional(),
  logo: z.string().max(2000).optional().nullable(),
  tagline: z.string().max(200).optional(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  backgroundColor: z.string().max(20).optional(),
  surfaceColor: z.string().max(20).optional(),
  textColor: z.string().max(20).optional(),
  mutedColor: z.string().max(20).optional(),
  borderColor: z.string().max(20).optional(),
  heroTitle: z.string().max(120).optional(),
  heroSubtitle: z.string().max(120).optional(),
  heroDescription: z.string().max(400).optional(),
  aboutText: z.string().max(4000).optional(),
  contactEmail: z.string().max(120).optional(),
  contactPhone: z.string().max(40).optional(),
  footerNote: z.string().max(240).optional(),
});

export async function GET(req: Request) {
  const { response } = await withAdmin(req);
  if (response) return response;
  const item = await getSettings();
  return json({ item });
}

export async function PATCH(req: Request) {
  const { response } = await withAdmin(req);
  if (response) return response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Dữ liệu không hợp lệ.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Dữ liệu không hợp lệ.");

  const warnings: string[] = [];
  const d = parsed.data;
  if (d.backgroundColor && d.textColor && isLowContrast(d.backgroundColor, d.textColor)) {
    warnings.push("Độ tương phản giữa nền và chữ đang thấp, có thể khó đọc.");
  }
  if (d.primaryColor && d.surfaceColor && isLowContrast(d.primaryColor, d.surfaceColor)) {
    warnings.push("Màu nút chính có thể không đủ tương phản.");
  }

  const item = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: d,
    create: { id: "default", ...d },
  });
  return json({ item, warnings });
}
