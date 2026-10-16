import type { GraphNode } from "./graph/types.ts";

// Goals with pace and the Income Map (PULSE-ROADMAP "ONE YOU"; Parry approved, 6 Oct). Each agent's goal year
// runs from their own start date (Parry, 30 Sep), and MASTER keeps the goals and where the agent should be by
// today (`pace`). This file says where the year is heading ("On pace for 22 of 25"), what the rest of the year
// asks for each week, and works the income goal back to closings, referrals, conversations and touches a week.
// Pure: nothing here saves or sends. Goals are changed on the desktop through /api/goals (Parry, 16 Oct, audit 3.4.1),
// checked here first (goalChange).

export type GoalKey = "closings_goal" | "referrals_goal" | "gci_goal";

export interface GoalFacts {
  key: GoalKey;
  label: string;
  value: number | null; // so far this goal year
  max: number | null; // the goal
  pace: number | null; // where MASTER says the agent should be by today
  from?: string; // YYYY-MM-DD, the goal year
  to?: string;
  // Closings only: closings that came from a referral this goal year. The closings goal counts the agent's own deals
  // only (Parry, 12 Oct: "differentiate between actual closed deals and referrals"; vip50-web-crm#196).
  from_referrals?: number | null;
}

export interface YearShare {
  share: number; // 0..1 of the goal year gone
  weeksLeft: number;
}

const DAY = 86_400_000;
const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);
const at = (s: string) => Date.parse(`${s.slice(0, 10)}T12:00:00Z`);

