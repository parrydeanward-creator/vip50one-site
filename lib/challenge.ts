import type { GraphNode } from "./graph/types.ts";
import { MOVE_URL } from "./host.ts";
import { CHALLENGE, CHALLENGE_NODE } from "./oneYou.ts";

// The 90-Day Challenge's live numbers (GO/MOVE, vip50-web-crm#277): GET ONE MOVE /api/brain/challenge with the agent's
// cookie. Not enrolled: {enrolled:false, url}. Enrolled: the day, today's score (5 a box, at most 100), each arena's
// boxes and points, the streak, the identity statement, the enemy list and the group. Read defensively: anything
// missing or the wrong shape falls back to a plain value, never an error on the agent's screen.

export const challengeUrl = `${MOVE_URL}/api/brain/challenge`;

export type ArenaKey = (typeof CHALLENGE.arenas)[number]["key"];
/** One box in an arena (VIP-SUMMARY §3ap `today.arenas[].boxes[]`): ONE MOVE's column key, its words, ticked or not. */
export type Box = { key: string; label: string; done: boolean; sub: string | null };
export type Arena = { key: ArenaKey; label: string; done: number; of: number; points: number; /** §3ap; null until ONE MOVE sends them. */ boxes: Box[] | null };
/** One day's score (§3ap `days[]`), 0 when nothing was logged. */
export type DayScore = { date: string; score: number };
/** §3ap `stats`, over logged days. */
export type ChallengeStats = { average: number; perfectDays: number; best: number | null };
/** One row of the week's leaderboard (§3ap `leaderboard[]`): scores only, never a box. */
export type Leader = { userId: string | null; name: string; initials: string; photo: string | null; day: number | null; weekAvg: number; me: boolean; rank: number };
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
      /** §3ap: one score a day from the start to today; null until ONE MOVE sends it (the ring then splits gone / to come). */
      days: DayScore[] | null;
      /** §3ap: average, perfect days and best; null until sent (the tiles then work from `days` or `results`). */
      stats: ChallengeStats | null;
      /** §3ap: this week's group or team board, top 5 plus the agent; null until sent (the group line shows instead). */
      leaderboard: Leader[] | null;
      /** §3ap "Every run kept": the 1-based number of the current run; null on an older route. */
      run: number | null;
      /** §3ap: every run, oldest first; null when the route does not send `runs` (the old route: Start another 90 opens Classic). */
      runs: Run[] | null;
      /** `can_start_another`: false while a run is still active; null on an older route (then the button shows as before). */
      canStartAnother: boolean | null;
      url: string;
    };

/** One run of the challenge (§3ap `runs[]`). */
export type Run = { run: number; startDate: string | null; completedAt: string | null; status: string; certificateUrl: string | null };

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
    return { key: a.key, label: str(r.label, 40) ?? a.name, done: num(r.done, 0, of), of, points: num(r.points, 0, 20), boxes: readBoxes(r.boxes) };
  });
}

function readBoxes(v: unknown): Box[] | null {
  if (!Array.isArray(v)) return null;
  const out: Box[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const b = x as Record<string, unknown>;
    const key = typeof b.key === "string" && /^[a-z0-9_]{1,64}$/.test(b.key) ? b.key : null;
    const label = str(b.label, 80);
    if (key && label) out.push({ key, label, done: b.done === true, sub: str(b.sub ?? b.hint, 80) });
  }
  return out.length ? out.slice(0, 10) : null;
}

function readDays(v: unknown): DayScore[] | null {
  if (!Array.isArray(v)) return null;
  const out: DayScore[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const d = date((x as Record<string, unknown>).date);
    if (d) out.push({ date: d, score: num((x as Record<string, unknown>).score, 0, 100) });
  }
  return out.length ? out.slice(0, 400) : null;
}

function readStats(v: unknown): ChallengeStats | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.average !== "number" || !Number.isFinite(r.average)) return null;
  const best = typeof r.best === "number" && Number.isFinite(r.best) ? num(r.best, 0, 100) : null;
  return { average: num(r.average, 0, 100), perfectDays: num(r.perfect_days, 0, 365), best };
}

