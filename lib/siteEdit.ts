// ENTITLEMENT.md §6a (v1.2, 11 Oct): "Edit my website". The Brain asks MASTER (as the signed-in agent) for a one-time
// ticket, good for 2 minutes, and sends the browser to the agent's own site with the ticket in the URL fragment, so it
// never reaches a server log or a Referer header. The site redeems it server-side and keeps its own session.

/** A bare host from MASTER's `site_host` ("jane.vip50homes.com"), or null for anything that is not one. */
export function cleanHost(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const h = v.trim().toLowerCase();
  return /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h) ? h : null;
}

/** Where the browser goes: `<site>/builder/enter#t=<ticket>`. Only an https site and a hex ticket; else null. */
export function enterUrl(siteUrl: unknown, ticket: unknown): string | null {
  if (typeof siteUrl !== "string" || typeof ticket !== "string" || !/^[0-9a-f]{64}$/.test(ticket)) return null;
  let u: URL;
  try {
    u = new URL(siteUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !cleanHost(u.hostname)) return null;
  return `https://${u.hostname}/builder/enter#t=${ticket}`;
}

/** MASTER's refusal words, kept short and plain; anything else becomes one plain line. */
export function ticketProblem(raw: unknown): string {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (r.reason === "not_complete") return "The website builder comes with ONE Complete.";
  if (r.reason === "no_site") return "Your website is not set up yet.";
  if (r.reason === "too_many") return "Too many tries. Please wait a few minutes and try again.";
  return "Your website could not be opened just now. Please try again.";
}

// ENTITLEMENT §6a v1.3 (13 Oct): a team's owner and admins also edit the team website. MASTER issues the ticket for
// `p_site` only when the caller holds that role, so the Brain just lists what it read and passes the host along.
export interface TeamSite { slug: string; host: string; role: "owner" | "admin" }

/** Team sites from MASTER rows (`team_members` joined to `teams`), owner and admin only, one per host. */
export function readTeamSites(raw: unknown): TeamSite[] {
  if (!Array.isArray(raw)) return [];
  const out: TeamSite[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const row = r as Record<string, unknown>;
    const team = (row.teams ?? row.team ?? row) as Record<string, unknown>;
    const role = row.role;
    const host = cleanHost(team?.site_host ?? row.host);
    const slug = typeof team?.slug === "string" ? team.slug : typeof row.slug === "string" ? row.slug : null;
    if ((role !== "owner" && role !== "admin") || !host || !slug || out.some((t) => t.host === host)) continue;
    out.push({ slug, host, role });
  }
  return out;
}
