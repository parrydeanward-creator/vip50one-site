import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { mondayOf } from "./habits.ts";

// Commitments (Parry, 6 Oct; VIP-SUMMARY §3n): set the week on Monday, check in on Friday, set the
// weekend on Friday and check it on Monday, as in his coaching. The agent and their coach see them; no
// points. MASTER keeps them and counts the counted kinds; the Brain draws, asks and checks shapes.
// Nothing here ever marks a commitment kept for the agent.

const MOVE_URL = "https://move.vip50one.com";
export const commitmentsUrl = `${MOVE_URL}/api/brain/commitments`;
export const WEEK_NODE = "go-week";
export const MAX = { week: 5, weekend: 3 } as const;
export const TEXT_MAX = 140;
export const NOTE_MAX = 200;

export type Period = "week" | "weekend";
export type Due = "set_week" | "check_weekend" | "check_week" | "set_weekend" | null;
export type Result = "kept" | "partly" | "missed";
export const COUNTED = ["call", "text", "video_text", "face_to_face", "handwritten_note", "drop_by", "social", "closing", "referral"] as const;
export type Kind = (typeof COUNTED)[number] | "yes_no";

export const KIND_LABEL: Record<Kind, string> = {
  yes_no: "Yes or no",
  call: "Calls",
  text: "Texts",
  video_text: "Video texts",
  face_to_face: "Face-to-faces",
  handwritten_note: "Handwritten notes",
  drop_by: "Drop-bys",
  social: "Social touches",
  closing: "Closings",
  referral: "Referrals",
};

/** Short words that fit inside an orb. */
export const KIND_SHORT: Record<Kind, string> = { yes_no: "", call: "CALLS", text: "TEXTS", video_text: "VIDEOS", face_to_face: "COFFEES", handwritten_note: "NOTES", drop_by: "DROP-BYS", social: "SOCIAL", closing: "CLOSINGS", referral: "REFERRALS" };

export interface Item {
  id: string;
  text: string;
  kind: Kind;
  target: number | null;
  count: number | null;
  result: Result | null;
  note: string | null;
}

export interface PeriodState {
  id: string;
  starts: string;
  setAt: string | null;
  checkedAt: string | null;
  items: Item[];
}

export interface Commitments {
  today: string;
  due: Due;
  week: PeriodState | null;
  weekend: PeriodState | null;
  lastWeek: { kept: number; partly: number; missed: number } | null;
  keepRate8w: number | null;
  streak: number;
  /** Daily commitments (§3n.6); absent until ONE MOVE answers with them. */
  daily?: Daily | null;
}

const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const DUES: readonly Exclude<Due, null>[] = ["set_week", "check_weekend", "check_week", "set_weekend"];
const RESULTS: readonly Result[] = ["kept", "partly", "missed"];
const KINDS: readonly Kind[] = ["yes_no", ...COUNTED];

function readPeriod(p: unknown): PeriodState | null {
  if (!p || typeof p !== "object") return null;
  const r = p as Record<string, unknown>;
  if (typeof r.id !== "string" || !isDay(r.starts) || !Array.isArray(r.items)) return null;
  const items: Item[] = [];
  for (const x of r.items as Record<string, unknown>[]) {
    if (!x || typeof x.id !== "string" || typeof x.text !== "string") continue;
    const kind = KINDS.includes(x.kind as Kind) ? (x.kind as Kind) : "yes_no";
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
    items.push({
      id: x.id,
      text: x.text.slice(0, TEXT_MAX),
      kind,
      target: kind === "yes_no" ? null : num(x.target),
      count: kind === "yes_no" ? null : num(x.count),
      result: RESULTS.includes(x.result as Result) ? (x.result as Result) : null,
      note: typeof x.note === "string" && x.note.trim() ? x.note.slice(0, NOTE_MAX) : null,
    });
  }
  return {
    id: r.id,
    starts: r.starts,
    setAt: typeof r.set_at === "string" ? r.set_at : null,
    checkedAt: typeof r.checked_at === "string" ? r.checked_at : null,
    items,
  };
}

