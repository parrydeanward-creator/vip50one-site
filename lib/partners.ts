import type { GraphEdge, GraphNode } from "./graph/types.ts";

// Accountability partners (VIP-SUMMARY §3s; Parry, 7 Oct: "accountability partner..yes"). Two agents who agreed see
// each other's weekly score against the 100, the last 4 weeks, the streak and whether today was ticked, and send
// one preset nudge a day. Commitments, contacts and clients are never shared. Opt-in on both sides; either ends it.

const MOVE_URL = "https://move.vip50one.com";
export const PARTNERS_NODE = "go-partners";
export const partnersUrl = `${MOVE_URL}/api/brain/partners`;
export const partnersActionUrl = (a: "invite" | "respond" | "end" | "nudge") => `${MOVE_URL}/api/brain/partners/${a}`;
export const MAX_PARTNERS = 3;

export const NUDGES = {
  got_this: "You've got this",
  call_me: "Call me when you can",
  proud: "Proud of your week",
  both_100: "Let's both hit 100 this week",
} as const;
export type NudgeKind = keyof typeof NUDGES;
const isKind = (v: unknown): v is NudgeKind => typeof v === "string" && v in NUDGES;

export interface Partner {
  pairId: string;
  userId: string;
  name: string;
  photo: string | null;
  score: number | null;
  minimum: number;
  last4: number[];
  streak: number;
  tickedToday: boolean;
  lastNudgeFromMe: string | null;
}
export interface PartnersState {
  partners: Partner[];
  invitesIn: { pairId: string; name: string }[];
  invitesOut: { pairId: string; name: string; expires: string | null }[];
  nudges: { from: string; kind: NudgeKind; at: string }[];
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 60) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** A §3s.4 answer, checked; null when it is not one. */
export function readPartners(j: unknown): PartnersState | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.partners)) return null;
  const partners: Partner[] = [];
  for (const p of r.partners as Record<string, unknown>[]) {
    const pairId = str(p?.pair_id), userId = str(p?.user_id), name = str(p?.first_name);
    if (!pairId || !userId || !name) continue;
    const w = (p.week ?? {}) as Record<string, unknown>;
    partners.push({
      pairId,
      userId,
      name,
      photo: str(p.photo_url),
      score: num(w.score),
      minimum: num(w.minimum) || 100,
      last4: (Array.isArray(p.last4) ? p.last4 : []).map(num).filter((x): x is number => x != null).slice(-4),
      streak: num(p.streak) ?? 0,
      tickedToday: p.ticked_today === true,
      lastNudgeFromMe: typeof p.last_nudge_from_me_at === "string" ? p.last_nudge_from_me_at : null,
    });
  }
  const pairs = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  return {
    partners: partners.slice(0, MAX_PARTNERS),
    invitesIn: pairs(r.invites_in).flatMap((x) => (str(x?.pair_id) && str(x?.first_name) ? [{ pairId: str(x.pair_id)!, name: str(x.first_name)! }] : [])),
    invitesOut: pairs(r.invites_out).flatMap((x) => (str(x?.pair_id) && str(x?.first_name) ? [{ pairId: str(x.pair_id)!, name: str(x.first_name)!, expires: typeof x.expires_at === "string" ? x.expires_at.slice(0, 10) : null }] : [])),
    nudges: pairs(r.nudges)
      .flatMap((x) => (str(x?.from_first_name) && isKind(x?.kind) && typeof x?.sent_at === "string" ? [{ from: str(x.from_first_name)!, kind: x.kind as NudgeKind, at: x.sent_at as string }] : []))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 10),
  };
}

/** One nudge per partner per day (§3s.3). `today` is the agent's own date. */
export const nudgedToday = (p: Partner, today: string) => !!p.lastNudgeFromMe && p.lastNudgeFromMe.slice(0, 10) === today;

/** Something waiting on the agent: an invite to answer, or a nudge from today. */
export function waiting(s: PartnersState, today: string): number {
  return s.invitesIn.length + s.nudges.filter((n) => n.at.slice(0, 10) === today).length;
}

export function partnerLine(p: Partner): string {
  if (p.score == null) return "No score yet this week";
  return p.score >= p.minimum ? `${p.score} this week: at ${p.minimum}` : `${p.score} this week: ${p.minimum - p.score} to ${p.minimum}`;
}

/** The Partners orb under ONE YOU: yellow when an invite or today's nudge waits. Shown once anyone is invited. */
export function withPartnersNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, s: PartnersState | null, today: string): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== PARTNERS_NODE);
  const edges = g.edges.filter((e) => e.target !== PARTNERS_NODE);
  if (!go || go.locked || !s) return { ...g, nodes, edges };
  const w = waiting(s, today);
  const n = s.partners.length;
  nodes.push({
    id: PARTNERS_NODE,
    type: "feature",
    label: "Partners",
    secondaryLabel: w ? `${w} waiting for you` : n ? `${n} accountability ${n === 1 ? "partner" : "partners"}` : "Pick an accountability partner",
    parentId: "go",
    product: "go",
    importance: 0.99,
    status: w ? "attention" : "healthy",
    summary: "Agents you chose to keep each other honest: their weekly score, and a one-tap nudge. Nothing else is shared.",
  });
  edges.push({ id: `go>${PARTNERS_NODE}`, source: "go", target: PARTNERS_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** Example partners for the demo dashboard. */
export function demoPartners(today: string): PartnersState {
  return {
    partners: [
      { pairId: "p1", userId: "u1", name: "Jen", photo: null, score: 108, minimum: 100, last4: [96, 104, 112, 101], streak: 3, tickedToday: true, lastNudgeFromMe: null },
      { pairId: "p2", userId: "u2", name: "Marcus", photo: null, score: 54, minimum: 100, last4: [82, 77, 91, 68], streak: 0, tickedToday: false, lastNudgeFromMe: null },
    ],
    invitesIn: [{ pairId: "p3", name: "Dave" }],
    invitesOut: [],
    nudges: [{ from: "Jen", kind: "both_100", at: `${today}T14:10:00Z` }],
  };
}
