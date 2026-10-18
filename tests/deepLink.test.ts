import { test } from "node:test";
import assert from "node:assert/strict";
import { GBP_ADDRESS, arrivalFirstId, arrivalFor, isArrivalPath, openTarget, type Arrival } from "../lib/deepLink.ts";
import { arrivalExact, landing } from "../lib/deepLinkNode.ts";
import { MENU_ORB, MOVE_COACH, MOVE_GROUPS, MOVE_HIDDEN, MOVE_MENU, TEAM_LEADS_PAGE, moveGroupId, movePageId, withMoveCoach, withTeamLeadsPage } from "../lib/moveMenu.ts";
import { GBP_PATH } from "../lib/gbp.ts";
import { START_NODE, demoStart, withStartNode } from "../lib/gettingStarted.ts";
import { GOALS_NODE } from "../lib/oneYou.ts";
import { TEAM_HUB } from "../lib/teamHub.ts";
import { GROWTH_NODE, withGrowthNodes } from "../lib/growthOrb.ts";
import { DEALS_NODE, demoDeals, withDealsNode } from "../lib/deals.ts";
import { LIFE_NODE } from "../lib/lifeEvents.ts";
import { demoUpcoming, withLifeUpcomingNode } from "../lib/lifeUpcoming.ts";
import { OPP_NODE, withOpportunities } from "../lib/opportunities.ts";
import { demoEvents, demoOutreach, withEventsNodes, withOutreachNodes } from "../lib/outreach.ts";
import { demoLearn, withLearnNodes } from "../lib/learn.ts";
import { withDemoTrackers } from "../lib/examples/move.ts";
import { withExampleMoveTools } from "../lib/examples/move2.ts";
import { withTourPages } from "../lib/examples/tourPages.ts";
import { demoGraph, oneYouView } from "../lib/graph/demo.ts";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { afterSignIn, appTarget } from "../lib/landing.ts";
import type { BusinessGraph } from "../lib/graph/types.ts";

// Parry, 18 Oct: links to vip50one.com/dashboard/<page> and ?open=<thing> "just open the dashboard". Every address
// lands on its own page or orb, on the example agent's map and on a signed-in (live-shaped) one alike.

const TODAY = "2026-10-18";

test("the ids lib/deepLink.ts names are the modules' own", () => {
  assert.equal(GBP_PATH, `/dashboard${GBP_ADDRESS}`);
  assert.deepEqual((openTarget("getting-started") as { ids: string[] }).ids, [START_NODE]);
  assert.deepEqual((openTarget("goals") as { ids: string[] }).ids, [GOALS_NODE]);
  assert.deepEqual((openTarget("team") as { ids: string[] }).ids, [TEAM_HUB]);
  assert.deepEqual((openTarget("growth") as { ids: string[] }).ids, [GROWTH_NODE]);
  assert.deepEqual((openTarget("deals") as { ids: string[] }).ids, [DEALS_NODE]);
});

/** The Brain's own layering (components/brain/Brain.tsx), with each route's answer in. */
function finish(g: BusinessGraph, o: { admin?: boolean; team?: boolean; growth?: boolean } = {}): BusinessGraph {
  let x = withTeamLeadsPage(withMoveCoach(g, !!o.admin), !!o.team);
  x = withOutreachNodes(withEventsNodes(x, demoEvents(TODAY)), demoOutreach());
  x = withLearnNodes(x, demoLearn(TODAY));
  x = withDealsNode(withLifeUpcomingNode(x, demoUpcoming(TODAY)), demoDeals(TODAY), TODAY);
  x = withGrowthNodes(x, { growth: !!o.growth, siteHost: null, teamHosts: [], likely: false });
  x = withStartNode(x, demoStart());
  return withOpportunities(x);
}
const demoWalk = (o = {}) => finish(withExampleMoveTools(withDemoTrackers(withTourPages(oneYouView(demoGraph("complete"))))), o);
const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [{ key: "closings_goal", label: "Closings this goal year", value: 4, max: 12, pace: 6, from: "2026-03-01", to: "2027-02-28" }], items: [] };
const live = (pkg: "relationship" | "complete", o = {}) => finish(liveGraph(MASTER, { pkg, firstName: "P", reachable: true, today: TODAY }, {}), o);

