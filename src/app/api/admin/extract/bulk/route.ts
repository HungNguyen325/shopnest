import { z } from "zod";
import { extractProductFromUrl } from "@/lib/extract";
import { withAdmin, json, error } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { mapLimit } from "@/lib/utils";

const schema = z.object({
  urls: z.array(z.string().min(4).max(4000)).min(1).max(100),
});

export const maxDuration = 60;

export async function POST(req: Request) {
  const { response } = await withAdmin(req);
  if (response) return response;

  const rl = rateLimit(`extract-bulk:${clientIp(req)}`, 6, 60 * 1000);
  if (!rl.ok) return error(`Quá nhiều yêu cầu. Thử lại sau ${rl.retryAfter}s.`, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Dữ liệu không hợp lệ.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Danh sách URL không hợp lệ (tối đa 100).");

  const unique = Array.from(
    new Map(parsed.data.urls.map((u) => [u.trim(), u.trim()])).values(),
  ).filter(Boolean);

  const results = await mapLimit(unique, 4, async (url) => {
    try {
      return await extractProductFromUrl(url);
    } catch (err) {
      return {
        ok: false,
        warning: true,
        error: err instanceof Error ? err.message : "Không thể xử lý liên kết.",
        originalUrl: url,
        purchaseUrl: url,
        linkType: "direct" as const,
        platform: "generic" as const,
        fingerprint: url,
      };
    }
  });

  return json({ results });
}
