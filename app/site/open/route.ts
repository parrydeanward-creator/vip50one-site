import { masterClient } from "@/lib/server/auth.ts";
import { cleanHost, cleanNext, cleanSlug, enterUrl, readAgentTeamSites, readTeamSites, teamTicketProblem, ticketProblem } from "@/lib/siteEdit.ts";

// ENTITLEMENT §6a v1.4 and LAUNCH.md §6 (14 Oct): a link that signs a team agent into their own team site's ad
// requests. GET /site/open?team=<slug>&next=/manage/ad-requests. Signed in to the Brain, it asks MASTER for a one-time
// ticket as that agent and forwards with the ticket in the fragment. MASTER decides what the ticket opens (the
// `ad_requests` scope for an agent, the full studio for an owner or admin); this page never widens it.
//
// Edit any time (Parry, 15 Oct: "the user needs to be able to make changes anytime they choose. with ease"): the sites
// link here from every signed-out studio page and `<site>/edit` as GET /site/open?site=<host>&next=<page>. The caller's
// own site (MASTER `user_profiles.site_host`) opens the full studio; a team site opens as above; anything else is
// refused. Signed out, the sign-in page brings them straight back here.

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

type Pick = { host: string; own: boolean; agent: boolean } | null;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = cleanSlug(u.searchParams.get("team"));
  const host = slug ? null : cleanHost(u.searchParams.get("site"));
  if (!slug && !host) return plain("That link is not complete. Open it again from ONE Brain.", 400);
  const next = cleanNext(u.searchParams.get("next")) ?? (slug ? "/manage/ad-requests" : "/manage");
  const sb = await masterClient();
  const { data: claims } = await sb.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return Response.redirect(new URL(`/login?next=${encodeURIComponent(u.pathname + u.search)}`, u), 303);
  const { data: rows } = await sb.from("team_members").select("role, active, teams(slug, site_host)").eq("user_id", uid);
  const match = (t: { slug: string; host: string }) => (slug ? t.slug === slug : t.host === host);
  let pick: Pick = null;
  if (host) {
    const { data: me } = await sb.from("user_profiles").select("site_host").eq("user_id", uid).maybeSingle();
    if (cleanHost((me as { site_host?: unknown } | null)?.site_host) === host) pick = { host, own: true, agent: false };
  }
  if (!pick) {
    const lead = readTeamSites(rows).find(match);
    const agent = lead ? null : readAgentTeamSites(rows).find(match);
    const site = lead ?? agent;
    if (site) pick = { host: site.host, own: false, agent: !lead };
  }
  if (!pick) return plain(slug ? "You are not on that team, or its website is not set up yet." : "That website is not one you can edit.", 404);
  // Own site: the plain ticket, as Edit my website. Owner or admin: the full studio for the team site. A team agent asks
  // for the ad-requests ticket (§6a v1.4); until MASTER takes `p_next`, that call fails with the plain line.
  const { data, error } = pick.own
    ? await sb.rpc("vip_site_ticket")
    : pick.agent
      ? await sb.rpc("vip_site_ticket", { p_site: pick.host, p_next: "/manage/ad-requests" })
      : await sb.rpc("vip_site_ticket", { p_site: pick.host });
  const r = (error && pick.agent ? { reason: "not_allowed" } : data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const url = !error && r.ok === true ? enterUrl(r.site_url, r.ticket, pick.agent ? "/manage/ad-requests" : next) : null;
  if (!url) return plain(pick.own ? ticketProblem(r) : teamTicketProblem(r));
  return new Response(null, { status: 303, headers: { Location: url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