/** How far through the goal year today is. Without dates, a year from the start (or null). */
export function yearShare(from: string | undefined, to: string | undefined, today: string): YearShare | null {
  if (!isDay(from) || !isDay(today)) return null;
  const s = at(from);
  const e = isDay(to) ? at(to) : s + 365 * DAY;
  const t = at(today);
  if (!(e > s)) return null;
  const share = Math.min(1, Math.max(0, (t - s) / (e - s)));
  return { share, weeksLeft: Math.max(0, (e - t) / (7 * DAY)) };
}

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const fmtGoal = (key: GoalKey, n: number) => (key === "gci_goal" ? money(n) : Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "about 2 a week", "about 1 every 3 weeks", "about $4,200 a week". */
export function perWeekWords(key: GoalKey, left: number, weeks: number): string {
  if (left <= 0) return "nothing more needed";
  if (weeks < 1) return key === "gci_goal" ? `${money(left)} this week` : `${Math.ceil(left)} this week`;
  const rate = left / weeks;
  if (key === "gci_goal") return `about ${money(rate)} a week`;
  if (rate >= 1) return `about ${rate >= 10 ? Math.round(rate) : Math.round(rate * 10) / 10} a week`;
  return `about 1 every ${Math.max(2, Math.round(1 / rate))} weeks`;
}

/** Below this share of the year a projection says too little (two weeks in, one closing is not 26). */
const EARLY = 0.04;

/** "Your own deals only. 3 more closed from referrals." under the closings goal; null when none. */
export function referralNote(g: GoalFacts): string | null {
  if (g.key !== "closings_goal") return null;
  const n = typeof g.from_referrals === "number" && Number.isFinite(g.from_referrals) ? Math.max(0, Math.round(g.from_referrals)) : 0;
  return n ? `Your own deals only. ${n} more closed from referrals.` : null;
}

/** The pace line under a goal: where the year is heading, and what the rest of it asks. */
export function goalPace(g: GoalFacts, today: string): { headline: string; detail: string; projected: number | null } | undefined {
  const p = paceOf(g, today);
  const note = referralNote(g);
  return p && note ? { ...p, detail: `${p.detail} ${note}` } : p;
}

function paceOf(g: GoalFacts, today: string): { headline: string; detail: string; projected: number | null } | undefined {
  if (g.max == null || g.max <= 0) return undefined;
  const value = Math.max(0, g.value ?? 0);
  const y = yearShare(g.from, g.to, today);
  const f = (n: number) => fmtGoal(g.key, n);
  if (value >= g.max) return { headline: `Goal reached: ${f(value)} of ${f(g.max)}`, detail: "Everything from here is extra.", projected: null };
  const left = g.max - value;
  if (!y) {
    return { headline: `${f(value)} of ${f(g.max)}`, detail: `${f(left)} to go.`, projected: null };
  }
  const shouldBe = g.pace ?? g.max * y.share;
  const weeks = Math.round(y.weeksLeft);
  const rest = `${f(left)} to go in ${weeks} ${weeks === 1 ? "week" : "weeks"}: ${perWeekWords(g.key, left, y.weeksLeft)}.`;
  if (y.share < EARLY) return { headline: `Goal year just started: ${f(g.max)} to reach`, detail: rest, projected: null };
  const projected = g.key === "gci_goal" ? Math.round(value / y.share / 1000) * 1000 : Math.round(value / y.share);
  // Whole numbers (Parry, 16 Oct, audit 3.4.3: "By today you'd be at 3.9" reads as "about 4").
  const where = g.key === "gci_goal" ? `By today you'd be at ${f(Math.round(shouldBe))}.` : `By today you'd be at about ${Math.round(shouldBe)}.`;
  return {
    headline: projected >= g.max ? `On pace for ${f(projected)} of ${f(g.max)}: ahead` : `On pace for ${f(projected)} of ${f(g.max)}`,
    detail: `${rest} ${where}`,
    projected,
  };
}

/** Behind pace: past the first weeks of the goal year and short of where the agent should be by today. */
export function behindPace(g: GoalFacts, today: string): boolean {
  if (g.max == null || g.max <= 0) return false;
  const value = Math.max(0, g.value ?? 0);
  if (value >= g.max) return false;
  const y = yearShare(g.from, g.to, today);
  if (g.pace != null && (!y || y.share >= EARLY)) return value < g.pace;
  if (!y || y.share < EARLY) return false;
  return value < g.max * y.share;
}

/** "3 goals behind pace" on the Goals orb, so its yellow count has a reason (Parry, 16 Oct, audit 3.4.5). */
export function goalsLine(goals: GoalFacts[], today: string): { line: string; behind: number } {
  const set = goals.filter((g) => g.max != null && g.max > 0);
  if (!set.length) return { line: "No goals set yet", behind: 0 };
  const behind = set.filter((g) => behindPace(g, today)).length;
  if (behind) return { line: `${behind} ${behind === 1 ? "goal" : "goals"} behind pace`, behind };
  return { line: set.length === 1 ? "On pace" : `All ${set.length} goals on pace`, behind: 0 };
}

// ---- changing a goal (Parry, 16 Oct, audit 3.4.1) -------------------------------------------------------------
// The agent changes a goal on the desktop; /api/goals saves it to MASTER agent_goals with the agent's own session
// (row-level security: user_id = auth.uid()). Closings and GCI themselves come from reZEN and the MLS, never typed.

export const GOAL_KEYS: GoalKey[] = ["closings_goal", "referrals_goal", "gci_goal"];
const GOAL_MAX: Record<GoalKey, number> = { closings_goal: 1000, referrals_goal: 1000, gci_goal: 100_000_000 };
export const GOAL_WORD: Record<GoalKey, string> = { closings_goal: "Closings", referrals_goal: "Referrals", gci_goal: "GCI" };

export interface GoalChange {
  goals: Partial<Record<GoalKey, number>>;
  startsOn: string | null; // the goal year start, used only when the agent has no goals row yet
  assumptions: Assume | null; // the Income Map's own numbers (agent_goals.income_assumptions)
}

/** A goal value as typed: "20", "$500,000", "500000". Closings and referrals whole numbers, GCI any amount; 0 or more. */
export function goalValue(key: GoalKey, raw: unknown): number | { error: string } {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw.replace(/[$,\s]/g, "")) : NaN;
  const word = GOAL_WORD[key];
  if (!Number.isFinite(n) || n < 0) return { error: `${word}: type a number, 0 or more.` };
  if (key !== "gci_goal" && !Number.isInteger(n)) return { error: `${word}: a whole number.` };
  if (n > GOAL_MAX[key]) return { error: `${word}: that is more than ONE can keep (${fmtGoal(key, GOAL_MAX[key])}).` };
  return key === "gci_goal" ? Math.round(n * 100) / 100 : n;
}

/** The /api/goals POST body, checked; an error says which part to fix. */
export function goalChange(j: unknown): GoalChange | { error: string } {
  if (!j || typeof j !== "object") return { error: "Nothing to change." };
  const r = j as Record<string, unknown>;
  const goals: Partial<Record<GoalKey, number>> = {};
  const g = r.goals && typeof r.goals === "object" ? (r.goals as Record<string, unknown>) : {};
  for (const k of GOAL_KEYS) {
    if (!(k in g)) continue;
    const v = goalValue(k, g[k]);
    if (typeof v !== "number") return v;
    goals[k] = v;
  }
  const assumptions = r.income_assumptions && typeof r.income_assumptions === "object" ? readAssume(r.income_assumptions) : null;
  if (!Object.keys(goals).length && !assumptions) return { error: "Nothing to change." };
  const startsOn = isDay(r.starts_on) ? r.starts_on.slice(0, 10) : null;
  return { goals, startsOn, assumptions };
}

