import { z } from "zod";
import { extractProductFromUrl } from "@/lib/extract";
import { withAdmin, json, error } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  url: z.string().min(4).max(4000),
});

export async function POST(req: Request) {
  const { response } = await withAdmin(req);
  if (response) return response;

  const rl = rateLimit(`extract:${clientIp(req)}`, 30, 60 * 1000);
  if (!rl.ok) return error(`Quá nhiều yêu cầu. Thử lại sau ${rl.retryAfter}s.`, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Dữ liệu không hợp lệ.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("URL không hợp lệ.");

  try {
    const result = await extractProductFromUrl(parsed.data.url);
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể xử lý liên kết.";
    return error(message, 422);
  }
}
