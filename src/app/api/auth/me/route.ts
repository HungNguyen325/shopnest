import { requireAdmin } from "@/lib/auth";
import { json } from "@/lib/api";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return json({ user: null }, 200);
  return json({ user });
}
