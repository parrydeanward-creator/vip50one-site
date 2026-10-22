import { clock12, DAY_OVER_WHY, toMin, toTime } from "./schedule.ts";
import type { Slot } from "./day.ts";
import { fromDay, type PlanItem } from "./plan.ts";

// Your day, always on time (audit stage 2, Parry 14 Oct: "yes I agree to your changes"). The list re-slides every five
// minutes: the top undone row is always now; a row whose time passed moves up by itself and says where it came from.
// Done rows keep their time. Fixed appointments are not work rows, so they never move (VIP-SUMMARY §3o).

export interface DayRow extends Slot { movedFrom: string | null; isNow: boolean; tomorrow: boolean }

/** The agent's working day (ONE MOVE's hours, else 8:00-5:30). Nothing slides past its end (walker, 14 Oct: "No calls
 * at night", Parry approved): what does not fit moves to tomorrow. */
export interface Hours { start: string; end: string }
export interface DayGroup { key: string; now: boolean; start: string; end: string; name: string; rows: DayRow[] }

/** "14:37" -> "14:35": every screen slides on the same five-minute steps, so two screens agree. */
export const floor5 = (hhmm: string) => toTime(Math.floor(toMin(hhmm) / 5) * 5);

export function slideSlots(slots: readonly Slot[], now: string | null, hours?: Hours): DayRow[] {
  if (!now) return slots.map((s) => ({ ...s, movedFrom: null, isNow: false, tomorrow: false }));
  const n = toMin(floor5(now));
  const endOfDay = hours ? toMin(hours.end) : 24 * 60;
  let cursor = n;
  let first = true;
  return slots.map((s) => {
    if (s.done) return { ...s, movedFrom: null, isNow: false, tomorrow: false };
    // A fixed appointment (lunch, a showing, a meeting) never moves (VIP-SUMMARY §3o).
    if (s.kind === "meeting") return { ...s, movedFrom: null, isNow: toMin(s.start) <= n && n < toMin(s.end), tomorrow: false };
    const start = toMin(s.start);
    const at = Math.max(start, cursor);
    // Past the end of the working day: tomorrow, never a call at night.
    if (at >= endOfDay) return { ...s, movedFrom: null, isNow: false, tomorrow: true };
    const row: DayRow = { ...s, start: toTime(at), end: toTime(at + s.minutes), movedFrom: at > start && start < n ? s.start : null, isNow: first && at <= n + 1, tomorrow: false };
    first = false;
    cursor = at + s.minutes;
    return row;
  });
}

const isCall = (r: Slot) => r.kind === "call";

/** A run of calls is "4 calls"; other work "3 tasks". The one Power Hour is ONE MOVE's, named as ONE MOVE names it
 * ("Power Hour: 3 of 9 done"); a run of the Brain's own calls is never called a Power Hour (Parry, 22 Oct: "there are 2
 * power hours"). */
export function groupName(rows: readonly Slot[]): string {
  const n = rows.length;
  if (rows[0]?.touchTitle) return rows[0].touchTitle;
  if (n > 1 && rows.every(isCall)) return `${n} calls`;
  if (n === 1 && isCall(rows[0])) return "1 call";
  return `${n} ${n === 1 ? "task" : "tasks"}`;
}

/** Undone rows in runs (calls together, other work together); done rows after, as one group. */
export function groupRows(rows: readonly DayRow[]): DayGroup[] {
  const out: DayGroup[] = [];
  const undone = rows.filter((r) => !r.done && !r.tomorrow);
  for (const r of undone) {
    const g = out[out.length - 1];
    // the Power Hour's touches are one group, the block's own; nothing else joins it
    const same = g && (g.rows[0].touchBlock || r.touchBlock ? g.rows[0].touchBlock === r.touchBlock : isCall(g.rows[0]) === isCall(r) && g.rows.length < 8);
    if (g && same) {
      g.rows.push(r);
      g.end = r.end;
    } else out.push({ key: r.id, now: r.isNow, start: r.start, end: r.end, name: "", rows: [r] });
  }
  for (const g of out) g.name = groupName(g.rows);
  const later = rows.filter((r) => r.tomorrow);
  if (later.length) out.push({ key: "tomorrow", now: false, start: later[0].start, end: later[later.length - 1].end, name: `Tomorrow · ${later.length}`, rows: later });
  const done = rows.filter((r) => r.done);
  if (done.length) out.push({ key: "done", now: false, start: done[0].start, end: done[done.length - 1].end, name: `Done · ${done.length}`, rows: done });
  return out;
}

export const groupHead = (g: DayGroup) =>
  g.key === "done" ? g.name : g.key === "tomorrow" ? `${g.name} (after your working day)` : `${g.now ? "Now · " : ""}${clock12(g.start)} to ${clock12(g.end)} · ${g.name}`;