/** A §3n.2 answer, checked; null when it is not one. */
export function readCommitments(j: unknown): Commitments | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!isDay(r.today)) return null;
  const lw = r.last_week as Record<string, unknown> | null | undefined;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
  return {
    today: r.today,
    due: DUES.includes(r.due as Exclude<Due, null>) ? (r.due as Due) : null,
    week: readPeriod(r.week),
    weekend: readPeriod(r.weekend),
    lastWeek: lw && typeof lw === "object" ? { kept: n(lw.kept), partly: n(lw.partly), missed: n(lw.missed) } : null,
    keepRate8w: typeof r.keep_rate_8w === "number" && r.keep_rate_8w >= 0 && r.keep_rate_8w <= 1 ? r.keep_rate_8w : null,
    streak: n(r.streak),
    daily: readDaily(r.daily),
  };
}

/** How urgent the due step is, by the clock in Denver (§3n.1): yellow while it is on time, red once it
 * is late (setting the week after Monday noon; checking in from Saturday). */
export function dueLevel(due: Due, today: string, hour: number): "now" | "today" | null {
  if (!due) return null;
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 Sunday .. 6 Saturday
  if (due === "set_week" || due === "check_weekend") return dow === 1 && hour < 12 ? "today" : "now";
  if (due === "check_week" || due === "set_weekend") return dow === 5 ? "today" : "now";
  return null;
}

/** The step's words, for the orb and the panel. */
export function dueWords(due: Due): string | null {
  switch (due) {
    case "set_week":
      return "Set this week's commitments";
    case "check_weekend":
      return "Check in on your weekend";
    case "check_week":
      return "Check in on your week";
    case "set_weekend":
      return "Set your weekend commitments";
    default:
      return null;
  }
}

/** A counted item has reached its target (the agent still marks it at check-in). */
export const reached = (i: Item) => i.kind !== "yes_no" && i.target != null && i.count != null && i.count >= i.target;

/** "9 of 15 calls", "Yes or no". */
export function progressWords(i: Item): string {
  if (i.kind === "yes_no" || i.target == null) return i.result ? resultWord(i.result) : "Yes or no";
  return `${Math.min(i.count ?? 0, 9999)} of ${i.target} ${KIND_LABEL[i.kind].toLowerCase()}`;
}

export const resultWord = (r: Result) => (r === "kept" ? "Kept" : r === "partly" ? "Partly" : "Missed");

/** Kept / all of a checked period; partly counts half (§3n.2). */
export function keepShare(items: Item[]): number | null {
  const done = items.filter((i) => i.result);
  if (!done.length) return null;
  return done.reduce((t, i) => t + (i.result === "kept" ? 1 : i.result === "partly" ? 0.5 : 0), 0) / done.length;
}

export interface Draft {
  text: string;
  kind: Kind;
  target: number | null;
}

/** The §3n.3 set body, or the plain-words reason it cannot be sent. */
export function setBody(period: Period, drafts: Draft[]): { period: Period; items: Draft[] } | { error: string } {
  const items = drafts
    .map((d) => ({ text: d.text.trim().slice(0, TEXT_MAX), kind: d.kind, target: d.kind === "yes_no" ? null : d.target }))
    .filter((d) => d.text);
  if (!items.length) return { error: "Write at least one commitment." };
  if (items.length > MAX[period]) return { error: `Up to ${MAX[period]} for the ${period}.` };
  for (const d of items) {
    if (d.kind !== "yes_no" && (d.target == null || !Number.isInteger(d.target) || d.target < 1 || d.target > 100)) {
      return { error: `Give "${d.text}" a number from 1 to 100.` };
    }
  }
  return { period, items };
}

/** The §3n.3 check body, or why not: every commitment needs a result. */
export function checkBody(period: Period, items: Item[], picks: Record<string, { result: Result | null; note: string }>): { period: Period; results: { id: string; result: Result; note: string | null }[] } | { error: string } {
  const results = [];
  for (const i of items) {
    const p = picks[i.id];
    if (!p?.result) return { error: `Mark "${i.text}" as kept, partly or missed.` };
    results.push({ id: i.id, result: p.result, note: p.note.trim() ? p.note.trim().slice(0, NOTE_MAX) : null });
  }
  return { period, results };
}

