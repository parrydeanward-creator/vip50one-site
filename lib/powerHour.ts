import type { GraphEdge, GraphNode } from "./graph/types.ts";
import type { DayItem } from "./day.ts";
import { nameFromTitle } from "./contact.ts";
import type { VipPerson, VipRoster } from "./vips.ts";

// Power Hour in ONE YOU (PULSE-ROADMAP "ONE YOU"; Parry approved, 6 Oct): block an hour, the top calls lined
// up with Call Prep, a countdown, then what got done. Who comes first follows the pulse: overdue, then special
// days, then due today, then the VIP-50 with no call yet this month, the longest unheard first. The agent
// says how each call went; only "Talked" and "Left a message" are logged, through ONE MOVE's own touch log.
// Nothing here dials, texts or sends anything for the agent.

export const POWER_NODE = "go-power";
export const MAX_CALLS = 10; // about six minutes a call in an hour
export const LENGTHS = [30, 45, 60] as const;
export const powerKey = (date: string) => `one.power.${date}`;

export type Outcome = "talked" | "message" | "no_answer" | "skipped";
export const OUTCOME_WORD: Record<Outcome, string> = { talked: "Talked", message: "Left a message", no_answer: "No answer", skipped: "Skipped" };
export const LOGGED: readonly Outcome[] = ["talked", "message"];

export interface Call {
  id: string; // unique in the line-up: the contact id, or the day item ref
  contactId: string | null;
  name: string;
  why: string;
  ref: string | null; // the day item it ticks when logged
  taskId: string | null; // the MASTER task it closes when they talked
  level: "now" | "today" | null;
}

