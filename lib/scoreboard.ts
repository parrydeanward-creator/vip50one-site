// The Scoreboard's own numbers from ONE MOVE (vip50-web-crm#281, Parry 16 Oct: ONE YOU): `GET /api/brain/scoreboard` ->
// `{week_start, mission:[{title, earns, progress_label, percent, status}], streak, xp:{week, last_week}, history:[...]}`,
// from the same functions as the Classic Scoreboard page, so the Brain's Mission Control and Streak and XP can never
// differ from ONE MOVE's. Read only. The example agent keeps the demo graph's numbers.

const MOVE_URL = "https://move.vip50one.com";
export const scoreboardUrl = `${MOVE_URL}/api/brain/scoreboard`;

export type MissionStatus = "Complete" | "In Progress" | "Not Started";
const STATUSES: MissionStatus[] = ["Complete", "In Progress", "Not Started"];

export interface MissionRow {
  title: string;
  earns: string;
  progressLabel: string;
  percent: number;
  status: MissionStatus;
}

export interface ScoreboardLive {
  weekStart: string;
  mission: MissionRow[];
  /** Days in a row with ONE GO opened (ONE MOVE's loginStreak). */
  streak: number;
  xp: { week: number; lastWeek: number };
  /** ONE MOVE's `weekly_totals.combined_total` rows, newest first. Not shown: that table stopped being written in
   *  Aug 2025 (Parry's last row is the week of 11 Aug 2025), so it is not the weekly score; see weeklyScoreLines. */
  history: { weekStart: string; total: number }[];
}

const day = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const whole = (v: unknown): number => Math.max(0, Math.round(num(v) ?? 0));

/** A scoreboard answer, checked; null when it is not one (an error, a sign-in page, anything else). Never throws. */
export function readScoreboard(j: unknown): ScoreboardLive | null {
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const r = j as Record<string, unknown>;
  const weekStart = day(r.week_start);
  if (!weekStart || !Array.isArray(r.mission)) return null;
  const mission: MissionRow[] = [];
  for (const m of r.mission as unknown[]) {
    if (!m || typeof m !== "object") continue;
    const x = m as Record<string, unknown>;
    const title = str(x.title, 80);
    if (!title) continue;
    const status = STATUSES.includes(x.status as MissionStatus) ? (x.status as MissionStatus) : "Not Started";
    mission.push({ title, earns: str(x.earns, 120), progressLabel: str(x.progress_label, 120), percent: Math.min(100, whole(x.percent)), status });
  }
  const xp = r.xp && typeof r.xp === "object" ? (r.xp as Record<string, unknown>) : {};
  const history: ScoreboardLive["history"] = [];
  if (Array.isArray(r.history)) {
    for (const h of r.history as unknown[]) {
      if (!h || typeof h !== "object") continue;
      const x = h as Record<string, unknown>;
      const ws = day(x.week_start_date);
      const t = num(x.combined_total);
      if (ws && t != null) history.push({ weekStart: ws, total: Math.round(t) });
    }
    history.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }
  return { weekStart, mission: mission.slice(0, 12), streak: whole(r.streak), xp: { week: whole(xp.week), lastWeek: whole(xp.last_week) }, history: history.slice(0, 8) };
}

/** Mission Control's dot: green done, yellow under way, grey not started (the demo graph's healthy/attention/idle). */
export const missionDot = (s: MissionStatus): "healthy" | "attention" | "idle" => (s === "Complete" ? "healthy" : s === "In Progress" ? "attention" : "idle");

/** "4 of 7 complete" for the panel's heading line. */
export const missionLine = (rows: MissionRow[]): string => `${rows.filter((m) => m.status === "Complete").length} of ${rows.length} complete`;

/** The Streak and XP rows' words, from a live answer. XP is ONE GO's game points, named XP, never "weekly score". */
export function streakXpLines(s: ScoreboardLive): { streak: string; xp: string; xpNote: string } {
  const n = (v: number) => v.toLocaleString("en-US");
  return {
    streak: s.streak === 1 ? "1 day" : `${n(s.streak)} days`,
    xp: `${n(s.xp.week)} XP this week`,
    xpNote: `${n(s.xp.lastWeek)} XP last week. XP is ONE GO's game points; the weekly score is the one against 100.`,
  };
}

/** One week of the 100-standard weekly score (daily tracker points plus the weekly bonus boxes), as ONE MOVE's
 *  /api/brain/history sends it: the same weeks the Weekly Review reads (lib/pulseCoach.ts). */
export type ScoreWeek = { start: string; score: number | null; minimum: number };

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** The Scoreboard's weekly score row from the same weeks as the Weekly Review: last full week big (as Pulse's read,
 *  pulseRead's `last`), this week so far and the weeks before in the note. Null when there is no scored week. */
export function weeklyScoreLines(weeks: ScoreWeek[] | null | undefined, today: string): { big: string; note: string } | null {
  if (!weeks?.length) return null;
  const sorted = [...weeks].sort((a, b) => a.start.localeCompare(b.start));
  const full = sorted.filter((w) => addDays(w.start, 7) <= today);
  const now = sorted.find((w) => w.start <= today && addDays(w.start, 7) > today) ?? null;
  const last = full.length ? full[full.length - 1] : null;
  const minimum = (last ?? now)?.minimum ?? 100;
  const before = full.slice(0, -1).filter((w) => w.score != null).reverse().slice(0, 4);
  if (last?.score == null && now?.score == null) return null;
  const big = last?.score != null ? `${last.score} last week` : `${now!.score} this week so far`;
  const parts = [
    last?.score != null ? (last.score >= minimum ? `Above the ${minimum}` : `${minimum - last.score} short of ${minimum}`) : null,
    last?.score != null && now?.score != null ? `${now.score} this week so far` : null,
    before.length ? `before that ${before.map((w) => w.score).join(", ")} (newest first)` : null,
  ].filter(Boolean);
  return { big, note: `${parts.join(" · ")}${parts.length ? ". " : ""}Daily tracker points plus the weekly bonus boxes; the standard is ${minimum}.` };
}
