// My Profile > Badges, the same tiles as ONE MOVE's Classic (Parry, 14 Oct: profile items on both). Weekly badges come
// from MASTER my_weekly_badges() (earned, never given: Parry, 9 Oct); milestone badges from badges + user_badges.

export const badgesUrl = "/api/badges";

export interface WeeklyBadge { name: string; target: number; count: number; earned: boolean; times: number }
export interface MilestoneBadge { name: string; description: string | null; target: number | null; progress: number | null; earned: boolean; earnedAt: string | null }
export interface Badges { weekly: WeeklyBadge[]; milestones: MilestoneBadge[] }

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, max = 160) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);

export function readBadges(j: unknown): Badges | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.weekly) || !Array.isArray(r.milestones)) return null;
  return {
    weekly: list(r.weekly)
      .map((b) => ({ name: str(b.name, 60) ?? "", target: num(b.target) ?? 0, count: num(b.count) ?? 0, earned: b.earned === true, times: num(b.times) ?? 0 }))
      .filter((b) => b.name),
    milestones: list(r.milestones)
      .map((b) => ({ name: str(b.name, 60) ?? "", description: str(b.description), target: num(b.target), progress: num(b.progress), earned: b.earned === true, earnedAt: str(b.earned_at, 40) }))
      .filter((b) => b.name),
  };
}

/** 0-100 for a progress bar. */
export const pct = (count: number | null, target: number | null) => (!target ? 0 : Math.max(0, Math.min(100, Math.round(((count ?? 0) / target) * 100))));

/** The ONE MOVE page where a weekly badge is worked on (rule 12: a badge tile always has a way in). Unknown: the Scoreboard. */
export function badgePath(name: string): string {
  const t = name.toLowerCase();
  if (t.includes("task")) return "/tasks";
  if (t.includes("consistency") || t.includes("momentum")) return "/daily";
  if (t.includes("touch") || t.includes("social") || t.includes("note") || t.includes("relationship")) return "/contacts/vip";
  return "/achievements";
}