/** Pulse suggests (§3n.5): editable starters from the agent's own week, never set for them. */
export function starters(facts: { overdueFollowUps?: number; vipsUntouched?: number; faceToFaceLastWeek?: number }): Draft[] {
  const out: Draft[] = [];
  if ((facts.faceToFaceLastWeek ?? 0) < 2) out.push({ text: "Two face-to-faces with VIP-50 clients", kind: "face_to_face", target: 2 });
  if ((facts.vipsUntouched ?? 0) > 0) out.push({ text: `Call ${Math.min(15, Math.max(5, facts.vipsUntouched ?? 0))} VIPs I haven't talked to this month`, kind: "call", target: Math.min(15, Math.max(5, facts.vipsUntouched ?? 0)) });
  if ((facts.overdueFollowUps ?? 0) > 0) out.push({ text: "Clear every overdue follow-up", kind: "yes_no", target: null });
  out.push({ text: "Three handwritten notes", kind: "handwritten_note", target: 3 });
  return out.slice(0, 3);
}

/** ONE YOU's "This week" orb (§3n.7): pulses for the step that is due, otherwise shows how the week is
 * going. No ONE YOU orb (or not in the package): unchanged. */
export function withWeekNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, c: Commitments | null, hour: number): G {
  const go = g.nodes.find((n) => n.id === "go");
  if (!go || go.locked || !c) return g;
  const nodes = g.nodes.filter((n) => n.id !== WEEK_NODE);
  const edges = g.edges.filter((e) => e.target !== WEEK_NODE);
  const level = dueLevel(c.due, c.today, hour);
  const items = c.week?.items ?? [];
  const on = items.filter((i) => i.result === "kept" || reached(i)).length;
  // Today's daily commitments pulse yellow until each is ticked (§3n.6); never red, a day is not overdue.
  const d = c.daily;
  const dailyLeft = d ? Math.max(0, d.today.due - d.today.done) : 0;
  const stats = [
    ...(items.length ? [{ label: "Commitments", value: `${on} / ${items.length}` }] : []),
    ...(d && d.today.due ? [{ label: "Today", value: `${d.today.done} / ${d.today.due}` }] : []),
  ];
  nodes.push({
    id: WEEK_NODE,
    type: "feature",
    label: "This week",
    secondaryLabel: dueWords(c.due) ?? (dailyLeft ? dailyWords(d!) : items.length ? `${on} of ${items.length} commitments on track` : "No commitments yet"),
    parentId: "go",
    product: "go",
    importance: 1.04,
    status: level === "now" ? "action" : level === "today" || dailyLeft ? "attention" : (items.length || d?.today.due) && on === items.length && !dailyLeft ? "healthy" : undefined,
    stats: stats.length ? stats : undefined,
    summary: c.keepRate8w != null ? `You keep ${Math.round(c.keepRate8w * 100)}% of your commitments (last 8 weeks).${c.streak ? ` ${c.streak}-week streak.` : ""}` : "Set your commitments Monday, check in Friday, and the weekend too.",
  });
  edges.push({ id: `go>${WEEK_NODE}`, source: "go", target: WEEK_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** The demo agent's week (Tuesday, half way through), so the sales demo shows it working. */
export function demoCommitments(today: string): Commitments {
  const item = (id: string, text: string, kind: Kind, target: number | null, count: number | null): Item => ({ id, text, kind, target, count, result: null, note: null });
  return {
    today,
    due: null,
    week: {
      id: "demo-week",
      starts: today,
      setAt: `${today}T14:00:00Z`,
      checkedAt: null,
      items: [
        item("c1", "Two coffees with VIP-50 clients", "face_to_face", 2, 1),
        item("c2", "Call 15 VIPs I haven't talked to this month", "call", 15, 9),
        item("c3", "Three handwritten notes", "handwritten_note", 3, 3),
        item("c4", "Finish my listing presentation", "yes_no", null, null),
      ],
    },
    weekend: null,
    lastWeek: { kept: 3, partly: 1, missed: 1 },
    keepRate8w: 0.72,
    streak: 4,
    daily: demoDaily(today),
  };
}

// Ticked as they are done (Parry, 8 Oct: "yes allow each agent to check off as they do them"; VIP-SUMMARY §3n.5).
// A tick marks the item kept now; the check-in still comes and opens with it marked. Only the agent ticks.
export const doneUrl = `${commitmentsUrl}/done`;

/** A period's items can be ticked once it is set and started, until its check-in closes it. */
export const tickable = (p: PeriodState | null, today: string) => !!p && !!p.setAt && !p.checkedAt && p.starts <= today;

/** Ticked done before the check-in. */
export const ticked = (i: Item) => i.result === "kept";

/** The example agent's tick, without ONE MOVE. */
export function applyTick(c: Commitments, period: Period, id: string, done: boolean): Commitments {
  const p = c[period];
  if (!p || !tickable(p, c.today)) return c;
  return { ...c, [period]: { ...p, items: p.items.map((i) => (i.id === id ? { ...i, result: done ? ("kept" as const) : null } : i)) } };
}

// ---- Daily commitments (Parry, 9 Oct: "we need the ability to add daily commitments that you can check to populate
// every single week"; VIP-SUMMARY §3n.6). Up to 5 standing ones, Mon-Fri unless "every day", ticked per day: today, or
// an earlier day this week caught up. Their own record ("4 of 5 days"); they never change the weekly keep rate or
// streak. Agent and coach only. Only the agent ticks.

export const DAILY_MAX = 5;
export const dailyUrl = `${commitmentsUrl}/daily`;
export const dailyDoneUrl = `${commitmentsUrl}/daily/done`;
export type Days = "weekdays" | "every_day";
export const DAYS_LABEL: Record<Days, string> = { weekdays: "Monday to Friday", every_day: "Every day" };

export interface DailyDay {
  day: string;
  due: boolean;
  done: boolean;
}
export interface DailyItem {
  id: string;
  text: string;
  kind: Kind;
  target: number | null;
  days: Days;
  today: { due: boolean; done: boolean; count: number | null };
  week: DailyDay[];
}
export interface Tally {
  due: number;
  done: number;
}
export interface Daily {
  items: DailyItem[];
  today: Tally;
  week: Tally;
  lastWeek: Tally | null;
}

const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
const tally = (v: unknown): Tally | null => (v && typeof v === "object" ? { due: count((v as Tally).due), done: count((v as Tally).done) } : null);

/** The §3n.6 `daily` block, checked; null when it is not there (ONE MOVE before #133). */
export function readDaily(j: unknown): Daily | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.items)) return null;
  const items: DailyItem[] = [];
  for (const x of r.items as Record<string, unknown>[]) {
    if (!x || typeof x.id !== "string" || typeof x.text !== "string" || !x.text.trim()) continue;
    const kind = KINDS.includes(x.kind as Kind) ? (x.kind as Kind) : "yes_no";
    const t = (x.today ?? {}) as Record<string, unknown>;
    const week: DailyDay[] = [];
    for (const w of (Array.isArray(x.week) ? x.week : []) as Record<string, unknown>[]) {
      if (w && isDay(w.day)) week.push({ day: w.day, due: w.due === true, done: w.done === true });
    }
    week.sort((a, b) => a.day.localeCompare(b.day));
    items.push({
      id: x.id,
      text: x.text.slice(0, TEXT_MAX),
      kind,
      target: kind === "yes_no" ? null : typeof x.target === "number" && x.target >= 1 ? Math.round(x.target) : null,
      days: x.days === "every_day" ? "every_day" : "weekdays",
      today: { due: t.due === true, done: t.done === true, count: kind === "yes_no" || typeof t.count !== "number" ? null : count(t.count) },
      week: week.slice(0, 7),
    });
  }
  const items5 = items.slice(0, DAILY_MAX);
  // the totals are ONE MOVE's; if they are missing, count them from the items
  const sum = (f: (i: DailyItem) => DailyDay[]) => ({ due: items5.reduce((n, i) => n + f(i).filter((d) => d.due).length, 0), done: items5.reduce((n, i) => n + f(i).filter((d) => d.due && d.done).length, 0) });
  return {
    items: items5,
    today: tally(r.today) ?? { due: items5.filter((i) => i.today.due).length, done: items5.filter((i) => i.today.due && i.today.done).length },
    week: tally(r.week) ?? sum((i) => i.week),
    lastWeek: tally(r.last_week),
  };
}

