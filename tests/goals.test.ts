import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { ASSUME_DEFAULT, INCOME_NODE, demoGoals, goalPace, incomeMap, perWeekWords, readAssume, withIncomeNode, yearShare, type GoalFacts } from "../lib/goals.ts";

const year = { from: "2026-01-01", to: "2027-01-01" };
const g = (key: GoalFacts["key"], value: number | null, max: number | null, pace: number | null = null): GoalFacts => ({ key, label: key, value, max, pace, ...year });

test("yearShare: how far through the agent's own goal year", () => {
  const y = yearShare("2026-01-01", "2027-01-01", "2026-07-02")!;
  assert.ok(Math.abs(y.share - 0.5) < 0.01);
  assert.ok(Math.abs(y.weeksLeft - 26) < 0.5);
  assert.equal(yearShare(undefined, undefined, "2026-07-02"), null);
  assert.equal(yearShare("2026-01-01", undefined, "2027-06-01")!.share, 1);
});

test("goalPace: on pace for N of M, from the share of the year gone", () => {
  const p = goalPace(g("closings_goal", 11, 25, 12.5), "2026-07-02")!;
  assert.equal(p.headline, "On pace for 22 of 25");
  assert.match(p.detail, /^14 to go in 26 weeks: about 0\.5 a week|^14 to go in 26 weeks: about 1 every 2 weeks/);
  assert.match(p.detail, /By today you'd be at 12\.5\.$/);
});

test("goalPace: ahead, reached, and too early to say", () => {
  assert.equal(goalPace(g("closings_goal", 15, 25), "2026-07-02")!.headline, "On pace for 30 of 25: ahead");
  assert.equal(goalPace(g("referrals_goal", 12, 12), "2026-07-02")!.headline, "Goal reached: 12 of 12");
  assert.match(goalPace(g("closings_goal", 1, 25), "2026-01-08")!.headline, /^Goal year just started/);
  assert.equal(goalPace(g("closings_goal", 3, null), "2026-07-02"), undefined);
});

test("goalPace: GCI in dollars, rounded to the thousand", () => {
  const p = goalPace(g("gci_goal", 96_000, 240_000), "2026-07-02")!;
  assert.equal(p.headline, "On pace for $193,000 of $240,000"); // 182 of 365 days gone
  assert.match(p.detail, /\$144,000 to go in 26 weeks: about \$5,\d{3} a week/);
});

test("perWeekWords: plain words for small rates", () => {
  assert.equal(perWeekWords("closings_goal", 4, 20), "about 1 every 5 weeks");
  assert.equal(perWeekWords("closings_goal", 30, 10), "about 3 a week");
  assert.equal(perWeekWords("closings_goal", 0, 10), "nothing more needed");
});

test("incomeMap: from the GCI goal back to the week", () => {
  const m = incomeMap([g("gci_goal", 100_000, 250_000), g("closings_goal", 10, 25), g("referrals_goal", 6, 15)], ASSUME_DEFAULT, "2026-07-02")!;
  assert.equal(m.avgGci.value, 10_000); // GCI so far / closings so far
  assert.equal(m.avgGci.from, "closings");
  assert.equal(m.referralShare.value, 0.6); // from the referrals and closings goals
  assert.equal(m.closingsLeft, 15);
  assert.equal(m.weeksLeft, 26);
  assert.equal(m.perWeek.conversations, Math.ceil((15 * 25) / 26));
  assert.equal(m.perWeek.touches, m.perWeek.conversations * 3);
  assert.deepEqual(m.parts.map((p) => p.key), ["income", "closings", "referrals", "conversations", "touches"]);
  assert.equal(m.parts.find((p) => p.key === "referrals")!.big, "9");
});

test("incomeMap: a closings goal alone, the agent's own numbers, and no goal at all", () => {
  const m = incomeMap([g("closings_goal", 4, 20)], { ...ASSUME_DEFAULT, avgGci: 12_000, convosPerClosing: 10 }, "2026-07-02")!;
  assert.equal(m.goal, 240_000);
  assert.match(m.basis, /closings goal \(20\) at \$12,000 each/);
  assert.equal(m.closingsLeft, 16);
  assert.equal(m.perWeek.conversations, Math.ceil(160 / 26));
  assert.equal(incomeMap([g("referrals_goal", 2, 10)], ASSUME_DEFAULT, "2026-07-02"), null);
});

test("incomeMap: reached means nothing more a week", () => {
  const m = incomeMap([g("gci_goal", 260_000, 250_000), g("closings_goal", 26, 25)], ASSUME_DEFAULT, "2026-09-01")!;
  assert.equal(m.closingsLeft, 0);
  assert.equal(m.perWeek.conversations, 0);
  assert.ok(m.parts.every((p) => !p.level));
});

test("readAssume: anything out of range takes the starting number", () => {
  assert.deepEqual(readAssume(null), ASSUME_DEFAULT);
  const a = readAssume({ avgGci: 9500, referralShare: 2, convosPerClosing: -1, touchesPerConvo: 4 });
  assert.equal(a.avgGci, 9500);
  assert.equal(a.referralShare, null);
  assert.equal(a.convosPerClosing, ASSUME_DEFAULT.convosPerClosing);
  assert.equal(a.touchesPerConvo, 4);
});

test("withIncomeNode: one orb under ONE YOU, gone when locked or no goal", () => {
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const m = incomeMap(demoGoals("2026-10-06"), ASSUME_DEFAULT, "2026-10-06");
  const g1 = withIncomeNode(base, m);
  const n = g1.nodes.find((x) => x.id === INCOME_NODE)!;
  assert.match(n.secondaryLabel!, /^\d+ conversations a week$/);
  assert.equal(withIncomeNode(withIncomeNode(base, m), m).nodes.filter((x) => x.id === INCOME_NODE).length, 1);
  assert.equal(withIncomeNode(base, null).nodes.length, 1);
  assert.equal(withIncomeNode({ ...base, nodes: [{ ...base.nodes[0], locked: true }] }, m).nodes.length, 1);
});
