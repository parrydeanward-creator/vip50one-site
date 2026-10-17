import { test } from "node:test";
import assert from "node:assert/strict";
import { TEAM_HUB, isTeamLead, partLines, withTeamHub } from "../lib/teamHub.ts";
import { TEAM_NODE, demoTeam } from "../lib/team.ts";
import { WAR_NODE, demoWarRoom } from "../lib/warroom.ts";
import { ONB_NODE, demoOnboarding, onbNodeId } from "../lib/onboarding.ts";
import { needsOf } from "../lib/needs.ts";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";

const now = Date.parse("2026-10-16T18:00:00Z");
// A graph that still carries the old parts under ONE YOU: they must leave it.
const base = (locked = false) => ({
  nodes: [
    { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
    { id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 0.95, locked },
    { id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 0.9 },
    { id: TEAM_NODE, type: "feature", label: "Team", parentId: "go", product: "go", importance: 0.98 },
    { id: WAR_NODE, type: "feature", label: "War room", parentId: "go", product: "go", importance: 0.9 },
    { id: ONB_NODE, type: "feature", label: "Onboarding", parentId: "go", product: "go", importance: 0.9 },
  ] as GraphNode[],
  edges: [] as GraphEdge[],
});
const input = (lead: boolean) => ({ lead, team: demoTeam("2026-10-12"), war: demoWarRoom(now), onb: demoOnboarding(), now });

test("one Team orb beside ONE YOU for a team lead, holding Leaderboard, War room and Onboarding", () => {
  const g = withTeamHub(base(), input(true));
  const hub = g.nodes.find((n) => n.id === TEAM_HUB)!;
  assert.equal(hub.parentId, "one", "its own orb on the main map");
  const ring = g.nodes.filter((n) => n.parentId === "one").sort((a, b) => b.importance - a.importance).map((n) => n.id);
  assert.deepEqual(ring.slice(0, 2), ["go", TEAM_HUB], "beside ONE YOU");
  const parts = g.nodes.filter((n) => n.parentId === TEAM_HUB).sort((a, b) => b.importance - a.importance);
  assert.deepEqual(parts.map((n) => [n.id, n.label]), [[TEAM_NODE, "Leaderboard"], [WAR_NODE, "War room"], [ONB_NODE, "Onboarding"]]);
  assert.ok(!g.nodes.some((n) => n.parentId === "go" && [TEAM_NODE, WAR_NODE, ONB_NODE].includes(n.id)), "they left ONE YOU");
  assert.equal(g.nodes.find((n) => n.id === onbNodeId("o1"))!.parentId, ONB_NODE);
  const need = needsOf(g.nodes);
  assert.equal(need.get(onbNodeId("o1"))?.level, "now", "day 8, nothing done: red");
  assert.equal(need.get(onbNodeId("o2")), undefined, "day 2, 3 done: calm");
  assert.equal(need.get(TEAM_HUB)?.level, "now", "the pulse leads to the Team orb");
  assert.equal(need.get("go"), undefined, "not through ONE YOU any more");
  assert.equal(withTeamHub(g, input(true)).nodes.filter((n) => n.id === TEAM_HUB).length, 1);
});

test("agents who are not leads never see it, nor its parts", () => {
  const g = withTeamHub(base(), input(false));
  assert.ok(!g.nodes.some((n) => [TEAM_HUB, TEAM_NODE, WAR_NODE, ONB_NODE].includes(n.id) || n.id.startsWith(`${ONB_NODE}:`)));
  assert.equal(withTeamHub(base(true), input(true)).nodes.some((n) => n.id === TEAM_HUB), false, "ONE YOU locked");
});

test("a lead always gets all three parts, each with a plain line when ONE MOVE has nothing yet", () => {
  const g = withTeamHub(base(), { lead: true, team: null, war: null, onb: [], now });
  assert.deepEqual(g.nodes.filter((n) => n.parentId === TEAM_HUB).map((n) => n.id).sort(), [ONB_NODE, TEAM_NODE, WAR_NODE].sort());
  assert.ok(g.nodes.filter((n) => n.parentId === TEAM_HUB).every((n) => (n.secondaryLabel ?? "").length > 10 && (n.summary ?? "").length > 20));
  const l = partLines({ lead: true, team: null, war: null, onb: demoOnboarding(), now });
  assert.equal(l.onboarding, "2 setting up, 1 with nothing done");
});

test("who is a lead: the war room's owner or admin, the Onboarding board answering, or a team site they manage", () => {
  const w = demoWarRoom(now);
  assert.equal(isTeamLead(w, null, 0), true);
  assert.equal(isTeamLead({ ...w, team: { ...w.team, role: "agent" } }, null, 0), false);
  assert.equal(isTeamLead(null, [], 0), true);
  assert.equal(isTeamLead(null, null, 1), true);
  assert.equal(isTeamLead(null, null, 0), false);
});
