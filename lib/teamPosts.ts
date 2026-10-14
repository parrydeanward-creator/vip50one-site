import { cleanHost } from "./siteEdit.ts";

// "Pulse posted" in the morning note (WEBSITES §7a, Parry 14 Oct: Pulse writes the team blog on Autopilot). The team
// owner and admins see the last 7 days of posts from their team site's public feed, `GET <site>/api/blog/recent`
// (one-websites, 14 Oct). Read only; a post opens on the site in a new tab.

export interface TeamPost { title: string; url: string; publishedAt: string | null; byPulse: boolean }

export const postsFeedUrl = (host: string) => `https://${host}/api/blog/recent`;

/** The feed's posts, checked: a title, and an https link on the same site only. Newest first, at most 5. */
export function readTeamPosts(j: unknown, host: string): TeamPost[] {
  const h = cleanHost(host);
  if (!h || !j || typeof j !== "object" || !Array.isArray((j as { posts?: unknown }).posts)) return [];
  const out: TeamPost[] = [];
  for (const p of (j as { posts: Record<string, unknown>[] }).posts) {
    const title = typeof p?.title === "string" ? p.title.trim().slice(0, 140) : "";
    let url: URL | null = null;
    try {
      url = typeof p?.url === "string" ? new URL(p.url) : null;
    } catch {
      url = null;
    }
    if (!title || !url || url.protocol !== "https:" || url.hostname !== h) continue;
    const at = typeof p.published_at === "string" ? p.published_at.slice(0, 40) : null;
    out.push({ title, url: url.toString(), publishedAt: at, byPulse: p.by_pulse === true });
  }
  return out.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 5);
}

/** "Mon 14 Oct" in Denver time, or "" when there is no date. */
export function postDay(at: string | null): string {
  if (!at) return "";
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { timeZone: "America/Denver", weekday: "short", day: "numeric", month: "short" });
}
