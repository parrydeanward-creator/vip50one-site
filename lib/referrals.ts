import type { GraphEdge, GraphNode } from "./graph/types.ts";

// The Referral Scoreboard (VIP-SUMMARY §3r; Parry, 7 Oct: "referral scoreboard sounds interesting"). Who sent the
// agent business, who is likely to send the next one, and how many of their VIPs refer at all. Rules only, from
// MASTER's records; nothing is sent to anyone: an ask is a task the agent does in their own words.

const MOVE_URL = "https://move.vip50one.com";
export const REFERRALS_NODE = "go-referrals";
export const referralsUrl = (agent?: string) => `${MOVE_URL}/api/brain/referrals${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`;
export const askUrl = `${MOVE_URL}/api/brain/referrals/ask`;
export const thankUrl = `${MOVE_URL}/api/brain/referrals/thank`;

export type Why = "past_referrer_quiet" | "recent_closing" | "fully_touched";
export const WHY_ORDER: Why[] = ["past_referrer_quiet", "recent_closing", "fully_touched"];
export const WHY_TITLE: Record<Why, string> = {
  past_referrer_quiet: "Has referred before, gone quiet",
  recent_closing: "Closed with you recently",
  fully_touched: "Fully touched, never asked",
};

export interface Referrer {
  id: string;
  name: string;
  tier: string | null;
  total: number;
  thisYear: number;
  closed: number;
  value: number | null;
  lastAt: string | null;
  lastTouchAt: string | null;
}
export interface Recent {
  id: string;
  name: string;
  by: string | null;
  at: string;
  closed: boolean;
  value: number | null;
  /** §3r.3; null when ONE MOVE does not say (before v1.55). */
  referralId: string | null;
  thanked: boolean | null;
  thankOpen: boolean;
}
export interface Candidate {
  id: string;
  name: string;
  tier: string | null;
  why: Why;
  words: string;
}
export interface Referrals {
  from: string | null;
  to: string | null;
  goal: number | null;
  count: number;
  referrers: Referrer[];
  recent: Recent[];
  vips: { count: number; ever: number; thisYear: number };
  candidates: Candidate[];
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : null);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const isWhy = (v: unknown): v is Why => typeof v === "string" && (WHY_ORDER as string[]).includes(v);

/** A §3r.1 answer, checked; null when it is not one. */
export function readReferrals(j: unknown): Referrals | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.referrers) || !r.vips || typeof r.vips !== "object") return null;
  const gy = (r.goal_year ?? {}) as Record<string, unknown>;
  const v = r.vips as Record<string, unknown>;
  const referrers: Referrer[] = [];
  for (const x of r.referrers as Record<string, unknown>[]) {
    const id = str(x?.contact_id), name = str(x?.name);
    if (!id || !name) continue;
    referrers.push({ id, name, tier: str(x.tier), total: num(x.total), thisYear: num(x.this_year), closed: num(x.closed), value: numOrNull(x.value), lastAt: day(x.last_referral_at), lastTouchAt: day(x.last_touch_at) });
  }
  referrers.sort((a, b) => b.thisYear - a.thisYear || b.total - a.total || a.name.localeCompare(b.name));
  const recent: Recent[] = [];
  for (const x of (Array.isArray(r.recent) ? r.recent : []) as Record<string, unknown>[]) {
    const at = day(x?.at), name = str(x?.referred_name);
    if (!at || !name) continue;
    recent.push({ id: str(x.referred_contact_id) ?? `${name}:${at}`, name, by: str(x.referrer_contact_id), at, closed: x.closed === true, value: numOrNull(x.value), referralId: str(x.referral_id), thanked: typeof x.thanked === "boolean" ? x.thanked : null, thankOpen: x.thank_open === true });
  }
  recent.sort((a, b) => b.at.localeCompare(a.at));
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const x of (Array.isArray(r.candidates) ? r.candidates : []) as Record<string, unknown>[]) {
    const id = str(x?.contact_id), name = str(x?.name);
    if (!id || !name || !isWhy(x.why) || seen.has(id)) continue;
    seen.add(id);
    candidates.push({ id, name, tier: str(x.tier), why: x.why, words: str(x.words) ?? WHY_TITLE[x.why] });
  }
  candidates.sort((a, b) => WHY_ORDER.indexOf(a.why) - WHY_ORDER.indexOf(b.why));
  return {
    from: day(gy.from),
    to: day(gy.to),
    goal: numOrNull(r.goal) || null,
    count: num(r.count),
    referrers: referrers.slice(0, 50),
    recent: recent.slice(0, 10),
    vips: { count: num(v.count), ever: num(v.referred_ever), thisYear: num(v.referred_this_year) },
    candidates: candidates.slice(0, 10),
  };
}

/** The referral rate: VIPs who referred this goal year, of all VIPs. Null with no VIPs. */
export function referralRate(r: Referrals): number | null {
  return r.vips.count ? r.vips.thisYear / r.vips.count : null;
}

