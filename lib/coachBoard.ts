import type { Coached } from "./coach.ts";
import { demoCoached, lastWeekShare } from "./coach.ts";
import { reached } from "./commitments.ts";
import type { Mate, Team } from "./team.ts";

// The Coaching board (Parry, 22 Oct, picked option A: research/mockups/coaching/coaching-a.png). The agents a coach
// coaches in three columns: Needs you now, Slipping, Winning, with the week's counts above them; every count opens the
// agents behind it (PROTOCOL rule 12). Scores, keep rates and yes/no only: never a client or a contact's note.
// The rules live here, pure, so the tests hold them (tests/coachBoard.test.ts).

const MOVE_URL = "https://move.vip50one.com";
/** ONE MOVE's coach nudge (vip50-web-crm app/api/brain/coach/nudge): one ONE notification to the agent, preset words. */
export type NudgeKind = "push" | "motivate";
export const nudgeUrl = (agent: string, kind: NudgeKind = "push") =>
  `${MOVE_URL}/api/brain/coach/nudge?agent=${encodeURIComponent(agent)}&kind=${kind}`;
/** The words that route sends for `push` (vip50-web-crm lib/coach-nudge.ts), shown before the coach sends it. */
export const NUDGE_WORDS = "Check-in from your coach: Your coach is thinking of you. Open ONE and track today's activities.";

/** Mountain days with no activity at all (MASTER last_active_at) before an agent has "gone quiet". */
export const QUIET_DAYS = 7;
/** How often an open board reads ONE MOVE again (Parry, 23 Oct: no snapshot older than 5 minutes). */
export const REFRESH_MS = 5 * 60_000;
/** How many cards each column shows before "+N more". */
export const COLUMN_SHOW = 4;

export type Column = "now" | "slip" | "win";
export type Tone = "red" | "amber" | "green" | "grey";

export interface BoardAgent {
  id: string;
  a: Coached;
  /** "Annette J.": first name and last initial, never a login or email handle. */
  short: string;
  initials: string;
  photo: string | null;
  /** 8-week keep rate, 0..1, or null with no history. */
  kept: number | null;
  /** Finished weeks' share kept, oldest first (from MASTER when sent, else last week only). */
  keptWeeks: (number | null)[];
  set: boolean;
  away: boolean;
  /** This week's score so far, and the last four finished weeks (oldest first), from the Team route (§3u). */
  score: number | null;
  last4: number[];
  last4Away: boolean[];
  minimum: number;
  /** Weeks in a row at the minimum (Team route). */
  streak: number;
  /** Whole Mountain days since the last real activity (last_active_at), when MASTER sends it. */
  quietDays: number | null;
  column: Column;
  why: string;
  tone: Tone;
  /** Kept % or score down two weeks running. */
  down2: boolean;
}

const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w);

/** First name and last initial. A login or email handle loses its domain and digits ("travis99@x.com" -> "Travis"). */
export function shortName(name: string): string {
  let n = (name || "").trim();
  const handle = n.includes("@") || (!/\s/.test(n) && /[\d._]/.test(n));
  if (handle) {
    n = n.split("@")[0].replace(/\d+/g, " ").replace(/[._\-+]+/g, " ").trim();
  }
  const words = n.split(/\s+/).filter(Boolean);
  if (!words.length) return "Agent";
  const first = handle ? cap(words[0]) : words[0];
  const last = words.length > 1 ? words[words.length - 1] : "";
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

export const initialsOf = (short: string) =>
  short
    .replace(/\./g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** The week's commitments are set: at least one item this week. */
export const isSet = (a: Coached) => (a.c.week?.items.length ?? 0) > 0;

/** Trailing finished weeks with nothing kept (a 0 share; a week with nothing set does not count either way). */
export function nothingKeptRun(weeks: (number | null)[]): number {
  let n = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i] === 0) n++;
    else break;
  }
  return n;
}

/** The last three values, each lower than the one before (down two weeks running). */
export function fallingTwo(xs: (number | null)[]): boolean {
  const t = xs.slice(-3);
  if (t.length < 3 || t.some((x) => x == null)) return false;
  return t[0]! > t[1]! && t[1]! > t[2]!;
}

const DAY_MS = 86_400_000;
const DENVER_YMD = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" });
/** Whole Mountain calendar days from the day `iso` happened to `today` (a Mountain YYYY-MM-DD): 0 is today. */
export function mountainDaysSince(iso: string | null | undefined, today: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const day = DENVER_YMD.format(new Date(t));
  return Math.max(0, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / DAY_MS));
}
/** "Active today", "Active yesterday", "Active 9 days ago", or "No activity yet". */
export function activeLabel(days: number | null): string {
  if (days == null) return "No activity yet";
  return days === 0 ? "Active today" : days === 1 ? "Active yesterday" : `Active ${days} days ago`;
}
export function daysSince(iso: string | null | undefined, today: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.parse(`${today}T23:59:59Z`) - t) / DAY_MS));
}