/** MASTER's answer when agent_goals.income_assumptions does not exist yet (another bot adds it): the Income Map then
 * keeps the agent's numbers in this browser, as before, and says so. */
export function missingColumn(e: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!e) return false;
  return e.code === "42703" || e.code === "PGRST204" || /income_assumptions/.test(e.message ?? "");
}

// ---- the Income Map --------------------------------------------------------------------------------

/** The retired ONE YOU orb (Parry, 16 Oct: the Income Map is part 3 of the Goals orb, "What to do each week"). */
export const INCOME_NODE = "go-income";
export const incomeKey = "one.income";

/** The agent's own numbers behind the map. Starting numbers until they change them. Kept in MASTER with the goals
 * (agent_goals.income_assumptions; Parry, 16 Oct, audit 3.5.3), in the browser only until that column exists. */
export interface Assume {
  avgGci: number | null; // null: from their closings so far, or the starting number
  referralShare: number | null; // 0..1 of closings that come from referrals; null: from their goals, or 50%
  convosPerClosing: number; // real conversations it takes to find one closing
  touchesPerConvo: number; // VIP touches it takes to start one real conversation
}
export const START: { avgGci: number; referralShare: number; convosPerClosing: number; touchesPerConvo: number } = {
  avgGci: 10_000,
  referralShare: 0.5,
  convosPerClosing: 25,
  touchesPerConvo: 3,
};
export const ASSUME_DEFAULT: Assume = { avgGci: null, referralShare: null, convosPerClosing: START.convosPerClosing, touchesPerConvo: START.touchesPerConvo };

/** Assumptions read back from storage, checked: anything out of range takes the starting number. */
export function readAssume(j: unknown): Assume {
  const r = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
  return {
    avgGci: num(r.avgGci, 500, 1_000_000),
    referralShare: num(r.referralShare, 0, 1),
    convosPerClosing: num(r.convosPerClosing, 1, 500) ?? START.convosPerClosing,
    touchesPerConvo: num(r.touchesPerConvo, 1, 50) ?? START.touchesPerConvo,
  };
}

export type IncomeKey = "income" | "closings" | "referrals" | "conversations" | "touches";

export interface IncomePart {
  key: IncomeKey;
  title: string;
  big: string; // what the orb shows
  unit: string; // under it
  line: string; // one line in the panel
  rows: { text: string; sub?: string }[];
  level: "today" | null; // yellow while the year is behind the pace it needs
}

export interface IncomeMap {
  goal: number; // the income goal for the goal year
  basis: string; // where the goal comes from
  weeksLeft: number;
  avgGci: { value: number; from: "you" | "closings" | "goals" | "start" };
  referralShare: { value: number; from: "you" | "goals" | "start" };
  closingsLeft: number;
  /** The referrals to go come straight from the referrals goal (the share of closings is then not used). */
  referralsFromGoal: boolean;
  perWeek: { conversations: number; touches: number };
  parts: IncomePart[];
}

/** From the income goal back to the week (Parry's roadmap: "from the income goal back to closings, referrals,
 * conversations and touches a week"). Null when there is no goal to work back from. */
