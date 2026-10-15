import { clock12, toMin, toTime } from "./schedule.ts";
import type { Slot } from "./day.ts";

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

/** "Power Hour · 4 calls" only for a run of calls; otherwise "3 tasks". */
export function groupName(rows: readonly Slot[]): string {
  const n = rows.length;
  if (n > 1 && rows.every(isCall)) return `Power Hour · ${n} calls`;
  if (n === 1 && isCall(rows[0])) return "1 call";
  return `${n} ${n === 1 ? "task" : "tasks"}`;
}

/** Undone rows in runs (calls together, other work together); done rows after, as one group. */
export function groupRows(rows: readonly DayRow[]): DayGroup[] {
  const out: DayGroup[] = [];
  const undone = rows.filter((r) => !r.done && !r.tomorrow);
  for (const r of undone) {
    const g = out[out.length - 1];
    if (g && isCall(g.rows[0]) === isCall(r) && g.rows.length < 8) {
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

/** The Now strip, named for what is in it: "Now: Power Hour · 4 calls (until 3:20pm)". After the working day: "Day done ·
 * 8 move to tomorrow"; before it: "Today starts 8:00am with Power Hour · 4 calls" (walker 14 Oct, Parry approved). */
export function nowStrip(groups: readonly DayGroup[], now?: string | null, hours?: Hours): string | null {
  const later = groups.find((x) => x.key === "tomorrow")?.rows.length ?? 0;
  const g = groups.find((x) => x.key !== "done" && x.key !== "tomorrow");
  if (now && hours && toMin(now) >= toMin(hours.end)) return later ? `Day done · ${later} move to tomorrow` : "Day done";
  if (!g) return later ? `Day done · ${later} move to tomorrow` : null;
  if (now && hours && toMin(now) < toMin(hours.start)) return `Today starts ${clock12(g.start)} with ${g.name}`;
  return g.now ? `Now: ${g.name} (until ${clock12(g.end)})` : `Next: ${g.name} at ${clock12(g.start)}`;
}
