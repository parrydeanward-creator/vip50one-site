import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { mondayOf } from "./habits.ts";

// Energy check in ONE YOU (VIP-SUMMARY §3w; PULSE-ROADMAP: "one tap a morning; how energy lines up with best weeks;
// rest before burnout"). Private to the agent: no coach reads it, nothing is sent, no points. The reading (best weeks,
// rest) is all here so ONE GO can copy it word for word.

const MOVE_URL = "https://move.vip50one.com";
export const ENERGY_NODE = "go-energy";
export const energyUrl = (days = 84) => `${MOVE_URL}/api/brain/energy?days=${days}`;
export const saveEnergyUrl = `${MOVE_URL}/api/brain/energy`;
export const MAX_DAYS = 84;

export type Level = 1 | 2 | 3 | 4 | 5;
export const LEVELS: Level[] = [1, 2, 3, 4, 5];
export const LEVEL_NAME: Record<Level, string> = { 1: "Running on empty", 2: "Low", 3: "Steady", 4: "Good", 5: "Full of energy" };
/** Low to high: coral to green; never the alarm red, a tired morning is not an emergency. */
export const LEVEL_HUE: Record<Level, string> = { 1: "#ff8a6b", 2: "#ffb25e", 3: "#f5c542", 4: "#8fd36b", 5: "#3fbf7f" };
export const isLevel = (v: unknown): v is Level => typeof v === "number" && LEVELS.includes(v as Level);

export interface Check {
  day: string;
  level: Level;
}
export interface Week {
  weekStart: string;
  score: number;
}
export interface Energy {
  today: string;
  checks: Check[];
  weeks: Week[];
}

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** A §3w.2 answer, checked; null when it is not one. Checks newest first, one per day, at most 84. */
export function readEnergy(j: unknown, fallbackToday: string): Energy | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.checks)) return null;
  const seen = new Set<string>();
  const checks: Check[] = [];
  for (const x of r.checks as Record<string, unknown>[]) {
    if (!isDay(x?.day) || !isLevel(x.level) || seen.has(x.day)) continue;
    seen.add(x.day);
    checks.push({ day: x.day, level: x.level });
  }
  checks.sort((a, b) => b.day.localeCompare(a.day));
  const weeks: Week[] = [];
  for (const x of (Array.isArray(r.weeks) ? r.weeks : []) as Record<string, unknown>[]) {
    if (!isDay(x?.week_start) || typeof x.score !== "number" || !Number.isFinite(x.score)) continue;
    weeks.push({ weekStart: x.week_start, score: Math.max(0, Math.round(x.score)) });
  }
  weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return { today: isDay(r.today) ? r.today : fallbackToday, checks: checks.slice(0, MAX_DAYS), weeks: weeks.slice(0, 12) };
}

export const todayCheck = (e: Energy): Check | null => e.checks.find((c) => c.day === e.today) ?? null;

/** The agent tapped a level: today's check replaced (or added), newest first. */
export function applyCheck(e: Energy, level: Level): Energy {
  const rest = e.checks.filter((c) => c.day !== e.today);
  return { ...e, checks: [{ day: e.today, level }, ...rest].slice(0, MAX_DAYS) };
}

/** The POST body (§3w.3). */
export const saveBody = (e: Energy, level: Level) => ({ day: e.today, level });

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const one = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

/** Rest before burnout (§3w.5): 3 of the last 4 checks at 1-2, or the last 7 averaging 2.4 or less. */
export function needsRest(e: Energy): boolean {
  const last4 = e.checks.slice(0, 4);
  if (last4.filter((c) => c.level <= 2).length >= 3) return true;
  const last7 = e.checks.slice(0, 7);
  const a = avg(last7.map((c) => c.level));
  return last7.length >= 5 && a != null && a <= 2.4;
}

