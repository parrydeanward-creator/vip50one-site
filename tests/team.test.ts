import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { TEAM_NODE, atMinimum, demoTeam, mostImproved, ranks, readTeam, teamLine, teamUrl, withTeamNode } from "../lib/team.ts";

test("readTeam: checked, sorted by score then streak, no repeats, at most 50", () => {
  const t = readTeam({
    week_start: "2026-10-05",
    minimum: 100,
    agents: [
      { user_id: "a", first_name: "Amy", score: 90, last4: [1, 2, 3, 4, 5], streak_weeks: 0 },
      { user_id: "b", first_name: "Ben", score: 112, streak_weeks: 1 },
      { user_id: "c", first_name: "Cal", score: 112, streak_weeks: 3, me: true },
      { user_id: "b", first_name: "Ben again", score: 1 },
      { user_id: "d" },
      { first_name: "No id" },
    ],
  })!;
  assert.deepEqual(t.agents.map((a) => a.id), ["c", "b", "a"]);
  assert.deepEqual(t.agents[2].last4, [2, 3, 4, 5]);
  assert.equal(t.minimum, 100);
  assert.equal(readTeam({ week_start: "x" }), null);
  assert.equal(readTeam(null), null);
  const many = readTeam({ agents: Array.from({ length: 70 }, (_, i) => ({ user_id: `u${i}`, first_name: `A${i}`, score: i })) })!;
  assert.equal(many.agents.length, 50);
});

test("ranks share a place on a tie; line, minimum and most improved", () => {
  const t = readTeam({ agents: [
    { user_id: "a", first_name: "Amy", score: 112, last4: [100] },
    { user_id: "b", first_name: "Ben", score: 112, last4: [80], me: true },
    { user_id: "c", first_name: "Cal", score: 98, last4: [99] },
  ] })!;
  const r = ranks(t);
  assert.equal(r.get("a"), 1);
  assert.equal(r.get("b"), 1);
  assert.equal(r.get("c"), 3);
  assert.equal(atMinimum(t), 2);
  assert.equal(mostImproved(t)?.id, "b");
  assert.equal(teamLine(t), "You are #1 of 3 this week");
  assert.equal(teamUrl("office"), "https://move.vip50one.com/api/brain/team?scope=office");
});

test("withTeamNode: a quiet orb under ONE YOU; none when locked, empty or not loaded", () => {
  const base = () => ({ nodes: [{ id: "go", type: "product", label: "ONE YOU", product: "go" } as unknown as GraphNode], edges: [] as GraphEdge[] });
  const g = withTeamNode(base(), demoTeam("2026-10-05"));
  const n = g.nodes.find((x) => x.id === TEAM_NODE)!;
  assert.equal(n.status, "healthy");
  assert.equal(withTeamNode(g, demoTeam("2026-10-05")).nodes.filter((x) => x.id === TEAM_NODE).length, 1);
  assert.equal(withTeamNode(base(), null).nodes.some((x) => x.id === TEAM_NODE), false);
  assert.equal(withTeamNode(base(), readTeam({ agents: [] })).nodes.some((x) => x.id === TEAM_NODE), false);
  const locked = base();
  (locked.nodes[0] as GraphNode & { locked?: boolean }).locked = true;
  assert.equal(withTeamNode(locked, demoTeam("2026-10-05")).nodes.some((x) => x.id === TEAM_NODE), false);
});

test("badgesFor: top of the week at the minimum, most improved, the longest streak tier, then ONE MOVE's", async () => {
  const { badgesFor, readTeam } = await import("../lib/team.ts");
  const t = readTeam({
    minimum: 100,
    agents: [
      { user_id: "a", first_name: "Amy", score: 112, last4: [100], streak_weeks: 9, badges: [{ name: "Call Champion" }, "Note Ninja", { name: "" }] },
      { user_id: "b", first_name: "Ben", score: 98, last4: [60], streak_weeks: 4 },
      { user_id: "c", first_name: "Cal", score: 70, last4: [75], streak_weeks: 0 },
    ],
  })!;
  const by = (id: string) => badgesFor(t, t.agents.find((x) => x.id === id)!).map((b) => b.label);
  assert.deepEqual(by("a"), ["Top of the week", "8-week streak", "Call Champion", "Note Ninja"]);
  assert.deepEqual(by("b"), ["Most improved", "4-week streak"]);
  assert.deepEqual(by("c"), []);
  const low = readTeam({ minimum: 100, agents: [{ user_id: "a", first_name: "Amy", score: 90 }] })!;
  assert.deepEqual(badgesFor(low, low.agents[0]), [], "first place under the minimum is not a badge");
});

test("away weeks: read, shown, and never 'most improved'", async () => {
  const { mostImproved, readTeam } = await import("../lib/team.ts");
  const t = readTeam({
    minimum: 100,
    agents: [
      { user_id: "a", first_name: "Amy", score: 110, last4: [40], last4_away: [true] },
      { user_id: "b", first_name: "Ben", score: 90, last4: [80], away: false },
      { user_id: "c", first_name: "Cal", score: 95, last4: [10], away: true },
    ],
  })!;
  assert.equal(t.agents.find((x) => x.id === "c")!.away, true);
  assert.deepEqual(t.agents.find((x) => x.id === "a")!.last4Away, [true]);
  assert.equal(mostImproved(t)?.id, "b", "a jump after or during an away week does not count");
});