const has = (g: BusinessGraph) => (id: string) => g.nodes.some((n) => n.id === id);
const locked = (g: BusinessGraph) => (id: string) => !!g.nodes.find((n) => n.id === id)?.locked;
const land = (g: BusinessGraph, a: Arrival | null, final = true) => (a ? landing(a, has(g), locked(g), final) : null);

const MENU_PATHS = [...MOVE_MENU, ...MOVE_HIDDEN].map((m) => m.path).filter((p) => p !== "/dashboard");

test("every ONE MOVE menu address names a place", () => {
  for (const p of [...MENU_PATHS, ...MOVE_COACH.pages.map((m) => m.path), TEAM_LEADS_PAGE.path, GBP_ADDRESS]) assert.ok(isArrivalPath(p), p);
  // the menu's group heads by their keys; /events stays Classic's VIP Events page
  for (const g of MOVE_GROUPS.filter((g) => g.key !== "events" && g.key !== "outreach" && g.key !== "learn")) {
    assert.deepEqual(arrivalFor(`/${g.key}`, null), { kind: "orb", ids: g.key === "people" ? [moveGroupId(g.key), "move"] : [moveGroupId(g.key)], label: g.label, fallback: ["move"], missing: `${g.label} isn't on your dashboard yet.` });
  }
  assert.equal(arrivalFor("/events", null)?.kind, "page");
  assert.equal(arrivalFor(GBP_ADDRESS, null)?.kind, "gbp");
  assert.equal(arrivalFor("/not-a-page", null), null);
  assert.equal(arrivalFor(null, null), null);
  assert.equal(arrivalFor("/dashboard", null), null);
});

for (const [name, g, demo] of [
  ["example agent (walk-through)", demoWalk({ growth: true }), true],
  ["signed-in agent, ONE Relationship", live("relationship"), false],
  ["signed-in agent, ONE Complete", live("complete", { growth: true }), false],
] as const) {
  test(`${name}: every menu address lands on its own orb`, () => {
    for (const p of MENU_PATHS) {
      const l = land(g, arrivalFor(p, null));
      assert.ok(l?.exact, `${p} -> ${JSON.stringify(l)}`);
      const want = MENU_ORB[p] ?? (p === "/outreach" ? moveGroupId("outreach") : p === "/learn" ? moveGroupId("learn") : null);
      if (want) assert.equal(l!.id, want, p);
      else if (g.nodes.some((n) => n.id === movePageId(p))) assert.equal(l!.id, movePageId(p), p);
    }
  });
  test(`${name}: ?open= names land on their orbs`, () => {
    const cases: [string, string][] = [
      // without ONE Growth a piece opens the locked Growth orb (its offer)
      ["growth", GROWTH_NODE], ["growth:ads", g.nodes.some((n) => n.id === "growth:ads") ? "growth:ads" : GROWTH_NODE], ["getting-started", START_NODE], ["profile", movePageId("/profile")],
      ["youone", "go"], ["move", "move"], ["marquee", "marquee"], ["showly", "showly"], ["open", "open"], ["goals", GOALS_NODE],
      ["deals", DEALS_NODE], ["people", demo ? "move" : moveGroupId("people")], ["trackers", moveGroupId("trackers")], ["events", moveGroupId("events")],
      ["outreach", moveGroupId("outreach")], ["learn", moveGroupId("learn")], ["opportunities", OPP_NODE], ["life-events", LIFE_NODE],
    ];
    for (const [open, id] of cases) assert.deepEqual(land(g, arrivalFor(null, open)), { id, exact: true }, open);
    // the address wins over ?open=
    assert.equal(land(g, arrivalFor("/weekly", "growth"))?.id, arrivalExact(arrivalFor("/weekly", null)!, has(g)));
  });
  test(`${name}: group heads by address`, () => {
    // the example agent has no People orb: ONE MOVE itself holds its contacts and VIPs
    for (const k of ["people", "trackers"]) assert.deepEqual(land(g, arrivalFor(`/${k}`, null)), { id: demo && k === "people" ? "move" : moveGroupId(k), exact: true });
  });
}

