import { test } from "node:test";
import assert from "node:assert/strict";
import { COACHING_GROUP, GOALS_GROUP, HWC_IDS, TODAY_GROUP, WEEK_GROUP, YOU_GROUPS, groupLine, groupOneYou } from "../lib/youGroups.ts";
import { demoGraph, oneYouView } from "../lib/graph/demo.ts";
import { pathTo, indexGraph } from "../lib/graph/model.ts";
import { needsOf } from "../lib/needs.ts";
import { CALENDAR_NODE, PLAN_NODE, withPlanNode } from "../lib/plan.ts";
import { POWER_NODE, withPowerNode } from "../lib/powerHour.ts";
import { HABITS_NODE, demoHabitsDay, habitsToday, withHabitsNode } from "../lib/habits.ts";
import { WEEK_NODE, demoCommitments, withWeekNode } from "../lib/commitments.ts";
import { REVIEW_NODE, withReviewNode } from "../lib/review.ts";
import { CHALLENGE_NODE, GOALS_NODE, SCORE_NODE } from "../lib/oneYou.ts";
import { REFERRALS_NODE, demoReferrals, withReferralsNode } from "../lib/referrals.ts";
import { COACH_NODE, demoCoached, withCoachNode } from "../lib/coach.ts";
import { REVIEW_CALLS_NODE, withReviewCallsNode } from "../lib/reviewCalls.ts";
import { ADS_NODE, withAdsAlertNode } from "../lib/siteAlerts.ts";
import { GROWTH_NODE, withGrowthNodes } from "../lib/growthOrb.ts";
import { movePageId } from "../lib/moveMenu.ts";
import { arrivalFor, openTarget } from "../lib/deepLink.ts";
import { landing } from "../lib/deepLinkNode.ts";
import { withTourPages } from "../lib/examples/tourPages.ts";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import type { BusinessGraph } from "../lib/graph/types.ts";

// Parry, 19 Oct: "yes on your plan for one you. and hot/warm/cold under today". ONE YOU's 14 tools in groups: Today,
// This week, Goals, and Coaching for a coach; Your ads under ONE GROWTH; Ask AI about you on My Profile.

const TODAY = "2026-10-19";
const ALERTS = [{ kind: "ads_failed" as const, line: "Your ad did not reach Meta.", url: "https://sarah.vip50homes.com/ads" }];

/** The Brain's builders, each with its example answer, before the grouping pass (as components/brain/Brain.tsx layers them). */
function built(o: { coach?: boolean; calls?: boolean; growth?: boolean; base?: BusinessGraph } = {}): BusinessGraph {
  let g: BusinessGraph = o.base ?? oneYouView(demoGraph("complete"));
  g = withPlanNode(g, { items: [{ done: true }, { done: false }, { done: false }] });
  g = withWeekNode(g, demoCommitments(TODAY), 10);
  g = withCoachNode(g, o.coach === false ? null : demoCoached(TODAY), 10);
  g = withReviewNode(g, { cards: [{ level: "now" }, { level: "today" }] } as never);
  g = withPowerNode(g, [], null);
  g = withReferralsNode(g, demoReferrals(TODAY), TODAY);
  g = withHabitsNode(g, habitsToday(demoHabitsDay(TODAY), null, TODAY));
  g = withReviewCallsNode(g, o.calls !== false);
  g = withAdsAlertNode(g, ALERTS);
  g = withGrowthNodes(g as BusinessGraph & { rootId: string }, { growth: o.growth !== false, siteHost: null, teamHosts: [], likely: false });
  return g;
}

const kidsOf = (g: BusinessGraph, id: string) => g.nodes.filter((n) => n.parentId === id).map((n) => n.id);

