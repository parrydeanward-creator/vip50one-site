import type { DayItem, DayKind } from "./day.ts";
import type { ProductKey } from "./graph/types.ts";

// Plan My Day (Parry, 5 Oct; VIP-SUMMARY §3l): the desktop plans, the phone does. The Brain lays
// out what is pulsing today, the agent orders it and cuts what will not happen, and Send to my phone
// saves it in MASTER, where ONE GO shows it as Today's plan. This file only orders, times and
// checks; nothing here draws or sends.

export const PLAN_MAX = 25;
const MOVE_URL = "https://move.vip50one.com";
export const planUrl = `${MOVE_URL}/api/brain/plan`;
const KINDS: readonly DayKind[] = ["call", "text", "note", "approval", "meeting", "rating", "follow_up", "report", "other"];
const PRODUCTS: readonly ProductKey[] = ["go", "move", "marquee", "open", "showly"];

export interface PlanItem {
  ref: string; // the vip_summary item id it came from, or "hwc:hot|warm|cold"
  product: ProductKey;
  kind: DayKind;
  title: string;
  contactId: string | null;
  link: string | null;
  minutes: number;
  at?: string | null; // a fixed time, "HH:MM" (a lunch, an appointment): it keeps its time
  done: boolean;
  nodeId?: string; // the Brain's own: the orb to go to (not sent)
  urgency?: "alert" | "today" | "soon"; // the Brain's own: the pulse colour (not sent)
  special?: boolean; // the Brain's own: a special day (not sent)
}

export interface Plan {
  date: string;
  sentAt: string | null;
  start: string; // "HH:MM"
  items: PlanItem[];
}

/** A day item as a plan item. Its ref is the summary item id (the Brain's day ids are "day:<id>"). */
export function fromDay(d: DayItem): PlanItem {
  return {
    ref: d.ref ?? d.id.replace(/^day:/, ""),
    product: d.product,
    kind: d.kind,
    title: d.what,
    contactId: d.contactId ?? null,
    link: d.link ?? null,
    minutes: d.minutes,
    at: d.at ?? null,
    done: false,
    nodeId: d.nodeId,
    urgency: d.urgency,
    special: d.special,
  };
}

const rank = (p: PlanItem) => (p.urgency === "alert" ? 0 : p.special ? 1 : p.urgency === "today" ? 2 : 3);

/** Pulse suggests: everything pulsing today, red first, then special days, then yellow; the
 * products' own order kept inside each. */
