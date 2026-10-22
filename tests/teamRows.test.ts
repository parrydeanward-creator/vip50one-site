import { test } from "node:test";
import assert from "node:assert/strict";
import { TEAM_HUB, withTeamHub } from "../lib/teamHub.ts";
import { TEAM_NODE, demoTeam } from "../lib/team.ts";
import { WAR_NODE, demoWarRoom } from "../lib/warroom.ts";
import { demoOnboarding } from "../lib/onboarding.ts";
import { MAX_FACES, agentNodeId, readPeople } from "../lib/teamPeople.ts";
import { indexGraph, visibleSet, DESKTOP_BUDGET, PHONE_BUDGET, TEAM_HUB_BUDGET } from "../lib/graph/model.ts";
import { TEAM_ORB_R, TEAM_ROWS, layout, bounds } from "../lib/brain/layout.ts";
import { fit } from "../lib/brain/camera.ts";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";

const now = Date.parse("2026-10-22T18:00:00Z");
const base = () => ({
  nodes: [
    { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
    { id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 0.95 },
  ] as GraphNode[],
  edges: [] as GraphEdge[],
});

// A live-shaped answer from ONE MOVE's /api/brain/team/people: stalled and behind sort first, so the on-track agents
// (Annette among them) come last, which is where a cap used to cut them.
const NAMES = ["Angelina", "Travis", "Darian", "John", "Sherrie", "Maria", "Luis", "Priya", "Kenji", "Olu", "Beth", "Carlos", "Dana", "Evan", "Fatima", "Gus", "Hana", "Annette", "Ivy", "Jo", "Kai", "Lena", "Mo", "Nia"];
const people = (n: number) =>
  readPeople({
    team: { name: "Luxury Agency" },
    people: NAMES.slice(0, n).map((first_name, i) => ({
      agent_id: `a${i}`, first_name, photo_url: null, week_score: 100 - i, standing: i < 2 ? "stalled" : i < 5 ? "behind" : "on_track", new_30d: false,
      vip_touches: 3, commitments_kept: 0.5, leads_held: 1, avg_reach_minutes: 9, getting_started: null,
    })),
  })!;
const hubGraph = (n: number) => withTeamHub(base(), { lead: true, team: demoTeam("2026-10-12"), war: demoWarRoom(now), onb: demoOnboarding(), now, people: people(n) });

const open = (n: number, budget = TEAM_HUB_BUDGET) => {
  const g = hubGraph(n);
  return { g, vs: visibleSet(indexGraph(g as never), TEAM_HUB, budget) };
};

for (const n of [18, 24]) {
  test(`One Team with ${n} agents: every face is a node and none is hidden`, () => {
    const { g, vs } = open(n);
    const faces = g.nodes.filter((x) => x.id.startsWith("team-agent:"));
    assert.equal(faces.length, n);
    for (let i = 0; i < n; i++) assert.ok(faces.some((f) => f.id === agentNodeId(`a${i}`)), `face ${i}`);
    assert.ok(faces.some((f) => f.label === "Annette"), "Annette is a node");
    const shown = new Set(vs.nodes.filter((v) => v.role === "child").map((v) => v.node.id));
    assert.equal(vs.hiddenChildren, 0);
    assert.equal(shown.size, n + 3, "3 parts + every face");
    for (const f of faces) assert.ok(shown.has(f.id), `${f.label} is in the visible set`);
    assert.ok(shown.has(TEAM_NODE) && shown.has(WAR_NODE));
  });

  for (const [name, w, h, phone] of [["1440x900", 1440, 900, false], ["390x844", 390, 844, true]] as const) {
    test(`One Team with ${n} agents at ${name}: two rows, no orb overlaps another, orbs larger than the ring`, () => {
      const { vs } = open(n);
      const placed = layout(vs, { teamRows: phone ? "start" : "centre" });
      assert.equal(placed.length, vs.nodes.length, "every visible node is placed");
      for (let i = 0; i < placed.length; i++)
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i], b = placed[j];
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r + 8, `${a.id} overlaps ${b.id}`);
        }
      const kids = placed.filter((p) => p.role === "child");
      assert.equal(new Set(kids.map((k) => k.y)).size, TEAM_ROWS, "exactly two rows");
      const b = bounds(placed, 20);
      const c = phone ? { scale: Math.max(fit(b, { width: w, height: h - 254 }, 12).scale, 0.6) } : fit(b, { width: w - 420, height: h }, 40);
      if (!phone) assert.ok((b.maxX - b.minX) * c.scale <= w - 420, "all of it fits beside the card");
      // Today's ring (desktop budget, 18 children cut) at the same screen, rail included on desktop.
      const old = layout(visibleSet(indexGraph(open(n).g as never), TEAM_HUB, phone ? PHONE_BUDGET : DESKTOP_BUDGET));
      const ob = bounds(old, 20);
      const oc = phone ? fit(ob, { width: w, height: h - 254 }, 12) : fit(ob, { width: w - 420 - 250, height: h - 160 }, 40);
      assert.ok(TEAM_ORB_R * c.scale > 34 * oc.scale * (n === 18 ? 1.5 : 1.2), `larger: ${TEAM_ORB_R * c.scale} vs ${34 * oc.scale}`);
      if (phone) assert.ok(TEAM_ORB_R * c.scale >= 27, "readable on a phone");
    });
  }
}

test("the old budgets did cut faces (why the budget is widened for the Team orb)", () => {
  const { g } = open(18);
  const ix = indexGraph(g as never);
  assert.ok(visibleSet(ix, TEAM_HUB, DESKTOP_BUDGET).hiddenChildren > 0);
  assert.ok(visibleSet(ix, TEAM_HUB, PHONE_BUDGET).hiddenChildren > 0);
  assert.ok(MAX_FACES + 3 <= TEAM_HUB_BUDGET.children);
});