test("ONE YOU shows Today, This week and Goals, plus Coaching for a coach", () => {
  const g = groupOneYou(built());
  assert.deepEqual(kidsOf(g, "go").sort(), [COACHING_GROUP, GOALS_GROUP, TODAY_GROUP, WEEK_GROUP].sort());
  // 20 Oct: the Calendar sits in Today beside Plan my day (Parry: "a better, more accessible way to reach the calendar")
  assert.deepEqual(new Set(kidsOf(g, TODAY_GROUP)), new Set([PLAN_NODE, CALENDAR_NODE, POWER_NODE, "go-today", HABITS_NODE, "move-9"]));
  assert.deepEqual(new Set(kidsOf(g, WEEK_GROUP)), new Set([WEEK_NODE, REVIEW_NODE, SCORE_NODE]));
  assert.deepEqual(new Set(kidsOf(g, GOALS_GROUP)), new Set([GOALS_NODE, REFERRALS_NODE, CHALLENGE_NODE]));
  assert.deepEqual(new Set(kidsOf(g, COACHING_GROUP)), new Set([COACH_NODE, REVIEW_CALLS_NODE]));
  // the names: Today's group, and the commitments tool inside This week
  assert.equal(g.nodes.find((n) => n.id === TODAY_GROUP)!.label, "Today");
  assert.equal(g.nodes.find((n) => n.id === WEEK_NODE)!.label, "Commitments");
  // Hot/Warm/Cold is drawn once, and no longer under ONE MOVE
  assert.equal(g.nodes.filter((n) => n.label === "Hot/Warm/Cold").length, 1);
  // edges follow the parents (one belongs_to edge per moved tool, from its group)
  for (const grp of YOU_GROUPS) for (const id of kidsOf(g, grp.id)) assert.deepEqual(g.edges.filter((e) => e.relationshipType === "belongs_to" && e.target === id).map((e) => e.source), [grp.id], id);
  // the order inside a group is the plan's: Plan my day first round Today
  const today = indexGraph(g).children.get(TODAY_GROUP)!.map((n) => n.id);
  assert.equal(today[0], PLAN_NODE);
});

test("Coaching shows only for a coach; an admin's Review calls is never lost", () => {
  const agent = groupOneYou(built({ coach: false, calls: false }));
  assert.equal(agent.nodes.some((n) => n.id === COACHING_GROUP), false);
  assert.deepEqual(kidsOf(agent, "go").sort(), [GOALS_GROUP, TODAY_GROUP, WEEK_GROUP].sort());
  const adminOnly = groupOneYou(built({ coach: false, calls: true }));
  assert.deepEqual(kidsOf(adminOnly, COACHING_GROUP), [REVIEW_CALLS_NODE]);
  const coachOnly = groupOneYou(built({ coach: true, calls: false }));
  assert.deepEqual(kidsOf(coachOnly, COACHING_GROUP), [COACH_NODE]);
});

test("a group pulses with its most urgent tool and carries their count; ONE YOU's total is the same tools'", () => {
  const before = built();
  const g = groupOneYou(before);
  const need = needsOf(g.nodes);
  for (const grp of YOU_GROUPS) {
    const kids = kidsOf(g, grp.id);
    const sum = kids.reduce((s, id) => s + (need.get(id)?.count ?? 0), 0);
    assert.equal(need.get(grp.id)?.count ?? 0, sum, `${grp.label} count`);
    const levels = kids.map((id) => need.get(id)?.level).filter(Boolean);
    const want = levels.includes("now") ? "now" : levels.includes("today") ? "today" : undefined;
    assert.equal(need.get(grp.id)?.level, want, `${grp.label} level`);
    const n = g.nodes.find((x) => x.id === grp.id)!;
    assert.equal(n.status, undefined, `${grp.label}: no state of its own, only its tools' (never one of Today's three)`);
  }
  // Weekly Review has a red card: This week is red
  assert.equal(need.get(WEEK_GROUP)?.level, "now");
  // ONE YOU: the same total as before, less Your ads (now ONE GROWTH's), plus Hot/Warm/Cold (now under Today)
  const was = needsOf(before.nodes);
  const hwc = was.get("move-9")?.count ?? 0;
  assert.equal(need.get("go")!.count, was.get("go")!.count - was.get(ADS_NODE)!.count + hwc);
  assert.equal(need.get(GROWTH_NODE)!.count, was.get(ADS_NODE)!.count);
  assert.equal(need.get(GROWTH_NODE)!.level, "now");
});

test("group lines in the subs' own style", () => {
  assert.equal(groupLine("today", 3), "3 things need you");
  assert.equal(groupLine("today", 1), "1 thing needs you");
  assert.equal(groupLine("today", 0), "All done today");
  assert.equal(groupLine("week", 4), "4 things need you");
  assert.equal(groupLine("week", 0), "Your week is on track");
  assert.equal(groupLine("goals", 3, 3), "3 behind pace");
  assert.equal(groupLine("goals", 4, 1), "4 things need you");
  assert.equal(groupLine("goals", 0), "On pace");
  assert.equal(groupLine("coaching", 0), "All good");
});

test("Your ads sits under ONE GROWTH, as ONE GROWTH's; without an open Growth orb it stays on ONE YOU", () => {
  const g = groupOneYou(built());
  const ads = g.nodes.find((n) => n.id === ADS_NODE)!;
  assert.equal(ads.parentId, GROWTH_NODE);
  assert.equal(ads.product, "growth");
  assert.ok(kidsOf(g, ADS_NODE).length > 0, "its alerts stay inside it");
  assert.ok(g.edges.some((e) => e.source === GROWTH_NODE && e.target === ADS_NODE));
  const locked = groupOneYou(built({ growth: false }));
  assert.equal(locked.nodes.find((n) => n.id === ADS_NODE)!.parentId, "go");
});

