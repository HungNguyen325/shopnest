import { prisma } from "@/lib/prisma";
import { apiFail, apiOk } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireOwnedPost } from "@/lib/posts";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await requireOwnedPost(user.id, id);
    const versions = await prisma.contentVersion.findMany({
      where: { contentPostId: id },
      orderBy: { versionNumber: "desc" },
      take: 30,
    });
    return apiOk(versions);
  } catch (err) {
    return apiFail(err, "posts/[id]/versions");
  }
}
