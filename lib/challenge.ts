import type { GraphNode } from "./graph/types.ts";
import { MOVE_URL } from "./host.ts";
import { CHALLENGE, CHALLENGE_NODE } from "./oneYou.ts";

// The 90-Day Challenge's live numbers (GO/MOVE, vip50-web-crm#277): GET ONE MOVE /api/brain/challenge with the agent's
// cookie. Not enrolled: {enrolled:false, url}. Enrolled: the day, today's score (5 a box, at most 100), each arena's
// boxes and points, the streak, the identity statement, the enemy list and the group. Read defensively: anything
// missing or the wrong shape falls back to a plain value, never an error on the agent's screen.

export const challengeUrl = `${MOVE_URL}/api/brain/challenge`;

export type ArenaKey = (typeof CHALLENGE.arenas)[number]["key"];
export type Arena = { key: ArenaKey; label: string; done: number; of: number; points: number };
export type ChallengeGroup = { name: string; emoji: string; members: number; names: string[]; scoredToday: number };
export type LiveChallenge =
  | { enrolled: false; url: string }
  | {
      enrolled: true;
      status: string;
      startDate: string | null;
      day: number;
      of: number;
      today: { date: string | null; points: number; arenas: Arena[] };
      streak: number;
      identity: string | null;
      enemy: string[];
      group: ChallengeGroup | null;
      url: string;
    };

const KEYS = CHALLENGE.arenas.map((a) => a.key) as readonly string[];
const num = (v: unknown, lo: number, hi: number, dflt = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt);
const str = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

/** The challenge page: the route's own https link on ONE MOVE, else ONE MOVE's challenge page. */
export function safeUrl(v: unknown): string {
  if (typeof v !== "string") return CHALLENGE.pageUrl;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && u.origin === MOVE_URL ? u.href : CHALLENGE.pageUrl;
  } catch {
    return CHALLENGE.pageUrl;
  }
}

function readArenas(v: unknown): Arena[] {
  const got = new Map<string, Record<string, unknown>>();
  if (Array.isArray(v)) for (const x of v) if (x && typeof x === "object" && KEYS.includes((x as { key?: string }).key ?? "")) got.set((x as { key: string }).key, x as Record<string, unknown>);
  // Every arena shows, in Parry's order, at 0 when the route left one out.
  return CHALLENGE.arenas.map((a) => {
    const r = got.get(a.key) ?? {};
    const of = num(r.of, 1, 10, 4);
    return { key: a.key, label: str(r.label, 40) ?? a.name, done: num(r.done, 0, of), of, points: num(r.points, 0, 20) };
  });
}

function readEnemy(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const r = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
    const s = r ? str(r.label ?? r.name ?? r.text ?? r.enemy, 120) : str(x, 120);
    if (s) out.push(s);
  }
  return out.slice(0, 12);
}

function readGroup(v: unknown): ChallengeGroup | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  const name = str(r.name, 80);
  if (!name) return null;
  const list = Array.isArray(r.members) ? r.members : null;
  const names = (list ?? [])
    .map((m) => (m && typeof m === "object" ? str((m as Record<string, unknown>).first_name ?? (m as Record<string, unknown>).name, 60) : str(m, 60)))
    .filter((s): s is string => !!s)
    .map((s) => s.split(/\s+/)[0]); // first names only, as the leaderboard
  const members = list ? list.length : num(r.members, 0, 10_000);
  return { name, emoji: str(r.emoji, 8) ?? "", members, names: names.slice(0, 12), scoredToday: num(r.scored_today, 0, Math.max(members, 0) || 10_000) };
}

/** ONE MOVE's answer, checked; null when it is not one (the panel then keeps "Coming from ONE MOVE"). */
export function readChallenge(raw: unknown): LiveChallenge | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const url = safeUrl(r.url);
  if (r.enrolled === false) return { enrolled: false, url };
  if (r.enrolled !== true) return null;
  const of = num(r.of, 1, 365, 90);
  const t = r.today && typeof r.today === "object" ? (r.today as Record<string, unknown>) : {};
  return {
    enrolled: true,
    status: str(r.status, 30) ?? "active",
    startDate: date(r.start_date),
    day: num(r.day, 0, of),
    of,
    today: { date: date(t.date), points: num(t.points, 0, 100), arenas: readArenas(t.arenas) },
    streak: num(r.streak, 0, 10_000),
    identity: str(r.identity_statement, 500),
    enemy: readEnemy(r.enemy),
    group: readGroup(r.group),
    url,
  };
}

/** The orb's side line: "Day 23 of 90 · 65 today"; null when not enrolled or not started. */
export function challengeLine(c: LiveChallenge | null): string | null {
  if (!c || !c.enrolled || c.day < 1) return null;
  return `Day ${c.day} of ${c.of} · ${c.today.points} today`;
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** The live numbers on the go-challenge orb; the graph unchanged when there are none (demo, or no answer yet). */
export function withChallengeNode<G extends { nodes: GraphNode[] }>(g: G, c: LiveChallenge | null): G {
  if (!c) return g;
  const line = challengeLine(c);
  let hit = false;
  const nodes = g.nodes.map((n) => {
    if (n.id !== CHALLENGE_NODE) return n;
    hit = true;
    if (!c.enrolled) return { ...n, secondaryLabel: "Five arenas, 100 a day", status: undefined, stats: undefined };
    if (!line) return n;
    return {
      ...n,
      secondaryLabel: line,
      status: "healthy" as const,
      stats: [
        { label: "Day", value: `${c.day} / ${c.of}` },
        { label: "Today", value: `${c.today.points} / 100` },
        { label: "Streak", value: days(c.streak) },
      ],
    };
  });
  return hit ? { ...g, nodes } : g;
}

/** "3 of 5 scored today" for the group line. */
export function groupLine(gr: ChallengeGroup): string {
  const who = gr.members ? `${gr.members} ${gr.members === 1 ? "member" : "members"}` : "No members yet";
  return `${gr.emoji ? `${gr.emoji} ` : ""}${gr.name}: ${who}, ${gr.scoredToday} scored today`;
}
