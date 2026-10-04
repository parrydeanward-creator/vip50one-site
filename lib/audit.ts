import { MONTH_BOXES, QUARTER_BOXES } from "./contact.ts";
import type { VipPerson, VipRoster } from "./vips.ts";

// VIP-SUMMARY §3f (v1.10): Touch Audit drawn natively in ONE Brain, the ring
// of touches. Same people and boxes as Classic's audit (VIP-50, this month,
// from /api/brain/vips); the Brain only counts and draws.

export interface TouchStat {
  key: string;
  label: string;
  kind: "month" | "quarter";
  done: number;
  total: number;
  missing: VipPerson[];
}

export interface Audit {
  people: number;
  touches: TouchStat[];
  coverage: number; // monthly touches done / possible, 0..1
  fully: number;
  untouched: number;
}

/** Which boxes an agent may log by hand from the Brain (newsletter and mixer tick on a real send). */
export const LOGGABLE: Record<string, string> = {
  call: "call",
  video_text: "video_text",
  social: "social",
  face_to_face: "face_to_face",
  handwritten_note: "handwritten_note",
  drop_by: "drop_by",
};

export function audit(r: VipRoster): Audit {
  const people = r.vip50;
  const stat = (key: string, label: string, kind: "month" | "quarter"): TouchStat => {
    const has = (p: VipPerson) => !!(kind === "month" ? p.month : p.quarter)?.[key];
    const missing = people.filter((p) => !has(p));
    return { key, label, kind, done: people.length - missing.length, total: people.length, missing };
  };
  const month = MONTH_BOXES.map(([k, l]) => stat(k, l, "month"));
  const quarter = QUARTER_BOXES.map(([k, l]) => stat(k, l, "quarter"));
  const possible = people.length * month.length;
  const done = month.reduce((n, t) => n + t.done, 0);
  const count = (p: VipPerson) => MONTH_BOXES.filter(([k]) => p.month?.[k]).length;
  return {
    people: people.length,
    touches: [...month, ...quarter],
    coverage: possible ? done / possible : 0,
    fully: people.filter((p) => count(p) === MONTH_BOXES.length).length,
    untouched: people.filter((p) => count(p) === 0).length,
  };
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** "Log a social touch with Sarah?" */
export function logQuestion(touchLabel: string, firstName: string): string {
  const what = touchLabel.toLowerCase();
  const a = /^[aeiou]/.test(what) ? "an" : "a";
  return `Log ${a} ${what} with ${firstName}?`;
}

/** Short column heads for the grid view. */
export const SHORT: Record<string, string> = {
  call: "Call",
  video_text: "Video",
  social: "Social",
  newsletter: "News",
  mixer: "Mixer",
  face_to_face: "Face",
  handwritten_note: "Note",
  drop_by: "Drop-by",
};

export interface GridRow {
  person: VipPerson;
  monthDone: number;
  quarterDone: number;
  cells: { key: string; kind: "month" | "quarter"; done: boolean }[];
}

/** The grid view: one row per VIP-50, least touched first, then by name. */
export function gridRows(r: VipRoster): GridRow[] {
  const rows = r.vip50.map((p) => {
    const cells = [
      ...MONTH_BOXES.map(([k]) => ({ key: k, kind: "month" as const, done: !!p.month?.[k] })),
      ...QUARTER_BOXES.map(([k]) => ({ key: k, kind: "quarter" as const, done: !!p.quarter?.[k] })),
    ];
    return {
      person: p,
      monthDone: cells.filter((c) => c.kind === "month" && c.done).length,
      quarterDone: cells.filter((c) => c.kind === "quarter" && c.done).length,
      cells,
    };
  });
  return rows.sort((a, b) => a.monthDone - b.monthDone || a.quarterDone - b.quarterDone || a.person.name.localeCompare(b.person.name));
}

/** Whether this person has this touch (this month, or this quarter). */
export function hasTouch(p: VipPerson, t: { key: string; kind: "month" | "quarter" }): boolean {
  return !!(t.kind === "month" ? p.month : p.quarter)?.[t.key];
}
