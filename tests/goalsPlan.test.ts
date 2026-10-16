import { test } from "node:test";
import assert from "node:assert/strict";
import { goalsPlanUrl, goalsShown, readGoalsPlan } from "../lib/goalsPlan.ts";
import { ASSUME_DEFAULT, incomeMap, type GoalFacts } from "../lib/goals.ts";
import { forecast } from "../lib/forecast.ts";
import { goalsThree } from "../lib/oneYou.ts";
import type { Deal } from "../lib/deals.ts";

// ONE MOVE's `GET /api/brain/goals-plan` (vip50-web-crm#279) runs a copy of these same functions (lib/goals-plan.ts
// there) and sends their objects as JSON, so the answer is built here the same way and sent through JSON.
const today = "2026-10-16";
const year = { from: "2026-01-01", to: "2027-01-01" };
const goals: GoalFacts[] = [
  { key: "closings_goal", label: "Closings", value: 9, max: 20, pace: 15, from_referrals: 2, ...year },
  { key: "referrals_goal", label: "Referrals", value: 4, max: 10, pace: 8, ...year },
  { key: "gci_goal", label: "GCI", value: 90_000, max: 250_000, pace: 190_000, ...year },
];
const deal = { id: "d", contact: { id: "c9", name: "Jane Smith" }, side: "buy", status: "under_contract", dates: [{ key: "settlement", label: "Settlement", on: "2026-11-20", effectiveOn: null }] } as unknown as Deal;
const income = incomeMap(goals, ASSUME_DEFAULT, today);
const f = forecast([deal], ["hot", "warm", "cold"], income!.avgGci.value, today, [{ cls: "hot", name: "Amy Chen", contactId: "c1" }]);
const three = goalsThree(goals, income, f, today);
const answer = JSON.parse(
  JSON.stringify({
    today,
    goals: goals.map((g) => ({ ...g, pace_line: { headline: "x", detail: "y", projected: null } })),
    three,
    likely: three.likely ? { ...three.likely, month_lines: ["Oct 2026: $5,000"] } : null,
    income,
    assumptions: ASSUME_DEFAULT,
    forecast: f,
  }),
);

test("readGoalsPlan: ONE MOVE's answer reads back as the very objects the Brain works out", () => {
  assert.equal(goalsPlanUrl, "https://move.vip50one.com/api/brain/goals-plan");
  const p = readGoalsPlan(answer)!;
  assert.equal(p.today, today);
  assert.deepEqual(p.goals, goals);
  assert.deepEqual(p.three, three);
  assert.deepEqual(p.income, income);
  assert.deepEqual(p.forecast, f);
  assert.deepEqual(p.assumptions, ASSUME_DEFAULT);
});

test("readGoalsPlan: not an answer is null; broken parts drop out, never a throw", () => {
  for (const bad of [null, undefined, 3, "x", [], {}, { error: "Not signed in." }, { today, goals: [] }, { today: "x", goals: [], three }, { today, goals: [], three: { closed: {} } }])
    assert.equal(readGoalsPlan(bad), null);
  const thin = readGoalsPlan({ today, goals: [null, { key: "nope", label: "x" }, goals[0]], three: { closed: { line: "No goals set yet" }, likely: 4, weekly: { line: "x" } }, income: { goal: "a lot" }, forecast: { months: [] }, assumptions: { convosPerClosing: -1 } })!;
  assert.equal(thin.goals.length, 1);
  assert.deepEqual(thin.three, { closed: { line: "No goals set yet" }, likely: null, weekly: null });
  assert.equal(thin.income, null);
  assert.equal(thin.forecast, null);
  assert.equal(thin.assumptions.convosPerClosing, ASSUME_DEFAULT.convosPerClosing);
});

test("goalsShown: ONE MOVE's plan when it answered for today; the Brain's own otherwise (demo, no answer, stale)", () => {
  const own = { three: goalsThree([], null, null, today), goals: [], income: null, forecast: null };
  const p = readGoalsPlan(answer)!;
  const live = goalsShown(p, own, today);
  assert.equal(live.from, "move");
  assert.deepEqual(live.three, three);
  assert.deepEqual(live.goals, goals);
  assert.deepEqual(goalsShown(null, own, today), { ...own, from: "brain" });
  assert.deepEqual(goalsShown(undefined, own, today), { ...own, from: "brain" });
  // a page left open past midnight: yesterday's answer is not today's
  assert.equal(goalsShown(p, own, "2026-10-17").from, "brain");
});
