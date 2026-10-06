import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { dueLevel, dueWords, keepShare, reached, readCommitments, type Commitments, type Item, type Kind } from "./commitments.ts";

// The Coach view (VIP-SUMMARY §3n.4, §3n.7; Parry, 6 Oct: commitments "seen by the agent and their coach";
// his team are linked to him as their coach). A coach reads, never writes: each agent's week, weekend,
// results and notes, keep rate and streak, with the ones who need a word from the coach first. MASTER only
// answers for someone who coaches at least one agent; anyone else gets no Coaching orb.

const MOVE_URL = "https://move.vip50one.com";
export const coachedUrl = `${MOVE_URL}/api/brain/commitments/coached`;
export const COACH_NODE = "go-coach";

export interface Coached {
  id: string;
  name: string;
  c: Commitments;
}

export type Attention = { level: "now" | "today" | null; words: string };

/** The §3n.4 answer, checked: agents with a name and a readable commitments state. */
export function readCoached(j: unknown, today: string): Coached[] {
  const agents = j && typeof j === "object" ? (j as { agents?: unknown }).agents : null;
  if (!Array.isArray(agents)) return [];
  const out: Coached[] = [];
  for (const a of agents as Record<string, unknown>[]) {
    if (!a || typeof a.agent_id !== "string") continue;
    const c = readCommitments({ ...a, today });
    if (!c) continue;
    const name = typeof a.name === "string" && a.name.trim() ? a.name.trim().slice(0, 60) : "Agent";
    out.push({ id: a.agent_id, name: name.includes("@") ? name.split("@")[0] : name, c });
  }
  return out;
}

/** What the coach should know about one agent right now, in plain words. Facts only. */
export function attention(a: Coached, hour: number): Attention {
  const { c } = a;
  const level = dueLevel(c.due, c.today, hour);
  const first = a.name.split(/\s+/)[0];
  if (level === "now" && c.due) {
    const late: Record<string, string> = {
      set_week: `${first} hasn't set this week's commitments`,
      check_week: `${first} hasn't checked in on the week`,
      set_weekend: `${first} hasn't set weekend commitments`,
      check_weekend: `${first} hasn't checked in on the weekend`,
    };
    return { level, words: late[c.due] };
  }
  if (level === "today" && c.due) return { level, words: `${dueWords(c.due)} today` };
  const items = c.week?.items ?? [];
  if (!items.length) return { level: null, words: "No commitments this week" };
  const missed = items.filter((i) => i.result === "missed").length;
  if (missed) return { level: null, words: `Missed ${missed} of ${items.length} this week` };
  const on = items.filter((i) => i.result === "kept" || reached(i)).length;
  return { level: null, words: `${on} of ${items.length} on track` };
}

/** Who needs the coach first: late (red), due today (yellow), then the lowest keep rate. */
export function coachOrder(agents: Coached[], hour: number): Coached[] {
  const rank = (a: Coached) => {
    const l = attention(a, hour).level;
    return l === "now" ? 0 : l === "today" ? 1 : 2;
  };
  return [...agents].sort((a, b) => rank(a) - rank(b) || (a.c.keepRate8w ?? 1) - (b.c.keepRate8w ?? 1) || a.name.localeCompare(b.name));
}

/** The team's keep rate: the average of the agents who have one. */
export function teamKeepRate(agents: Coached[]): number | null {
  const rates = agents.map((a) => a.c.keepRate8w).filter((r): r is number => r != null);
  return rates.length ? rates.reduce((t, r) => t + r, 0) / rates.length : null;
}

/** Last week, as kept / all (partly counts half), for the drawer. */
export const lastWeekShare = (a: Coached) => {
  const lw = a.c.lastWeek;
  if (!lw) return null;
  const n = lw.kept + lw.partly + lw.missed;
  return n ? (lw.kept + lw.partly / 2) / n : null;
};
export { keepShare };

/** ONE YOU's Coaching orb: only for a coach. It pulses for the agents who are late, with a count. */
export function withCoachNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, agents: Coached[] | null, hour: number): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== COACH_NODE);
  const edges = g.edges.filter((e) => e.target !== COACH_NODE);
  if (!go || go.locked || !agents?.length) return { ...g, nodes, edges };
  const late = agents.filter((a) => attention(a, hour).level === "now").length;
  const today = agents.filter((a) => attention(a, hour).level === "today").length;
  const rate = teamKeepRate(agents);
  nodes.push({
    id: COACH_NODE,
    type: "feature",
    label: "Coaching",
    secondaryLabel: late ? `${late} ${late === 1 ? "agent needs" : "agents need"} a word from you` : `${agents.length} ${agents.length === 1 ? "agent" : "agents"}${rate != null ? ` · ${Math.round(rate * 100)}% kept` : ""}`,
    parentId: "go",
    product: "go",
    importance: 1.02,
    status: late ? "action" : today ? "attention" : "healthy",
    stats: [{ label: "Agents", value: String(agents.length) }],
    summary: "The commitments of the agents you coach: who has set the week, who checked in, and who kept them. Read only.",
  });
  edges.push({ id: `go>${COACH_NODE}`, source: "go", target: COACH_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** Made-up agents for the sales demo, so the Coach view shows what a coach sees. */
export function demoCoached(today: string): Coached[] {
  const base = (over: Partial<Commitments>): Commitments => ({ today, due: null, week: null, weekend: null, lastWeek: null, keepRate8w: null, streak: 0, ...over });
  const item = (id: string, text: string, kind: Kind, target: number | null, count: number | null): Item => ({ id, text, kind, target, count, result: null, note: null });
  const week = (id: string, items: Item[]) => ({ id, starts: today, setAt: `${today}T14:00:00Z`, checkedAt: null, items });
  return [
    { id: "d1", name: "Marcus Lee", c: base({ due: "set_week", keepRate8w: 0.45, streak: 0, lastWeek: { kept: 1, partly: 1, missed: 3 } }) },
    { id: "d2", name: "Jen Alvarez", c: base({ week: week("w2", [item("a", "Call 15 VIPs", "call", 15, 11), item("b", "Two coffees", "face_to_face", 2, 2), item("c", "Finish my listing presentation", "yes_no", null, null)]), keepRate8w: 0.83, streak: 6, lastWeek: { kept: 4, partly: 1, missed: 0 } }) },
    { id: "d3", name: "Dave Kim", c: base({ week: week("w3", [item("a", "Three handwritten notes", "handwritten_note", 3, 1), item("b", "Call 10 VIPs", "call", 10, 2)]), keepRate8w: 0.6, streak: 1, lastWeek: { kept: 2, partly: 1, missed: 2 } }) },
    { id: "d4", name: "Amy Chen", c: base({ week: week("w4", [item("a", "Book my open house", "yes_no", null, null), item("b", "Five video texts", "video_text", 5, 5)]), keepRate8w: 0.92, streak: 9, lastWeek: { kept: 5, partly: 0, missed: 0 } }) },
  ];
}