/** Each week's average energy beside its score, newest first; weeks with no check are left out. */
export function weekPairs(e: Energy): { weekStart: string; score: number; energy: number }[] {
  const out: { weekStart: string; score: number; energy: number }[] = [];
  for (const w of e.weeks) {
    const a = avg(e.checks.filter((c) => mondayOf(c.day) === mondayOf(w.weekStart)).map((c) => c.level));
    if (a != null) out.push({ weekStart: w.weekStart, score: w.score, energy: a });
  }
  return out;
}

/** "Your 100 weeks averaged 4.1; the others 2.9", once there are 3 of each (§3w.5); else null. */
export function bestWeeksLine(e: Energy, minimum = 100): string | null {
  const pairs = weekPairs(e);
  const top = pairs.filter((p) => p.score >= minimum).map((p) => p.energy);
  const rest = pairs.filter((p) => p.score < minimum).map((p) => p.energy);
  if (top.length < 3 || rest.length < 3) return null;
  return `Your ${minimum} weeks averaged ${one(avg(top)!)}; the others ${one(avg(rest)!)}`;
}

export const KEEP_GOING = "Keep checking in; after a few weeks Pulse shows how your energy lines up with your best weeks.";

/** The last n days, oldest first, with the level or null where there was no check. */
export function strip(e: Energy, n = 14): { day: string; level: Level | null }[] {
  const by = new Map(e.checks.map((c) => [c.day, c.level]));
  const t = Date.parse(`${e.today}T12:00:00Z`);
  return Array.from({ length: n }, (_, k) => {
    const day = new Date(t - (n - 1 - k) * 86_400_000).toISOString().slice(0, 10);
    return { day, level: by.get(day) ?? null };
  });
}

export function energyLine(e: Energy, hour: number): string {
  const t = todayCheck(e);
  if (t) return needsRest(e) ? `${LEVEL_NAME[t.level]} today · Pulse suggests a lighter day` : `${LEVEL_NAME[t.level]} today`;
  return hour >= 5 && hour < 12 ? "How's your energy?" : "No check today";
}

/** The Energy orb under ONE YOU: a yellow pulse from 5 am to noon until today is checked; never red, never after noon. */
export function withEnergyNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, e: Energy | null, hour: number): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== ENERGY_NODE);
  const edges = g.edges.filter((x) => x.target !== ENERGY_NODE);
  if (!go || go.locked || !e) return { ...g, nodes, edges };
  const ask = !todayCheck(e) && hour >= 5 && hour < 12;
  nodes.push({
    id: ENERGY_NODE,
    type: "feature",
    label: "Energy",
    secondaryLabel: energyLine(e, hour),
    parentId: "go",
    product: "go",
    importance: ask ? 0.995 : 0.9,
    status: ask ? "attention" : "healthy",
    summary: "One tap a morning. How your energy lines up with your best weeks, and a nudge to rest before you burn out. Yours only.",
  });
  edges.push({ id: `go>${ENERGY_NODE}`, source: "go", target: ENERGY_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

const addDays = (d: string, k: number) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);

/** Example energy for the demo dashboard: today unchecked, six weeks of mornings, best weeks plain to see. */
export function demoEnergy(today: string): Energy {
  const mon = mondayOf(today);
  const scores = [112, 86, 104, 79, 101, 92, 108, 103];
  const up: Level[] = [4, 5, 4, 4, 3, 4, 5];
  const down: Level[] = [3, 2, 3, 2, 3, 3, 2];
  const checks: { day: string; level: Level }[] = [];
  for (let d = 1; addDays(today, -d) >= mon; d++) checks.push({ day: addDays(today, -d), level: d % 2 ? 4 : 3 });
  scores.slice(0, 6).forEach((score, k) => {
    const start = addDays(mon, -7 * (k + 1));
    (score >= 100 ? up : down).forEach((level, i) => checks.push({ day: addDays(start, i), level }));
  });
  const weeks = scores.map((score, k) => ({ week_start: addDays(mon, -7 * (k + 1)), score }));
  return readEnergy({ today, checks, weeks }, today)!;
}