const httpsOnly = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
};

function readLeaderboard(v: unknown): Leader[] | null {
  if (!Array.isArray(v)) return null;
  const rows: (Omit<Leader, "rank"> & { given: number | null })[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const r = x as Record<string, unknown>;
    const me = r.me === true;
    const first = str(r.first_name, 40)?.split(/\s+/)[0] ?? null;
    if (!first && !me) continue;
    const li = str(r.last_initial, 4)?.charAt(0).toUpperCase() ?? "";
    rows.push({
      userId: str(r.user_id, 64),
      name: me ? "You" : `${first}${li ? ` ${li}.` : ""}`,
      initials: me ? "YOU" : `${first!.charAt(0).toUpperCase()}${li}`,
      photo: httpsOnly(r.photo_url),
      day: typeof r.day === "number" && Number.isFinite(r.day) ? num(r.day, 0, 365) : null,
      weekAvg: num(r.week_avg, 0, 100),
      me,
      given: typeof r.rank === "number" && Number.isFinite(r.rank) && r.rank >= 1 ? Math.round(r.rank) : null,
    });
  }
  if (!rows.length) return null;
  // ONE MOVE's own rank when it sends one (the agent may sit below the top 5); otherwise best week first.
  const sorted = rows.every((r) => r.given != null) ? [...rows].sort((a, b) => a.given! - b.given!) : [...rows].sort((a, b) => b.weekAvg - a.weekAvg);
  return sorted.slice(0, 8).map(({ given, ...r }, i) => ({ ...r, rank: given ?? i + 1 }));
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
    days: readDays(r.days),
    stats: readStats(r.stats),
    leaderboard: readLeaderboard(r.leaderboard),
    run: typeof r.run === "number" && Number.isFinite(r.run) && r.run >= 1 ? num(r.run, 1, 1000) : null,
    runs: readRuns(r.runs),
    canStartAnother: typeof r.can_start_another === "boolean" ? r.can_start_another : null,
    url,
  };
}

function readRuns(v: unknown): Run[] | null {
  if (!Array.isArray(v)) return null;
  const out: Run[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const r = x as Record<string, unknown>;
    if (typeof r.run !== "number" || !Number.isFinite(r.run) || r.run < 1) continue;
    const completedAt = date(r.completed_at);
    out.push({ run: num(r.run, 1, 1000), startDate: date(r.start_date), completedAt, status: str(r.status, 30) ?? (completedAt ? "completed" : "active"), certificateUrl: moveLink(r.certificate_url) });
  }
  return out.sort((a, b) => a.run - b.run).slice(0, 100);
}

/** POST here to start the next run today (§3ap "Every run kept"); it answers with the whole GET body. */
export const challengeStartUrl = `${MOVE_URL}/api/brain/challenge/start`;

/** The start's body: `{identity_statement}` when the agent wrote one, else `{}`. */
export const startBody = (identity: string): string => {
  const t = identity.trim().slice(0, 500);
  return JSON.stringify(t ? { identity_statement: t } : {});
};

export const STILL_RUNNING = "Your current 90 days are still running.";
/** ONE MOVE's answer to the start: the new state; 409, the current run is still active; or it did not take it. */
export type StartResult = { kind: "started"; challenge: LiveChallenge } | { kind: "running"; words: string } | { kind: "error"; words: string };
export function readStart(status: number, body: unknown): StartResult {
  if (status === 409) return { kind: "running", words: STILL_RUNNING };
  const b = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const fresh = status >= 200 && status < 300 ? readChallenge(body) : null;
  if (fresh?.enrolled) return { kind: "started", challenge: fresh };
  return { kind: "error", words: str(b.error, 200) ?? "ONE MOVE did not take that. Nothing was changed; try again." };
}

