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
  /** The last weekly scores, newest first. */
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

/** The Streak and XP rows' words, from a live answer. */
export function streakXpLines(s: ScoreboardLive): { streak: string; xp: string; xpNote: string } {
  const n = (v: number) => v.toLocaleString("en-US");
  return {
    streak: s.streak === 1 ? "1 day" : `${n(s.streak)} days`,
    xp: `${n(s.xp.week)} this week`,
    xpNote: `${n(s.xp.lastWeek)} last week${s.history.length ? ` · weekly score ${s.history.map((h) => h.total).join(", ")} (newest first)` : ""}.`,
  };
}
