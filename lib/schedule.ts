import type { PlanItem } from "./plan.ts";

// How Pulse builds a day (VIP-SUMMARY §3o.5; Parry, 6 Oct: "make the plan my day actually make sense and
// they will do it. not just look good"). Pure: free time first, fixed things first, the work batched the way
// a top agent works (Power Hour in the best calling window, one block of texts, one of notes), most urgent
// first, never more than 85% of the free time, and whatever does not fit says so. The same rules run in
// MASTER for the 7:00 build; this is the Brain's copy for planning live.

export interface Busy {
  start: string; // "HH:MM"
  end: string;
  title: string | null; // null when the agent keeps calendar titles private (§3o.1)
  source: "calendar" | "one_event" | "time_block" | "open_house" | "showing" | "listing_appointment" | "fixed" | "travel";
  category?: string | null; // ONE MOVE / ONE GO category (§3o.1 v1.27 "Colours"), so the colour matches theirs
}

export type BlockKind = "power_hour" | "texts" | "notes" | "approvals" | "in_person" | "task" | "custom";

export interface Block {
  id: string;
  start: string;
  end: string;
  kind: BlockKind;
  title: string;
  refs: string[]; // the plan items inside it
  why: string; // one line, facts only
  done: boolean;
}

export interface DayInput {
  hours: { start: string; end: string };
  busy: Busy[];
  items: PlanItem[];
  bestCalls?: { start: string; end: string };
  notBefore?: string; // today: nothing is planned in the past
}

export interface DayPlan {
  blocks: Block[];
  later: { item: PlanItem; why: string }[]; // "Moves to tomorrow"
  freeMin: number;
  plannedMin: number;
}

export const BUFFER = 10; // minutes either side of an appointment
export const MAX_SHARE = 0.85; // never plan more than this share of the free time
const POWER_MAX = 60;

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;

/** Free gaps inside working hours, after appointments (with a buffer each side) and the past. */
export function freeGaps(hours: DayInput["hours"], busy: Busy[], notBefore?: string): [number, number][] {
  const lo = Math.max(toMin(hours.start), notBefore ? toMin(notBefore) : 0);
  const hi = toMin(hours.end);
  const taken = busy
    .map((b) => {
      const pad = b.source === "time_block" || b.source === "fixed" || b.source === "travel" ? 0 : BUFFER;
      return [toMin(b.start) - pad, toMin(b.end) + pad] as [number, number];
    })
    .sort((a, b) => a[0] - b[0]);
  const gaps: [number, number][] = [];
  let t = lo;
  for (const [s, e] of taken) {
    if (s > t) gaps.push([t, Math.min(s, hi)]);
    t = Math.max(t, e);
    if (t >= hi) break;
  }
  if (t < hi) gaps.push([t, hi]);
  return gaps.filter(([s, e]) => e - s >= 5);
}

const rank = (p: PlanItem) => (p.urgency === "alert" ? 0 : p.special ? 1 : p.urgency === "today" ? 2 : 3);
const isCall = (p: PlanItem) => p.kind === "call" || p.kind === "follow_up";
const IN_PERSON = /\b(coffee|lunch|face-to-face|drop-?by|meet)\b/i;

interface Group {
  kind: BlockKind;
  title: string;
  items: PlanItem[];
  minutes: number;
  rank: number;
  why: string;
  prefer?: [number, number];
  before?: number;
}

