import type { GraphEdge, GraphNode } from "./graph/types.ts";
import type { DayItem } from "./day.ts";
import { nameFromTitle } from "./contact.ts";
import type { VipPerson, VipRoster } from "./vips.ts";

// Power Hour in ONE YOU (PULSE-ROADMAP "ONE YOU"; Parry approved, 6 Oct). Reshaped 19 Oct (Parry: "the power hour
// should follow the auto daily tasks or 3 calls, 3 video texts, 3 social interaction etc instead of just creating a
// list of people to call ... focus on what the user already has to accomplish to stay current in the vip-50 system";
// "all of today's touches"; then "anything that is behind schedule, touches or daily items that are not done. dont
// overwhelm so set a max"). The line-up is today's VIP touch tasks first (calls, then video texts, texts, social),
// most urgent first, then the VIP-50 touches behind for the month, longest unheard first, at most MAX_ITEMS in all.
// Each done touch is logged in ONE MOVE as its own kind, which ticks the task, the contact's month box and the
// Daily Tracker slot. Nothing here dials, texts or sends anything for the agent.

export const POWER_NODE = "go-power";
export const MAX_ITEMS = 12; // about five minutes a touch in an hour
/** @deprecated the line-up holds every kind of touch now; kept for older imports. */
export const MAX_CALLS = MAX_ITEMS;
export const LENGTHS = [30, 45, 60] as const;
export const powerKey = (date: string) => `one.power.${date}`;

export type TouchKind = "call" | "video_text" | "text" | "social";
export const TOUCH_WORD: Record<TouchKind, string> = { call: "Call", video_text: "Video text", text: "Text", social: "Social touch" };
const TOUCH_ORDER: Record<TouchKind, number> = { call: 0, video_text: 1, text: 2, social: 3 };
/** The VIP-50 monthly boxes the "behind" part checks, in the order they are offered. */
const MONTHLY: readonly ("call" | "video_text" | "social")[] = ["call", "video_text", "social"];
const BEHIND_WORD: Record<(typeof MONTHLY)[number], string> = { call: "no call", video_text: "no video text", social: "no social touch" };

export type Outcome = "talked" | "message" | "no_answer" | "sent" | "skipped";
export const OUTCOME_WORD: Record<Outcome, string> = { talked: "Talked", message: "Left a message", no_answer: "No answer", sent: "Done", skipped: "Skipped" };
export const LOGGED: readonly Outcome[] = ["talked", "message", "sent"];
/** The buttons for each kind of touch: a call says how it went; a text or social touch is done or skipped. */
export const OUTCOMES: Record<TouchKind, readonly Outcome[]> = {
  call: ["talked", "message", "no_answer", "skipped"],
  video_text: ["sent", "skipped"],
  text: ["sent", "skipped"],
  social: ["sent", "skipped"],
};
/** The word on the done button for a kind ("Sent" for a text, "Done" for a social touch). */
export const outcomeWord = (kind: TouchKind, o: Outcome) => (o === "sent" ? (kind === "social" ? "Done" : "Sent") : OUTCOME_WORD[o]);

export interface Call {
  id: string; // unique in the line-up: contact + kind, or the day item ref
  contactId: string | null;
  name: string;
  kind: TouchKind;
  why: string;
  ref: string | null; // the day item it ticks when logged
  taskId: string | null; // the MASTER task it closes when done
  level: "now" | "today" | null;
  behind: boolean; // from the month's missing touches, not a task for today
}

