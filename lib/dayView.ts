import { clock12, toMin, toTime } from "./schedule.ts";
import type { Slot } from "./day.ts";

// Your day, always on time (audit stage 2, Parry 14 Oct: "yes I agree to your changes"). The list re-slides every five
// minutes: the top undone row is always now; a row whose time passed moves up by itself and says where it came from.
// Done rows keep their time. Fixed appointments are not work rows, so they never move (VIP-SUMMARY §3o).

export interface DayRow extends Slot { movedFrom: string | null; isNow: boolean }
export interface DayGroup { key: string; now: boolean; start: string; end: string; name: string; rows: DayRow[] }

/** "14:37" -> "14:35": every screen slides on the same five-minute steps, so two screens agree. */
export const floor5 = (hhmm: string) => toTime(Math.floor(toMin(hhmm) / 5) * 5);

export function slideSlots(slots: readonly Slot[], now: string | null): DayRow[] {
  if (!now) return slots.map((s) => ({ ...s, movedFrom: null, isNow: false }));
  const n = toMin(floor5(now));
  let cursor = n;
  let first = true;
  return slots.map((s) => {
    if (s.done) return { ...s, movedFrom: null, isNow: false };
    // A fixed appointment (lunch, a showing, a meeting) never moves (VIP-SUMMARY §3o).
    if (s.kind === "meeting") return { ...s, movedFrom: null, isNow: toMin(s.start) <= n && n < toMin(s.end) };
    const start = toMin(s.start);
    const at = Math.max(start, cursor);
    const row: DayRow = { ...s, start: toTime(at), end: toTime(at + s.minutes), movedFrom: at > start && start < n ? s.start : null, isNow: first && at <= n + 1 };
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
  const undone = rows.filter((r) => !r.done);
  for (const r of undone) {
    const g = out[out.length - 1];
    if (g && isCall(g.rows[0]) === isCall(r) && g.rows.length < 8) {
      g.rows.push(r);
      g.end = r.end;
    } else out.push({ key: r.id, now: r.isNow, start: r.start, end: r.end, name: "", rows: [r] });
  }
  for (const g of out) g.name = groupName(g.rows);
  const done = rows.filter((r) => r.done);
  if (done.length) out.push({ key: "done", now: false, start: done[0].start, end: done[done.length - 1].end, name: `Done · ${done.length}`, rows: done });
  return out;
}

export const groupHead = (g: DayGroup) => (g.key === "done" ? g.name : `${g.now ? "Now · " : ""}${clock12(g.start)} to ${clock12(g.end)} · ${g.name}`);

/** The Now strip, named for what is in it: "Now: Power Hour · 4 calls (until 3:20pm)". */
export function nowStrip(groups: readonly DayGroup[]): string | null {
  const g = groups.find((x) => x.key !== "done");
  if (!g) return null;
  return g.now ? `Now: ${g.name} (until ${clock12(g.end)})` : `Next: ${g.name} at ${clock12(g.start)}`;
}