/** "2 of 3 daily commitments done today". */
export function dailyWords(d: Daily): string {
  if (!d.today.due) return d.items.length ? "No daily commitments due today" : "No daily commitments yet";
  if (d.today.done >= d.today.due) return "Every daily commitment done today";
  return `${d.today.done} of ${d.today.due} daily ${d.today.due === 1 ? "commitment" : "commitments"} done today`;
}

/** "4 of 5 days" for one item this week, counting days up to today. */
export function daysKept(i: DailyItem, today: string): string {
  const past = i.week.filter((d) => d.due && d.day <= today);
  return `${past.filter((d) => d.done).length} of ${past.length} ${past.length === 1 ? "day" : "days"}`;
}

/** A day can be ticked when it was due, is today or earlier, and is in this week (ONE MOVE's rule). */
export const dayTickable = (d: DailyDay, today: string) => d.due && d.day <= today;

export interface DailyDraft {
  text: string;
  kind: Kind;
  target: number | null;
  days: Days;
}

/** The §3n.6 set body (0 to 5; an empty list clears them), or the plain-words reason it cannot be sent. */
export function setDailyBody(drafts: DailyDraft[]): { items: DailyDraft[] } | { error: string } {
  const items = drafts
    .map((d) => ({ text: d.text.trim().slice(0, TEXT_MAX), kind: d.kind, target: d.kind === "yes_no" ? null : d.target, days: d.days }))
    .filter((d) => d.text);
  if (items.length > DAILY_MAX) return { error: `Up to ${DAILY_MAX} daily commitments.` };
  for (const d of items) {
    if (d.kind !== "yes_no" && (d.target == null || !Number.isInteger(d.target) || d.target < 1 || d.target > 100)) {
      return { error: `Give "${d.text}" a number from 1 to 100.` };
    }
  }
  return { items };
}

