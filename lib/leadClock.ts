// When a new lead came in, in plain words, on Denver time (ecosystem 17 Oct, Parry: "yes on fixes"):
// "Came in 6:25 am · 13 hours ago", "Came in 6:25 am · 20 minutes ago", "Came in 6:25 am · just now",
// "Came in yesterday 6:25 am", "Came in Tue 6:25 am", and for more than a week back "Came in Oct 6, 6:25 am".
// Pure: the caller passes the time now, so tests and the orb line agree.

export const LEAD_TZ = "America/Denver";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: LEAD_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: LEAD_TZ, hour: "numeric", minute: "2-digit", hour12: true });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: LEAD_TZ, weekday: "short" });
const monthDayFmt = new Intl.DateTimeFormat("en-US", { timeZone: LEAD_TZ, month: "short", day: "numeric" });

/** The Denver calendar day (YYYY-MM-DD) of a moment. */
export const denverDay = (ms: number) => dayFmt.format(new Date(ms));

/** "6:25 am" on Denver time. */
export const clockTime = (ms: number) => timeFmt.format(new Date(ms)).replace(/\s*AM$/i, " am").replace(/\s*PM$/i, " pm");

const daysApart = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** How long ago, for a moment earlier today: "just now", "20 minutes ago", "13 hours ago". */
export function agoWords(ms: number, now: number): string {
  const mins = Math.floor(Math.max(0, now - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${plural(mins, "minute")} ago`;
  return `${plural(Math.floor(mins / 60), "hour")} ago`;
}

/** The lead's clock line; null when the time is missing or not a time. */
export function cameInWords(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const t = clockTime(ms);
  const gap = daysApart(denverDay(ms), denverDay(now));
  if (gap <= 0) return `Came in ${t} · ${agoWords(ms, now)}`;
  if (gap === 1) return `Came in yesterday ${t}`;
  if (gap < 7) return `Came in ${weekdayFmt.format(new Date(ms))} ${t}`;
  return `Came in ${monthDayFmt.format(new Date(ms))}, ${t}`;
}
