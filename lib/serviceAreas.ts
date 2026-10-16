import { MOVE_URL } from "./host.ts";

// PROFILE.md §2 v1.9 `service_areas` "Where I work" (16 Oct; Websites asked). Up to 12 Utah incorporated city or town
// names, picked from ONE MOVE's list (never free text) and kept as the list spells them. The cities the agent serves,
// not where they live. ONE MOVE's routes read and write `user_profiles.service_areas`; the Brain shows the same card as
// Classic's My Profile (rule 8). Nothing is saved before the agent taps Save.

export const areasUrl = `${MOVE_URL}/api/brain/profile/areas`;
export const AREAS_MAX = 12;
export const SUGGEST_MAX = 8;

export interface AreasState {
  areas: string[];
  list: string[];
  max: number;
}

const names = (v: unknown, cap: number): string[] => {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== "string") continue;
    const t = x.trim().slice(0, 80);
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
};

/** GET /api/brain/profile/areas, checked; null when it is not one. `max` is never above 12; the list is sorted A-Z. */
export function readAreas(j: unknown): AreasState | null {
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.list)) return null;
  const n = typeof r.max === "number" && Number.isFinite(r.max) ? Math.floor(r.max) : AREAS_MAX;
  const max = Math.min(AREAS_MAX, Math.max(1, n));
  const list = names(r.list, 2000).sort((a, b) => a.localeCompare(b, "en-US"));
  return { areas: names(r.areas, max), list, max };
}

/**
 * The type-ahead: names from the list only, case-insensitive. Names starting with what was typed come first, then
 * names containing it, each A-Z as the list is; names already picked are left out; at most 8.
 */
export function suggest(list: string[], typed: string, picked: string[], limit = SUGGEST_MAX): string[] {
  const q = typed.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return [];
  const have = new Set(picked.map((p) => p.toLowerCase()));
  const starts: string[] = [];
  const has: string[] = [];
  for (const name of list) {
    const k = name.toLowerCase();
    if (have.has(k)) continue;
    if (k.startsWith(q)) starts.push(name);
    else if (k.includes(q)) has.push(name);
  }
  return [...starts, ...has].slice(0, limit);
}

/** The list's own spelling of a typed name (any case, extra spaces), or null when it is not on the list. */
export function onList(list: string[], typed: string): string | null {
  const q = typed.trim().toLowerCase().replace(/\s+/g, " ");
  return (q && list.find((n) => n.toLowerCase() === q)) || null;
}

/** Add one name: unchanged when it is already picked (any case) or the cap is reached. */
export function addArea(picked: string[], name: string, max = AREAS_MAX): string[] {
  const t = name.trim();
  if (!t || picked.length >= max || picked.some((p) => p.toLowerCase() === t.toLowerCase())) return picked;
  return [...picked, t];
}

export const removeArea = (picked: string[], name: string): string[] => picked.filter((p) => p !== name);

export const areasChanged = (a: string[], b: string[]) => a.length !== b.length || a.some((x, i) => x !== b[i]);

export const countLine = (n: number, max = AREAS_MAX) => `${n} of ${max}`;

/** The Save body: trimmed, no repeats, at most 12, in the order picked. */
export function areasBody(picked: string[], max = AREAS_MAX): { areas: string[] } {
  return { areas: names(picked, Math.min(max, AREAS_MAX)) };
}

/** ONE MOVE's refusal in words: its own error, with the names it did not know named. */
export function areasError(j: unknown): string {
  const r = j && typeof j === "object" ? (j as Record<string, unknown>) : {};
  const base = typeof r.error === "string" && r.error.trim() ? r.error.trim() : "That didn't save. Nothing was changed.";
  const unknown = names(r.unknown, 12);
  return unknown.length && !unknown.every((u) => base.includes(u)) ? `${base} (${unknown.join(", ")})` : base;
}

/** The saved list from ONE MOVE's answer, or what was sent when it did not echo one. */
export function savedAreas(j: unknown, sent: string[]): string[] {
  const r = j && typeof j === "object" ? (j as Record<string, unknown>) : {};
  return Array.isArray(r.areas) ? names(r.areas, AREAS_MAX) : sent;
}

/** The example agent (?demo=1): a short list, nothing called, nothing saved. */
export const DEMO_LIST = [
  "Alpine", "American Fork", "Bluffdale", "Bountiful", "Cottonwood Heights", "Draper", "Heber City", "Herriman",
  "Holladay", "Lehi", "Midvale", "Millcreek", "Murray", "Orem", "Park City", "Provo", "Riverton", "Salt Lake City",
  "Sandy", "South Jordan", "South Salt Lake", "West Jordan",
];
export function demoAreas(): AreasState {
  return { areas: ["Draper", "Sandy", "Lehi"], list: [...DEMO_LIST], max: AREAS_MAX };
}
