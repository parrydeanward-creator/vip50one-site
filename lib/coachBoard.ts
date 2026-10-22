import type { Coached } from "./coach.ts";
import { lastWeekShare } from "./coach.ts";
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

/** Days without a sign-in before an agent has "gone quiet". */
export const QUIET_DAYS = 7;
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
  /** Whole days since the last sign-in, when MASTER sends it. */
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
 *  1. Gone quiet: no sign-in for 7 days or more; or, when MASTER does not send the sign-in, no points in the last two
 *     finished weeks (away weeks left out).
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

/** One agent on the board, from the coached answer and (when there) their Team screen entry. */
export function boardAgent(a: Coached, mate: Mate | null, minimum: number): BoardAgent {
  const short = shortName(a.name);
  const lw = lastWeekShare(a);
  const keptWeeks = a.keptWeeks?.length ? a.keptWeeks : lw != null ? [lw] : [];
  const base = {
    id: a.id,
    a,
    short,
    initials: initialsOf(short),
    photo: a.photo ?? mate?.photo ?? null,
    kept: a.c.keepRate8w,
    keptWeeks,
    set: isSet(a),
    away: mate?.away ?? false,
    score: mate ? mate.score : null,
    last4: mate?.last4 ?? [],
    last4Away: mate?.last4Away ?? [],
    minimum,
    streak: mate?.streak ?? 0,
    quietDays: daysSince(a.lastActive, a.c.today),
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

/** The small line under a name: "60% kept · pace 95", or why we cannot say. */
export function cardLine(b: BoardAgent): string {
  const parts = [b.kept == null ? "No keep history yet" : `${Math.round(b.kept * 100)}% kept`];
  if (b.quietDays != null && b.quietDays >= QUIET_DAYS) parts.push(`no sign-in ${b.quietDays} days`);
  else if (b.away) parts.push("away");
  else if (b.score != null) parts.push(`pace ${b.score}`);
  return parts.join(" · ");
}

/** The five-week mini bar: kept share when MASTER sends weeks of it, else the weekly score against the minimum. */
export function sparkOf(b: BoardAgent): { values: (number | null)[]; kind: "kept" | "score" } {
  if (b.keptWeeks.length >= 2) return { values: b.keptWeeks.slice(-5), kind: "kept" };
  const s: (number | null)[] = b.last4.map((v, k) => (b.last4Away[k] ? null : v / b.minimum));
  if (b.score != null) s.push(b.away ? null : b.score / b.minimum);
  return { values: s.slice(-5), kind: "score" };
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
  ];
}