/**
 * The column and the one-line reason for one agent. The rules, in order:
 *
 * Needs you now (red), the first that holds:
 *  1. Gone quiet: no activity of any kind (last_active_at) for 7 Mountain days or more; or, when MASTER does not send
 *     it, no points in the last two finished weeks (away weeks left out).
 *  2. Nothing kept two finished weeks running or more ("Nothing kept in N weeks").
 *  3. This week's commitments not set ("Hasn't set this week").
 * Slipping (amber):
 *  4. Kept % down two weeks running, or the weekly score down two weeks running (the last three finished weeks).
 *  5. Last finished week's score under the team minimum (100), unless that week was away.
 * Winning (green): everyone else; the reason is the best true thing (N weeks at 100, at 100 this week, all on track).
 * An agent away this week is never in Needs you now or Slipping for this week's rules (§3x: away never counts against).
 */
export function placeOf(x: Omit<BoardAgent, "column" | "why" | "tone" | "down2">): Pick<BoardAgent, "column" | "why" | "tone" | "down2"> {
  const counted = x.last4.filter((_, k) => !x.last4Away[k]);
  const keptDown = fallingTwo(x.keptWeeks);
  const scoreDown = fallingTwo(counted);
  const down2 = keptDown || scoreDown;
  const noPoints2 = counted.length >= 2 && counted.slice(-2).every((s) => s === 0);
  if (x.quietDays != null ? x.quietDays >= QUIET_DAYS : noPoints2) return { column: "now", why: "Gone quiet", tone: "red", down2 };
  const none = nothingKeptRun(x.keptWeeks);
  if (none >= 2) return { column: "now", why: `Nothing kept in ${none} weeks`, tone: "red", down2 };
  if (!x.set && !x.away) return { column: "now", why: "Hasn't set this week", tone: "red", down2 };
  if (x.away) return { column: "win", why: "Away this week", tone: "grey", down2 };
  if (keptDown) return { column: "slip", why: "Kept less 2 weeks running", tone: "amber", down2 };
  if (scoreDown) return { column: "slip", why: "Score down 2 weeks running", tone: "amber", down2 };
  const lastIdx = x.last4.length - 1;
  if (lastIdx >= 0 && !x.last4Away[lastIdx] && x.last4[lastIdx] < x.minimum)
    return { column: "slip", why: `Under ${x.minimum} last week (${x.last4[lastIdx]})`, tone: "amber", down2 };
  if (x.streak >= 2) return { column: "win", why: `${x.streak} weeks at ${x.minimum}`, tone: "green", down2 };
  if (x.score != null && x.score >= x.minimum) return { column: "win", why: `At ${x.minimum} this week`, tone: "green", down2 };
  const items = x.a.c.week?.items ?? [];
  const on = items.filter((i) => i.result === "kept" || reached(i)).length;
  if (items.length && on === items.length) return { column: "win", why: `All ${items.length} on track`, tone: "green", down2 };
  return { column: "win", why: items.length ? `Set ${items.length}, ${on} done so far` : "On pace", tone: "green", down2 };
}

/** One agent on the board, from the coached answer and (when there) their Team screen entry. The weekly score is
 *  MASTER's own (score_this_week, scores_by_week: ONE GO's Weekly Tracker numbers) whenever it sends them. */
export function boardAgent(a: Coached, mate: Mate | null, minimum: number): BoardAgent {
  const short = shortName(a.name);
  const lw = lastWeekShare(a);
  const keptWeeks = a.keptWeeks?.length ? a.keptWeeks : lw != null ? [lw] : [];
  const ms = a.scoresByWeek?.length ? a.scoresByWeek : null;
  const last4 = ms ? ms.slice(-4).map((w) => w.score) : mate?.last4 ?? [];
  const last4Away = ms ? ms.slice(-4).map((w) => w.away) : mate?.last4Away ?? [];
  const score = a.scoreThisWeek != null ? a.scoreThisWeek : mate ? mate.score : null;
  let streak = mate?.streak ?? 0;
  if (ms && !mate) {
    streak = 0;
    for (let i = ms.length - 1; i >= 0; i--) {
      if (ms[i].score >= minimum) streak++;
      else if (!ms[i].away) break;
    }
    if (score != null && score >= minimum) streak++;
  }
  const base = {
    id: a.id,
    a,
    short,
    initials: initialsOf(short),
    photo: a.photo ?? mate?.photo ?? null,
    // no commitments ever set: no keep rate at all ("No commitments set yet"), never 0%
    kept: a.hasCommitments === false ? null : a.c.keepRate8w,
    keptWeeks,
    set: isSet(a),
    away: mate?.away ?? false,
    score,
    last4,
    last4Away,
    minimum,
    streak,
    quietDays: mountainDaysSince(a.lastActive, a.c.today),
  };
  return { ...base, ...placeOf(base) };
}

