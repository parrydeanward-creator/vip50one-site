import { signedIn } from "@/lib/server/auth.ts";
import { ecosystemSecret } from "@/lib/server/summary.ts";
import { readSiteAlerts } from "@/lib/siteAlerts.ts";

// The signed-in agent's ad alerts from ONE Websites (`site_alerts`, one-websites#128), asked with the Brain's own
// `one-brain` partner secret for the email MASTER verified at sign-in. The secret never leaves the server.
// Publishable key: public by design (CONNECTIONS §5.3).

export const dynamic = "force-dynamic";

const SITES_URL = "https://kwnmbvbucyaqfysdyvyh.supabase.co";
const SITES_KEY = "sb_publishable_6re5ROu-m3oUOSWbSMPI0w_6YXCHtUo";

export async function GET() {
  const me = await signedIn();
  if (!me) return Response.json({ error: "Sign in first." }, { status: 401 });
  const secret = ecosystemSecret();
  if (!secret) return Response.json({ alerts: [] });
  try {
    const r = await fetch(`${SITES_URL}/rest/v1/rpc/site_alerts`, {
      method: "POST",
      headers: { apikey: SITES_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_partner: "one-brain", p_secret: secret, p_email: me.email }),
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!r.ok) return Response.json({ alerts: null, reason: r.status === 400 ? "refused" : "unreachable" }, { headers: { "Cache-Control": "no-store" } });
    return Response.json({ alerts: readSiteAlerts(await r.json()) ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ alerts: null, reason: "unreachable" }, { headers: { "Cache-Control": "no-store" } });
  }
}
