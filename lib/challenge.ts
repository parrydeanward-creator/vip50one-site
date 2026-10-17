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
      /** Set once the 90 days are over (status completed, or past the last day): the last day, and its words. */
      finished: { date: string | null; label: string | null; short: string | null } | null;
      /** The results, when ONE MOVE sends them (`results: {days_scored, average}`); null until then. */
      results: { daysScored: number; average: number } | null;
      /** The sealed letter, when ONE MOVE sends it once the 90 days are over (`letter`); null until then. */
      letter: string | null;
      /** ONE MOVE's true day count, never held at 90 (`days_since_start`, vip50-web-crm#287); null on an older answer. */
      daysSinceStart: number | null;
      /** Day 90 or later and not completed yet (`letter_waiting`): the letter opens and "Complete my 90 days" shows. */
      letterWaiting: boolean;
      /** When the agent completed their 90 days (`completed_at`), YYYY-MM-DD; null until then. */
      completedAt: string | null;
      /** Their certificate on ONE MOVE (`certificate_url`, once completed); null otherwise. */
      certificateUrl: string | null;
      url: string;
    };

const KEYS = CHALLENGE.arenas.map((a) => a.key) as readonly string[];
const num = (v: unknown, lo: number, hi: number, dflt = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt);
const str = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

const DAY_MS = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
/** Today in Mountain time, YYYY-MM-DD. */
export const mountainToday = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o }).format(new Date(`${d}T12:00:00Z`));

/** The challenge's last day (start + of - 1). */
export const lastDay = (start: string, of: number) => addDays(start, of - 1);

function readResults(v: unknown): { daysScored: number; average: number } | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.days_scored !== "number" || !Number.isFinite(r.days_scored)) return null;
  const average = typeof r.average === "number" && Number.isFinite(r.average) ? Math.min(100, Math.max(0, Math.round(r.average))) : 0;
  return { daysScored: Math.min(365, Math.max(0, Math.round(r.days_scored))), average };
}

/** POST here to complete the 90 days (live on ONE MOVE; no body). */
export const challengeCompleteUrl = `${MOVE_URL}/api/brain/challenge/complete`;

/** A link on ONE MOVE only (https, move.vip50one.com), else null. */
export function moveLink(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && u.origin === MOVE_URL ? u.href : null;
  } catch {
    return null;
  }
}

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
export function readChallenge(raw: unknown, today: string = mountainToday()): LiveChallenge | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const url = safeUrl(r.url);
  if (r.enrolled === false) return { enrolled: false, url };
  if (r.enrolled !== true) return null;
  const of = num(r.of, 1, 365, 90);
  const t = r.today && typeof r.today === "object" ? (r.today as Record<string, unknown>) : {};
  const status = str(r.status, 30) ?? "active";
  const startDate = date(r.start_date);
  const day = num(r.day, 0, of);
  // ONE MOVE holds `day` at 90 after the end (vip50-web-crm lib/challenge.ts dayNumber); `days_since_start` is the true
  // count (vip50-web-crm#287), so past the last day it is finished, never a frozen "Day 90 of 90". An older answer
  // without it is read from the start date.
  const end = startDate ? lastDay(startDate, of) : null;
  const daysSinceStart = typeof r.days_since_start === "number" && Number.isFinite(r.days_since_start) ? Math.max(0, Math.round(r.days_since_start)) : null;
  const completedAt = date(r.completed_at);
  const past = daysSinceStart != null ? daysSinceStart > of : day >= of && !!end && today > end;
  const done = /^(completed?|finished)$/i.test(status) || !!completedAt || past;
  return {
    enrolled: true,
    status,
    startDate,
    day,
    of,
    today: { date: date(t.date), points: num(t.points, 0, 100), arenas: readArenas(t.arenas) },
    streak: num(r.streak, 0, 10_000),
    identity: str(r.identity_statement, 500),
    enemy: readEnemy(r.enemy),
    group: readGroup(r.group),
    finished: done ? { date: end, label: end ? fmt(end, { weekday: "short", day: "numeric", month: "short" }) : null, short: end ? fmt(end, { day: "numeric", month: "short" }) : null } : null,
    results: readResults(r.results),
    letter: str(r.letter ?? r.letter_to_self, 5000),
    daysSinceStart,
    letterWaiting: r.letter_waiting === true && !completedAt && !/^completed?$/i.test(status),
    completedAt,
    certificateUrl: moveLink(r.certificate_url),
    url,
  };
}

/** The orb's side line: "Day 23 of 90 · 65 today", or "Finished 7 Oct · start again" once it is over; null when not
 *  enrolled or not started. */
export function challengeLine(c: LiveChallenge | null): string | null {
  if (!c || !c.enrolled) return null;
  if (c.finished) return `Finished${c.finished.short ? ` ${c.finished.short}` : ""} · ${c.letterWaiting ? "your letter is open" : "start again"}`;
  if (c.day < 1) return null;
  return `Day ${c.day} of ${c.of} · ${c.today.points} today`;
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** "23 days scored · 47 a day on average" (Parry's average is on the days that had points). */
export function resultsLine(r: { daysScored: number; average: number } | null): string | null {
  if (!r) return null;
  return r.daysScored ? `${days(r.daysScored)} scored · ${r.average} a day on average` : "No days scored yet";
}

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
    if (c.finished)
      return {
        ...n,
        secondaryLabel: line,
        status: "healthy" as const,
        stats: [
          { label: "Finished", value: c.finished.short ?? "Yes" },
          ...(c.results ? [{ label: "Days scored", value: `${c.results.daysScored} / ${c.of}` }, { label: "Average", value: `${c.results.average} / 100` }] : []),
        ],
      };
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

/** ONE MOVE's answer to "Complete my 90 days" (POST /api/brain/challenge/complete, vip50-web-crm): done, with the date
 *  and the certificate when it sends them; 409, the 90 days are not up yet; 404, not enrolled; 405, not there yet
 *  (complete it on the challenge page); or it did not take it (the error words when it sends them). */
export type CompleteResult =
  | { kind: "done"; completedAt: string | null; certificateUrl: string | null }
  | { kind: "not_yet"; words: string }
  | { kind: "not_enrolled"; words: string }
  | { kind: "elsewhere" }
  | { kind: "error"; words: string };
export const NOT_YET = "Your 90 days are not up yet.";
export function readComplete(status: number, body: unknown): CompleteResult {
  const b = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  if (status >= 200 && status < 300 && b.ok !== false) return { kind: "done", completedAt: date(b.completed_at), certificateUrl: moveLink(b.certificate_url) };
  if (status === 409) return { kind: "not_yet", words: NOT_YET };
  if (status === 404) return { kind: "not_enrolled", words: "You are not in the 90-Day Challenge yet. Start it on the challenge page in ONE MOVE." };
  if (status === 405) return { kind: "elsewhere" };
  return { kind: "error", words: str(b.error, 200) ?? "ONE MOVE did not take that. Nothing was changed; try again." };
}

/** "Completed on Fri 17 Oct" from YYYY-MM-DD. */
export const completedLine = (d: string) => `Completed on ${fmt(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;