/** Batch the work the way a top agent does it. */
export function batches(items: PlanItem[], bestCalls: [number, number]): Group[] {
  const groups: Group[] = [];
  const calls = items.filter(isCall).sort((a, b) => rank(a) - rank(b));
  // Power Hours of up to 60 minutes, most urgent calls first
  let cur: PlanItem[] = [];
  const flush = () => {
    if (!cur.length) return;
    const m = cur.reduce((t, p) => t + p.minutes, 0);
    const late = cur.filter((p) => p.urgency === "alert").length;
    groups.push({
      kind: "power_hour",
      title: `Power Hour: ${cur.length} ${cur.length === 1 ? "call" : "calls"}`,
      items: cur,
      minutes: m,
      rank: Math.min(...cur.map(rank)),
      why: late ? `${late} overdue first, in your best calling window.` : "In your best calling window, when people pick up.",
      prefer: bestCalls,
    });
    cur = [];
  };
  for (const c of calls) {
    if (cur.reduce((t, p) => t + p.minutes, 0) + c.minutes > POWER_MAX) flush();
    cur.push(c);
  }
  flush();
  const take = (pred: (p: PlanItem) => boolean) => items.filter((p) => !isCall(p) && pred(p));
  const texts = take((p) => p.kind === "text");
  if (texts.length) groups.push({ kind: "texts", title: `Texts and video texts (${texts.length})`, items: texts, minutes: Math.max(15, texts.reduce((t, p) => t + p.minutes, 0)), rank: Math.min(...texts.map(rank)), why: "One sitting for every text, so none slip." });
  const notes = take((p) => p.kind === "note");
  if (notes.length) groups.push({ kind: "notes", title: `Handwritten notes (${notes.length})`, items: notes, minutes: notes.reduce((t, p) => t + p.minutes, 0), rank: Math.min(...notes.map(rank)), why: "Done together, out in today's mail." });
  const approvals = take((p) => p.kind === "approval");
  if (approvals.length) groups.push({ kind: "approvals", title: `Approvals (${approvals.length})`, items: approvals, minutes: approvals.reduce((t, p) => t + p.minutes, 0), rank: Math.min(...approvals.map(rank)), why: "Before posting time, so nothing waits on you.", before: toMin("12:00") });
  for (const p of take((x) => x.kind !== "text" && x.kind !== "note" && x.kind !== "approval")) {
    const inPerson = p.kind === "meeting" || IN_PERSON.test(p.title);
    groups.push({ kind: inPerson ? "in_person" : "task", title: p.title.replace(/[.]$/, ""), items: [p], minutes: p.minutes + (inPerson ? 30 : 0), rank: rank(p), why: inPerson ? "With 15 minutes' drive each way." : p.urgency === "alert" ? "Overdue: done today, it stops pulsing." : "Due today." });
  }
  return groups.sort((a, b) => a.rank - b.rank || (a.kind === "power_hour" ? -1 : 0));
}

/** Pulse builds the day (§3o.5). Fixed-time items are placed as they are; the rest fills the free gaps. */
export function buildDay(input: DayInput): DayPlan {
  const fixed = input.items.filter((p) => p.at);
  const loose = input.items.filter((p) => !p.at);
  const busy: Busy[] = [...input.busy, ...fixed.map((p) => ({ start: p.at!, end: toTime(toMin(p.at!) + p.minutes), title: p.title, source: "fixed" as const }))];
  const gaps = freeGaps(input.hours, busy, input.notBefore);
  const freeMin = gaps.reduce((t, [s, e]) => t + (e - s), 0);
  const cap = Math.floor(freeMin * MAX_SHARE);
  const best = input.bestCalls ?? { start: "09:00", end: "11:00" };
  const groups = batches(loose, [toMin(best.start), toMin(best.end)]);
  const open = gaps.map(([s, e]) => [s, e] as [number, number]);
  const blocks: Block[] = fixed.map((p) => ({ id: `b:${p.ref}`, start: p.at!, end: toTime(toMin(p.at!) + p.minutes), kind: "custom", title: p.title.replace(/[.]$/, ""), refs: [p.ref], why: "At the time you set.", done: p.done }));
  const later: DayPlan["later"] = [];
  let used = 0;
  const place = (g: Group): number | null => {
    const fits = (k: number) => open[k][1] - open[k][0] >= g.minutes;
    let k = -1;
    if (g.prefer) k = open.findIndex(([s, e], i) => fits(i) && Math.max(s, g.prefer![0]) + g.minutes <= Math.min(e, g.prefer![1] + 30));
    if (k < 0 && g.before) k = open.findIndex(([s], i) => fits(i) && s + g.minutes <= g.before!);
    if (k < 0) k = open.findIndex((_, i) => fits(i));
    if (k < 0) return null;
    const start = g.prefer && open[k][0] < g.prefer[0] && open[k][1] - g.prefer[0] >= g.minutes ? g.prefer[0] : open[k][0];
    const end = start + g.minutes;
    // split the gap round the block
    const [s, e] = open[k];
    open.splice(k, 1, ...([[s, start], [end, e]] as [number, number][]).filter(([a, b]) => b - a >= 5));
    open.sort((a, b) => a[0] - b[0]);
    return start;
  };
  for (const g of groups) {
    if (used + g.minutes > cap) {
      for (const p of g.items) later.push({ item: p, why: "Today is full: this keeps the day doable." });
      continue;
    }
    const at = place(g);
    if (at == null) {
      for (const p of g.items) later.push({ item: p, why: "No free gap long enough today." });
      continue;
    }
    used += g.minutes;
    // a reason that is no longer true is not given: approvals that miss noon still wait on the agent
    const why = g.before && at + g.minutes > g.before ? "Posts wait on your approval: first free time today." : g.why;
    blocks.push({ id: `b:${g.kind}:${g.items[0].ref}`, start: toTime(at), end: toTime(at + g.minutes), kind: g.kind, title: g.title, refs: g.items.map((p) => p.ref), why, done: g.items.every((p) => p.done) });
  }
  blocks.sort((a, b) => toMin(a.start) - toMin(b.start));
  return { blocks, later, freeMin, plannedMin: used };
}