export interface Session {
  date: string;
  minutes: number;
  startedAt: number | null; // ms; null until Start
  order: string[]; // call ids, in the order the agent works them
  results: Record<string, Outcome>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const callish = (d: DayItem) => d.kind === "call" || (d.kind === "follow_up" && /^\s*call\b/i.test(d.what));
const rank = (d: DayItem) => (d.urgency === "alert" ? 0 : d.special ? 1 : d.urgency === "today" ? 2 : 3);
const byOldest = (a: VipPerson, b: VipPerson) => (a.last_touch_on ?? "").localeCompare(b.last_touch_on ?? "");

/** The calls for this Power Hour, most urgent first, at most MAX_CALLS, each person once. */
export function lineUp(today: DayItem[], roster: VipRoster | null, max = MAX_CALLS): Call[] {
  const out: Call[] = [];
  const seen = new Set<string>();
  const due = today.filter(callish).sort((a, b) => rank(a) - rank(b));
  const names = new Set<string>();
  for (const d of due) {
    const key = d.contactId ?? d.ref ?? d.id;
    // "Call Jen Alvarez. Her birthday is tomorrow." -> the name, and the reason in the item's own words
    const [head, ...rest] = d.what.split(/\.\s+|\s+[—–-]\s+/);
    const name = nameFromTitle(head) || head;
    const said = rest.join(". ").trim().replace(/\.$/, "");
    if (seen.has(key) || names.has(name.toLowerCase())) continue;
    seen.add(key);
    names.add(name.toLowerCase());
    const task = d.ref?.match(/^go:task:(.+)$/)?.[1] ?? null;
    out.push({
      id: key,
      contactId: d.contactId && UUID.test(d.contactId) ? d.contactId : null,
      name,
      why: [d.urgency === "alert" ? "Overdue" : d.special ? "A special day" : d.urgency === "today" ? "Due today" : "On today's list", said].filter(Boolean).join(": "),
      ref: d.ref ?? null,
      taskId: task && UUID.test(task) ? task : null,
      level: d.urgency === "alert" ? "now" : d.urgency === "today" || d.special ? "today" : null,
    });
  }
  const noCall = (roster?.vip50 ?? []).filter((p) => !p.month?.call && !seen.has(p.id) && !names.has(p.name.trim().toLowerCase())).sort(byOldest);
  for (const p of noCall) {
    seen.add(p.id);
    out.push({
      id: p.id,
      contactId: UUID.test(p.id) ? p.id : null,
      name: p.name,
      why: p.last_touch_on ? `VIP-50, no call this month · last touch ${p.last_touch_on}` : "VIP-50, no call this month",
      ref: null,
      taskId: null,
      level: null,
    });
  }
  return out.slice(0, max);
}

/** Minutes and seconds left, never below zero; null before Start. */
export function remaining(s: Session, now: number): number | null {
  if (s.startedAt == null) return null;
  return Math.max(0, s.minutes * 60_000 - (now - s.startedAt));
}

export const mmss = (ms: number) => {
  const t = Math.ceil(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** The call now: the first in the agent's order with no result yet. */
export function current(calls: Call[], s: Session): Call | null {
  const by = new Map(calls.map((c) => [c.id, c]));
  for (const id of s.order) if (by.has(id) && !s.results[id]) return by.get(id)!;
  return calls.find((c) => !s.results[c.id]) ?? null;
}

/** Bring a call to the front of what is left (tapping its orb). */
export function bringUp(s: Session, id: string): Session {
  return { ...s, order: [id, ...s.order.filter((x) => x !== id)] };
}

export interface Wrap {
  talked: number;
  messages: number;
  noAnswer: number;
  skipped: number;
  left: number;
  line: string;
}

/** What got done, in one line. */
export function wrap(calls: Call[], s: Session): Wrap {
  const r = calls.map((c) => s.results[c.id]).filter(Boolean) as Outcome[];
  const n = (o: Outcome) => r.filter((x) => x === o).length;
  const talked = n("talked"), messages = n("message"), noAnswer = n("no_answer"), skipped = n("skipped");
  const left = calls.length - r.length;
  const bits = [
    talked && `${talked} ${talked === 1 ? "conversation" : "conversations"}`,
    messages && `${messages} ${messages === 1 ? "message" : "messages"} left`,
    noAnswer && `${noAnswer} no answer`,
  ].filter(Boolean);
  const line = r.length ? `${bits.join(", ") || "Nothing logged"}${left ? `. ${left} still to call.` : "."}` : "No calls yet.";
  return { talked, messages, noAnswer, skipped, left, line };
}

/** A fresh session for today, keeping the line-up's order. */
export function newSession(date: string, calls: Call[], minutes = 60): Session {
  return { date, minutes, startedAt: null, order: calls.map((c) => c.id), results: {} };
}

/** A stored session read back, checked; null when it is not today's. */
export function readSession(j: unknown, date: string): Session | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (r.date !== date) return null;
  const minutes = LENGTHS.includes(r.minutes as (typeof LENGTHS)[number]) ? (r.minutes as number) : 60;
  const startedAt = typeof r.startedAt === "number" && Number.isFinite(r.startedAt) ? r.startedAt : null;
  const order = Array.isArray(r.order) ? (r.order as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const results: Record<string, Outcome> = {};
  if (r.results && typeof r.results === "object")
    for (const [k, v] of Object.entries(r.results as Record<string, unknown>)) if (v === "talked" || v === "message" || v === "no_answer" || v === "skipped") results[k] = v;
  return { date, minutes, startedAt, order, results };
}

/** The Power Hour orb under ONE YOU: "8 calls lined up", pulsing with the most urgent call in it. */
export function withPowerNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, calls: Call[] | null, s: Session | null): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== POWER_NODE);
  const edges = g.edges.filter((e) => e.target !== POWER_NODE);
  if (!go || go.locked || !calls) return { ...g, nodes, edges };
  const open = calls.filter((c) => !s?.results[c.id]);
  const w = s ? wrap(calls, s) : null;
  const now = open.filter((c) => c.level === "now").length;
  const today = open.filter((c) => c.level === "today").length;
  nodes.push({
    id: POWER_NODE,
    type: "feature",
    label: "Power Hour",
    secondaryLabel: !calls.length ? "No calls lined up" : open.length ? `${open.length} ${open.length === 1 ? "call" : "calls"} lined up` : `Done: ${w!.line.replace(/\.$/, "")}`,
    parentId: "go",
    product: "go",
    importance: 1.02,
    status: now ? "action" : today ? "attention" : "healthy",
    needCount: now + today || undefined,
    summary: "An hour of calls: the top calls lined up with Call Prep, a countdown, then what got done.",
  });
  edges.push({ id: `go>${POWER_NODE}`, source: "go", target: POWER_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}