export interface Session {
  date: string;
  minutes: number;
  startedAt: number | null; // ms; null until Start
  order: string[]; // ids, in the order the agent works them
  results: Record<string, Outcome>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const callish = (d: DayItem) => d.kind === "call" || (d.kind === "follow_up" && /^\s*call\b/i.test(d.what));
/** The kind of touch a day item is, or null when it is not a touch the Power Hour works. */
export function touchOf(d: DayItem): TouchKind | null {
  if (callish(d)) return "call";
  if (d.kind !== "text") return null;
  if (/video/i.test(d.what)) return "video_text";
  if (/social/i.test(d.what)) return "social";
  return "text";
}
const rank = (d: DayItem) => (d.urgency === "alert" ? 0 : d.special ? 1 : d.urgency === "today" ? 2 : 3);
const byOldest = (a: VipPerson, b: VipPerson) => (a.last_touch_on ?? "").localeCompare(b.last_touch_on ?? "");
// "Social media touch — Jen Alvarez" (ONE MOVE's generated title): the name comes after the dash
const SOCIAL_HEAD = /^\s*social(?: media)? (?:touch|interaction)(?: with)?\s*[—–:-]?\s*/i;

/**
 * How many VIP-50s are behind on one monthly touch on `date` ("YYYY-MM-DD"): the month's touches spread evenly, so by
 * day d of a D-day month about d/D of the list should have had it. Early in the month nobody is behind.
 */
export function behindCount(total: number, done: number, date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.max(0, Math.floor((total * d) / days) - done);
}

/** Today's touches, then what is behind pace for the month, most urgent first, at most `max`, each person once per kind. */
export function lineUp(today: DayItem[], roster: VipRoster | null, date: string, max = MAX_ITEMS): Call[] {
  const out: Call[] = [];
  const seen = new Set<string>();
  const due = today
    .map((d) => ({ d, kind: touchOf(d) }))
    .filter((x): x is { d: DayItem; kind: TouchKind } => !!x.kind)
    .sort((a, b) => rank(a.d) - rank(b.d) || TOUCH_ORDER[a.kind] - TOUCH_ORDER[b.kind]);
  for (const { d, kind } of due) {
    const what = d.what.replace(SOCIAL_HEAD, "").replace(/^\s*send\s+/i, "");
    // "Call Jen Alvarez. Her birthday is tomorrow." -> the name, and the reason in the item's own words
    const [head, ...rest] = what.split(/\.\s+|,\s+|\s+[—–-]\s+/);
    const name = (nameFromTitle(head) || head).replace(/\.+$/, "");
    const said = rest.join(". ").trim().replace(/\.$/, "");
    const who = d.contactId ?? name.toLowerCase();
    const key = `${who}:${kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    seen.add(`${name.toLowerCase()}:${kind}`);
    const task = d.ref?.match(/^go:task:(.+)$/)?.[1] ?? null;
    out.push({
      id: d.ref ?? `${d.contactId ?? d.id}:${kind}`,
      contactId: d.contactId && UUID.test(d.contactId) ? d.contactId : null,
      name,
      kind,
      why: [d.urgency === "alert" ? "Overdue" : d.special ? "A special day" : d.urgency === "today" ? "Due today" : "On today's list", said].filter(Boolean).join(": "),
      ref: d.ref ?? null,
      taskId: task && UUID.test(task) ? task : null,
      level: d.urgency === "alert" ? "now" : d.urgency === "today" || d.special ? "today" : null,
      behind: false,
    });
  }
  // Behind pace for the month: per touch (calls first), only as many VIP-50s as the month's pace says are late, the
  // longest unheard first (Parry, 19 Oct: "anything that is behind schedule ... dont overwhelm so set a max").
  const vips = [...(roster?.vip50 ?? [])].sort(byOldest);
  for (const kind of MONTHLY) {
    const missing = vips.filter((p) => !p.month?.[kind]);
    let late = behindCount(vips.length, vips.length - missing.length, date);
    for (const p of missing) {
      if (out.length >= max || late <= 0) break;
      const key = `${p.id}:${kind}`;
      if (seen.has(key) || seen.has(`${p.name.trim().toLowerCase()}:${kind}`)) continue;
      seen.add(key);
      late--;
      out.push({
        id: key,
        contactId: UUID.test(p.id) ? p.id : null,
        name: p.name,
        kind,
        why: `Behind pace: VIP-50, ${BEHIND_WORD[kind]} this month${p.last_touch_on ? ` · last touch ${p.last_touch_on}` : ""}`,
        ref: null,
        taskId: null,
        level: null,
        behind: true,
      });
    }
  }
  return out.slice(0, max);
}

/** "5 calls, 3 video texts, 2 social touches" for a set of touches. */
export function touchesLine(calls: Call[]): string {
  const n = (k: TouchKind) => calls.filter((c) => c.kind === k).length;
  const word: Record<TouchKind, [string, string]> = { call: ["call", "calls"], video_text: ["video text", "video texts"], text: ["text", "texts"], social: ["social touch", "social touches"] };
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
  const open = calls.filter((c) => !s?.results[c.id]);
  const w = s ? wrap(calls, s) : null;
  const now = open.filter((c) => c.level === "now").length;
  const today = open.filter((c) => c.level === "today").length;
  nodes.push({
    id: POWER_NODE,
    type: "feature",
    label: "Power Hour",
    secondaryLabel: !calls.length ? "Nothing to catch up on" : open.length ? `${open.length} ${open.length === 1 ? "touch" : "touches"} lined up` : `Done: ${w!.line.replace(/\.$/, "")}`,
    parentId: "go",
    product: "go",
    importance: 1.02,
    status: now ? "action" : today ? "attention" : "healthy",
    needCount: now + today || undefined,
    summary: "An hour on today's VIP touches (calls, video texts, social), then anything behind for the month. Each one you finish ticks its boxes.",
  });
  edges.push({ id: `go>${POWER_NODE}`, source: "go", target: POWER_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}