test("idempotent, and safe when the builders run again after it (each builder puts its tool back on ONE YOU)", () => {
  const once = groupOneYou(built());
  assert.deepEqual(groupOneYou(once), once);
  // Power Hour rebuilt on the grouped map, then grouped again: back in Today, one edge
  const again = groupOneYou(withPowerNode(once, [], null));
  assert.equal(again.nodes.find((n) => n.id === POWER_NODE)!.parentId, TODAY_GROUP);
  assert.equal(again.edges.filter((e) => e.target === POWER_NODE).length, 1);
  // ONE YOU locked: nothing is grouped
  const lockedGo = built();
  lockedGo.nodes = lockedGo.nodes.map((n) => (n.id === "go" ? { ...n, locked: true } : n));
  assert.equal(groupOneYou(lockedGo).nodes.some((n) => n.id === TODAY_GROUP), false);
});

const MASTER: SummaryEnvelope = {
  v: 1, product: "go", found: true,
  stats: [{ key: "closings_goal", label: "Closings this goal year", value: 4, max: 12, pace: 6, from: "2026-03-01", to: "2027-02-28" }],
  items: [],
  today_boxes: [{ key: "hot_contact", label: "Hot Contact", done: true, points: 1 }, { key: "warm_contact", label: "Warm Contact", done: false, points: 1 }, { key: "cold_contact", label: "Cold Contact", done: false, points: 1 }],
};

test("signed in: ONE MOVE's Hot/Warm/Cold moves under Today with its pulse", () => {
  const g = groupOneYou(built({ base: liveGraph(MASTER, { pkg: "complete", firstName: "P", reachable: true, today: TODAY }, {}) }));
  const hwc = g.nodes.find((n) => n.id === movePageId("/hot-warm-cold"))!;
  assert.equal(hwc.parentId, TODAY_GROUP);
  assert.equal(g.nodes.filter((n) => n.id === HWC_IDS[0] || n.id === HWC_IDS[1]).length, 1);
  const need = needsOf(g.nodes);
  assert.equal(need.get(hwc.id)?.count, 2);
  assert.ok((need.get(TODAY_GROUP)?.count ?? 0) >= 2);
  assert.deepEqual(new Set(kidsOf(g, GOALS_GROUP)), new Set([GOALS_NODE, REFERRALS_NODE, CHALLENGE_NODE]));
});

test("deep links to moved tools still land on them, inside their group", () => {
  const walk = groupOneYou(withTourPages(built()));
  const has = (id: string) => walk.nodes.some((n) => n.id === id);
  const locked = (id: string) => !!walk.nodes.find((n) => n.id === id)?.locked;
  const ix = indexGraph(walk);
  const through = (id: string) => pathTo(ix, id).map((n) => n.id);
  // ?open=goals and /dashboard/goals: the Goals tool, in Goals
  for (const a of [openTarget("goals"), arrivalFor("/goals", null)]) {
    const l = landing(a!, has, locked, true);
    assert.deepEqual(l, { id: GOALS_NODE, exact: true });
    assert.deepEqual(through(GOALS_NODE), ["one", "go", GOALS_GROUP, GOALS_NODE]);
  }
  // /dashboard/hot-warm-cold: the page, under Today (on the walk-through, inside the example Hot/Warm/Cold orb)
  const hwc = landing(arrivalFor("/hot-warm-cold", null)!, has, locked, true);
  assert.deepEqual(hwc, { id: movePageId("/hot-warm-cold"), exact: true });
  assert.ok(through(hwc!.id).includes(TODAY_GROUP));
  // ?open=growth:ads style names keep working; Your ads is inside ONE GROWTH
  assert.deepEqual(through(ADS_NODE), ["one", GROWTH_NODE, ADS_NODE]);
  // the groups by name
  for (const [name, id] of [["today", TODAY_GROUP], ["this-week", WEEK_GROUP], ["coaching", COACHING_GROUP]] as const) {
    assert.deepEqual(landing(openTarget(name)!, has, locked, true), { id, exact: true }, name);
    assert.deepEqual(arrivalFor(`/${name}`, null), openTarget(name));
  }
  // Coaching for someone who coaches nobody: ONE YOU, with a plain note
  const agent = groupOneYou(built({ coach: false, calls: false }));
  const l = landing(openTarget("coaching")!, (id) => agent.nodes.some((n) => n.id === id), () => false, true);
  assert.deepEqual(l, { id: "go", exact: false, note: "Coaching is for coaches." });
});
