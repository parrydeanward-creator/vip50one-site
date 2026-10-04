import { MOVE_URL } from "./host.ts";
import { MONTH_BOXES } from "./contact.ts";

// VIP-SUMMARY §3d (v1.7): VIP Management drawn natively in ONE Brain, the
// VIP rings. The roster, the 50 cap, the swap and "overdue" are ONE MOVE's and
// MASTER's (one place, so Classic and the Brain never differ); the Brain only
// draws them and asks before anything moves.

export type Urgency = "overdue" | "due_soon" | "ok";

export interface VipPerson {
  id: string;
  name: string;
  first_name?: string | null;
  month?: Record<string, boolean> | null;
  month_done?: number | null;
  quarter?: Record<string, boolean> | null;
  last_touch_on?: string | null;
  urgency?: Urgency | string | null;
  promoted_at?: string | null;
  photo?: string | null;
}

export interface VipRoster {
  cap: number;
  month?: string | null;
  counts?: { vip50?: number; vip100?: number; fully_touched?: number } | null;
  vip50: VipPerson[];
  vip100: VipPerson[];
}

export const vipsUrl = `${MOVE_URL}/api/brain/vips`;
export const vipSwapUrl = `${MOVE_URL}/api/brain/vip/swap`;
export const vipTierUrl = `${MOVE_URL}/api/brain/vip/tier`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keep only well-formed people; a bad row never reaches the screen. */
export function readRoster(raw: unknown): VipRoster | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const people = (v: unknown): VipPerson[] =>
    Array.isArray(v)
      ? v.filter((p): p is VipPerson => !!p && typeof p === "object" && UUID.test(String((p as VipPerson).id)) && typeof (p as VipPerson).name === "string")
      : [];
  if (!Array.isArray(r.vip50) || !Array.isArray(r.vip100)) return null;
  const cap = typeof r.cap === "number" && r.cap > 0 ? r.cap : 50;
  return { cap, month: typeof r.month === "string" ? r.month : null, counts: (r.counts as VipRoster["counts"]) ?? null, vip50: people(r.vip50), vip100: people(r.vip100) };
}

/**
 * A face picture the Brain may draw: only ONE MOVE's signed face links
 * (VIP-SUMMARY §3d v1.8). Anything else is ignored and initials show.
 */
export function faceUrl(photo: string | null | undefined): string | null {
  if (!photo) return null;
  try {
    const u = new URL(photo);
    return u.protocol === "https:" && u.origin === MOVE_URL && u.pathname.startsWith("/api/face/") ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * "Lycia Ward" -> "LW"; one name -> its first two letters. Only letters and
 * digits count, so a name that starts with an emoji or a symbol still gives
 * clean initials (seen live, 4 Oct).
 */
export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => Array.from(w).filter((ch) => /[\p{L}\p{N}]/u.test(ch)).join(""))
    .filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  return (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toUpperCase();
}

/** The name under an orb: the first name, cleaned the same way. */
export function shortName(p: { name: string; first_name?: string | null }): string {
  const clean = (w: string) => Array.from(w).filter((ch) => /[\p{L}\p{N}'.-]/u.test(ch)).join("").replace(/^[.'-]+/, "");
  const first = clean(p.first_name?.trim() ?? "");
  if (first) return first;
  const word = p.name.split(/\s+/).map(clean).find(Boolean);
  return word || initialsOf(p.name);
}

/**
 * The ring around a face: one segment per monthly touch ONE MOVE sends, in
 * Parry's order, then any extra (market report joins later as the sixth).
 */
export function touchSegments(month: Record<string, boolean> | null | undefined): { key: string; label: string; done: boolean }[] {
  const m = month ?? {};
  const known = MONTH_BOXES.filter(([k]) => k in m || !Object.keys(m).length);
  const extra = Object.keys(m).filter((k) => !MONTH_BOXES.some(([b]) => b === k));
  return [
    ...known.map(([key, label]) => ({ key, label, done: !!m[key] })),
    ...extra.map((key) => ({ key, label: key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), done: !!m[key] })),
  ];
}

export const fullyTouched = (p: VipPerson) => {
  const s = touchSegments(p.month);
  return s.length > 0 && s.every((x) => x.done);
};

export interface Seat {
  id: string;
  x: number;
  y: number;
  r: number;
}