export function incomeMap(goals: GoalFacts[], a: Assume, today: string): IncomeMap | null {
  const by = (k: GoalKey) => goals.find((g) => g.key === k);
  const gci = by("gci_goal"), cl = by("closings_goal"), rf = by("referrals_goal");
  const closed = Math.max(0, cl?.value ?? 0);
  const earned = Math.max(0, gci?.value ?? 0);
  // One set of goals feeds Goals and the Income Map (Parry, 16 Oct, audit 3.5.1: the map said 50 closings to go from
  // $500,000 at a $10,000 starting number while Goals said 20). GCI per closing: the agent's own number, else their
  // closings so far, else the GCI goal over the closings goal, else the starting number until sold homes come in from
  // reZEN or the MLS.
  const avg =
    a.avgGci != null
      ? { value: a.avgGci, from: "you" as const }
      : earned > 0 && closed > 0
        ? { value: Math.round(earned / closed), from: "closings" as const }
        : gci?.max && cl?.max
          ? { value: Math.round(gci.max / cl.max), from: "goals" as const }
          : { value: START.avgGci, from: "start" as const };
  let goal: number, basis: string;
  if (gci?.max) {
    goal = gci.max;
    basis = "Your GCI goal for this goal year";
  } else if (cl?.max) {
    goal = cl.max * avg.value;
    basis = `Your closings goal (${cl.max}) at ${money(avg.value)} each`;
  } else return null;
  const share =
    a.referralShare != null
      ? { value: a.referralShare, from: "you" as const }
      : rf?.max && cl?.max
        ? { value: Math.min(1, rf.max / cl.max), from: "goals" as const }
        : { value: START.referralShare, from: "start" as const };
  const y = yearShare((gci ?? cl ?? rf)?.from, (gci ?? cl ?? rf)?.to, today);
  const weeksLeft = Math.max(1, Math.round(y?.weeksLeft ?? 52));
  const sofar = gci?.max ? earned : closed * avg.value;
  const incomeLeft = Math.max(0, goal - sofar);
  // The closings goal, when set, is the number of closings (own deals only, Parry 12 Oct); else the income at GCI each.
  const closingsTotal = cl?.max ? cl.max : Math.ceil(goal / avg.value);
  const closingsLeft = cl?.max ? (incomeLeft > 0 ? Math.max(0, cl.max - closed) : 0) : Math.ceil(incomeLeft / avg.value);
  const referralsFromGoal = !!rf?.max;
  const referralsLeft = referralsFromGoal ? Math.max(0, rf!.max! - Math.max(0, rf!.value ?? 0)) : Math.ceil(closingsLeft * share.value);
  const convosLeft = closingsLeft * a.convosPerClosing;
  const conversations = closingsLeft ? Math.ceil(convosLeft / weeksLeft) : 0;
  const touches = Math.ceil(conversations * a.touchesPerConvo);
  // behind when the year has gone further than the income has
  const behind = !!y && y.share >= EARLY && sofar < goal * y.share;
  const lvl = behind && incomeLeft > 0 ? ("today" as const) : null;
  const avgWord =
    avg.from === "you" ? "your number" : avg.from === "closings" ? "your average so far" : avg.from === "goals" ? "your GCI goal over your closings goal" : "a starting number until your sold homes come in from reZEN or the MLS";
  const shareWord = share.from === "you" ? "your number" : share.from === "goals" ? "from your referrals and closings goals" : "a starting number: change it to yours";
  const mismatch = cl?.max && gci?.max && Math.abs(cl.max * avg.value - gci.max) >= avg.value;
  const parts: IncomePart[] = [
    {
      key: "income",
      title: "Income",
      big: money(goal),
      unit: "GOAL",
      line: incomeLeft ? `${money(sofar)} so far, ${money(incomeLeft)} to go in ${weeksLeft} weeks` : `Reached: ${money(sofar)}`,
      rows: [
        { text: basis, sub: `${money(goal)} this goal year.` },
        { text: `${money(sofar)} so far`, sub: gci?.max ? "GCI from your closings this goal year." : `${closed} closings at ${money(avg.value)} each.` },
        { text: `${money(incomeLeft)} to go`, sub: `${weeksLeft} weeks left in your goal year.` },
      ],
      level: lvl,
    },
    {
      key: "closings",
      title: "Closings",
      big: String(closingsLeft),
      unit: "TO GO",
      line: cl?.max ? `Your closings goal: ${closed} of ${cl.max}, at ${money(avg.value)} GCI each (${avgWord})` : `${closingsTotal} at ${money(avg.value)} each (${avgWord})`,
      rows: [
        cl?.max
          ? { text: `Closings goal: ${cl.max}`, sub: "The same goal as in Goals. Change it there or below." }
          : { text: `${closingsTotal} closings reach ${money(goal)}`, sub: `At ${money(avg.value)} GCI each: ${avgWord}.` },
        { text: `${closed} closed so far`, sub: `${closingsLeft} to go: ${perWeekWords("closings_goal", closingsLeft, weeksLeft)}.` },
        ...(cl?.max ? [{ text: `${money(avg.value)} GCI per closing`, sub: `${avgWord[0].toUpperCase()}${avgWord.slice(1)}.` }] : []),
        ...(mismatch ? [{ text: `${cl!.max} closings at ${money(avg.value)} make ${money(cl!.max! * avg.value)}`, sub: `Your GCI goal is ${money(gci!.max!)}: change one so they agree.` }] : []),
      ],
      level: lvl,
    },
    {
      key: "referrals",
      title: "Referrals",
      big: String(referralsLeft),
      unit: "TO GO",
      line: referralsFromGoal ? `Your referrals goal: ${Math.max(0, rf!.value ?? 0)} of ${rf!.max}` : `${Math.round(share.value * 100)}% of closings from referrals (${shareWord})`,
      rows: [
        referralsFromGoal
          ? { text: `Referrals goal: ${Math.max(0, rf!.value ?? 0)} of ${rf!.max}`, sub: "The same goal as in Goals, counted from your Referrals scoreboard." }
          : { text: `${referralsLeft} of the ${closingsLeft} closings to go from referrals`, sub: `${Math.round(share.value * 100)}% of closings: ${shareWord}.` },
        { text: "Where referrals come from", sub: "Your VIP-50: the people who already love you, touched every month." },
      ],
      level: null,
    },
    {
      key: "conversations",
      title: "Conversations",
      big: String(conversations),
      unit: "A WEEK",
      line: `${a.convosPerClosing} real conversations find one closing`,
      rows: [
        { text: `${conversations} conversations a week`, sub: `${closingsLeft} closings × ${a.convosPerClosing} conversations each, over ${weeksLeft} weeks.` },
        { text: "A real conversation", sub: "A call that connects, a coffee, a drop-by that turns into a talk. Not a voicemail." },
      ],
      level: null,
    },
    {
      key: "touches",
      title: "Touches",
      big: String(touches),
      unit: "A WEEK",
      line: `${a.touchesPerConvo} touches start one conversation`,
      rows: [
        { text: `${touches} VIP touches a week`, sub: `${conversations} conversations × ${a.touchesPerConvo} touches each.` },
        { text: "What counts", sub: "Calls, video texts, social, newsletters, mixer invites, face-to-faces, notes and drop-bys. Automatic drips don't." },
      ],
      level: null,
    },
  ];
  return { goal, basis, weeksLeft, avgGci: avg, referralShare: share, closingsLeft, referralsFromGoal, perWeek: { conversations, touches }, parts };
}

