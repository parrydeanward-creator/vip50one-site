import { masterClient } from "@/lib/server/auth.ts";
import { readTeamSites } from "@/lib/siteEdit.ts";
import { postsFeedUrl, readTeamPosts } from "@/lib/teamPosts.ts";

// The team blog's last 7 days for the morning note: owner and admin only (readTeamSites), fetched here so the Brain
// never depends on the team site's CORS. Empty when the caller runs no team site.

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const sb = await masterClient();
  const { data: claims } = await sb.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return Response.json({ error: "Sign in first." }, { status: 401, headers: NO_STORE });
  const { data: rows } = await sb.from("team_members").select("role, active, teams(slug, site_host)").eq("user_id", uid).in("role", ["owner", "admin"]);
  const site = readTeamSites(rows)[0];
  if (!site) return Response.json({ host: null, posts: [] }, { headers: NO_STORE });
  const r = await fetch(postsFeedUrl(site.host), { cache: "no-store", signal: AbortSignal.timeout(5000) }).catch(() => null);
  const j = r?.ok ? await r.json().catch(() => null) : null;
  return Response.json({ host: site.host, posts: readTeamPosts(j, site.host) }, { headers: NO_STORE });
}
