import { apiFail, apiOk } from "@/lib/api";
import { clearSessionCookieHeaders, deleteSessionRecord, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/api";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) await audit(user.id, "user", user.id, "logout");
    await deleteSessionRecord();
    // Clear every cookie variant (Partitioned / None / legacy Lax) with raw
    // headers — Next dedupes same-name writes through cookies(), so only
    // manual Set-Cookie headers can send all three at once.
    const res = apiOk({ ok: true });
    for (const header of clearSessionCookieHeaders()) {
      res.headers.append("set-cookie", header);
    }
    return res;
  } catch (err) {
    return apiFail(err, "auth/logout");
  }
}
