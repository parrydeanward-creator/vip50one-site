import type { GraphEdge, GraphNode } from "./graph/types.ts";
import steps from "./review-call-steps.json" with { type: "json" };

// Review calls in the Brain (VIP-SUMMARY §3v; Parry, 8 Oct: "it needs to be in the NEw one version as well"). The
// same call guide as Classic ONE MOVE's Coach > Review calls (vip50-ecosystem research/review-call-steps.json, the
// Websites bot's wording, copied here; copy again when its `version` changes) and the same MASTER `review_calls`, so a
// call saved in either place shows in both. Admins only; nothing is sent to anyone.

const MOVE_URL = "https://move.vip50one.com";
export const REVIEW_CALLS_NODE = "go-review-calls";
export const agentsUrl = (q = "") => `${MOVE_URL}/api/brain/review-calls/agents${q ? `?q=${encodeURIComponent(q)}` : ""}`;
export const callsUrl = (agent: string) => `${MOVE_URL}/api/brain/review-calls?agent=${encodeURIComponent(agent)}`;
export const saveUrl = `${MOVE_URL}/api/brain/review-calls`;

export type CallKind = "site" | "soi";
export type CallStep = { t: string; min: string; say?: string; items: string[]; rule?: string };
export type CallGuide = { title: string; steps: CallStep[] };
export const STEPS_VERSION: number = steps.version;
export const GUIDES = steps.calls as Record<CallKind, CallGuide>;
export const KINDS: CallKind[] = ["site", "soi"];
export const isCallKind = (v: unknown): v is CallKind => v === "site" || v === "soi";

/** Item key used for ticks, the same as ONE MOVE's: "<step index>.<item index>". */
export const itemKey = (s: number, i: number) => `${s}.${i}`;

export interface ReviewAgent {
  id: string;
  name: string;
  plan: string | null;
  addons: string[];
}
export interface SavedCall {
  id: string;
  kind: CallKind;
  at: string;
  durationSec: number | null;
  ticked: number;
  total: number;
  notes: Record<string, string>;
}

const str = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function readAgents(j: unknown): ReviewAgent[] | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as { agents?: unknown }).agents)) return null;
  const out: ReviewAgent[] = [];
  for (const x of (j as { agents: Record<string, unknown>[] }).agents) {
    const id = str(x?.user_id), name = str(x?.name);
    if (!id || !name) continue;
    out.push({ id, name, plan: str(x.plan, 30), addons: Array.isArray(x.addons) ? x.addons.filter((a): a is string => typeof a === "string").slice(0, 8) : [] });
  }
  return out.slice(0, 30);
}

export function readCalls(j: unknown): SavedCall[] | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as { calls?: unknown }).calls)) return null;
  const out: SavedCall[] = [];
  for (const x of (j as { calls: Record<string, unknown>[] }).calls) {
    const id = str(x?.id), at = typeof x?.created_at === "string" ? x.created_at : null;
    if (!id || !at || !isCallKind(x.kind)) continue;
    const t = Array.isArray(x.ticked) ? x.ticked.length : 0;
    const u = Array.isArray(x.unticked) ? x.unticked.length : 0;
    const notes: Record<string, string> = {};
    if (x.notes && typeof x.notes === "object") for (const [k, v] of Object.entries(x.notes as Record<string, unknown>)) if (typeof v === "string" && v.trim()) notes[k.slice(0, 80)] = v.slice(0, 4000);
    out.push({ id, kind: x.kind, at, durationSec: typeof x.duration_sec === "number" ? x.duration_sec : null, ticked: t, total: t + u, notes });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
}

/** How many of a step's items are ticked. */
export function stepDone(kind: CallKind, s: number, ticks: Set<string>): number {
  return GUIDES[kind].steps[s].items.filter((_, i) => ticks.has(itemKey(s, i))).length;
}
export const totalItems = (kind: CallKind) => GUIDES[kind].steps.reduce((n, st) => n + st.items.length, 0);

/** The body ONE MOVE saves (§3v.3). Notes keyed by step index, empty ones dropped. */
export function saveBody(agentId: string, kind: CallKind, ticks: Set<string>, notes: Record<number, string>, durationSec: number) {
  const n: Record<string, string> = {};
  for (const [k, v] of Object.entries(notes)) if (v.trim()) n[k] = v.trim().slice(0, 4000);
  return { agent_id: agentId, kind, ticks: [...ticks].filter((t) => /^\d+\.\d+$/.test(t)).sort(), notes: n, duration_sec: Math.max(0, Math.round(durationSec)) };
}

/** 1:05:09 or 12:04, the same as ONE MOVE's clock. */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0"), rr = String(r).padStart(2, "0");
  return h ? `${h}:${mm}:${rr}` : `${mm}:${rr}`;
}

/** The Review calls orb under ONE YOU, for admins only (shown once ONE MOVE answers the agents list). */
export function withReviewCallsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, on: boolean): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== REVIEW_CALLS_NODE);
  const edges = g.edges.filter((e) => e.target !== REVIEW_CALLS_NODE);
  if (!go || go.locked || !on) return { ...g, nodes, edges };
  nodes.push({
    id: REVIEW_CALLS_NODE,
    type: "feature",
    label: "Review calls",
    secondaryLabel: "Done-for-you site and SOI setup",
    parentId: "go",
    product: "go",
    importance: 0.9,
    status: "healthy",
    summary: "The call guide for the paid done-for-you add-ons. Admins only; saved on the agent's record.",
  });
  edges.push({ id: `go>${REVIEW_CALLS_NODE}`, source: "go", target: REVIEW_CALLS_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

export function demoAgents(): ReviewAgent[] {
  return [
    { id: "a1", name: "Jen Wright", plan: "complete", addons: ["site_build"] },
    { id: "a2", name: "Marcus Lee", plan: "complete", addons: ["soi_setup"] },
    { id: "a3", name: "Amy Chen", plan: "complete", addons: [] },
  ];
}