export interface Board {
  agents: BoardAgent[];
  now: BoardAgent[];
  slip: BoardAgent[];
  win: BoardAgent[];
  /** The five counts, each with the agents behind it. */
  kpi: {
    all: BoardAgent[];
    notSet: BoardAgent[];
    teamKept: number | null;
    keptList: BoardAgent[];
    down2: BoardAgent[];
    at100: BoardAgent[];
  };
}

const keptAsc = (a: BoardAgent, b: BoardAgent) => (a.kept ?? 1) - (b.kept ?? 1) || a.short.localeCompare(b.short);
const NOW_RANK: Record<string, number> = { "Gone quiet": 0 };
const nowRank = (b: BoardAgent) => NOW_RANK[b.why] ?? (b.why.startsWith("Nothing kept") ? 1 : 2);

/** The whole board. Needs you now: quiet first, then nothing kept, then not set, lowest keep rate first. */
export function buildBoard(agents: Coached[], squad: Team | null): Board {
  const minimum = squad?.minimum ?? 100;
  const list = agents.map((a) => boardAgent(a, squad?.agents.find((m) => m.id === a.id) ?? null, minimum));
  const now = list.filter((b) => b.column === "now").sort((a, b) => nowRank(a) - nowRank(b) || keptAsc(a, b));
  const slip = list.filter((b) => b.column === "slip").sort(keptAsc);
  const win = list
    .filter((b) => b.column === "win")
    .sort((a, b) => (a.away ? 1 : 0) - (b.away ? 1 : 0) || b.streak - a.streak || (b.kept ?? 0) - (a.kept ?? 0) || a.short.localeCompare(b.short));
  const rates = list.map((b) => b.kept).filter((r): r is number => r != null);
  return {
    agents: [...now, ...slip, ...win],
    now,
    slip,
    win,
    kpi: {
      all: [...now, ...slip, ...win],
      notSet: list.filter((b) => !b.set && !b.away).sort(keptAsc),
      teamKept: rates.length ? rates.reduce((t, r) => t + r, 0) / rates.length : null,
      keptList: list.filter((b) => b.kept != null).sort(keptAsc),
      down2: list.filter((b) => b.down2 && !b.away).sort(keptAsc),
      at100: list.filter((b) => b.score != null && b.score >= minimum).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    },
  };
}

/** "60% kept of 5", or "No commitments set yet" when none were ever set (never "0% kept" for that). */
export function keptLine(b: BoardAgent): string {
  if (b.kept == null) return b.a.hasCommitments === false || b.a.keptCounts?.set === 0 ? "No commitments set yet" : "No keep history yet";
  const set = b.a.keptCounts?.set;
  return `${Math.round(b.kept * 100)}% kept${set ? ` of ${set}` : ""}`;
}

/** What lies behind the keep rate: "3 kept, 0 partly, 0 missed, 2 never checked in". Null with none set. */
export function keptDetail(b: BoardAgent): string | null {
  const c = b.a.keptCounts;
  if (!c || !c.set) return null;
  return `${c.kept} kept, ${c.partly} partly, ${c.missed} missed${c.notChecked ? `, ${c.notChecked} never checked in` : ""}`;
}

/** The small line under a name: "60% kept of 5 · Active today · pace 95". */
export function cardLine(b: BoardAgent): string {
  const parts = [keptLine(b)];
  if (b.quietDays != null) parts.push(activeLabel(b.quietDays));
  if (b.away) parts.push("away");
  else if (b.score != null) parts.push(`pace ${b.score}`);
  return parts.join(" · ");
}

/** The five-week mini bar: the weekly score against the minimum when MASTER sends ONE GO's weeks (scores_by_week);
 *  without them, the kept share when MASTER sends weeks of it, else the Team screen's scores. */
export function sparkOf(b: BoardAgent): { values: (number | null)[]; kind: "kept" | "score" } {
  if (!b.a.scoresByWeek?.length && b.keptWeeks.length >= 2) return { values: b.keptWeeks.slice(-5), kind: "kept" };
  const s: (number | null)[] = b.last4.map((v, k) => (b.last4Away[k] ? null : v / b.minimum));
  if (b.score != null) s.push(b.away ? null : b.score / b.minimum);
  return { values: s.slice(-5), kind: "score" };
}