/**
 * Faces evenly round a circle, the first at the top, clockwise. The face size
 * shrinks as the ring fills so neighbours never overlap (50 on the inner ring).
 */
export function ringSeats(ids: string[], cx: number, cy: number, radius: number, maxFace: number): Seat[] {
  const n = ids.length;
  if (!n) return [];
  const gap = n === 1 ? maxFace : (2 * Math.PI * radius) / n / 2 - 2;
  const r = Math.max(9, Math.min(maxFace, gap));
  return ids.map((id, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { id, x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), r };
  });
}

/** SVG arc path for segment i of n round a face, with a small gap between. */
export function segmentPath(cx: number, cy: number, r: number, i: number, n: number): string {
  const gap = n > 1 ? 0.22 : 0;
  const a0 = -Math.PI / 2 + (2 * Math.PI * i) / n + gap / 2;
  const a1 = -Math.PI / 2 + (2 * Math.PI * (i + 1)) / n - gap / 2;
  const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)}`;
}

/** The nearest face to a point, if the point is on it (drop target for a drag). */
export function seatAt(seats: Seat[], x: number, y: number, slack = 6): Seat | null {
  let best: Seat | null = null;
  let bestD = Infinity;
  for (const s of seats) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= s.r + slack && d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

const firstOf = (p: VipPerson) => (p.first_name?.trim() || p.name.trim().split(/\s+/)[0] || p.name).trim();

/** The one question asked before a swap. Nothing moves without a yes. */
export function swapQuestion(out: VipPerson, into: VipPerson): string {
  return `Move ${firstOf(out)} to your VIP-100 and ${firstOf(into)} to your VIP-50?`;
}

export function tierQuestion(p: VipPerson, tier: "vip50" | "vip100"): string {
  return `Move ${firstOf(p)} to your ${tier === "vip50" ? "VIP-50" : "VIP-100"}?`;
}

export function rosterLine(r: VipRoster): string {
  const n = r.vip50.length;
  const full = r.counts?.fully_touched ?? r.vip50.filter(fullyTouched).length;
  const open = Math.max(0, r.cap - n);
  return `${n} of ${r.cap} in your VIP-50 · ${full} fully touched this month · ${r.vip100.length} in your VIP-100${open ? ` · ${open} open ${open === 1 ? "spot" : "spots"}` : ""}`;
}

export const canPromote = (r: VipRoster) => r.vip50.length < r.cap;

export function lastTouchLine(p: VipPerson, today: string): string {
  if (!p.last_touch_on) return "Never touched";
  const d = Math.round((Date.parse(today + "T12:00:00Z") - Date.parse(p.last_touch_on + "T12:00:00Z")) / 86400000);
  if (!Number.isFinite(d)) return "Never touched";
  if (d <= 0) return "Touched today";
  if (d === 1) return "Touched yesterday";
  return `Last touched ${d} days ago`;
}

/**
 * Several rings for one tier, so every orb keeps a size you can tap (Parry,
 * 4 Oct: double or triple the rings instead of shrinking the orbs). Rows are
 * used from the inside out, only as many as needed; people are shared across
 * the used rows in proportion to their length, each row offset half a step so
 * neighbours sit in the gaps.
 */
export function ringRows(ids: string[], cx: number, cy: number, radii: number[], r: number, gap = 10): Seat[] {
  const cap = radii.map((R) => Math.max(1, Math.floor((2 * Math.PI * R) / (2 * r + gap))));
  let rows = 1;
  while (rows < radii.length && cap.slice(0, rows).reduce((a, b) => a + b, 0) < ids.length) rows++;
  const used = radii.slice(0, rows);
  const total = used.reduce((a, b) => a + b, 0);
  const counts = used.map((R) => Math.floor((ids.length * R) / total));
  for (let i = 0; counts.reduce((a, b) => a + b, 0) < ids.length; i = (i + 1) % rows) counts[rows - 1 - i]++;
  const out: Seat[] = [];
  let k = 0;
  used.forEach((R, row) => {
    const n = counts[row];
    for (let j = 0; j < n; j++) {
      const a = -Math.PI / 2 + (2 * Math.PI * (j + (row % 2 ? 0.5 : 0))) / n;
      out.push({ id: ids[k++], x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r });
    }
  });
  return out;
}
