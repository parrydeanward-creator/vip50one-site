import { masterClient } from "@/lib/server/auth.ts";
import { cleanHost, enterUrl, ticketProblem } from "@/lib/siteEdit.ts";

// ENTITLEMENT.md §6a: GET says whether the signed-in agent has a site (MASTER `user_profiles.site_host`, their own row);
// POST asks MASTER for a one-time ticket as that agent and answers with the address to open. No secret here.

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const sb = await masterClient();
  const { data: claims } = await sb.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return Response.json({ error: "Sign in first." }, { status: 401, headers: NO_STORE });
  const { data } = await sb.from("user_profiles").select("site_host").eq("user_id", uid).maybeSingle();
  return Response.json({ site_host: cleanHost((data as { site_host?: unknown } | null)?.site_host) }, { headers: NO_STORE });
}

export async function POST() {
  const sb = await masterClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Sign in first." }, { status: 401, headers: NO_STORE });
  const { data, error } = await sb.rpc("vip_site_ticket");
  const r = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const url = !error && r.ok === true ? enterUrl(r.site_url, r.ticket) : null;
  if (!url) return Response.json({ error: ticketProblem(r) }, { status: 409, headers: NO_STORE });
  return Response.json({ url }, { headers: NO_STORE });
}
