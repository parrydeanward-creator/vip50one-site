import type { DatedNote } from "./graph/types.ts";
import type { GraphIndex } from "./graph/model.ts";
import { candidates } from "./ask.ts";

// The timeline slider (BRAIN-HANDOFF.md feature 5): PAST <- TODAY -> FUTURE.
// Drag back and the map shows what happened between then and today; drag
// forward and it shows what is coming. Days are the agent's local days in
// Mountain time (VIP-SUMMARY §2).

export const RANGE = 30; // days either side of today
export const MAX_SHOWN = 10; // nodes around ONE at once
const TZ = "America/Denver";

function localDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Whole local days from today to `at` (negative = past).
export function dayOffset(at: string, now: Date): number {
  const a = Date.parse(`${localDate(new Date(at))}T00:00:00Z`);
  const b = Date.parse(`${localDate(now)}T00:00:00Z`);
  return Math.round((a - b) / 86400_000);
}

// What the map shows at `offset` days from today: everything dated between
// today and that day (past or future), nearest to today first, only items the
// agent has, at most MAX_SHOWN distinct nodes.
export function inWindow(dated: DatedNote[] | undefined, offset: number, now: Date, ix: GraphIndex): (DatedNote & { day: number })[] {
  if (!offset) return [];
  const ok = new Set(candidates(ix).map((n) => n.id));
  const rows = (dated ?? [])
    .map((d) => ({ ...d, day: dayOffset(d.at, now) }))
    .filter((d) => ok.has(d.id) && (offset < 0 ? d.day <= 0 && d.day >= offset : d.day >= 0 && d.day <= offset))
    .sort((a, b) => Math.abs(a.day) - Math.abs(b.day) || a.at.localeCompare(b.at));
  const ids = new Set<string>();
  return rows.filter((r) => {
    if (ids.has(r.id)) return true;
    if (ids.size >= MAX_SHOWN) return false;
    ids.add(r.id);
    return true;
  });
}

export function offsetLabel(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === -1) return "Yesterday";
  if (offset === 1) return "Tomorrow";
  return offset < 0 ? `${-offset} days ago` : `In ${offset} days`;
}

// "Looking back 14 days" / "The next 14 days"
export function windowTitle(offset: number): string {
  if (offset < 0) return offset === -1 ? "Since yesterday" : `The last ${-offset} days`;
  return offset === 1 ? "Today and tomorrow" : `The next ${offset} days`;
}

export function dayLabel(day: number, at: string): string {
  if (day === 0) return "Today";
  if (day === -1) return "Yesterday";
  if (day === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).format(new Date(at));
}
