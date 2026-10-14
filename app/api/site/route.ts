import { masterClient } from "@/lib/server/auth.ts";
import { cleanHost, cleanNext, enterUrl, readAgentTeamSites, readTeamSites, ticketProblem } from "@/lib/siteEdit.ts";

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
  // §6a v1.3: team sites this agent runs (owner or admin). Until MASTER has `teams.site_host` this reads nothing.
  // §6a v1.4 (14 Oct): agents on a team are listed too, for "Ask for an ad"; the ticket is MASTER's to give.
  const { data: team } = await sb.from("team_members").select("role, active, teams(slug, site_host)").eq("user_id", uid);
  return Response.json(
    { site_host: cleanHost((data as { site_host?: unknown } | null)?.site_host), team_sites: readTeamSites(team), agent_team_sites: readAgentTeamSites(team) },
    { headers: NO_STORE },
  );
}

export async function POST(req: Request) {
  const sb = await masterClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Sign in first." }, { status: 401, headers: NO_STORE });
  // A team site is asked for by host; MASTER checks the caller is that team's owner or admin (§6a v1.3).
  const body = (await req.json().catch(() => null)) as { site?: unknown; next?: unknown } | null;
  const site = cleanHost(body?.site);
  const { data, error } = site ? await sb.rpc("vip_site_ticket", { p_site: site }) : await sb.rpc("vip_site_ticket");
  const r = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const url = !error && r.ok === true ? enterUrl(r.site_url, r.ticket, cleanNext(body?.next)) : null;
  if (!url) return Response.json({ error: ticketProblem(r) }, { status: 409, headers: NO_STORE });
  return Response.json({ url }, { headers: NO_STORE });
}
