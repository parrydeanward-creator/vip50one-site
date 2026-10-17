import { MOVE_URL } from "./host.ts";

// Today against the agent's working week (walker, 17 Oct 07:40 MT: on a Saturday morning Plan my day said "Today's
// working day is over. Open it to see tomorrow's plan." before the day had begun). The week is ONE MOVE's week template
// (VIP-SUMMARY §3o.4, set once in My Profile; GET /api/brain/week-template {days: {"1".."7": {start, end} | null}}):
// a null day is a day off. Until the agent saves their own, ONE MOVE plans 8:00 to 5:30 every day, so every day is a
// working day. Pure.

export const weekTemplateUrl = `${MOVE_URL}/api/brain/week-template`;

export interface Hours { start: string; end: string }
/** ISO weekday (1 = Monday ... 7 = Sunday) -> hours, or null for a day off. */
export type Week = Record<number, Hours | null>;

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** GET /api/brain/week-template, checked; null when it is not one or keeps no working day. */
export function readWeek(j: unknown): Week | null {
  if (!j || typeof j !== "object") return null;
  const days = (j as Record<string, unknown>).days;
  if (!days || typeof days !== "object") return null;
  const out: Week = {};
  for (let d = 1; d <= 7; d++) {
    const v = (days as Record<string, unknown>)[String(d)] as Record<string, unknown> | null | undefined;
    out[d] = v && typeof v.start === "string" && typeof v.end === "string" && HM.test(v.start) && HM.test(v.end) && v.start < v.end ? { start: v.start, end: v.end } : null;
  }
  return Object.values(out).some(Boolean) ? out : null;
}

/** ISO weekday of a YYYY-MM-DD date (1 = Monday). */
export function isoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}
export const dayName = (date: string) => DAY_NAMES[isoWeekday(date)];
const plusDays = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Whether the agent works on this date: false only when their week says the day is off. */
export const worksOn = (date: string, week: Week | null | undefined) => !week || !!week[isoWeekday(date)];

/** The next date after `date` the agent works (the day after when no week is known). */
export function nextWorkingDay(date: string, week: Week | null | undefined): string {
  for (let i = 1; i <= 7; i++) {
    const d = plusDays(date, i);
    if (worksOn(d, week)) return d;
  }
  return plusDays(date, 1);
}

/** "9:00", "8:30", "1:00 pm". */
export function startWords(t: string): string {
  const m = toMin(t);
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
  return h < 12 ? `${h || 12}:${mm}` : `${h % 12 || 12}:${mm} pm`;
}

export type DayStart =
  | { kind: "off"; line: string; nextDate: string; nextName: string; button: string }
  | { kind: "before"; line: string }
  | { kind: "on" };

/**
 * Where today stands before the plan is looked at: a day off (ONE MOVE's day says `day_off`, or the week has no hours
 * for today), or a working day not started yet, or under way. Never "over" before it began.
 */
export function dayStart(x: { date: string; now: string | null | undefined; hours: Hours; dayOff?: boolean; week?: Week | null }): DayStart {
  if (x.dayOff || !worksOn(x.date, x.week)) {
    const nextDate = nextWorkingDay(x.date, x.week);
    const nextName = dayName(nextDate);
    return { kind: "off", line: `No working hours today (${dayName(x.date)})`, nextDate, nextName, button: `See ${nextName}'s plan` };
  }
  if (x.now && toMin(x.now) < toMin(x.hours.start)) return { kind: "before", line: `Your day starts at ${startWords(x.hours.start)}` };
  return { kind: "on" };
}
