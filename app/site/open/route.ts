import { masterClient } from "@/lib/server/auth.ts";
import { cleanNext, cleanSlug, enterUrl, readAgentTeamSites, readTeamSites, teamTicketProblem } from "@/lib/siteEdit.ts";

// ENTITLEMENT §6a v1.4 and LAUNCH.md §6 (14 Oct): a link that signs a team agent into their own team site's ad
// requests. GET /site/open?team=<slug>&next=/manage/ad-requests. Signed in to the Brain, it asks MASTER for a one-time
// ticket as that agent and forwards with the ticket in the fragment. MASTER decides what the ticket opens (the
// `ad_requests` scope for an agent, the full studio for an owner or admin); this page never widens it.

export const dynamic = "force-dynamic";

function plain(msg: string, status = 409): Response {
  const esc = msg.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Team website</title>` +
      `<body style="margin:0;background:#0b0f1a;color:#eef;font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh">` +
      `<main style="max-width:28rem;padding:24px"><p>${esc}</p><p><a style="color:#f5c542" href="/dashboard">Back to ONE Brain</a></p></main>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = cleanSlug(u.searchParams.get("team"));
  const next = cleanNext(u.searchParams.get("next")) ?? "/manage/ad-requests";
  if (!slug) return plain("That link is not complete. Open it again from ONE Brain.", 400);
  const sb = await masterClient();
  const { data: claims } = await sb.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return Response.redirect(new URL("/login", u), 303);
  const { data: rows } = await sb.from("team_members").select("role, active, teams(slug, site_host)").eq("user_id", uid);
  const lead = readTeamSites(rows).find((t) => t.slug === slug);
  const agent = lead ? null : readAgentTeamSites(rows).find((t) => t.slug === slug);
  const site = lead ?? agent;
  if (!site) return plain("You are not on that team, or its website is not set up yet.", 404);
  // An owner or admin gets the full studio as today; an agent asks for the ad-requests ticket (§6a v1.4). Until MASTER
  // takes `p_next`, the agent's call fails and they get the plain "opens shortly" line.
  const { data, error } = agent
    ? await sb.rpc("vip_site_ticket", { p_site: site.host, p_next: "/manage/ad-requests" })
    : await sb.rpc("vip_site_ticket", { p_site: site.host });
  const r = (error && agent ? { reason: "not_allowed" } : data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const url = !error && r.ok === true ? enterUrl(r.site_url, r.ticket, agent ? "/manage/ad-requests" : next) : null;
  if (!url) return plain(teamTicketProblem(r));
  return new Response(null, { status: 303, headers: { Location: url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