/** The example agent's tick on one day, without ONE MOVE; the totals follow. */
export function applyDailyTick(c: Commitments, id: string, day: string, done: boolean): Commitments {
  const d = c.daily;
  if (!d) return c;
  const target = d.items.find((i) => i.id === id)?.week.find((w) => w.day === day);
  if (!target || !dayTickable(target, c.today)) return c;
  const items = d.items.map((i) =>
    i.id !== id ? i : { ...i, week: i.week.map((w) => (w.day === day ? { ...w, done } : w)), today: day === c.today ? { ...i.today, done } : i.today },
  );
  return { ...c, daily: retally({ ...d, items }, c.today) };
}

/** The example agent's new list, without ONE MOVE: same words, kind, target and days keep their ticks. */
export function applyDailySet(c: Commitments, drafts: DailyDraft[]): Commitments {
  const old = c.daily?.items ?? [];
  const mon = mondayOf(c.today);
  const items: DailyItem[] = drafts.map((x, k) => {
    const same = old.find((i) => i.text === x.text && i.kind === x.kind && i.target === x.target && i.days === x.days);
    if (same) return same;
    const week = Array.from({ length: 7 }, (_, n) => {
      const day = addDay(mon, n);
      return { day, due: day >= c.today && (x.days === "every_day" || n < 5), done: false };
    });
    const due = week.find((w) => w.day === c.today)?.due ?? false;
    return { id: `local-daily-${k}-${Date.now()}`, text: x.text, kind: x.kind, target: x.target, days: x.days, today: { due, done: false, count: x.kind === "yes_no" ? null : 0 }, week };
  });
  return { ...c, daily: retally({ items, today: { due: 0, done: 0 }, week: { due: 0, done: 0 }, lastWeek: c.daily?.lastWeek ?? null }, c.today) };
}

function retally(d: Daily, today: string): Daily {
  const days = d.items.flatMap((i) => i.week.filter((w) => w.due && w.day <= today));
  const now = d.items.flatMap((i) => i.week.filter((w) => w.due && w.day === today));
  return { ...d, today: { due: now.length, done: now.filter((w) => w.done).length }, week: { due: days.length, done: days.filter((w) => w.done).length } };
}

const addDay = (d: string, k: number) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);

/** The demo agent's daily list: two done earlier this week, today still to tick. */
export function demoDaily(today: string): Daily {
  const mon = mondayOf(today);
  const mk = (id: string, text: string, kind: Kind, target: number | null, days: Days, doneBefore: (n: number) => boolean, count: number | null): DailyItem => {
    const week = Array.from({ length: 7 }, (_, n) => {
      const day = addDay(mon, n);
      const due = days === "every_day" || n < 5;
      return { day, due, done: due && day < today && doneBefore(n) };
    });
    const t = week.find((w) => w.day === today)!;
    return { id, text, kind, target, days, today: { due: t.due, done: false, count }, week };
  };
  const items = [
    mk("d1", "Five calls before 10am", "call", 5, "weekdays", () => true, 2),
    mk("d2", "Read my VIP-50 list", "yes_no", null, "weekdays", (n) => n !== 2, null),
    mk("d3", "Walk 30 minutes", "yes_no", null, "every_day", (n) => n % 2 === 0, null),
  ];
  return retally({ items, today: { due: 0, done: 0 }, week: { due: 0, done: 0 }, lastWeek: { due: 17, done: 13 } }, today);
}
