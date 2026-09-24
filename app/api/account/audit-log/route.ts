import { prisma } from "@/lib/prisma";
import { apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { parseJsonObject } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const take = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") ?? 40)));

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
    });

    return apiOk(
      logs.map((log) => ({
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        createdAt: log.createdAt,
        metadata: parseJsonObject(log.metadata),
      })),
    );
  } catch (err) {
    return apiFail(err, "account/audit-log");
  }
}
