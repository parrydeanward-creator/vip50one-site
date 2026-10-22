import type { GraphEdge, GraphNode } from "./graph/types.ts";
import type { Block } from "./schedule.ts";
import { contactHref, type TouchItem } from "./touchBlock.ts";

// Power Hour in ONE YOU (PULSE-ROADMAP "ONE YOU"; Parry approved, 6 Oct). One Power Hour everywhere (Parry, 22 Oct): the
// line-up is the touches of the Power Hour ONE MOVE sends (GET /api/brain/day, `items`), then the "Finish your VIP
// touches" follow-up's once the hour has ended; the Day Clock and Your day draw the same ones (lib/touchBlock.ts). The
// Brain no longer builds a call list of its own (it was Today's touches plus a few behind pace, 19 Oct). A tick goes
// through the same tick as the side panel's. Nothing here dials, texts or sends anything for the agent.

export const POWER_NODE = "go-power";
export const LENGTHS = [30, 45, 60] as const;
export const powerKey = (date: string) => `one.power.${date}`;

export type TouchKind = "call" | "video_text" | "text" | "social" | "note";
export const TOUCH_WORD: Record<TouchKind, string> = { call: "Call", video_text: "Video text", text: "Text", social: "Social touch", note: "Handwritten note" };
const TOUCH_ORDER: Record<TouchKind, number> = { call: 0, video_text: 1, text: 2, social: 3, note: 4 };

export type Outcome = "talked" | "message" | "no_answer" | "sent" | "skipped";
export const OUTCOME_WORD: Record<Outcome, string> = { talked: "Talked", message: "Left a message", no_answer: "No answer", sent: "Done", skipped: "Skipped" };
export const LOGGED: readonly Outcome[] = ["talked", "message", "sent"];
/** The buttons for each kind of touch: a call says how it went; a text or social touch is done or skipped. */
export const OUTCOMES: Record<TouchKind, readonly Outcome[]> = {
  call: ["talked", "message", "no_answer", "skipped"],
  video_text: ["sent", "skipped"],
  text: ["sent", "skipped"],
  social: ["sent", "skipped"],
  note: ["sent", "skipped"],
};
/** The word on the done button for a kind ("Sent" for a text, "Done" for a social touch). */
export const outcomeWord = (kind: TouchKind, o: Outcome) => (o === "sent" ? (kind === "video_text" || kind === "text" ? "Sent" : "Done") : OUTCOME_WORD[o]);

export interface Call {
  id: string; // unique in the line-up: contact + kind, or the day item ref
  contactId: string | null;
  name: string;
  kind: TouchKind;
  why: string;
  ref: string | null; // the day item it ticks when logged
  taskId: string | null; // the MASTER task it closes when done
  level: "now" | "today" | null;
  done: boolean; // ONE MOVE says it is ticked
}