export function suggest(today: DayItem[]): PlanItem[] {
  const seen = new Set<string>();
  return today
    .map(fromDay)
    .filter((p) => (seen.has(p.ref) ? false : (seen.add(p.ref), true)))
    .map((p, n) => ({ p, n }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.n - b.n)
    .map(({ p }) => p);
}

/** A first plan when the agent has none: Pulse's order, everything red and special, then yellow up to
 * about three hours of work, never more than PLAN_MAX. */
export function firstPlan(suggestions: PlanItem[], budget = 180, start = "08:00"): PlanItem[] {
  const out: PlanItem[] = [];
  let used = 0;
  for (const p of suggestions) {
    if (out.length >= PLAN_MAX) break;
    const must = rank(p) < 2;
    if (!must && used + p.minutes > budget) continue;
    out.push(p);
    used += p.minutes;
  }
  // A fixed time (a lunch) goes where the day reaches it, not where Pulse ranked it.
  const flex = out.filter((p) => !isTime(p.at));
  for (const f of out.filter((p) => isTime(p.at)).sort((a, b) => toMin(a.at!) - toMin(b.at!))) {
    let t = toMin(start), i = 0;
    while (i < flex.length && (isTime(flex[i].at) ? Math.max(t, toMin(flex[i].at!)) : t) + flex[i].minutes <= toMin(f.at!)) {
      t = (isTime(flex[i].at) ? Math.max(t, toMin(flex[i].at!)) : t) + flex[i].minutes;
      i++;
    }
    flex.splice(i, 0, f);
  }
  return flex;
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const isTime = (t: unknown): t is string => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** The plan in the agent's order, each item starting when the one before ends. An item with a fixed
 * time (a lunch) starts then when that is later; the agent's order is never changed. */
export function timed(items: PlanItem[], start: string): (PlanItem & { start: string; end: string })[] {
  let t = toMin(isTime(start) ? start : "08:00");
  return items.map((p) => {
    const s = isTime(p.at) ? Math.max(t, toMin(p.at)) : t;
    t = s + p.minutes;
    return { ...p, start: toTime(s), end: toTime(t) };
  });
}

/** Move the item at `i` up (-1) or down (+1). Out of range: unchanged. */
export function shift<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (i < 0 || i >= list.length || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const https = (u: string | null) => (u && /^https:\/\//.test(u) ? u : null);

/** The §3l.2 body. */
export function putBody(plan: { start: string; items: PlanItem[] }) {
  return {
    start: isTime(plan.start) ? plan.start : "08:00",
    items: plan.items.slice(0, PLAN_MAX).map((p) => ({
      ref: p.ref,
      product: p.product,
      kind: p.kind,
      title: p.title.slice(0, 120),
      contact_id: p.contactId,
      link: https(p.link),
      minutes: p.minutes,
      at: isTime(p.at) ? p.at : null,
    })),
  };
}

/** A §3l.1 answer, checked; null when it is not one. Items the Brain knows keep their orb. */
export function readPlan(j: unknown, known: Pick<PlanItem, "ref" | "nodeId" | "urgency" | "special">[] = []): Plan | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (typeof r.date !== "string" || !Array.isArray(r.items)) return null;
  const byRef = new Map(known.map((k) => [k.ref, k]));
  const items: PlanItem[] = [];
  for (const x of r.items as Record<string, unknown>[]) {
    if (!x || typeof x.ref !== "string" || typeof x.title !== "string") continue;
    const k = byRef.get(x.ref);
    items.push({
      ref: x.ref,
      product: PRODUCTS.includes(x.product as ProductKey) ? (x.product as ProductKey) : "move",
      kind: KINDS.includes(x.kind as DayKind) ? (x.kind as DayKind) : "other",
      title: x.title,
      contactId: typeof x.contact_id === "string" ? x.contact_id : null,
      link: https(typeof x.link === "string" ? x.link : null),
      minutes: typeof x.minutes === "number" && x.minutes > 0 ? Math.min(240, Math.round(x.minutes)) : 10,
      at: isTime(x.at) ? x.at : null,
      done: x.done === true,
      nodeId: k?.nodeId,
      urgency: k?.urgency,
      special: k?.special,
    });
  }
  return { date: r.date, sentAt: typeof r.sent_at === "string" ? r.sent_at : null, start: isTime(r.start) ? r.start : "08:00", items };
}

export const planKey = (date: string) => `one.plan.${date}`;

/** "7 things, about 2 h 10 min, 8:00am to 10:10am" is drawn by the page; this is the sum. */
export function totalMinutes(items: PlanItem[]): number {
  return items.reduce((t, p) => t + p.minutes, 0);
}

/** The weekly score's gap to the minimum (100, CLAUDE.md), or null when unknown. */
export function pointsLeft(week: { score: number; minimum: number } | undefined): number | null {
  if (!week || !Number.isFinite(week.score)) return null;
  return Math.max(0, week.minimum - week.score);
}

// ---- the orb view (Parry, 5 Oct: "make the plan my day look more like what the move looks like") ----

export interface Seat {
  ref: string;
  x: number;
  y: number;
  r: number;
  angle: number; // radians, 0 at the top, clockwise
}

/** The plan round a clock ring, first at the top, clockwise in the agent's order; a longer item is a
 * bigger orb. Pulse's suggestions sit on a wider ring outside. */
export function planSeats(items: PlanItem[], cx: number, cy: number, ring: number): Seat[] {
  const n = items.length;
  if (!n) return [];
  const step = (2 * Math.PI) / Math.max(n, 6);
  const span = step * (n - 1);
  const first = n < 6 ? -span / 2 : 0; // a short plan sits as an arc across the top
  const cap = Math.max(16, Math.min(46, (ring * step) / 2 - 4));
  return items.map((p, i) => {
    const angle = first + i * step;
    const r = Math.min(cap, 20 + (Math.min(p.minutes, 60) / 60) * 22);
    return { ref: p.ref, angle, r, x: cx + ring * Math.sin(angle), y: cy - ring * Math.cos(angle) };
  });
}

export function poolSeats(items: PlanItem[], cx: number, cy: number, ring: number): Seat[] {
  const n = items.length;
  const step = (2 * Math.PI) / Math.max(n, 10);
  const r = Math.max(12, Math.min(22, (ring * step) / 2 - 4));
  // start at the bottom so the outside ring never sits on top of the first plan item
  return items.map((p, i) => {
    const angle = Math.PI + (i - (n - 1) / 2) * step;
    return { ref: p.ref, angle, r, x: cx + ring * Math.sin(angle), y: cy - ring * Math.cos(angle) };
  });
}

/** Where an orb dropped at (x, y) goes in a plan of `n` items: its place round the ring, or null when it
 * was dropped outside the ring (taken off) or inside the core. */
export function dropIndex(x: number, y: number, cx: number, cy: number, ring: number, n: number, core: number): number | null {
  const d = Math.hypot(x - cx, y - cy);
  if (d < core || d > ring * 1.22) return null;
  if (n <= 0) return 0;
  const step = (2 * Math.PI) / Math.max(n, 6);
  const first = n < 6 ? -(step * (n - 1)) / 2 : 0;
  let a = Math.atan2(x - cx, cy - y); // 0 at the top, clockwise
  if (n >= 6 && a < -step / 2) a += 2 * Math.PI;
  return Math.max(0, Math.min(n, Math.round((a - first) / step)));
}

/** Put `item` at position `index` (where it lands after the move): moved within the plan, or inserted
 * from Pulse suggests. */
export function placeAt(items: PlanItem[], item: PlanItem, index: number): PlanItem[] {
  const rest = items.filter((p) => p.ref !== item.ref);
  rest.splice(Math.max(0, Math.min(rest.length, index)), 0, item);
  return rest.slice(0, PLAN_MAX);
}

/** Two letters for an orb: the person's initials from "Call Jen Alvarez", else the kind. */
export function orbMark(p: PlanItem): string {
  const m = /^(?:[Cc]all|[Tt]ext|[Ee]mail|[Mm]eet|[Ww]rite|[Tt]hank|[Ww]ish)\s+([A-Z][a-z'’-]+)\s+([A-Z][a-z'’-]+)/.exec(p.title);
  if (m) return `${m[1][0]}${m[2][0]}`;
  const k: Partial<Record<string, string>> = { call: "☎", text: "✉", note: "✎", approval: "✓", meeting: "☕", rating: "★", follow_up: "↻", report: "▤" };
  return k[p.kind] ?? "•";
}
