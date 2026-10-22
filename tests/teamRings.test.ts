import { test } from "node:test";
import assert from "node:assert/strict";
import { TEAM_HUB, withTeamHub } from "../lib/teamHub.ts";
import { TEAM_NODE, demoTeam } from "../lib/team.ts";
import { WAR_NODE, demoWarRoom } from "../lib/warroom.ts";
import { demoOnboarding } from "../lib/onboarding.ts";
import { MAX_FACES, agentNodeId, readPeople } from "../lib/teamPeople.ts";
import { indexGraph, visibleSet, DESKTOP_BUDGET, PHONE_BUDGET, TEAM_HUB_BUDGET } from "../lib/graph/model.ts";
import { TEAM_ORB_R, layout, bounds, teamInner } from "../lib/brain/layout.ts";
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
    test(`One Team with ${n} agents at ${name}: two concentric rings, nothing overlaps, orbs no smaller than #335's`, () => {
      const { vs } = open(n);
      const placed = layout(vs, { teamRings: true });
      assert.equal(placed.length, vs.nodes.length, "every visible node is placed");
      // Deliberate change (Parry, 22 Oct): the two straight rows (#335) are replaced by two rings round the focus.
      for (let i = 0; i < placed.length; i++)
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i], b = placed[j];
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r + 10, `${a.id} overlaps ${b.id}`);
        }
      const focus = placed.find((p) => p.role === "focus")!;
      assert.deepEqual([focus.x, focus.y], [0, 0], "the focus is the centre");
      const kids = placed.filter((p) => p.role === "child");
      assert.equal(kids.length, n + 3);
      const dist = kids.map((k) => Math.hypot(k.x - focus.x, k.y - focus.y));
      const radii = [...new Set(dist.map((d) => Math.round(d * 1000)))].map((d) => d / 1000).sort((a, b) => a - b);
      assert.equal(radii.length, 2, "exactly two distinct ring radii");
      assert.ok(radii[0] < radii[1], "inner radius < outer radius");
      for (const d of dist) assert.ok(radii.some((r) => Math.abs(d - r) < 0.01), "every child sits on one of the two rings");
      const inner = dist.filter((d) => Math.abs(d - radii[0]) < 0.01).length;
      const outer = kids.length - inner;
      assert.ok(inner < outer, "the outer ring holds more (split by circumference)");
      // "space all of them the same" (Parry, 22 Oct): neighbour gap on each ring and the gap between the rings agree.
      const gapIn = 2 * radii[0] * Math.sin(Math.PI / inner), gapOut = 2 * radii[1] * Math.sin(Math.PI / outer), gapRings = radii[1] - radii[0];
      const gs = [gapIn, gapOut, gapRings];
      assert.ok(Math.max(...gs) / Math.min(...gs) <= 1.05, `equal spacing: ${gs.map((g) => g.toFixed(1))}`);
      assert.ok(kids.every((k) => k.r >= TEAM_ORB_R) && TEAM_ORB_R >= 54, "orbs are no smaller than #335's");
      // the three parts are on the inner ring
      for (const id of [TEAM_NODE, WAR_NODE]) {
        const p = placed.find((q) => q.id === id)!;
        assert.ok(Math.abs(Math.hypot(p.x, p.y) - radii[0]) < 0.01, `${id} is on the inner ring`);
      }
      // phone: starts fitted to the focus and inner ring at a readable scale
      if (phone) {
        const c = Math.max(fit(bounds(teamInner(placed), 20), { width: w, height: h - 254 }, 12).scale, 0.6);
        assert.ok(TEAM_ORB_R * c >= 27, "readable on a phone");
      }
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
