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
