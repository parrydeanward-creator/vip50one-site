import { MOVE_URL } from "./host.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { LIFE_NODE } from "./lifeEvents.ts";

// Life events, one list (vip50-web-crm#294; Parry, 17 Oct: "yes"). ONE MOVE puts birthdays, anniversaries, home
// anniversaries (closing dates) and the news Pulse read in the agent's notes into one list, soonest first, each with the
// touch Pulse suggests. The agent adds the task; nothing is sent. Gentle rows (a loss, a hard time) are a caring touch
// only, never a sales line. Separate from Opportunities. The old raw-notes radar (lib/lifeEvents.ts) keeps its shape.

export const upcomingUrl = `${MOVE_URL}/api/brain/life-events/upcoming`;
export const taskUrl = `${MOVE_URL}/api/brain/life-events/task`;

export type UpcomingKind = "birthday" | "anniversary" | "home_anniversary" | "note_event";
const KINDS: UpcomingKind[] = ["birthday", "anniversary", "home_anniversary", "note_event"];

export interface Upcoming {
  contactId: string;
  firstName: string;
  kind: UpcomingKind;
  /** The day, YYYY-MM-DD. */
  on: string;
  /** ONE MOVE's line: "Birthday Tue 20 Oct". */
  line: string;
  /** Pulse's touch: "Video text". */
  touch: string;
  gentle: boolean;
  /** The note event's name (baby, wedding...), when kind is note_event. */
  event: string | null;
  example?: boolean;
}
export interface UpcomingList {
  count: number;
  people: Upcoming[];
}

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isDay = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10));

/** ONE MOVE's answer, in its own order (soonest first); a wrong shape is refused (null). */
export function readUpcoming(raw: unknown): UpcomingList | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.people)) return null;
  const seen = new Set<string>();
  const people: Upcoming[] = [];
  for (const x of r.people as Record<string, unknown>[]) {
    if (!x || typeof x !== "object") continue;
    const contactId = str(x.contact_id, 80);
    const firstName = str(x.first_name, 60);
    const kind = KINDS.includes(x.kind as UpcomingKind) ? (x.kind as UpcomingKind) : null;
    const on = str(x.on, 40);
    const line = str(x.line, 120);
    if (!contactId || !firstName || !kind || !isDay(on) || !line) continue;
    const key = `${contactId}|${kind}|${on.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const gentle = x.gentle === true;
    people.push({ contactId, firstName, kind, on: on.slice(0, 10), line, touch: str(x.touch, 160) ?? (gentle ? "A caring call or note" : "A short personal touch"), gentle, event: str(x.event, 40) });
  }
  const count = typeof r.count === "number" && Number.isFinite(r.count) ? Math.max(0, Math.round(r.count)) : people.length;
  return { count, people };
}

/** The task ONE MOVE adds (once per person, kind and day). */
export const taskBody = (p: Upcoming) => ({ contact_id: p.contactId, kind: p.kind, on: p.on });
export const TASK_ADDED = "Task added";
export const GENTLE_NOTE = "A caring touch only";
export const EMPTY_LINE = "Add birthdays, anniversaries and closing dates to your people; Pulse also reads your notes";
/** The one labelled example while the list is empty. */
export const EXAMPLE_ROW: Upcoming = { contactId: "example", firstName: "Jenny", kind: "birthday", on: "2026-10-20", line: "Birthday Tue 20 Oct", touch: "Video text", gentle: false, event: null, example: true };
export const exampleLine = (p: Upcoming = EXAMPLE_ROW) => `Example: ${p.firstName}'s ${p.line.charAt(0).toLowerCase()}${p.line.slice(1)}: ${p.touch.charAt(0).toLowerCase()}${p.touch.slice(1)}`;

/** The ONE MOVE panel's line for this list (lib/live.ts). */
export const DATES_STAT = "Birthdays and anniversaries (30 days)";

/**
 * The Life events orb on ONE MOVE from the one list: gold glow while anything is coming up (special days keep the gold
 * glow), a still green ring when nothing is. Its count also fills ONE MOVE's "Birthdays and anniversaries (30 days)".
 * Nothing when ONE MOVE is locked or the list has not answered (null).
 */
export function withLifeUpcomingNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, u: UpcomingList | null): G {
  const move = g.nodes.find((n) => n.id === "move");
  const edges = g.edges.filter((e) => e.target !== LIFE_NODE);
  let nodes = g.nodes.filter((n) => n.id !== LIFE_NODE);
  if (!move || move.locked || !u) return { ...g, nodes, edges };
  if (move.stats?.some((s) => s.label === DATES_STAT)) {
    nodes = nodes.map((n) => (n.id === "move" ? { ...n, stats: n.stats!.map((s) => (s.label === DATES_STAT ? { ...s, value: String(u.count) } : s)) } : n));
  }
  const first = u.people[0];
  nodes.push({
    id: LIFE_NODE,
    type: "feature",
    label: "Life events",
    secondaryLabel: u.count ? `${u.count} coming up${first ? ` · ${first.firstName}: ${first.line}` : ""}` : "Nothing coming up",
    parentId: "move",
    product: "move",
    importance: u.count ? 0.97 : 0.7,
    status: u.count ? undefined : "healthy",
    celebrate: u.count > 0 || undefined,
    stats: [{ label: "Coming up", value: String(u.count) }],
    summary: "Birthdays, anniversaries, home anniversaries and news from your notes, soonest first, with the touch Pulse suggests. You add the task; nothing is sent.",
  });
  edges.push({ id: `move>${LIFE_NODE}`, source: "move", target: LIFE_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** "Tue 20 Oct" for a YYYY-MM-DD day. */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return `${d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })} ${d.getUTCDate()} ${d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}`;
}
const ahead = (today: string, k: number) => new Date(Date.parse(`${today}T12:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);

/** The example agent's list: a birthday, a home anniversary and a new baby from a note. */
export function demoUpcoming(today: string): UpcomingList {
  const b = ahead(today, 3), h = ahead(today, 9), n = ahead(today, 0);
  return readUpcoming({
    count: 3,
    people: [
      { contact_id: "r1", first_name: "Jane", kind: "note_event", event: "baby", on: n, line: "New baby (from your note)", touch: "Handwritten note: congratulations", gentle: false },
      { contact_id: "r2", first_name: "Mike", kind: "birthday", on: b, line: `Birthday ${dayLabel(b)}`, touch: "Video text", gentle: false },
      { contact_id: "r6", first_name: "Dave", kind: "home_anniversary", on: h, line: `6 years in their home ${dayLabel(h)}`, touch: "Call: ask how the house is working for them", gentle: false },
    ],
  })!;
}