test("a place that is not on this agent's map: its locked orb, or the nearest orb with a plain line, never the bare map", () => {
  const rel = live("relationship");
  // a product outside the package: the locked orb itself (its panel says how to add it)
  assert.deepEqual(land(rel, arrivalFor(null, "marquee")), { id: "marquee", exact: true });
  assert.ok(rel.nodes.find((n) => n.id === "marquee")?.locked);
  // ONE Growth without Growth: the locked Growth orb, for the orb and for a piece
  assert.deepEqual(land(rel, arrivalFor(null, "growth")), { id: GROWTH_NODE, exact: true });
  assert.deepEqual(land(rel, arrivalFor(null, "growth:ads")), { id: GROWTH_NODE, exact: true });
  // Team for someone who is not a lead: waits for the team answer, then ONE YOU with the line
  assert.equal(land(rel, arrivalFor(null, "team"), false), null);
  assert.deepEqual(land(rel, arrivalFor(null, "team"), true), { id: "go", exact: false, note: "Team is for team leads." });
  // Coach pages for a non-admin: ONE MOVE with the line; for an admin, the page
  assert.deepEqual(land(rel, arrivalFor("/admin/revenue", null)), { id: "move", exact: false, note: "Coach pages are for admins." });
  assert.deepEqual(land(live("complete", { admin: true }), arrivalFor("/admin/revenue", null)), { id: movePageId("/admin/revenue"), exact: true });
  // Team Leads: there once the team answer says so
  assert.equal(land(rel, arrivalFor("/team-leads", null), false), null);
  assert.deepEqual(land(live("complete", { team: true }), arrivalFor("/team-leads", null)), { id: movePageId("/team-leads"), exact: true });
  // Deals before its route answers: waits; if it never does, People with the line
  const noDeals = withDealsNode(rel, null, TODAY);
  assert.equal(land(noDeals, arrivalFor("/deals", null), false), null);
  assert.deepEqual(land(noDeals, arrivalFor("/deals", null), true), { id: moveGroupId("people"), exact: false, note: "Deals isn't on your dashboard yet." });
});

test("ONE MOVE locked: a ONE MOVE page lands on the locked ONE MOVE orb at once", () => {
  const g = demoWalk();
  const nodes = g.nodes.filter((n) => n.parentId !== "move" && !n.id.startsWith("move-")).map((n) => (n.id === "move" ? { ...n, locked: true } : n));
  const shut = { ...g, nodes };
  assert.deepEqual(land(shut, arrivalFor("/weekly", null), false), { id: "move", exact: false, note: "" });
});

test("the first paint opens a page whose orb is already there", () => {
  assert.equal(arrivalFirstId(arrivalFor("/profile", null)), movePageId("/profile"));
  assert.equal(arrivalFirstId(arrivalFor(null, "growth")), GROWTH_NODE);
  assert.equal(arrivalFirstId(arrivalFor(GBP_ADDRESS, null)), null);
});

test("unknown ?open= names open nothing", () => {
  for (const bad of ["", "nope", "../x", "admin/secret", "javascript:alert(1)"]) assert.equal(openTarget(bad), null, bad);
});

test("signing in keeps the place asked for: every address and a known ?open=", () => {
  assert.equal(appTarget("/dashboard/opportunities"), "/dashboard/opportunities");
  assert.equal(appTarget("/dashboard/google-profile"), "/dashboard/google-profile");
  assert.equal(appTarget("/dashboard/people"), "/dashboard/people");
  assert.equal(appTarget("/dashboard?open=growth"), "/dashboard?open=growth");
  assert.equal(appTarget("/dashboard?open=growth%3Aads"), "/dashboard?open=growth%3Aads");
  assert.equal(appTarget("/dashboard?open=nope"), "/dashboard");
  assert.equal(appTarget("/dashboard?open=growth&x=1"), "/dashboard?open=growth");
  assert.equal(afterSignIn("/dashboard?open=getting-started", "/dashboard/profile"), "/dashboard?open=getting-started");
  assert.equal(afterSignIn("/dashboard/deals", null), "/dashboard/deals");
  for (const p of MENU_PATHS) assert.equal(appTarget(`/dashboard${p}`), `/dashboard${p}`, p);
});
