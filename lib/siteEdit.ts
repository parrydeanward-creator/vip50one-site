// ENTITLEMENT.md §6a (v1.2, 11 Oct): "Edit my website". The Brain asks MASTER (as the signed-in agent) for a one-time
// ticket, good for 2 minutes, and sends the browser to the agent's own site with the ticket in the URL fragment, so it
// never reaches a server log or a Referer header. The site redeems it server-side and keeps its own session.

/** A bare host from MASTER's `site_host` ("jane.vip50homes.com"), or null for anything that is not one. */
export function cleanHost(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const h = v.trim().toLowerCase();
  return /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h) ? h : null;
}

/** Studio pages a sign-in may land on (one-websites#108, #109); anything else goes to the Web Studio. */
// "/ads" and "/manage/areas" for the Growth orb (16 Oct); ONE Websites lands them once its ENTER_NEXT has them (else /manage).
export const SITE_NEXT = ["/manage", "/manage/results", "/manage/ad-requests", "/builder", "/ads", "/manage/areas"] as const;
export type SiteNext = (typeof SITE_NEXT)[number];
export const cleanNext = (v: unknown): SiteNext | null => (typeof v === "string" && (SITE_NEXT as readonly string[]).includes(v) ? (v as SiteNext) : null);

/** Where the browser goes: `<site>/builder/enter[?next=<page>]#t=<ticket>`. Only an https site and a hex ticket; else null. */
export function enterUrl(siteUrl: unknown, ticket: unknown, next: unknown = null): string | null {
  if (typeof siteUrl !== "string" || typeof ticket !== "string" || !/^[0-9a-f]{64}$/.test(ticket)) return null;
  let u: URL;
  try {
    u = new URL(siteUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !cleanHost(u.hostname)) return null;
  const n = cleanNext(next);
  return `https://${u.hostname}/builder/enter${n ? `?next=${n}` : ""}#t=${ticket}`;
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

// ENTITLEMENT §6a v1.4 (14 Oct; Parry: "yes on team sign in for their own ads"): a team agent gets a ticket for the team
// site that opens only their own ad requests (`/manage/ad-requests`). MASTER decides; the Brain only lists the team.
export interface AgentTeamSite { slug: string; host: string }

/** Team sites where the caller is an active agent (not owner or admin, who already get the full studio). */
export function readAgentTeamSites(raw: unknown): AgentTeamSite[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentTeamSite[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const row = r as Record<string, unknown>;
    const team = (row.teams ?? row.team ?? row) as Record<string, unknown>;
    const host = cleanHost(team?.site_host ?? row.host);
    const slug = cleanSlug(team?.slug ?? row.slug);
    // MASTER rows carry `role`; the /api/site answer is already this list, without it.
    if ((row.role !== undefined && row.role !== "agent") || row.active === false || !host || !slug || out.some((t) => t.host === host)) continue;
    out.push({ slug, host });
  }
  return out;
}

export const cleanSlug = (v: unknown): string | null => (typeof v === "string" && /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(v) ? v : null);

/** The signed-in link a launch's team ad piece opens (LAUNCH §6): the Brain asks for the ticket, then forwards. */
export const siteOpenHref = (slug: string, next: SiteNext = "/manage/ad-requests") =>
  `https://www.vip50one.com/site/open?team=${encodeURIComponent(slug)}&next=${encodeURIComponent(next)}`;

/** MASTER's refusal for a team agent before the scope is live, or when they are not on that team. */
export function teamTicketProblem(raw: unknown): string {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (r.reason === "not_team_admin" || r.reason === "not_allowed" || r.reason === "forbidden") return "Asking for an ad from the team site opens shortly. Your team lead can see your launch request already.";
  return ticketProblem(raw);
}