/** "Next: Power Hour in 12 min", "Now: Texts (until 10:15)", or null when the day is done. */
export function nextLine(blocks: Block[], now: string): string | null {
  const n = toMin(now);
  const cur = blocks.find((b) => !b.done && toMin(b.start) <= n && n < toMin(b.end));
  if (cur) return `Now: ${cur.title} (until ${clock12(cur.end)})`;
  const nx = blocks.find((b) => !b.done && toMin(b.start) > n);
  if (!nx) return null;
  const d = toMin(nx.start) - n;
  return `Next: ${nx.title} ${d < 60 ? `in ${d} min` : `at ${clock12(nx.start)}`}`;
}

export function clock12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

/** A block in plain words (§3o.3), the common shapes: "Gym 6 to 7", "Lunch with Marcus 12:30",
 * "School pickup 3:15-3:45 every weekday". Pulse on the server reads anything; this is the quick local
 * reading for the confirm card. Null when it cannot tell. */
export function readBlock(text: string): { title: string; start: string; end: string; repeat: "none" | "weekdays" | "daily" } | null {
  const t = text.trim();
  const time = String.raw`(\d{1,2})(?::(\d{2}))?\s*(am|pm)?`;
  const range = new RegExp(`${time}\\s*(?:to|-|–|until)\\s*${time}`, "i").exec(t);
  const single = range ? null : new RegExp(`(?:at\\s+)?${time}`, "i").exec(t);
  const m = range ?? single;
  if (!m) return null;
  const hour = (h: string, mm: string | undefined, ap: string | undefined, hint?: string) => {
    let x = Number(h) % 12;
    const ampm = (ap ?? hint ?? "").toLowerCase();
    if (ampm === "pm" || (!ampm && x >= 1 && x <= 6)) x += 12; // 1 to 6 without am/pm is afternoon
    if (!ampm && Number(h) === 12) x = 12; // "12:30" is lunchtime
    if (ampm === "am" && x === 12) x = 0;
    return x * 60 + Number(mm ?? 0);
  };
  let s: number, e: number;
  if (range) {
    e = hour(range[4], range[5], range[6]);
    s = hour(range[1], range[2], range[3] ?? range[6]);
    if (/gym|workout|run/i.test(t) && !range[3] && !range[6] && Number(range[1]) <= 7) {
      s -= 12 * 60;
      e -= 12 * 60;
    }
    if (e <= s) e += 12 * 60;
  } else {
    s = hour(single![1], single![2], single![3]);
    e = s + (/lunch|coffee|meet/i.test(t) ? 60 : 30);
  }
  if (s < 0 || e > 24 * 60 || e <= s) return null;
  const title = t
    .replace(range ? range[0] : single![0], "")
    .replace(/\b(every weekday|weekdays|every day|daily)\b/i, "")
    .replace(/\s+at\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
  if (!title) return null;
  const repeat = /every weekday|weekdays/i.test(t) ? "weekdays" : /every day|daily/i.test(t) ? "daily" : "none";
  return { title, start: toTime(s), end: toTime(e), repeat };
}

// ---- the day from ONE MOVE (§3o.2), the agent's own blocks, and the clock face ----------------------

const MOVE_URL = "https://move.vip50one.com";
export const dayUrl = `${MOVE_URL}/api/brain/day`;
const KIND_OK: readonly BlockKind[] = ["power_hour", "texts", "notes", "approvals", "in_person", "task", "custom"];
const SOURCES: readonly Busy["source"][] = ["calendar", "one_event", "time_block", "open_house", "showing", "listing_appointment", "fixed", "travel"];
const isHM = (t: unknown): t is string => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

export interface DayFromMove {
  date: string;
  hours: { start: string; end: string };
  busy: Busy[];
  blocks: (Block & { movedFrom: string | null })[];
  approvedAt: string | null;
}

/** A §3o.2 answer, checked; null when it is not one. Bad rows are dropped, never guessed. */
export function readDay(j: unknown): DayFromMove | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (typeof r.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
  const h = r.hours as Record<string, unknown> | undefined;
  const hours = h && isHM(h.start) && isHM(h.end) && h.start < h.end ? { start: h.start, end: h.end } : { start: "08:00", end: "17:30" };
  const busy: Busy[] = [];
  for (const b of Array.isArray(r.busy) ? (r.busy as Record<string, unknown>[]) : []) {
    if (!b || !isHM(b.start) || !isHM(b.end) || b.end <= b.start) continue;
    busy.push({
      start: b.start,
      end: b.end,
      title: typeof b.title === "string" && b.title.trim() ? b.title.slice(0, 80) : null,
      source: SOURCES.includes(b.source as Busy["source"]) ? (b.source as Busy["source"]) : "calendar",
      category: typeof b.category === "string" && b.category.trim() ? b.category.trim().slice(0, 40) : null,
    });
  }
  const blocks: DayFromMove["blocks"] = [];
  for (const b of Array.isArray(r.blocks) ? (r.blocks as Record<string, unknown>[]) : []) {
    if (!b || typeof b.id !== "string" || !isHM(b.start) || !isHM(b.end) || b.end <= b.start || typeof b.title !== "string") continue;
    blocks.push({
      id: b.id,
      start: b.start,
      end: b.end,
      kind: KIND_OK.includes(b.kind as BlockKind) ? (b.kind as BlockKind) : "task",
      title: b.title.slice(0, 120),
      refs: Array.isArray(b.refs) ? (b.refs as unknown[]).filter((x): x is string => typeof x === "string") : [],
      why: typeof b.why === "string" ? b.why.slice(0, 160) : "",
      done: b.done === true,
      movedFrom: isHM(b.moved_from) ? b.moved_from : null,
    });
  }
  blocks.sort((a, b) => toMin(a.start) - toMin(b.start));
  return { date: r.date, hours, busy, blocks, approvedAt: typeof r.approved_at === "string" ? r.approved_at : null };
}

/** The §3o.3 PUT body: only what MASTER keeps. */
export function dayPutBody(date: string, blocks: Block[]) {
  return { date, blocks: blocks.map((b) => ({ start: b.start, end: b.end, kind: b.kind, title: b.title.slice(0, 120), refs: b.refs.slice(0, 25) })) };
}

/** A block the agent added (in plain words or by tapping a gap), kept as a fixed-time plan item. */
export interface Custom {
  id: string;
  title: string;
  start: string;
  end: string;
  repeat: "none" | "weekdays" | "daily";
}
export const customKey = "one.blocks";

/** The agent's blocks that fall on a day: one-offs on their date, weekday and daily ones by the rule. */
export function customsOn(all: (Custom & { date: string })[], date: string): Custom[] {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return all.filter((c) => (c.repeat === "none" ? c.date === date : c.repeat === "daily" ? c.date <= date : c.date <= date && dow >= 1 && dow <= 5));
}

/** A custom block as a fixed plan item (so buildDay plans round it, and §3l carries it to ONE GO). */
export function customItem(c: Custom): PlanItem {
  return { ref: `blk:${c.id}`, product: "go", kind: "other", title: c.title, contactId: null, link: null, minutes: Math.max(5, toMin(c.end) - toMin(c.start)), at: c.start, done: false };
}

/** Where a time sits on the Day Clock: radians clockwise from the top, the working day once round. */
export function angleOf(t: string | number, hours: { start: string; end: string }): number {
  const m = typeof t === "number" ? t : toMin(t);
  const s = toMin(hours.start);
  const span = Math.max(60, toMin(hours.end) - s);
  return ((m - s) / span) * Math.PI * 2;
}

/** The time at a point on the clock face, to the quarter hour (tapping a gap). */
export function timeAtPoint(x: number, y: number, cx: number, cy: number, hours: { start: string; end: string }): string {
  let a = Math.atan2(x - cx, cy - y);
  if (a < 0) a += Math.PI * 2;
  const s = toMin(hours.start);
  const span = Math.max(60, toMin(hours.end) - s);
  const m = s + Math.round(((a / (Math.PI * 2)) * span) / 15) * 15;
  return toTime(Math.min(toMin(hours.end) - 15, m));
}

/** "3h 30m". */
export function hm(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** The time now in the agent's time zone, "HH:MM". */
export function denverNow(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Denver", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}

// Colour by kind (Parry, 6 Oct: "color code items being added to the calendar so it is not so boring"). Every
// item on the Day Clock takes the colour of what it is, the same in the plan list beside it: the work Pulse
// plans in bright colours with dark words, the appointments and drives in deeper ones with white words.
export type Hue = "calls" | "texts" | "notes" | "approvals" | "people" | "tasks" | "client" | "meeting" | "meal" | "personal" | "drive" | "busy";
export const HUE: Record<Hue, { color: string; word: string }> = {
  calls: { color: "#f5c542", word: "Calls" },
  texts: { color: "#f28bc0", word: "Texts" },
  notes: { color: "#b79cff", word: "Notes" },
  approvals: { color: "#ff9f5a", word: "Approvals" },
  people: { color: "#5fd39a", word: "Face to face" },
  tasks: { color: "#6cc4ff", word: "Tasks" },
  client: { color: "#2f9e6a", word: "Clients" },
  meeting: { color: "#4a76d9", word: "Meetings" },
  meal: { color: "#d9694a", word: "Meals" },
  personal: { color: "#8a5cc9", word: "Personal" },
  drive: { color: "#2fb7a3", word: "Drives" },
  busy: { color: "#6b7590", word: "Busy" },
};
const BLOCK_HUE: Record<BlockKind, Hue> = { power_hour: "calls", texts: "texts", notes: "notes", approvals: "approvals", in_person: "people", task: "tasks", custom: "tasks" };
export const blockHue = (kind: BlockKind): Hue => BLOCK_HUE[kind] ?? "tasks";

/** What an appointment is, from its words: client business, a meal, something personal, or a meeting. */
export function titleHue(title: string | null | undefined): Hue | null {
  const t = (title ?? "").toLowerCase();
  if (!t.trim()) return null;
  if (/\b(show(ing)?s?|listing|open house|closing|inspection|appraisal|walk-?through|buyers?|sellers?|offer|cma|signing)\b/.test(t)) return "client";
  if (/\b(lunch|breakfast|brunch|dinner|coffee|drinks?|happy hour)\b/.test(t)) return "meal";
  if (/\b(dr\.?|doctor|dentist|dental|gym|workout|school|kids?|pick ?up|drop ?off|haircut|church|vet|family|personal|therapy|physio|nap|rest|break)\b/.test(t)) return "personal";
  if (/\b(meeting|meet|call|zoom|team|training|coaching|class|webinar|interview|1:1|one on one)\b/.test(t)) return "meeting";
  return null;
}

/** ONE MOVE and ONE GO categories (§3o.1 v1.27 table). A category says what an item is before its words do. */
const CATEGORY_HUE: Record<string, Hue> = {
  revenue: "calls", calls: "calls", texts: "texts", notes: "notes", approvals: "approvals",
  face_to_face: "people", "face-to-face": "people", drop_by: "people",
  admin: "tasks", task: "tasks", tasks: "tasks",
  clients: "client", client: "client", showing: "client", listing: "client", open_house: "client",
  team: "meeting", business: "meeting", meeting: "meeting",
  meal: "meal", personal: "personal", travel: "drive",
};
export const categoryHue = (c: string | null | undefined): Hue | null => (c ? CATEGORY_HUE[c.trim().toLowerCase().replace(/\s+/g, "_")] ?? null : null);
// The day feed sends MASTER's own decision as a colour key (`calendar_color`, vip50-web-crm#83); it is final.
const isHue = (c: string | null | undefined): c is Hue => !!c && Object.prototype.hasOwnProperty.call(HUE, c);

export function busyHue(b: Pick<Busy, "source" | "title"> & { category?: string | null }): Hue {
  if (b.source === "travel") return "drive";
  if (b.source === "showing" || b.source === "open_house" || b.source === "listing_appointment") return "client";
  if (isHue(b.category)) return b.category;
  const c = categoryHue(b.category);
  if (c) return c;
  return titleHue(b.title) ?? (b.source === "fixed" || b.source === "one_event" ? "meeting" : "busy");
}
