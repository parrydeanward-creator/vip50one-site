import type { GraphEdge, GraphNode } from "./graph/types.ts";

// Time off in ONE YOU (VIP-SUMMARY §3x; PULSE-ROADMAP: "pause touches, warn what comes due, plan the first day
// back"). While away nothing pulses, Autopilot waits, and a week away does not count against 100. Nothing is sent to
// clients about it; the coach sees only the dates.

const MOVE_URL = "https://move.vip50one.com";
export const TIME_OFF_NODE = "go-time-off";
export const timeOffUrl = `${MOVE_URL}/api/brain/time-off`;
export const MAX_DAYS = 30;

export type DueKind = "birthday" | "anniversary" | "home_anniversary" | "task" | "closing" | "appointment" | "quarterly_touch";
export const DUE_KINDS: DueKind[] = ["closing", "appointment", "task", "birthday", "anniversary", "home_anniversary", "quarterly_touch"];
export const DUE_TITLE: Record<DueKind, string> = {
  closing: "Closings",
  appointment: "Appointments",
  task: "Tasks",
  birthday: "Birthdays",
  anniversary: "Anniversaries",
  home_anniversary: "Home anniversaries",
  quarterly_touch: "Quarterly touches",
};
/** What cannot simply wait for the first day back: someone else is counting on the agent that day. */
export const NEEDS_COVER: DueKind[] = ["closing", "appointment"];

export interface TimeOff {
  id: string;
  starts: string;
  ends: string;
  note: string | null;
}
export interface Due {
  kind: DueKind;
  title: string;
  date: string;
  contactId: string | null;
}
export interface TimeOffState {
  today: string;
  current: TimeOff | null;
  upcoming: TimeOff[];
  due: Due[];
}

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isKind = (v: unknown): v is DueKind => typeof v === "string" && (DUE_KINDS as string[]).includes(v);

function readOne(x: unknown): TimeOff | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = str(r.id, 60);
  if (!id || !isDay(r.starts) || !isDay(r.ends) || r.ends < r.starts) return null;
  return { id, starts: r.starts, ends: r.ends, note: str(r.note, 140) };
}

/** A §3x.3 answer, checked; null when it is not one. Upcoming soonest first; due by date, at most 50. */
export function readTimeOff(j: unknown, fallbackToday: string): TimeOffState | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.upcoming) && !("current" in r)) return null;
  const upcoming = (Array.isArray(r.upcoming) ? r.upcoming : []).map(readOne).filter((t): t is TimeOff => !!t).sort((a, b) => a.starts.localeCompare(b.starts));
  const due: Due[] = [];
  for (const x of (Array.isArray(r.due) ? r.due : []) as Record<string, unknown>[]) {
    const title = str(x?.title, 90);
    if (!title || !isDay(x.date) || !isKind(x.kind)) continue;
    due.push({ kind: x.kind, title, date: x.date, contactId: str(x.contact_id, 60) });
  }
  due.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  return { today: isDay(r.today) ? r.today : fallbackToday, current: readOne(r.current), upcoming, due: due.slice(0, 50) };
}

