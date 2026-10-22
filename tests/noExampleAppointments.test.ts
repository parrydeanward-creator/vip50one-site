import { test } from "node:test";
import assert from "node:assert/strict";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { withPlanNode, CALENDAR_NODE } from "../lib/plan.ts";
import { indexGraph, childrenOf } from "../lib/graph/model.ts";
import { calendarBusy, customKey, dayKeys, DEMO_BUSY, type Busy } from "../lib/schedule.ts";

// Parry, 22 Oct: "I dont want the real estate appointments unless the user adds that, I did not." The example agent's
// appointments (lib/schedule.ts DEMO_BUSY, lib/graph/go.ts calendar, lib/outreach.ts demoEvents, lib/timeOff.ts) stay in
// /dashboard?demo=1; a signed-in agent's day, calendar and Day Clock hold only what is theirs.

const DEMO_TITLES = ["Listing appointment", "418 Oak Lane", "Showing with the Parks", "Coffee with Dave", "Coffee with Marcus Webb", "Willow Creek", "77 E Alta View", "88 Aspen Ct", "Sun 1-3pm", "Today 2:00pm", "Today 4:30pm"];

const ENV: SummaryEnvelope = {
  v: 1,
  product: "go",
  found: true,
  as_of: "2026-10-22T15:00:00Z",
  stats: [{ key: "daily_points", label: "Daily score", value: 4, max: 26 }],
  items: [{ id: "go:task:1", kind: "vip_touch", title: "Video text Kim Patel", detail: "Today's VIP-50 touch", urgency: "today", due: "2026-10-22", why: ["ONE GO scheduled this VIP touch for today."], link: "https://move.vip50one.com/dashboard", seen: null }],
};

test("a live-shaped graph, with Plan my day and the Calendar orb, holds none of the example appointments", () => {
  for (const pkg of ["complete", "relationship", "growth"] as const) {
    const g = withPlanNode(liveGraph(ENV, { pkg, firstName: "Kim", reachable: true, today: "2026-10-22" }), null, "empty");
    const text = JSON.stringify(g);
    for (const t of DEMO_TITLES) assert.ok(!text.includes(t), `${pkg}: ${t}`);
    const ix = indexGraph(g);
    // the Calendar orb opens the agent's own calendar; it never carries example appointments as children
    if (ix.byId.has(CALENDAR_NODE)) assert.equal(childrenOf(ix, CALENDAR_NODE).length, 0, pkg);
  }
});

test("a signed-in agent's day is planned round their own calendar only, never the example agent's", () => {
  // before ONE MOVE answers, or when it cannot: nothing, not the example appointments
  assert.deepEqual(calendarBusy(null, true, false), []);
  assert.deepEqual(calendarBusy(null, true, true), []);
  // ONE MOVE's answer is the calendar, as it is (empty means empty)
  assert.deepEqual(calendarBusy([], true, false), []);
  const mine: Busy[] = [{ start: "13:00", end: "15:30", title: "Real Estate Appointments & Showings", source: "calendar" }];
  assert.deepEqual(calendarBusy(mine, true, false), mine);
  // the example agent keeps its example appointments until it tells Pulse its own day
  assert.deepEqual(calendarBusy(null, false, false).map((b) => b.title), DEMO_BUSY.map((b) => b.title));
  assert.deepEqual(calendarBusy(null, false, true), []);
});

test("the example agent's day is kept apart in the browser, so it never comes back in a signed-in agent's day", () => {
  const live = dayKeys(true), demo = dayKeys(false);
  // a signed-in agent's keys are the ones already in use (nothing they saved is lost)
  assert.equal(live.custom, customKey);
  assert.equal(live.approved("2026-10-22"), "one.dayplan.2026-10-22");
  assert.equal(live.told("2026-10-22"), "one.told.2026-10-22");
  assert.equal(live.carry("2026-10-22"), "one.carry.2026-10-22");
  const all = (k: ReturnType<typeof dayKeys>) => [k.custom, k.approved("2026-10-22"), k.told("2026-10-22"), k.carry("2026-10-22")];
  for (const k of all(demo)) {
    assert.ok(k.startsWith("demo."), k);
    assert.ok(!all(live).includes(k), k);
  }
});
