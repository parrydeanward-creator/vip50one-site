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