/** The 8-week chart. With MASTER's scores_by_week: the weekly score of each of the 8 finished Mountain weeks, the
 *  same numbers the agent sees in ONE GO's Weekly Tracker (Parry, 23 Oct); an away week under the minimum is empty.
 *  Without it: the kept share of the weeks MASTER sent (a week with nothing set is an empty slot, never a 0 bar).
 *  Never padded: four weeks show as four bars, not eight. Null when there is nothing to draw from the coached answer
 *  (the view then reads the history route). */
export function eightWeeks(b: BoardAgent): { values: (number | null)[]; kind: "kept" | "score"; raw: (number | null)[] } | null {
  const ms = b.a.scoresByWeek;
  if (ms?.length) {
    const w = ms.slice(-8);
    return { values: w.map((x) => (x.away && x.score < b.minimum ? null : x.score / b.minimum)), kind: "score", raw: w.map((x) => (x.away && x.score < b.minimum ? null : x.score)) };
  }
  if (b.keptWeeks.length >= 2) {
    const v = b.keptWeeks.slice(-8);
    return { values: v, kind: "kept", raw: v };
  }
  return null;
}

/** "Score 104 this week · 3 of the last 4 at 100"; null with no score. */
export function scoreLine(b: BoardAgent): string | null {
  if (b.score == null) return null;
  const counted = b.last4.filter((_, k) => !b.last4Away[k]);
  const hit = counted.filter((s) => s >= b.minimum).length;
  return counted.length ? `Score ${b.score} this week · ${hit} of the last ${counted.length} at ${b.minimum}` : `Score ${b.score} this week`;
}

/** A bar's colour: at the mark green (gold in the 8-week chart), half way amber (blue), under that red. */
export function barTone(v: number | null): Tone {
  if (v == null) return "grey";
  return v >= 0.9 ? "green" : v >= 0.5 ? "amber" : "red";
}

