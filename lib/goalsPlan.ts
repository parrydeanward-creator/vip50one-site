import type { Assume, GoalFacts, GoalKey, IncomeKey, IncomeMap, IncomePart } from "./goals.ts";
import { readAssume } from "./goals.ts";
import type { Forecast, MonthForecast, Who } from "./forecast.ts";
import type { GoalsThree } from "./oneYou.ts";

// Goals as ONE MOVE works them out (vip50-web-crm#279, Parry 16 Oct: one source of numbers for Classic and the Brain):
// `GET /api/brain/goals-plan` -> `{today, goals[] (with pace_line), three, likely (+ month_lines), income, assumptions,
// forecast}`. ONE MOVE's lib/goals-plan.ts is a copy of the Brain's lib/goals.ts, lib/forecast.ts and oneYou goalsThree,
// so the shapes are the same camelCase objects. For a signed-in agent the Goals orb and the opened Goals read this answer;
// the Brain's own working-out stays as the fallback (ONE MOVE not answering, or an answer from another day) and for the
// example agent. Read only: the Income Map's numbers are still saved through the Brain's /api/goals (agent_goals).

const MOVE_URL = "https://move.vip50one.com";
export const goalsPlanUrl = `${MOVE_URL}/api/brain/goals-plan`;

export interface GoalsPlan {
  today: string;
  goals: GoalFacts[];
  three: GoalsThree;
  income: IncomeMap | null;
  assumptions: Assume;
  forecast: Forecast | null;
}

const GOAL_KEYS: GoalKey[] = ["closings_goal", "referrals_goal", "gci_goal"];
const INCOME_KEYS: IncomeKey[] = ["income", "closings", "referrals", "conversations", "touches"];
type R = Record<string, unknown>;
const obj = (v: unknown): R | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as R) : null);
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const numOrNull = (v: unknown): number | null => (fin(v) ? v : null);
const text = (v: unknown, max = 300): string | null => (typeof v === "string" ? v.slice(0, max) : null);

function readGoal(v: unknown): GoalFacts | null {
  const g = obj(v);
  if (!g || !GOAL_KEYS.includes(g.key as GoalKey) || typeof g.label !== "string") return null;
  const out: GoalFacts = { key: g.key as GoalKey, label: g.label.slice(0, 60), value: numOrNull(g.value), max: numOrNull(g.max), pace: numOrNull(g.pace) };
  if (isDay(g.from)) out.from = g.from.slice(0, 10);
  if (isDay(g.to)) out.to = g.to.slice(0, 10);
  if (g.from_referrals !== undefined) out.from_referrals = numOrNull(g.from_referrals);
  return out;
}

function readWho(v: unknown): Who | null {
  const w = obj(v);
  if (!w || typeof w.name !== "string" || !["contract", "hot", "warm"].includes(w.why as string)) return null;
  return { name: w.name.slice(0, 60), contactId: typeof w.contactId === "string" ? w.contactId : null, why: w.why as Who["why"] };
}

function readMonth(v: unknown): MonthForecast | null {
  const m = obj(v);
  if (!m || !isDay(m.month) || !fin(m.total)) return null;
  return {
    month: m.month.slice(0, 10),
    contract: fin(m.contract) ? m.contract : 0,
    hot: fin(m.hot) ? m.hot : 0,
    warm: fin(m.warm) ? m.warm : 0,
    total: m.total,
    settling: Array.isArray(m.settling) ? m.settling.filter((s): s is string => typeof s === "string").slice(0, 20) : [],
    who: Array.isArray(m.who) ? m.who.map(readWho).filter((w): w is Who => !!w).slice(0, 30) : [],
  };
}

function readForecast(v: unknown): Forecast | null {
  const f = obj(v);
  if (!f || !Array.isArray(f.months)) return null;
  const months = f.months.map(readMonth).filter((m): m is MonthForecast => !!m);
  if (!months.length) return null;
  const c = obj(f.counts) ?? {};
  const n = (x: unknown) => (fin(x) ? x : 0);
  return { months: months.slice(0, 12), later: n(f.later), total12: n(f.total12), avgGci: n(f.avgGci), counts: { contract: n(c.contract), hot: n(c.hot), warm: n(c.warm), cold: n(c.cold) } };
}

