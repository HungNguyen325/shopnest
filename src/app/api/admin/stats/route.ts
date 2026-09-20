import { prisma } from "@/lib/db";
import { withAdmin, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { response } = await withAdmin(req);
  if (response) return response;

  const [products, categories, successLogs, failLogs] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.extractLog.count({ where: { success: true } }),
    prisma.extractLog.count({ where: { success: false } }),
  ]);

  return json({
    products,
    categories,
    extractSuccess: successLogs,
    extractFail: failLogs,
  });
}
