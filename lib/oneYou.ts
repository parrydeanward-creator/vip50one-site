import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { ENERGY_NODE } from "./energy.ts";
import { TIME_OFF_NODE } from "./timeOff.ts";
import { WINS_NODE } from "./wins.ts";
import { PARTNERS_NODE } from "./partners.ts";
import { PULSE_COACH_NODE } from "./pulseCoach.ts";
import { INCOME_NODE, fmtGoal, goalsLine, money, GOAL_WORD, type GoalFacts, type IncomeMap } from "./goals.ts";
import { FORECAST_NODE, monthWords, type Forecast, type MonthForecast } from "./forecast.ts";
import type { Mate, Team } from "./team.ts";

// ONE YOU reshaped (Parry, 16 Oct, relayed by the walker: inbox/ecosystem/2026-10-16-1905 to -1950). One place for money
// (Goals, three parts) and one for activity (the Scoreboard); the 90-Day Challenge explained in full; Energy dropped;
// Time off on My Profile; Wins and Partners inside the Scoreboard; Pulse Coach inside Weekly Review; Income Map and the
// income forecast inside Goals. Live and demo build the same ONE YOU.

export const SCORE_NODE = "go-score";
export const CHALLENGE_NODE = "go-challenge";
export const GOALS_NODE = "go-goals";

/** The ONE YOU orbs Parry retired on 16 Oct. Nothing adds them now; a graph that still carries one drops it. */
export const RETIRED_YOU_ORBS: readonly string[] = [ENERGY_NODE, TIME_OFF_NODE, WINS_NODE, PARTNERS_NODE, PULSE_COACH_NODE, INCOME_NODE, FORECAST_NODE];

export function withoutRetired<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G): G {
  const gone = new Set(RETIRED_YOU_ORBS);
  if (!g.nodes.some((n) => gone.has(n.id))) return g;
  return { ...g, nodes: g.nodes.filter((n) => !gone.has(n.id)), edges: g.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)) };
}

// ---- Goals: three parts, one source (Parry, 16 Oct 13:38 MT: "yes do that") -----------------------------------------

export interface GoalsThree {
  /** 1. Closed so far: closings, referrals and GCI against the goals, with pace (GoalsPanel draws the full list). */
  closed: { line: string };
  /** 2. Likely next 3 months: the forecast month by month, who makes each month up, and the gap against the goal. */
  likely: { line: string; months: MonthForecast[]; next3: number; gapLine: string | null } | null;
  /** 3. What to do each week: the Income Map's weekly numbers to close the gap. */
  weekly: { line: string; conversations: number; touches: number; closingsLeft: number } | null;
}

/** The three lines (side panel) and the numbers (the opened Goals) from the one goals list, the Income Map built from it
 * and the forecast at the Income Map's GCI per closing: nothing is counted twice, so the parts cannot disagree. */
export function goalsThree(goals: GoalFacts[], map: IncomeMap | null, f: Forecast | null, today: string): GoalsThree {
  const set = goals.filter((g) => g.max != null && g.max > 0);
  const closedLine = set.length
    ? `${set.map((g) => `${fmtGoal(g.key, Math.max(0, g.value ?? 0))} of ${fmtGoal(g.key, g.max!)} ${GOAL_WORD[g.key] === "GCI" ? "GCI" : GOAL_WORD[g.key].toLowerCase()}`).join(" · ")}. ${goalsLine(goals, today).line}`
    : "No goals set yet: set closings, referrals and GCI to see your pace";
  let likely: GoalsThree["likely"] = null;
  if (f) {
    const months = f.months.slice(0, 3);
    const next3 = months.reduce((s, m) => s + m.total, 0);
    const gapLine = map ? `${money(next3)} likely against ${money(map.goal)}` : null;
    likely = { line: gapLine ?? `About ${money(next3)} likely in the next 3 months`, months, next3, gapLine };
  }
  const weekly = map
    ? {
        line: map.closingsLeft ? `${map.perWeek.conversations} conversations and ${map.perWeek.touches} VIP touches a week` : "Income goal reached: keep the same rhythm",
        conversations: map.perWeek.conversations,
        touches: map.perWeek.touches,
        closingsLeft: map.closingsLeft,
      }
    : null;
  return { closed: { line: closedLine }, likely, weekly };
}