/** The Now strip, named for what is in it: "Now: Power Hour: 3 of 9 done (until 3:20pm)". After the working day: "Day done ·
 * 8 move to tomorrow"; before it: "Today starts 8:00am with 4 calls" (walker 14 Oct, Parry approved). */
export function nowStrip(groups: readonly DayGroup[], now?: string | null, hours?: Hours): string | null {
  const later = groups.find((x) => x.key === "tomorrow")?.rows.length ?? 0;
  const g = groups.find((x) => x.key !== "done" && x.key !== "tomorrow");
  if (now && hours && toMin(now) >= toMin(hours.end)) return later ? `Day done · ${later} move to tomorrow` : "Day done";
  if (!g) return later ? `Day done · ${later} move to tomorrow` : null;
  if (now && hours && toMin(now) < toMin(hours.start)) return `Today starts ${clock12(g.start)} with ${g.name}`;
  return g.now ? `Now: ${g.name} (until ${clock12(g.end)})` : `Next: ${g.name} at ${clock12(g.start)}`;
}

// ---- one count for "moves to tomorrow" (Parry, 16 Oct, Plan my day audit 3.1.2) ----------------------------------
// At the same moment the ONE panel said "8 move to tomorrow", the Now pill "6" and the Day Clock listed 15. One list now:
// the rows of Your day that slid past the end of the working day, and what Pulse could not fit in the plan (the Day
// Clock's "Moves to tomorrow"), each once. The panel, the pill and the Day Clock all read it.

export interface TomorrowItem { ref: string; title: string; why: string; item: PlanItem }

const rowRef = (r: Slot) => r.ref ?? r.id.replace(/^day:/, "");

/** Is the working day over: now at or past its end, or nothing left to do today while something waits for tomorrow.
 * Never before the day has begun, and never on a day off (walker, 17 Oct: "over" at 07:40 on a Saturday; a day off and
 * a day not started yet have their own words, lib/workDay.ts dayStart). */
export function dayIsDone(now: string | null | undefined, hours: Hours, leftToday: number, tomorrow: number, dayOff = false): boolean {
  if (!now || dayOff) return false;
  if (toMin(now) < toMin(hours.start)) return false;
  return toMin(now) >= toMin(hours.end) || (leftToday === 0 && tomorrow > 0);
}

/** Your day's rows with every "moves to tomorrow" item in its Tomorrow group, and that one list. `later` is the Day
 * Clock's (useDay's plan.later). Rows already in Your day are not added twice. */
export function withTomorrow(rows: readonly DayRow[], later: readonly { item: PlanItem; why: string }[], now?: string | null, hours?: Hours): { rows: DayRow[]; tomorrow: TomorrowItem[] } {
  const over = !!now && !!hours && toMin(now) >= toMin(hours.end);
  const done = new Set(rows.filter((r) => r.done).map(rowRef));
  const later2 = later.filter((l) => !l.item.done && !done.has(l.item.ref));
  // what the plan could not fit is not today on any screen: its row in Your day joins the Tomorrow group too
  const laterRefs = new Set(later2.map((l) => l.item.ref));
  const out = rows.map((r) => (!r.done && !r.tomorrow && laterRefs.has(rowRef(r)) ? { ...r, tomorrow: true, isNow: false, movedFrom: null } : r));
  const seen = new Set<string>();
  const tomorrow: TomorrowItem[] = [];
  for (const r of out) {
    if (!r.tomorrow || r.done || seen.has(rowRef(r)) || laterRefs.has(rowRef(r))) continue;
    seen.add(rowRef(r));
    tomorrow.push({ ref: rowRef(r), title: r.what, why: over ? DAY_OVER_WHY : "No time left in your working day.", item: { ...fromDay(r), at: null } });
  }
  const extra: DayRow[] = [];
  const end = hours?.end ?? "23:55";
  for (const l of later2) {
    if (seen.has(l.item.ref)) continue;
    seen.add(l.item.ref);
    tomorrow.push({ ref: l.item.ref, title: l.item.title, why: l.why, item: { ...l.item, at: null } });
    // a row in Your day only for what is not there already, so its Tomorrow group counts the same
    if (!out.some((r) => rowRef(r) === l.item.ref))
      extra.push({ id: `day:${l.item.ref}`, ref: l.item.ref, nodeId: l.item.nodeId ?? (l.item.product === "go" ? "go" : "move"), product: l.item.product, kind: l.item.kind, what: l.item.title, minutes: l.item.minutes, contactId: l.item.contactId ?? undefined, link: l.item.link ?? undefined, urgency: l.item.urgency, special: l.item.special, start: end, end, done: false, movedFrom: null, isNow: false, tomorrow: true });
  }
  return { rows: [...out, ...extra], tomorrow };
}