const t = (d: string) => Date.parse(`${d}T12:00:00Z`);
export const addDays = (d: string, k: number) => new Date(t(d) + k * 86_400_000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((t(b) - t(a)) / 86_400_000);
export const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** The time off the view is about: the current one, else the next. */
export const focusOff = (s: TimeOffState): TimeOff | null => s.current ?? s.upcoming[0] ?? null;
export const away = (s: TimeOffState) => !!s.current;
/** The first day back after a time off. */
export const backOn = (o: TimeOff) => addDays(o.ends, 1);

/** Why a plan cannot be saved (the same rules as ONE MOVE's POST, §3x.4), or null when it can. */
export function planProblem(s: TimeOffState, starts: string, ends: string): string | null {
  if (!starts || !ends) return "Pick the first and last day.";
  if (starts < s.today) return "The first day cannot be in the past.";
  if (ends < starts) return "The last day comes before the first.";
  if (daysBetween(starts, ends) > MAX_DAYS) return `At most ${MAX_DAYS} days at a time.`;
  const clash = [s.current, ...s.upcoming].find((o) => o && !(ends < o.starts || starts > o.ends));
  return clash ? `That overlaps your time off ${short(clash.starts)} to ${short(clash.ends)}.` : null;
}

/** The POST body (§3x.4). */
export const saveBody = (starts: string, ends: string, note: string) => ({ starts, ends, ...(note.trim() ? { note: note.trim().slice(0, 140) } : {}) });

export const dueIn = (s: TimeOffState, k: DueKind) => s.due.filter((d) => d.kind === k);
export const coverNeeded = (s: TimeOffState) => s.due.filter((d) => NEEDS_COVER.includes(d.kind));

/** First day back (§3x.5): what came due while away, oldest first; then the rest Pulse adds that morning. */
export function firstDayBack(s: TimeOffState): string[] {
  const o = focusOff(s);
  if (!o) return [];
  const missed = s.due.filter((d) => !NEEDS_COVER.includes(d.kind) && d.date >= o.starts && d.date <= o.ends);
  const lines: string[] = [];
  const birthdays = missed.filter((d) => d.kind === "birthday" || d.kind === "anniversary" || d.kind === "home_anniversary");
  if (birthdays.length) lines.push(`Belated wishes: ${birthdays.slice(0, 3).map((d) => d.title).join(", ")}${birthdays.length > 3 ? ` and ${birthdays.length - 3} more` : ""}`);
  const tasks = missed.filter((d) => d.kind === "task" || d.kind === "quarterly_touch");
  if (tasks.length) lines.push(`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} that came due while you were away, oldest first`);
  lines.push("Your Hot business, then the VIP-50 most behind (Pulse lines them up that morning)");
  return lines.slice(0, 3);
}

export function timeOffLine(s: TimeOffState): string {
  if (s.current) return `Away until ${short(s.current.ends)}`;
  const n = s.upcoming[0];
  if (n) return `${short(n.starts)} to ${short(n.ends)}`;
  return "Plan time off";
}

/** The Time off orb under ONE YOU: always quiet, with a gold ring only while a closing or appointment needs cover. */
export function withTimeOffNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, s: TimeOffState | null): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== TIME_OFF_NODE);
  const edges = g.edges.filter((e) => e.target !== TIME_OFF_NODE);
  if (!go || go.locked || !s) return { ...g, nodes, edges };
  // While away, the centre ONE orb says when the agent is back (§3x.6).
  if (s.current) {
    const i = nodes.findIndex((n) => n.id === "one");
    if (i >= 0) nodes[i] = { ...nodes[i], secondaryLabel: `Away until ${short(s.current.ends)}` };
  }
  const cover = !s.current && s.upcoming.length > 0 && coverNeeded(s).length > 0;
  nodes.push({
    id: TIME_OFF_NODE,
    type: "feature",
    label: "Time off",
    secondaryLabel: cover ? `${timeOffLine(s)} · ${coverNeeded(s).length} to cover` : timeOffLine(s),
    parentId: "go",
    product: "go",
    importance: s.current || s.upcoming.length ? 0.97 : 0.6,
    status: cover ? "attention" : "healthy",
    summary: "Plan days away: touches pause, Autopilot waits, the week does not count against 100, and Pulse plans your first day back.",
  });
  edges.push({ id: `go>${TIME_OFF_NODE}`, source: "go", target: TIME_OFF_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** Example time off for the demo: a long weekend in two weeks with a few things due round it. */
export function demoTimeOff(today: string): TimeOffState {
  const starts = addDays(today, 14), ends = addDays(today, 18);
  return readTimeOff({
    today,
    current: null,
    upcoming: [{ id: "demo-off", starts, ends, note: "Family trip to Moab" }],
    due: [
      { kind: "closing", title: "1482 Maple Ridge Dr closes", date: addDays(today, 15), contact_id: "r3" },
      { kind: "appointment", title: "Listing appointment, the Parks", date: addDays(today, 17), contact_id: "r4" },
      { kind: "birthday", title: "Jane Smith", date: addDays(today, 16), contact_id: "r1" },
      { kind: "home_anniversary", title: "Mike Torres, 5 years in his home", date: addDays(today, 18), contact_id: "r2" },
      { kind: "task", title: "Send the Ortiz CMA", date: addDays(today, 15), contact_id: null },
      { kind: "quarterly_touch", title: "Drop-by: Amy Chen", date: addDays(today, 16), contact_id: null },
    ],
  }, today)!;
}