/** "Oct '26: $4,500 · Jane, Mike (under contract), Amy (Hot)". */
export function monthWho(m: MonthForecast): string {
  const contract = m.who.filter((w) => w.why === "contract").map((w) => w.name);
  const hot = m.who.filter((w) => w.why === "hot").map((w) => w.name);
  const parts = [contract.length ? `${contract.join(", ")} (under contract)` : null, hot.length ? `${hot.slice(0, 4).join(", ")}${hot.length > 4 ? ` and ${hot.length - 4} more` : ""} (Hot)` : null].filter(Boolean);
  return `${monthWords(m.month)}: ${m.total ? money(m.total) : "nothing expected yet"}${parts.length ? ` · ${parts.join(", ")}` : ""}`;
}

// ---- the Scoreboard (Parry, 16 Oct: "yes on combining into Scoreboard") ---------------------------------------------

/** The Scoreboard's sections, in Parry's order (walker 2026-10-16-1938, item 3). */
export const SCOREBOARD_SECTIONS = ["Mission Control", "Leaderboard", "Your partners", "Badges this week", "Streak and XP", "This week's wins"] as const;

/** The plain note a section shows while ONE MOVE does not answer it to the Brain yet (never an empty box). */
export const COMING = "Coming from ONE MOVE";

/** The leaderboard rows: the agent as "You", everyone else by first name only; the top 5 and the agent. */
export function leaderRows(t: Team, max = 5): { place: number; name: string; score: number; me: boolean }[] {
  const place = new Map<string, number>();
  t.agents.forEach((a, i) => place.set(a.id, i > 0 && t.agents[i - 1].score === a.score ? place.get(t.agents[i - 1].id)! : i + 1));
  const row = (a: Mate) => ({ place: place.get(a.id)!, name: a.me ? "You" : a.name.split(/\s+/)[0], score: a.score, me: a.me });
  const top = t.agents.slice(0, max).map(row);
  const me = t.agents.find((a) => a.me);
  if (me && !top.some((r) => r.me)) top.push(row(me));
  return top;
}

// ---- the 90-Day Challenge (Parry, 16 Oct 13:43 MT: "it needs to go much deeper ... fix this") ------------------------
// From ONE MOVE app/(dashboard)/challenge, app/c and challenge.vip-50.com (walker 2026-10-16-1950).

export const CHALLENGE = {
  what: "Five arenas. One daily score. 90 days to build the version of yourself that others want to follow.",
  why: "Parry's 90-day personal and business challenge: every day you score yourself in five arenas, 20 points each, 100 a day. Ninety days of it changes your year.",
  day1: [
    { title: "Who you are doing this for", line: "Name them. On the hard days you do it for them." },
    { title: "Your identity statement", line: "\"Right now I am someone who...\" and \"I am becoming someone who...\"" },
    { title: "The enemy", line: "Name what you eliminate for the 90 days." },
    { title: "The sealed letter", line: "A letter to yourself, sealed on Day 1 and opened on Day 90." },
  ],
  arenas: [
    { key: "body", name: "Body", items: ["Workout", "Clean nutrition", "Water", "7+ hours sleep"] },
    { key: "spirit", name: "Spirit", items: ["Prayer or meditation", "Journaling", "Reading", "Gratitude"] },
    { key: "relationships", name: "Relationships", items: ["A real conversation with someone you love", "Phone-down family time", "Gratitude messages"] },
    { key: "business", name: "Business", items: ["Sales conversations", "Follow-up", "Pipeline", "Plan tomorrow"] },
    { key: "legacy", name: "Legacy", items: ["Mentor", "Celebrate", "Serve: \"Who is better because I showed up today?\""] },
  ],
  together: "Run it with your group: a group streak, buddy pairs, and the Results wall.",
  end: "On Day 90 you open your letter and get your completion certificate.",
  pageUrl: "https://move.vip50one.com/challenge",
} as const;

/** "Day 23 of 90" from ONE MOVE's challenge_day stat ("23 / 90" or a bare day); null when not started. */
export function challengeDay(stats: GraphNode["stats"]): { day: number; of: number } | null {
  const s = stats?.find((x) => /^day$/i.test(x.label) || /90-Day Challenge/i.test(x.label));
  const m = s ? /(\d+)(?:\s*\/\s*(\d+))?/.exec(s.value) : null;
  if (!m) return null;
  const day = Number(m[1]);
  return day > 0 ? { day, of: Number(m[2] ?? 90) || 90 } : null;
}