function readIncome(v: unknown): IncomeMap | null {
  const m = obj(v);
  if (!m || !fin(m.goal) || !fin(m.weeksLeft) || !fin(m.closingsLeft)) return null;
  const avg = obj(m.avgGci), share = obj(m.referralShare), pw = obj(m.perWeek);
  if (!avg || !fin(avg.value) || !share || !fin(share.value) || !pw || !fin(pw.conversations) || !fin(pw.touches)) return null;
  const parts: IncomePart[] = [];
  for (const p of Array.isArray(m.parts) ? m.parts : []) {
    const x = obj(p);
    if (!x || !INCOME_KEYS.includes(x.key as IncomeKey)) continue;
    const rows = Array.isArray(x.rows)
      ? x.rows.map(obj).filter((r): r is R => !!r && typeof r.text === "string").map((r) => (typeof r.sub === "string" ? { text: r.text as string, sub: r.sub } : { text: r.text as string }))
      : [];
    parts.push({ key: x.key as IncomeKey, title: text(x.title, 80) ?? "", big: text(x.big, 40) ?? "", unit: text(x.unit, 60) ?? "", line: text(x.line) ?? "", rows, level: x.level === "today" ? "today" : null });
  }
  return {
    goal: m.goal,
    basis: text(m.basis) ?? "",
    weeksLeft: m.weeksLeft,
    avgGci: { value: avg.value, from: (["you", "closings", "goals", "start"] as const).find((k) => k === avg.from) ?? "start" },
    referralShare: { value: share.value, from: (["you", "goals", "start"] as const).find((k) => k === share.from) ?? "start" },
    closingsLeft: m.closingsLeft,
    referralsFromGoal: m.referralsFromGoal === true,
    perWeek: { conversations: pw.conversations, touches: pw.touches },
    parts,
  };
}

function readThree(v: unknown): GoalsThree | null {
  const t = obj(v);
  const closed = obj(t?.closed);
  if (!t || !closed || typeof closed.line !== "string") return null;
  let likely: GoalsThree["likely"] = null;
  const l = obj(t.likely);
  if (l && typeof l.line === "string" && Array.isArray(l.months)) {
    const months = l.months.map(readMonth).filter((m): m is MonthForecast => !!m).slice(0, 3);
    likely = { line: l.line, months, next3: fin(l.next3) ? l.next3 : months.reduce((s, m) => s + m.total, 0), gapLine: typeof l.gapLine === "string" ? l.gapLine : null };
  }
  let weekly: GoalsThree["weekly"] = null;
  const w = obj(t.weekly);
  if (w && typeof w.line === "string" && fin(w.conversations) && fin(w.touches) && fin(w.closingsLeft)) {
    weekly = { line: w.line, conversations: w.conversations, touches: w.touches, closingsLeft: w.closingsLeft };
  }
  return { closed: { line: closed.line }, likely, weekly };
}

/** A goals-plan answer, checked; null when it is not one (an error, a sign-in page). Never throws. */
export function readGoalsPlan(j: unknown): GoalsPlan | null {
  const r = obj(j);
  if (!r || !isDay(r.today) || !Array.isArray(r.goals)) return null;
  const three = readThree(r.three);
  if (!three) return null;
  return {
    today: r.today.slice(0, 10),
    goals: r.goals.map(readGoal).filter((g): g is GoalFacts => !!g),
    three,
    income: readIncome(r.income),
    assumptions: readAssume(r.assumptions),
    forecast: readForecast(r.forecast),
  };
}

export interface GoalsShown {
  three: GoalsThree;
  goals: GoalFacts[];
  income: IncomeMap | null;
  forecast: Forecast | null;
  from: "move" | "brain";
}

/** What the Goals orb and the opened Goals show: ONE MOVE's plan when it answered for today, else the Brain's own
 * working-out (the example agent, ONE MOVE not answering, or a page left open past midnight). */
export function goalsShown(plan: GoalsPlan | null | undefined, own: Omit<GoalsShown, "from">, today: string): GoalsShown {
  if (plan && plan.today === today) return { three: plan.three, goals: plan.goals, income: plan.income, forecast: plan.forecast, from: "move" };
  return { ...own, from: "brain" };
}
