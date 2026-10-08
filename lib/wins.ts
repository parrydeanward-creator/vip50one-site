import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { mondayOf } from "./habits.ts";

// Wins (VIP-SUMMARY §3t; Parry approved ONE YOU's tools, 6 Oct: "every closing, referral, thank-you and five-star
// moment in one place"). Read only, from MASTER; nothing is sent. A win newer than the agent's last look glows gold
// (the special-day glow), never red: good news never nags.

const MOVE_URL = "https://move.vip50one.com";
export const WINS_NODE = "go-wins";
export const winsUrl = (days = 365, agent?: string) => `${MOVE_URL}/api/brain/wins?days=${days}${agent ? `&agent=${encodeURIComponent(agent)}` : ""}`;
export const MAX_WINS = 200;

export type WinKind = "closing" | "referral" | "referral_closed" | "five_star" | "week_100" | "badge" | "goal_reached";
/** The orbs round the middle; a referral that closed sits with referrals. */
export type WinGroup = "closing" | "referral" | "five_star" | "week_100" | "badge" | "goal_reached";
export const GROUPS: WinGroup[] = ["closing", "referral", "five_star", "week_100", "badge", "goal_reached"];
export const GROUP_TITLE: Record<WinGroup, string> = {
  closing: "Closings",
  referral: "Referrals",
  five_star: "Five-star reviews",
  week_100: "Weeks at 100",
  badge: "Badges",
  goal_reached: "Goals reached",
};
const KINDS: WinKind[] = ["closing", "referral", "referral_closed", "five_star", "week_100", "badge", "goal_reached"];
export const groupOf = (k: WinKind): WinGroup => (k === "referral_closed" ? "referral" : k);

export interface Win {
  kind: WinKind;
  at: string;
  title: string;
  detail: string | null;
  contactId: string | null;
  amount: number | null;
}
export interface Wins {
  wins: Win[];
  counts: Record<WinGroup, number>;
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const amt = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const isKind = (v: unknown): v is WinKind => typeof v === "string" && (KINDS as string[]).includes(v);

/** A §3t.1 answer, checked; null when it is not one. Counts are MASTER's when sent, else counted from the list. */
export function readWins(j: unknown): Wins | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.wins)) return null;
  const wins: Win[] = [];
  for (const x of r.wins as Record<string, unknown>[]) {
    const at = day(x?.at), title = str(x?.title, 90);
    if (!at || !title || !isKind(x.kind)) continue;
    wins.push({ kind: x.kind, at, title, detail: str(x.detail, 120), contactId: str(x.contact_id, 60), amount: amt(x.amount) });
  }
  wins.sort((a, b) => b.at.localeCompare(a.at));
  const sent = (r.counts && typeof r.counts === "object" ? r.counts : {}) as Record<string, unknown>;
  const counts = {} as Record<WinGroup, number>;
  for (const g of GROUPS) {
    const n = sent[g];
    counts[g] = typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n) : wins.filter((w) => groupOf(w.kind) === g && w.kind !== "referral_closed").length;
  }
  return { wins: wins.slice(0, MAX_WINS), counts };
}

export const total = (w: Wins) => GROUPS.reduce((s, g) => s + w.counts[g], 0);
export const inGroup = (w: Wins, g: WinGroup) => w.wins.filter((x) => groupOf(x.kind) === g);

/** Wins dated after the agent's last look (`seen`, a date). None before a first look counts as new. */
export function newSince(w: Wins, seen: string | null): Win[] {
  return seen ? w.wins.filter((x) => x.at > seen) : [];
}

export function winsLine(w: Wins): string {
  const n = total(w);
  if (!n) return "Your wins will gather here";
  return `${n} ${n === 1 ? "win" : "wins"} this year`;
}

/** The Wins orb under ONE YOU: a gold glow when something new came in since the last look, never a red pulse. */
export function withWinsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, w: Wins | null, fresh: number): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== WINS_NODE);
  const edges = g.edges.filter((e) => e.target !== WINS_NODE);
  if (!go || go.locked || !w) return { ...g, nodes, edges };
  nodes.push({
    id: WINS_NODE,
    type: "feature",
    label: "Wins",
    secondaryLabel: fresh ? `${fresh} new since you last looked` : winsLine(w),
    parentId: "go",
    product: "go",
    importance: 0.99,
    status: "healthy",
    celebrate: fresh > 0,
    summary: "Every closing, referral, five-star review, week at 100, badge and goal reached, in one place.",
  });
  edges.push({ id: `go>${WINS_NODE}`, source: "go", target: WINS_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

const addDays = (d: string, k: number) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);
const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Example wins for the demo dashboard. */
export function demoWins(today: string): Wins {
  const w = (kind: WinKind, ago: number, title: string, detail: string | null = null, contactId: string | null = null, amount: number | null = null): Win => ({
    kind, at: addDays(today, -ago), title, detail, contactId, amount,
  });
  // a week is won on its Sunday and named by its Monday
  const wk = (weeksAgo: number, score: number) => {
    const mon = addDays(mondayOf(today), -7 * weeksAgo);
    return { kind: "week_100" as const, at: addDays(mon, 6), title: `Week of ${short(mon)}: ${score}`, detail: null, contactId: null, amount: null };
  };
  return readWins({
    wins: [
      w("five_star", 1, "Jane Smith", "Made the whole move feel easy. Answered every call, even on a Sunday.", "r1"),
      w("referral", 2, "Mike Torres sent you Sara Kent", null, "r2"),
      wk(1, 112),
      w("closing", 8, "Closed 1482 Maple Ridge Dr", "Buyer side · $455,000", "r3", 455000),
      w("badge", 9, "Ten-week streak"),
      wk(2, 104),
      w("referral", 12, "David Park sent you Tom Lee", null, "r4"),
      w("goal_reached", 20, "Referrals goal reached: 6 of 6"),
      w("referral_closed", 26, "Ben Ortiz closed (sent by Jane Smith)", "$425,000", "r1", 425000),
      w("closing", 26, "Closed 77 Juniper Ct", "Seller side · $425,000", null, 425000),
      wk(4, 101),
      w("closing", 61, "Closed 309 Canyon View Rd", "Buyer side · $389,000", "r2", 389000),
      w("five_star", 64, "Ann Ruiz", "Ten out of ten. We will never use anyone else.", "r3"),
      w("badge", 90, "First VIP-50 fully touched"),
    ],
  })!;
}
