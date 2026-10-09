import type { GraphEdge, GraphNode } from "./graph/types.ts";

// The Team screen (VIP-SUMMARY §3u; PULSE-ROADMAP "ONE YOU": "challenge and leaderboard full screen for the office
// TV"). The week's leaderboard among the members who already see each other on ONE MOVE's challenge leaderboard:
// first name, photo and weekly score only. Nothing about contacts, goals or commitments. Read only.

const MOVE_URL = "https://move.vip50one.com";
export const TEAM_NODE = "go-team";
export type Scope = "all" | "office";
export const teamUrl = (scope: Scope = "all") => `${MOVE_URL}/api/brain/team?scope=${scope}`;
export const MAX_AGENTS = 50;
/** Seconds each agent stays in the middle on the office TV. */
export const TV_SECONDS = 12;

export interface Mate {
  id: string;
  name: string;
  photo: string | null;
  score: number;
  last4: number[];
  streak: number;
  tickedToday: boolean;
  me: boolean;
  /** Away this week (§3x.6): time off covers 4 or more weekdays; the 100 does not apply. */
  away: boolean;
  /** Which of `last4` were away weeks, same order. */
  last4Away: boolean[];
  /** Badges earned in ONE MOVE (§3u.2, optional), newest first, at most 3. */
  earned: string[];
}
export interface Team {
  weekStart: string | null;
  minimum: number;
  agents: Mate[];
}

const str = (v: unknown, max = 60) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);

/** A §3u.1 answer, checked; null when it is not one. Sorted by score, then streak, then name; at most 50. */
export function readTeam(j: unknown): Team | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.agents)) return null;
  const seen = new Set<string>();
  const agents: Mate[] = [];
  for (const x of r.agents as Record<string, unknown>[]) {
    const id = str(x?.user_id), name = str(x?.first_name, 30);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    agents.push({
      id,
      name,
      photo: str(x.photo_url, 500),
      score: num(x.score) ?? 0,
      last4: (Array.isArray(x.last4) ? x.last4 : []).map(num).filter((n): n is number => n != null).slice(-4),
      streak: num(x.streak_weeks) ?? 0,
      tickedToday: x.ticked_today === true,
      me: x.me === true,
      away: x.away === true,
      last4Away: (Array.isArray(x.last4_away) ? x.last4_away : []).map((v: unknown) => v === true).slice(-4),
      earned: (Array.isArray(x.badges) ? x.badges : [])
        .map((b: unknown) => (b && typeof b === "object" ? str((b as Record<string, unknown>).name, 40) : str(b, 40)))
        .filter((b): b is string => !!b)
        .slice(0, 3),
    });
  }
  agents.sort((a, b) => b.score - a.score || b.streak - a.streak || a.name.localeCompare(b.name));
  const wk = typeof r.week_start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.week_start) ? r.week_start : null;
  return { weekStart: wk, minimum: num(r.minimum) || 100, agents: agents.slice(0, MAX_AGENTS) };
}

/** Rank with ties sharing a place (112, 112, 98 -> 1, 1, 3). */
export function ranks(t: Team): Map<string, number> {
  const out = new Map<string, number>();
  t.agents.forEach((a, i) => out.set(a.id, i > 0 && t.agents[i - 1].score === a.score ? out.get(t.agents[i - 1].id)! : i + 1));
  return out;
}

export const atMinimum = (t: Team) => t.agents.filter((a) => a.score >= t.minimum).length;

/** The biggest jump on last week, for the TV's "most improved"; null when no one went up. */
export function mostImproved(t: Team): Mate | null {
  let best: Mate | null = null;
  let gain = 0;
  for (const a of t.agents) {
    const last = a.last4[a.last4.length - 1];
    if (last == null || a.away || a.last4Away[a.last4Away.length - 1]) continue;
    const g = a.score - last;
    if (g > gain) {
      gain = g;
      best = a;
    }
  }
  return best;
}

export function teamLine(t: Team): string {
  const me = t.agents.find((a) => a.me);
  const r = me ? ranks(t).get(me.id) : null;
  if (me && r) return `You are #${r} of ${t.agents.length} this week`;
  return `${atMinimum(t)} of ${t.agents.length} at ${t.minimum} this week`;
}

/** The Team orb under ONE YOU: quiet (green) always; a leaderboard never nags. */
export function withTeamNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, t: Team | null): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== TEAM_NODE);
  const edges = g.edges.filter((e) => e.target !== TEAM_NODE);
  if (!go || go.locked || !t || !t.agents.length) return { ...g, nodes, edges };
  nodes.push({
    id: TEAM_NODE,
    type: "feature",
    label: "Team",
    secondaryLabel: teamLine(t),
    parentId: "go",
    product: "go",
    importance: 0.98,
    status: "healthy",
    summary: "The week's leaderboard, full screen for the office TV. Names, photos and weekly scores only.",
  });
  edges.push({ id: `go>${TEAM_NODE}`, source: "go", target: TEAM_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** Example team for the demo dashboard. */
export function demoTeam(weekStart: string): Team {
  const m = (id: string, name: string, score: number, last4: number[], streak: number, tickedToday: boolean, me = false) => ({
    user_id: id, first_name: name, photo_url: null, score, last4, streak_weeks: streak, ticked_today: tickedToday, me,
  });
  return readTeam({
    week_start: weekStart,
    minimum: 100,
    agents: [
      m("t1", "Jen", 112, [96, 104, 101, 98], 9, true),
      m("t2", "Marcus", 104, [88, 92, 101, 77], 1, true),
      m("t3", "Sarah", 98, [101, 105, 99, 110], 0, true, true),
      m("t4", "Dave", 91, [70, 84, 79, 82], 0, false),
      m("t5", "Amy", 87, [102, 108, 111, 104], 0, true),
      m("t6", "Travis", 76, [60, 72, 81, 64], 0, false),
      m("t7", "Annette", 69, [99, 95, 90, 88], 0, true),
      m("t8", "Lisa", 58, [41, 55, 60, 47], 0, false),
    ],
  })!;
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
}

/** Streak badges, longest first (weeks at the minimum in a row). */
export const STREAK_TIERS = [12, 8, 4];

/**
 * A mate's badges on the Team screen: the week's own (top of the week at the minimum, most improved, the longest
 * streak tier reached) first, then what they earned in ONE MOVE. Read only; good news, never a nag.
 */
export function badgesFor(t: Team, a: Mate): Badge[] {
  const out: Badge[] = [];
  const r = ranks(t).get(a.id);
  if (r === 1 && a.score >= t.minimum) out.push({ id: "top", label: "Top of the week", icon: "★" });
  if (mostImproved(t)?.id === a.id) out.push({ id: "improved", label: "Most improved", icon: "↑" });
  const tier = STREAK_TIERS.find((n) => a.streak >= n);
  if (tier) out.push({ id: `streak-${tier}`, label: `${tier}-week streak`, icon: "✦" });
  for (const e of a.earned) out.push({ id: `earned-${e}`, label: e, icon: "◆" });
  return out;
}
