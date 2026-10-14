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

test("the line says the day, where they are and what is next", () => {
  assert.equal(onbLine(demoOnboarding()[1]), "Day 2 · 3 of 6 done · next: First VIPs");
});