const ago = (d: string, today: string) => Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${d}T12:00:00Z`)) / 86_400_000);

/** Referrals not thanked yet (§3r.3): the last 90 days, no thank-you touch and no open thank-you task, oldest first
 * (the longest wait first). Only when ONE MOVE says so: an unknown is never shown as unthanked. */
export function unthanked(r: Referrals, today: string): Recent[] {
  return r.recent.filter((x) => x.thanked === false && !x.thankOpen && x.referralId && ago(x.at, today) <= 90).sort((a, b) => a.at.localeCompare(b.at));
}

/** Who sent it, by name. */
export const referrerName = (r: Referrals, x: Recent) => r.referrers.find((p) => p.id === x.by)?.name ?? null;

/** "Thank Jane Smith for referring Tom Lee". */
export const thankWords = (r: Referrals, x: Recent) => `Thank ${referrerName(r, x) ?? "them"} for referring ${x.name}`;

/** The example agent's tap, without ONE MOVE: the task is open, so it leaves the list. */
export const applyThank = (r: Referrals, referralId: string): Referrals => ({ ...r, recent: r.recent.map((x) => (x.referralId === referralId ? { ...x, thankOpen: true } : x)) });

/** Ask-worthy now: a quiet past referrer or a recent closing. These make the orb pulse. */
export const askNow = (r: Referrals) => r.candidates.filter((c) => c.why !== "fully_touched");

export function headline(r: Referrals): string {
  const n = r.count;
  const got = `${n} ${n === 1 ? "referral" : "referrals"}`;
  if (r.goal) return n >= r.goal ? `${got}: goal of ${r.goal} reached` : `${got} of ${r.goal} this goal year`;
  return `${got} this goal year`;
}

/** The Referrals orb under ONE YOU: yellow when someone is worth asking now. */
export function withReferralsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, r: Referrals | null, today: string = new Date().toISOString().slice(0, 10)): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== REFERRALS_NODE);
  const edges = g.edges.filter((e) => e.target !== REFERRALS_NODE);
  if (!go || go.locked || !r) return { ...g, nodes, edges };
  const ask = askNow(r).length;
  const thank = unthanked(r, today).length;
  const rate = referralRate(r);
  nodes.push({
    id: REFERRALS_NODE,
    type: "feature",
    label: "Referrals",
    secondaryLabel: thank ? `${thank} to thank${ask ? ` · ${ask} worth asking` : ""}` : ask ? `${ask} worth asking now` : headline(r),
    parentId: "go",
    product: "go",
    importance: 1.0,
    status: ask || thank ? "attention" : "healthy",
    summary: `${headline(r)}.${rate != null ? ` ${Math.round(rate * 100)}% of your VIPs have referred this year.` : ""} Who sent you business, and who is likely next.`,
  });
  edges.push({ id: `go>${REFERRALS_NODE}`, source: "go", target: REFERRALS_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

const addDays = (d: string, k: number) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);

/** Example referrals for the demo dashboard (and until ONE MOVE answers). */
export function demoReferrals(today: string): Referrals {
  const ref = (id: string, name: string, total: number, thisYear: number, closed: number, value: number | null, lastAgo: number, touchAgo: number): Referrer => ({
    id, name, tier: "vip50", total, thisYear, closed, value, lastAt: addDays(today, -lastAgo), lastTouchAt: addDays(today, -touchAgo),
  });
  return {
    from: addDays(today, -220),
    to: addDays(today, 145),
    goal: 12,
    count: 7,
    referrers: [
      ref("r1", "Jane Smith", 4, 2, 2, 812000, 54, 6),
      ref("r2", "Mike Torres", 2, 2, 1, 389000, 21, 3),
      ref("r3", "Ann Ruiz", 3, 1, 1, 455000, 160, 58),
      ref("r4", "David Park", 1, 1, 0, null, 12, 12),
      ref("r5", "Lisa Grant", 1, 1, 0, null, 90, 30),
    ],
    recent: [
      { id: "n1", name: "Tom Lee", by: "r4", at: addDays(today, -12), closed: false, value: null, referralId: "f1", thanked: false, thankOpen: false },
      { id: "n2", name: "Sara Kent", by: "r2", at: addDays(today, -21), closed: false, value: null, referralId: "f2", thanked: true, thankOpen: false },
      { id: "n3", name: "Ben Ortiz", by: "r1", at: addDays(today, -54), closed: true, value: 425000, referralId: "f3", thanked: true, thankOpen: false },
    ],
    vips: { count: 48, ever: 9, thisYear: 5 },
    candidates: [
      { id: "r3", name: "Ann Ruiz", tier: "vip50", why: "past_referrer_quiet", words: "Sent you 3 referrals; no touch in 58 days" },
      { id: "c7", name: "Chris Hall", tier: "vip50", why: "recent_closing", words: "Closed with you 41 days ago; no referral since" },
      { id: "c8", name: "Nina Brooks", tier: "vip50", why: "fully_touched", words: "Every monthly touch for 3 months; has never referred" },
      { id: "c9", name: "Paul Diaz", tier: "vip50", why: "fully_touched", words: "Every monthly touch for 3 months; has never referred" },
    ],
  };
}
