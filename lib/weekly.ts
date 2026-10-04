import { MOVE_URL } from "./host.ts";
import type { DailySection } from "./daily.ts";

// VIP-SUMMARY §3g (v1.11): the Weekly Tracker drawn natively in ONE Brain. The
// boxes, points and the weekly score are ONE MOVE's (lib/weekly-tracker.ts, the
// one copy Classic, ONE GO and vip_summary use); the Brain draws and ticks.

export interface WeeklyBox {
  key: string;
  label: string;
  points: number;
  done: boolean;
  auto: boolean; // ticks itself the week the agent sends one (Parry, 1 Oct)
}
export interface WeeklySection {
  key: string;
  label: string;
  boxes: WeeklyBox[];
}
export interface WeeklyWeek {
  weekStart: string;
  score: number;
  minimum: number;
  met: boolean;
  dailyPoints: number;
  bonusPoints: number;
  days: { date: string; points: number }[];
  sections: WeeklySection[];
}

export const weeklyUrl = `${MOVE_URL}/api/brain/weekly`;

const KEY = /^[a-z0-9_]{1,40}$/;
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Keep only well-formed parts; a wrong shape is refused. */
export function readWeekly(raw: unknown): WeeklyWeek | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.sections) || typeof r.score !== "number") return null;
  const sections: WeeklySection[] = [];
  for (const sec of r.sections as unknown[]) {
    if (!sec || typeof sec !== "object") continue;
    const s = sec as Record<string, unknown>;
    if (typeof s.key !== "string" || !KEY.test(s.key) || typeof s.label !== "string" || !Array.isArray(s.boxes)) continue;
    const boxes = (s.boxes as unknown[])
      .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
      .filter((b) => typeof b.key === "string" && KEY.test(b.key) && typeof b.label === "string")
      .map((b) => ({ key: b.key as string, label: b.label as string, points: Math.max(0, num(b.points, 5)), done: b.done === true, auto: b.auto === true }));
    if (boxes.length) sections.push({ key: s.key, label: s.label, boxes });
  }
  if (!sections.length) return null;
  const days = Array.isArray(r.days)
    ? (r.days as unknown[])
        .filter((d): d is Record<string, unknown> => !!d && typeof d === "object" && typeof (d as { date?: unknown }).date === "string")
        .map((d) => ({ date: d.date as string, points: Math.max(0, num(d.points)) }))
        .slice(0, 7)
    : [];
  const minimum = Math.max(1, num(r.minimum, 100));
  return {
    weekStart: typeof r.week_start === "string" ? r.week_start : "",
    score: r.score,
    minimum,
    met: r.met === true || r.score >= minimum,
    dailyPoints: num(r.daily_points),
    bonusPoints: num(r.bonus_points),
    days,
    sections,
  };
}

/** Custom activities are edited on the Classic page only (§3g.2). */
export const tickable = (sectionKey: string) => sectionKey !== "custom";

/** The week after ticking or unticking one box, before ONE MOVE answers. */
export function withWeeklyTick(w: WeeklyWeek, key: string, done: boolean): WeeklyWeek {
  let delta = 0;
  const sections = w.sections.map((s) => ({
    ...s,
    boxes: s.boxes.map((b) => {
      if (b.key !== key || b.done === done || !tickable(s.key)) return b;
      delta += done ? b.points : -b.points;
      return { ...b, done };
    }),
  }));
  const score = Math.max(0, w.score + delta);
  return { ...w, sections, score, bonusPoints: Math.max(0, w.bonusPoints + delta), met: score >= w.minimum };
}

/** How full the core is, 0..1, against the weekly minimum. */
export const weeklyFill = (w: WeeklyWeek) => Math.max(0, Math.min(1, w.score / w.minimum));

/** The same arc layout as the Daily Tracker wants daily sections. */
export const asSections = (w: WeeklyWeek): DailySection[] =>
  w.sections.map((s) => ({ key: s.key, label: s.key === "bonus" ? "Activities" : s.label, boxes: s.boxes.map((b) => ({ key: b.key, label: b.label, points: b.points, done: b.done })) }));

export function weeklyLine(w: WeeklyWeek): string {
  const left = w.minimum - w.score;
  return left > 0 ? `${w.score} of the ${w.minimum}-point minimum this week. ${left} to go.` : `${w.score} points this week, past the ${w.minimum} minimum.`;
}

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Mon" for "2026-09-28" (read as a calendar date, not a moment). */
export function dayName(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return "";
  return DAY[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
}