/** "Week of Oct 19", from the Monday the week starts. */
export function weekLabel(monday: string): string {
  const d = new Date(`${monday}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "This week";
  return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}
export const mondayOf = (today: string) => {
  const d = new Date(`${today}T12:00:00Z`);
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10);
};

/** More example agents for the demo board, beside lib/coach.ts demoCoached (ids match lib/team.ts demoTeam). */
export function demoCoachedMore(today: string): Coached[] {
  const ago = (d: number) => new Date(Date.parse(`${today}T15:00:00Z`) - d * DAY_MS).toISOString();
  const base = (o: Partial<Coached["c"]>): Coached["c"] => ({ today, due: null, week: null, weekend: null, lastWeek: null, keepRate8w: null, streak: 0, ...o });
  const wk = (n: number, done: number): Coached["c"]["week"] => ({
    id: `w-${n}-${done}`,
    starts: today,
    setAt: `${today}T14:00:00Z`,
    checkedAt: null,
    items: Array.from({ length: n }, (_, k) => ({ id: `i${k}`, text: ["Call 10 VIPs", "Two coffees", "Three handwritten notes", "Post one video", "Book my open house"][k % 5], kind: k === 4 ? "yes_no" : "call", target: k === 4 ? null : 2, count: k < done ? 2 : 0, result: null, note: null })),
  });
  return [
    { id: "t6", name: "Kyle Barton", c: base({ week: wk(5, 2), keepRate8w: 0.52, lastWeek: { kept: 2, partly: 1, missed: 2 } }), setup: null, keptWeeks: [0.8, 0.7, 0.6, 0.5, 0.4], lastActive: ago(1) },
    { id: "t7", name: "Rachel Moore", c: base({ week: wk(3, 1), keepRate8w: 0.64, lastWeek: { kept: 2, partly: 0, missed: 1 } }), setup: null, keptWeeks: [1, 0.9, 0.8, 0.75, 0.6], lastActive: ago(0) },
    { id: "t8", name: "lisa.grant88@example.com", c: base({ keepRate8w: 0, lastWeek: { kept: 0, partly: 0, missed: 3 } }), setup: null, keptWeeks: [0.3, 0, 0, 0], lastActive: ago(2) },
    { id: "t9", name: "Sheri Cole", c: base({ keepRate8w: 0.1, lastWeek: { kept: 0, partly: 1, missed: 2 } }), setup: null, keptWeeks: [0.5, 0, 0.2], lastActive: ago(9) },
    { id: "t10", name: "Aaron Brooks", c: base({ week: wk(4, 4), keepRate8w: 1, streak: 4, lastWeek: { kept: 4, partly: 0, missed: 0 } }), setup: null, keptWeeks: [1, 1, 1, 1, 1], lastActive: ago(0) },
    { id: "t11", name: "Darian Ortiz", c: base({ week: wk(3, 3), keepRate8w: 0.88, streak: 2, lastWeek: { kept: 3, partly: 0, missed: 0 } }), setup: null, keptWeeks: [0.7, 0.9, 0.8, 1, 1], lastActive: ago(0) },
    // signs in and works contacts but has never set a commitment: "No commitments set yet", never 0% kept
    { id: "t12", name: "Nina Patel", c: base({}), setup: null, keptWeeks: [], lastActive: ago(1) },
  ];
}

/** The demo's share of what ONE MOVE's coached route sends since vip50-web-crm#399 (scores_by_week oldest first, this
 *  week's score, the counts behind the keep rate, the latest real activity and what it was). The last four weeks and
 *  this week match lib/team.ts demoTeam, so the board and the Team screen agree. */
const DEMO_TRUTH: Record<string, { s: number[]; now: number; k: [number, number, number, number, number]; src: string; ago?: number }> = {
  t1: { s: [104, 110, 98, 102, 96, 104, 101, 98], now: 112, k: [18, 14, 2, 1, 1], src: "touch", ago: 0 },
  t2: { s: [95, 80, 90, 85, 88, 92, 101, 77], now: 104, k: [20, 8, 2, 7, 3], src: "app", ago: 1 },
  t4: { s: [90, 75, 88, 80, 70, 84, 79, 82], now: 91, k: [15, 8, 2, 4, 1], src: "task", ago: 2 },
  t5: { s: [110, 105, 120, 101, 102, 108, 111, 104], now: 87, k: [25, 23, 0, 2, 0], src: "tracker", ago: 0 },
  t6: { s: [70, 66, 58, 75, 60, 72, 81, 64], now: 76, k: [25, 12, 2, 9, 2], src: "commitment" },
  t7: { s: [101, 98, 97, 100, 99, 95, 90, 88], now: 69, k: [25, 15, 2, 8, 0], src: "plan" },
  t8: { s: [50, 44, 62, 39, 41, 55, 60, 47], now: 58, k: [9, 0, 0, 6, 3], src: "contact" },
  t9: { s: [60, 45, 30, 20, 10, 5, 0, 0], now: 0, k: [10, 0, 2, 6, 2], src: "app" },
  t10: { s: [100, 104, 110, 102, 105, 108, 101, 115], now: 106, k: [16, 16, 0, 0, 0], src: "habit" },
  t11: { s: [80, 95, 100, 92, 104, 110, 101, 103], now: 98, k: [16, 14, 0, 2, 0], src: "lounge" },
  t12: { s: [0, 0, 0, 0, 0, 0, 0, 0], now: 12, k: [0, 0, 0, 0, 0], src: "contact" },
};

/** Demo agents with the new coached fields filled in, so the demo board runs on the same rules as a live one. */
export function withDemoTruth(list: Coached[], today: string): Coached[] {
  const monday = mondayOf(today);
  const weekOf = (k: number) => new Date(Date.parse(`${monday}T12:00:00Z`) - (8 - k) * 7 * DAY_MS).toISOString().slice(0, 10);
  const ago = (d: number) => new Date(Date.parse(`${today}T18:00:00Z`) - d * DAY_MS).toISOString();
  return list.map((a) => {
    const t = DEMO_TRUTH[a.id];
    if (!t) return a;
    const [set, kept, partly, missed, notChecked] = t.k;
    return {
      ...a,
      // Marcus: a week in the middle with nothing set is an empty slot, never a 0 bar
      ...(a.id === "t2" ? { keptWeeks: [0.6, null, 0.4, 0.5] } : {}),
      c: set ? a.c : { ...a.c, keepRate8w: null },
      lastActive: t.ago != null ? ago(t.ago) : a.lastActive ?? null,
      lastActiveSource: t.src,
      scoreThisWeek: t.now,
      scoresByWeek: t.s.map((score, k) => ({ week: weekOf(k), score, away: false })),
      keptCounts: { set, kept, partly, missed, notChecked },
      hasCommitments: set > 0,
    };
  });
}

/** The whole demo board: lib/coach.ts demoCoached, demoCoachedMore, with the coached route's new fields. */
export const demoCoachBoard = (today: string): Coached[] => withDemoTruth([...demoCoached(today), ...demoCoachedMore(today)], today);