export interface Session {
  date: string;
  minutes: number;
  startedAt: number | null; // ms; null until Start
  order: string[]; // ids, in the order the agent works them
  results: Record<string, Outcome>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The kind of touch an item of ONE MOVE's Power Hour is (its `what` says video text or social touch). */
export function touchKindOf(i: Pick<TouchItem, "kind" | "what">): TouchKind {
  if (i.kind === "call") return "call";
  if (i.kind === "note") return "note";
  if (/video/i.test(i.what)) return "video_text";
  if (/social/i.test(i.what)) return "social";
  return "text";
}

/**
 * The Power Hour's line-up: exactly the items of the day's Power Hour block and, once the hour has ended, its follow-up
 * (lib/touchBlock.ts touchBlocks), in ONE MOVE's order, each ref once. The names link as the side panel's do.
 */
export function callsFromTouch(blocks: readonly Pick<Block, "items" | "followUp">[]): Call[] {
  const seen = new Set<string>();
  const out: Call[] = [];
  for (const b of blocks)
    for (const i of b.items ?? []) {
      if (seen.has(i.ref)) continue;
      seen.add(i.ref);
      out.push({
        id: i.ref,
        contactId: i.contactId && contactHref(i.contactId) && UUID.test(i.contactId) ? i.contactId : null,
        name: i.name,
        kind: touchKindOf(i),
        why: b.followUp ? "Left from your Power Hour" : "Today's VIP touch",
        ref: i.ref,
        taskId: i.taskId && UUID.test(i.taskId) ? i.taskId : null,
        level: null,
        done: i.done,
      });
    }
  return out;
}

/** The session with every touch ONE MOVE already shows ticked counted as done, whatever was logged here. */
export function withTicked(s: Session, calls: readonly Call[]): Session {
  const results = { ...s.results };
  for (const c of calls) if (c.done && !results[c.id]) results[c.id] = "sent";
  return { ...s, results };
}

/** "5 calls, 3 video texts, 2 social touches" for a set of touches. */
export function touchesLine(calls: Call[]): string {
  const n = (k: TouchKind) => calls.filter((c) => c.kind === k).length;
  const word: Record<TouchKind, [string, string]> = { call: ["call", "calls"], video_text: ["video text", "video texts"], text: ["text", "texts"], social: ["social touch", "social touches"], note: ["handwritten note", "handwritten notes"] };
  const bits = (Object.keys(word) as TouchKind[]).filter((k) => n(k)).map((k) => `${n(k)} ${word[k][n(k) === 1 ? 0 : 1]}`);
  return bits.join(", ") || "Nothing lined up";
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
  sent: number;
  noAnswer: number;
  skipped: number;
  left: number;
  line: string;
}

/** What got done, in one line. */
export function wrap(calls: Call[], s: Session): Wrap {
  const r = calls.map((c) => s.results[c.id]).filter(Boolean) as Outcome[];
  const n = (o: Outcome) => r.filter((x) => x === o).length;
  const talked = n("talked"), messages = n("message"), noAnswer = n("no_answer"), sent = n("sent"), skipped = n("skipped");
  const left = calls.length - r.length;
  const bits = [
    talked && `${talked} ${talked === 1 ? "conversation" : "conversations"}`,
    messages && `${messages} ${messages === 1 ? "message" : "messages"} left`,
    noAnswer && `${noAnswer} no answer`,
    sent && `${sent} ${sent === 1 ? "text or social touch" : "texts and social touches"} done`,
  ].filter(Boolean);
  const line = r.length ? `${bits.join(", ") || "Nothing logged"}${left ? `. ${left} still to do.` : "."}` : "Nothing done yet.";
  return { talked, messages, noAnswer, sent, skipped, left, line };
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
    for (const [k, v] of Object.entries(r.results as Record<string, unknown>)) if (v === "talked" || v === "message" || v === "no_answer" || v === "sent" || v === "skipped") results[k] = v;
  return { date, minutes, startedAt, order, results };
}

/** The Power Hour orb under ONE YOU: "8 touches lined up", pulsing with the most urgent touch in it. */
export function withPowerNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, calls: Call[] | null, s: Session | null): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== POWER_NODE);
  const edges = g.edges.filter((e) => e.target !== POWER_NODE);
  if (!go || go.locked || !calls) return { ...g, nodes, edges };
  const open = calls.filter((c) => !c.done && !s?.results[c.id]);
  const w = s ? wrap(calls, s) : null;
  nodes.push({
    id: POWER_NODE,
    type: "feature",
    label: "Power Hour",
    secondaryLabel: !calls.length ? "Nothing to catch up on" : open.length ? `${open.length} ${open.length === 1 ? "touch" : "touches"} lined up` : `Done: ${w!.line.replace(/\.$/, "")}`,
    parentId: "go",
    product: "go",
    importance: 1.02,
    status: open.length ? "attention" : "healthy",
    needCount: open.length || undefined,
    summary: "An hour on today's VIP touches (calls, video texts, social): the same Power Hour as on your Day Clock. Each one you finish ticks its boxes.",
  });
  edges.push({ id: `go>${POWER_NODE}`, source: "go", target: POWER_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}
