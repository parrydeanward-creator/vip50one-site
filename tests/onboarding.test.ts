import { test } from "node:test";
import assert from "node:assert/strict";
import { needsOf } from "../lib/needs.ts";
import { ONB_NODE, demoOnboarding, onbIdOf, onbLine, onbNodeId, readOnboarding, withOnboardingNodes } from "../lib/onboarding.ts";
import { TEAM_NODE } from "../lib/team.ts";
import type { GraphNode } from "../lib/graph/types.ts";

const base = (team: boolean) => ({
  nodes: [
    { id: "go", type: "product", label: "ONE YOU" },
    ...(team ? [{ id: TEAM_NODE, type: "feature", label: "Team", parentId: "go", status: "healthy" }] : []),
  ] as GraphNode[],
  edges: [],
});

test("reads the board and refuses junk", () => {
  assert.equal(readOnboarding({ error: "For the team lead and admins." }), null);
  const ms = readOnboarding({ members: [{ user_id: "u1", name: "Sam", day: 4, urgency: "today", steps: [{ key: "profile", label: "Profile and photo", done: true }], nudge_sms: "javascript:x" }, { name: "no id" }] })!;
  assert.equal(ms.length, 1);
  assert.equal(ms[0].urgency, "today");
  assert.equal(ms[0].nudgeSms, null, "only an sms: link");
  assert.equal(ms[0].of, 1);
});

test("Onboarding sits beside Team under ONE YOU (Team opens full screen) and pulses red and yellow up to it", () => {
  const g = withOnboardingNodes(base(true), demoOnboarding());
  const onb = g.nodes.find((n) => n.id === ONB_NODE)!;
  assert.equal(onb.parentId, "go");
  const need = needsOf(g.nodes);
  assert.equal(need.get(onbNodeId("o1"))?.level, "now");
  assert.equal(need.get("go")?.level, "now");
  assert.equal(need.get(TEAM_NODE), undefined);
  assert.equal(need.get(onbNodeId("o2")), undefined, "a member on track does not pulse");
  assert.equal(onbIdOf(onbNodeId("o2")), "o2");
});

test("no board, no orb", () => {
  const g = withOnboardingNodes(withOnboardingNodes(base(true), demoOnboarding()), []);
  assert.ok(!g.nodes.some((n) => n.id.startsWith(ONB_NODE)));
  assert.equal(withOnboardingNodes(base(false), null).nodes.length, 1);
});

// Rewritten 16 Oct (deliberate change, GETTING-STARTED §4): the board reads the Getting started list (11 counted
// steps), not its own six, so the example member's line counts of 11 and names the list's next step.
test("the line says the day, where they are and what is next", () => {
  assert.equal(onbLine(demoOnboarding()[1]), "Day 2 · 3 of 11 done · next: Connect your calendar");
});

test("each member's own Getting started list replaces the old six; yellow by day 3, red by day 7 with nothing done", async () => {
  const { withStart, startUrgency } = await import("../lib/onboarding.ts");
  const { demoStart } = await import("../lib/gettingStarted.ts");
  const m = readOnboarding({ members: [{ user_id: "u1", name: "Sam", day: 5, done: 2, of: 6, status: "2 of 6 done", next: "Calendar", urgency: null, steps: [{ key: "profile", label: "Profile and photo", done: true }] }] })![0];
  assert.equal(withStart(m, null), m, "unchanged until the list answers");
  const s = demoStart();
  const w = withStart(m, s);
  assert.equal(w.of, 11);
  assert.equal(w.done, 4);
  assert.equal(w.steps.length, 11, "the optional 90-Day Challenge is not on the lead's board");
  assert.equal(w.next, "Choose your first VIPs");
  assert.equal(w.status, "4 of 11 done");
  assert.equal(w.urgency, null);
  const none = { ...s, done: 0, steps: s.steps.map((x) => ({ ...x, done: false })) };
  assert.equal(withStart({ ...m, day: 2 }, none).urgency, null);
  assert.equal(withStart({ ...m, day: 3 }, none).urgency, "today");
  assert.equal(withStart({ ...m, day: 7 }, none).urgency, "now");
  assert.equal(startUrgency(9, 1), null, "one step done: no longer red");
  const demo = demoOnboarding();
  assert.deepEqual(demo.map((x) => [x.day, x.done, x.of, x.urgency]), [[8, 0, 11, "now"], [2, 3, 11, null]]);
});

test("the board lists who was removed in the last 30 days", async () => {
  const { readRemoved } = await import("../lib/onboarding.ts");
  assert.deepEqual(readRemoved({ removed: [{ user_id: "x", name: "Bo", left_at: "2026-10-15T18:00:00Z" }] }), ["Bo: removed on Oct 15"]);
  assert.deepEqual(readRemoved({ members: [] }), []);
});
