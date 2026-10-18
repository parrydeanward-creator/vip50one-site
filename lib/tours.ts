import { MOVE_URL } from "./host.ts";

// "Tours booked from your site" on My Profile (Websites' vip_open_slots; GO/MOVE's vip50-web-crm#317, the hard rule of
// 14 Oct: My Profile items on Classic and the Brain alike). GET and POST /api/brain/profile/tours carry
// `{on, hours:{days:[1-7 ISO, 1 = Monday], start:"HH:MM", end:"HH:MM"}}`. Visitors pick a free time from the agent's own
// calendar and never see what is on it; each booking is held on the calendar for the agent to confirm.

export const toursUrl = `${MOVE_URL}/api/brain/profile/tours`;
export const TOURS_TITLE = "Tours booked from your site";
export const TOURS_COPY = "Visitors pick a free time from your own calendar (they never see what is on it). Each booking is held on your calendar for you to confirm.";
export const TOURS_CHECK = "Let visitors book a tour";
export const TOURS_SAVING = "Saving...";
export const TOURS_SAVED = "Saved.";
export const TOURS_FAILED = "That did not save. Nothing was changed.";
export const DAY_CHIPS: { n: number; label: string }[] = [
  { n: 1, label: "Mon" }, { n: 2, label: "Tue" }, { n: 3, label: "Wed" }, { n: 4, label: "Thu" }, { n: 5, label: "Fri" }, { n: 6, label: "Sat" }, { n: 7, label: "Sun" },
];

export interface TourHours { days: number[]; start: string; end: string }
export interface Tours { on: boolean; hours: TourHours }
export const DEFAULT_HOURS: TourHours = { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" };

const time = (v: unknown): string | null => {
  const m = typeof v === "string" ? /^(\d{1,2}):(\d{2})/.exec(v.trim()) : null;
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
};

/** GET's answer; null when it is not that answer. Missing hours fall back to Mon-Fri 9:00 to 17:00. */
export function readTours(j: unknown): Tours | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  if (typeof o.on !== "boolean") return null;
  const h = (o.hours && typeof o.hours === "object" ? o.hours : {}) as Record<string, unknown>;
  const days = Array.isArray(h.days)
    ? [...new Set(h.days.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 7))].sort((a, b) => a - b)
    : DEFAULT_HOURS.days;
  return { on: o.on, hours: { days, start: time(h.start) ?? DEFAULT_HOURS.start, end: time(h.end) ?? DEFAULT_HOURS.end } };
}

/** The first problem with the hours, in words, or null. */
export function hoursProblem(h: TourHours): string | null {
  if (!h.days.length) return "Pick at least one day.";
  if (!time(h.start) || !time(h.end)) return "Choose a start and an end time.";
  if (h.end <= h.start) return "The end time must be after the start time.";
  return null;
}

/** POST's body: the check box, and the hours when they are valid. A problem comes back in words. */
export function toursBody(on: boolean, h: TourHours): { on: boolean; hours?: TourHours } | { error: string } {
  const p = hoursProblem(h);
  if (p) return { error: p };
  return { on, hours: { days: [...h.days].sort((a, b) => a - b), start: h.start, end: h.end } };
}

export const toggleDay = (days: number[], n: number): number[] =>
  (days.includes(n) ? days.filter((d) => d !== n) : [...days, n]).sort((a, b) => a - b);

/** The example agent (?demo=1): on, Mon-Fri 9:00 to 17:00. Saves stay on the screen. */
export const demoTours = (): Tours => ({ on: true, hours: { ...DEFAULT_HOURS, days: [...DEFAULT_HOURS.days] } });
