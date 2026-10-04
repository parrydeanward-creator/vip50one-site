import { MOVE_URL } from "./host.ts";

// VIP-SUMMARY §3e (v1.9): the Daily Tracker drawn natively in ONE Brain. The
// boxes, points and score are ONE MOVE's (Classic's own scoring, shared); the
// Brain draws them and sends a tick.

export interface DailyBox {
  key: string;
  label: string;
  points: number;
  done: boolean;
}
export interface DailySection {
  key: string;
  label: string;
  boxes: DailyBox[];
}
export interface DailyDay {
  date: string;
  score: number;
  max: number;
  week: { score: number; minimum: number } | null;
  sections: DailySection[];
}

export const dailyUrl = `${MOVE_URL}/api/brain/daily`;

const KEY = /^[a-z0-9_]{1,40}$/;

/** Keep only well-formed sections and boxes; a wrong shape is refused. */
export function readDaily(raw: unknown): DailyDay | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.sections) || typeof r.score !== "number" || typeof r.max !== "number") return null;
  const sections: DailySection[] = [];
  for (const sec of r.sections as unknown[]) {
    if (!sec || typeof sec !== "object") continue;
    const s = sec as Record<string, unknown>;
    if (typeof s.key !== "string" || !KEY.test(s.key) || typeof s.label !== "string" || !Array.isArray(s.boxes)) continue;
    const boxes = (s.boxes as unknown[])
      .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
      .filter((b) => typeof b.key === "string" && KEY.test(b.key) && typeof b.label === "string")
      .map((b) => ({ key: b.key as string, label: b.label as string, points: typeof b.points === "number" && b.points >= 0 ? b.points : 1, done: b.done === true }));
    if (boxes.length) sections.push({ key: s.key, label: s.label, boxes });
  }
  if (!sections.length) return null;
  const w = r.week as Record<string, unknown> | null | undefined;
  const week = w && typeof w.score === "number" && typeof w.minimum === "number" ? { score: w.score, minimum: w.minimum } : null;
  return { date: typeof r.date === "string" ? r.date : "", score: r.score, max: Math.max(1, r.max), week, sections };
}

/** The score after ticking or unticking one box, before ONE MOVE answers. */
export function withTick(day: DailyDay, key: string, done: boolean): DailyDay {
  let delta = 0;
  const sections = day.sections.map((s) => ({
    ...s,
    boxes: s.boxes.map((b) => {
      if (b.key !== key || b.done === done) return b;
      delta += done ? b.points : -b.points;
      return { ...b, done };
    }),
  }));
  return { ...day, sections, score: Math.max(0, day.score + delta) };
}

/** How full the core is, 0..1. */
export const fillOf = (d: DailyDay) => Math.max(0, Math.min(1, d.score / d.max));

export interface BoxSeat {
  section: string;
  key: string;
  x: number;
  y: number;
  r: number;
}
export interface SectionArc {
  key: string;
  label: string;
  mid: number; // angle of the section's middle, radians
  lx: number;
  ly: number;
}

/**
 * Each section is an arc of its boxes round the score, sections spaced by a
 * gap, all starting at the top and going clockwise. A 2-point box is a little
 * larger than a 1-point box.
 */
export function dailyLayout(sections: DailySection[], cx: number, cy: number, radius: number): { seats: BoxSeat[]; arcs: SectionArc[] } {
  const total = sections.reduce((n, s) => n + s.boxes.length, 0);
  const gapSlots = 1.4; // the gap between sections, in box widths
  const slots = total + gapSlots * sections.length;
  const step = (2 * Math.PI) / slots;
  const r = Math.max(10, Math.min(30, (radius * step) / 2 - 3));
  const seats: BoxSeat[] = [];
  const arcs: SectionArc[] = [];
  let a = -Math.PI / 2 + (gapSlots / 2) * step;
  for (const s of sections) {
    const start = a;
    for (const b of s.boxes) {
      const ang = a + step / 2;
      seats.push({ section: s.key, key: b.key, x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang), r: b.points >= 2 ? r * 1.15 : r });
      a += step;
    }
    const mid = (start + a) / 2;
    const lr = radius + r + 44;
    arcs.push({ key: s.key, label: s.label, mid, lx: cx + lr * Math.cos(mid), ly: cy + lr * Math.sin(mid) });
    a += gapSlots * step;
  }
  return { seats, arcs };
}

export function scoreLine(d: DailyDay): string {
  const left = Math.max(0, d.max - d.score);
  return left ? `${d.score} of ${d.max} points today. ${left} to go.` : `${d.score} of ${d.max} points today. Every box done.`;
}

export function weekLine(d: DailyDay): string | null {
  if (!d.week) return null;
  const { score, minimum } = d.week;
  return score >= minimum ? `This week: ${score} points, past the ${minimum} minimum.` : `This week: ${score} of the ${minimum}-point minimum.`;
}