/** The goals as the graph carries them (live.ts puts the facts on each goal orb). */
export function goalFacts(nodes: GraphNode[]): GoalFacts[] {
  return nodes.filter((n) => n.type === "goal" && n.goal).map((n) => n.goal!);
}

/** The example agent's goal year, so the sales demo shows goals with pace and an Income Map. */
export function demoGoals(today: string): GoalFacts[] {
  const t = at(today);
  const from = new Date(t - 200 * DAY).toISOString().slice(0, 10);
  const to = new Date(t - 200 * DAY + 365 * DAY).toISOString().slice(0, 10);
  const share = 200 / 365;
  return [
    { key: "closings_goal", label: "Closings this goal year", value: 11, max: 24, pace: Math.round(24 * share * 10) / 10, from, to },
    { key: "referrals_goal", label: "Referrals this goal year", value: 7, max: 12, pace: Math.round(12 * share * 10) / 10, from, to },
    { key: "gci_goal", label: "GCI this goal year", value: 110_000, max: 240_000, pace: Math.round(240_000 * share), from, to },
  ];
}

const longDay = (ymd?: string) =>
  isDay(ymd) ? new Date(`${ymd.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : undefined;

/** ONE YOU's Goals group: one orb per goal, each with its pace line and its facts (for the Income Map). */
export function addGoals(add: (n: Omit<GraphNode, "importance"> & { importance?: number }) => void, goals: GoalFacts[], today: string) {
  if (!goals.length) return;
  const set = goals.some((g) => g.max != null);
  const gl = goalsLine(goals, today);
  add({
    id: "go-goals",
    type: "category",
    label: "Goals",
    secondaryLabel: gl.line,
    parentId: "go",
    product: "go",
    importance: 0.9,
    summary: set ? `Your goal year runs from ${longDay(goals[0].from) ?? "your start date"} to ${longDay(goals[0].to) ?? "a year later"}.` : "Set closings, referrals and GCI goals here to see your pace.",
  });
  goals.forEach((g, k) => {
    const f = (n: number) => fmtGoal(g.key, n);
    const ofMax = g.value == null ? null : g.max != null ? `${f(g.value)} / ${f(g.max)}` : f(g.value);
    const p = goalPace(g, today);
    add({
      id: `go-${g.key}`,
      type: "goal",
      label: g.label.replace(" this goal year", ""),
      secondaryLabel: g.max != null ? `${f(g.value ?? 0)} of ${f(g.max)}` : g.value ? `${f(g.value)} so far` : "No goal set",
      parentId: "go-goals",
      product: "go",
      importance: 1 - k * 0.05,
      status: g.max == null ? undefined : behindPace(g, today) ? "attention" : "healthy",
      stats: [{ label: g.label, value: ofMax ?? "0" }],
      pace: p ? { headline: p.headline, detail: p.detail } : undefined,
      goal: g,
    });
  });
}