const dayWords = (d: string, year: boolean) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) }).format(new Date(`${d}T12:00:00Z`));
/** "Jul 10 – Oct 22, 2026" (both years when they differ); a run still going: "Started Oct 12, 2026". */
export function runRange(r: Run): string {
  if (!r.startDate) return r.completedAt ? `Finished ${dayWords(r.completedAt, true)}` : "Dates coming";
  if (!r.completedAt) return `Started ${dayWords(r.startDate, true)}`;
  const same = r.startDate.slice(0, 4) === r.completedAt.slice(0, 4);
  return `${dayWords(r.startDate, !same)} – ${dayWords(r.completedAt, true)}`;
}
export const runStatus = (r: Run): string => (/^completed?$/i.test(r.status) || r.completedAt ? "Completed" : /^active$/i.test(r.status) ? "In progress" : r.status.charAt(0).toUpperCase() + r.status.slice(1));
/** "Run 1 · Jul 10 – Oct 22, 2026 · Completed". */
export const runLine = (r: Run): string => `Run ${r.run} · ${runRange(r)} · ${runStatus(r)}`;
/** Runs, newest first, when the row shows: more than one run or any completed run; else null. */
export function runsShown(c: LiveChallenge | null): Run[] | null {
  if (!c || !c.enrolled || !c.runs) return null;
  return c.runs.length > 1 || c.runs.some((r) => runStatus(r) === "Completed") ? [...c.runs].sort((a, b) => b.run - a.run) : null;
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

// ---- the challenge page (Parry, 22 Oct: "yes on both"; vip50-ecosystem research/mockups/challenge, VIP-SUMMARY §3ap) ----
// Every §3ap field is optional: the ring, the tiles, the boxes and the leaderboard each fall back to what the route
// already sends, so the Brain and ONE MOVE can ship in either order.

type Enrolled = Extract<LiveChallenge, { enrolled: true }>;

/** A segment's colour: gold 100, green 70+, blue under 70, grey missed, faint to come; `elapsed` when no `days` came. */
export type Tone = "perfect" | "good" | "low" | "missed" | "future" | "elapsed";
export type Seg = { day: number; date: string | null; score: number | null; tone: Tone; today: boolean };
export type Ring = { mode: "days" | "split"; segs: Seg[]; day: number; of: number; toGo: number };

export const TONE_HUE: Record<Tone, string> = {
  perfect: "#f5c542",
  good: "#2fbf71",
  low: "#5fb3f0",
  missed: "#3a3f55",
  future: "rgba(255,255,255,0.07)",
  elapsed: "rgba(245,197,66,0.42)",
};

/** A finished day's colour from its score (0 is a missed day). */
export const toneOf = (score: number): Tone => (score >= 100 ? "perfect" : score >= 70 ? "good" : score > 0 ? "low" : "missed");

/** The 90-segment ring: from `days` when ONE MOVE sends them, else days gone and days to come (`results` holds only a
 *  count and an average, never a day). Today is outlined and coloured by its points so far, faint while it has none. */
export function ringOf(c: Enrolled): Ring {
  const of = c.of;
  const done = !!c.finished;
  const day = done ? of : Math.max(0, Math.min(of, c.day));
  const byDate = new Map((c.days ?? []).map((d) => [d.date, d.score]));
  const segs: Seg[] = [];
  for (let i = 0; i < of; i++) {
    const n = i + 1;
    const d = c.startDate ? addDays(c.startDate, i) : null;
    const isToday = !done && n === day;
    const fromDays = c.days ? (d ? byDate.get(d) : c.days[i]?.score) : undefined;
    let score: number | null = null;
    let tone: Tone = "future";
    if (n < day || (done && n <= day)) {
      if (c.days) {
        score = fromDays ?? 0;
        tone = toneOf(score);
      } else tone = "elapsed";
    } else if (isToday) {
      score = fromDays ?? c.today.points;
      tone = score > 0 ? toneOf(score) : "future";
    }
    segs.push({ day: n, date: d, score, tone, today: isToday });
  }
  return { mode: c.days ? "days" : "split", segs, day, of, toGo: Math.max(0, of - day) };
}

export type Tile = { key: "streak" | "average" | "perfect" | "rank"; value: string; label: string };

/** The four tiles: the streak always; average and perfect days from `stats`, else from `days`, else the average from
 *  `results`; the rank only from `leaderboard`. A tile with nothing behind it is left out. */
export function tilesOf(c: Enrolled): Tile[] {
  const out: Tile[] = [{ key: "streak", value: String(c.streak), label: "day streak" }];
  const ring = ringOf(c);
  const logged = c.days ? ring.segs.filter((s) => s.score != null && s.score > 0).map((s) => s.score!) : null;
  const average = c.stats ? c.stats.average : logged && logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : c.results?.daysScored ? c.results.average : null;
  if (average != null) out.push({ key: "average", value: String(average), label: "average" });
  const perfect = c.stats ? c.stats.perfectDays : logged ? logged.filter((s) => s >= 100).length : null;
  if (perfect != null) out.push({ key: "perfect", value: String(perfect), label: perfect === 1 ? "perfect day" : "perfect days" });
  const me = c.leaderboard?.find((r) => r.me);
  if (me) out.push({ key: "rank", value: `#${me.rank}`, label: c.group ? "in your group" : "on your team" });
  return out;
}

/** POST here to tick or untick one of today's boxes (§3ap, GO/MOVE); it answers with the whole GET body. */
export const challengeTickUrl = `${MOVE_URL}/api/brain/challenge/tick`;

/** The tick's body: exactly `{key, done}`. */
export const tickBody = (key: string, done: boolean): string => JSON.stringify({ key, done: done === true });

/** True when the boxes can be ticked here: enrolled, not finished, and ONE MOVE sent at least one arena's boxes. */
export const canTick = (c: LiveChallenge | null): boolean => !!c && c.enrolled && !c.finished && c.today.arenas.some((a) => !!a.boxes?.length);

/** The answer at once, before ONE MOVE replies: the box flipped, its arena's count and points (5 a box, 20 at most) and
 *  today's points (100 at most) and today's day on the ring. Unknown key: unchanged. */
export function applyTick(c: LiveChallenge, key: string, done: boolean): LiveChallenge {
  if (!c.enrolled || !c.today.arenas.some((a) => a.boxes?.some((b) => b.key === key))) return c;
  const arenas = c.today.arenas.map((a) => {
    if (!a.boxes?.some((b) => b.key === key)) return a;
    const boxes = a.boxes.map((b) => (b.key === key ? { ...b, done } : b));
    const n = boxes.filter((b) => b.done).length;
    return { ...a, boxes, done: Math.min(a.of, n), points: Math.min(20, n * 5) };
  });
  const points = Math.min(100, arenas.reduce((t, a) => t + a.points, 0));
  const d = c.today.date;
  const days = c.days && d ? (c.days.some((x) => x.date === d) ? c.days.map((x) => (x.date === d ? { ...x, score: points } : x)) : [...c.days, { date: d, score: points }]) : c.days;
  return { ...c, today: { ...c.today, points, arenas }, days };
}

/** "Thursday, Oct 22" for the Today card. */
export const todayWords = (d: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" }).format(new Date(`${d}T12:00:00Z`));

/** What the page shows: the signed-in agent's own answer only (null while it loads), the example agent's on the demo.
 *  A live agent never sees the example data. */
export const challengeShown = (live: boolean, fetched: LiveChallenge | null, demo: () => LiveChallenge | null): LiveChallenge | null => (live ? fetched : demo());

const DEMO_BOXES: Record<ArenaKey, [string, string, string][]> = {
  body: [["ch_body_workout", "Workout 45+ min", "Any movement counts"], ["ch_body_nutrition", "Nutrition on plan", "Clean eating"], ["ch_body_water", "100 oz water", "Keep the bottle close"], ["ch_body_sleep", "7+ hours sleep", "Last night"]],
  spirit: [["ch_spirit_prayer", "Prayer or meditation", "10+ minutes"], ["ch_spirit_journal", "Journal", "A page is plenty"], ["ch_spirit_reading", "Read 10+ pages", "Your current book"], ["ch_spirit_gratitude", "Gratitude", "Three things"]],
  relationships: [["ch_rel_conversations", "Real conversations", "Someone you love"], ["ch_rel_gratitude_msg", "A gratitude message", "Opens your VIP-50"], ["ch_rel_introduction", "One introduction", "Connect two people"], ["ch_rel_family_time", "Phone-down family time", "Fully present"]],
  business: [["ch_biz_conversations", "5 real conversations", "Opens your call list"], ["ch_biz_followup", "Follow up every lead", "3 waiting, all done"], ["ch_biz_marketing", "One piece of marketing", "Opens Marquee"], ["ch_biz_plan_tomorrow", "Plan tomorrow", "Opens Plan my day"]],
  legacy: [["ch_legacy_who_better", "Who is better because I showed up?", "Write one name"], ["ch_legacy_mentor", "Mentor an agent", "Ten minutes is enough"], ["ch_legacy_celebrate", "Celebrate a client", "A milestone, a card"], ["ch_legacy_serve", "Serve, expecting nothing", "Quietly"]],
};
const DEMO_DONE: Record<ArenaKey, number> = { body: 4, spirit: 3, relationships: 3, business: 2, legacy: 2 };

/** The example agent on day 74 (the approved mockup), as ONE MOVE's GET body with every §3ap field. */
export function demoChallengeBody(today: string = mountainToday()) {
  const day = 74;
  const start = addDays(today, -(day - 1));
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280), seed / 233280);
  const days = Array.from({ length: day }, (_, i) => {
    if (i === day - 1) return { date: addDays(start, i), score: 70 };
    const v = rnd();
    const s = v < 0.07 && i < 62 ? 0 : v < 0.33 ? 100 : v < 0.8 ? 70 + Math.round(rnd() * 25) : 40 + Math.round(rnd() * 25);
    return { date: addDays(start, i), score: s };
  });
  return {
    enrolled: true,
    status: "active",
    start_date: start,
    day,
    of: 90,
    days_since_start: day,
    completed_at: null,
    results: { days_scored: days.filter((d) => d.score > 0).length, average: 81 },
    letter: null,
    certificate_url: null,
    today: {
      date: today,
      points: 70,
      arenas: CHALLENGE.arenas.map((a) => ({
        key: a.key,
        label: a.name,
        done: DEMO_DONE[a.key],
        of: 4,
        points: DEMO_DONE[a.key] * 5,
        boxes: DEMO_BOXES[a.key].map(([key, label, sub], i) => ({ key, label, sub, done: i < DEMO_DONE[a.key] })),
      })),
    },
    days,
    streak: 12,
    stats: { average: 81, perfect_days: 19, best: 100 },
    leaderboard: [
      { user_id: "d1", first_name: "Julie", last_initial: "S", day: 61, week_avg: 94, me: false },
      { user_id: "d2", first_name: "Darian", last_initial: "M", day: 58, week_avg: 88, me: false },
      { user_id: "d3", first_name: "Kim", last_initial: "W", day: 74, week_avg: 81, me: true },
      { user_id: "d4", first_name: "Angelina", last_initial: "T", day: 40, week_avg: 76, me: false },
    ],
    identity_statement: "I am constantly in motion with purpose, building better relationships and making new ones daily.",
    enemy: ["my family's freedom", "a business that runs on relationships"],
    group: null,
    run: 2,
    runs: [
      { run: 1, start_date: addDays(start, -100), completed_at: addDays(start, -11), status: "completed", certificate_url: `${MOVE_URL}/certificate/example-user?run=1` },
      { run: 2, start_date: start, completed_at: null, status: "active", certificate_url: null },
    ],
    url: CHALLENGE.pageUrl,
  };
}

/** The example agent, read the same way as a live answer. */
export const demoChallenge = (today: string = mountainToday()): LiveChallenge | null => readChallenge(demoChallengeBody(today), today);
