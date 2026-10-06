import { test } from "node:test";
import assert from "node:assert/strict";
import { attention, coachOrder, demoCoached, readCoached, teamKeepRate, withCoachNode, COACH_NODE } from "../lib/coach.ts";
import { needsOf } from "../lib/needs.ts";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";

const TUESDAY = "2026-10-06";

test("reading §3n.4: each coached agent with a name and their commitments; nothing else", () => {
  const a = readCoached(
    {
      agents: [
        { agent_id: "u1", name: "Annette Judd", due: "set_week", week: null, weekend: null, last_week: { kept: 3, partly: 1, missed: 1 }, keep_rate_8w: 0.7, streak: 2 },
        { agent_id: "u2", name: "travis@example.com", due: null, week: { id: "w", starts: TUESDAY, items: [{ id: "i", text: "Call 10", kind: "call", target: 10, count: 4 }] }, keep_rate_8w: null, streak: 0 },
        { name: "no id" },
      ],
    },
    TUESDAY,
  );
  assert.deepEqual(a.map((x) => x.name), ["Annette Judd", "travis"], "an email never shows as a name");
  assert.equal(a[0].c.keepRate8w, 0.7);
  assert.equal(a[1].c.week?.items[0].count, 4);
  assert.deepEqual(readCoached({ error: "Coaches only." }, TUESDAY), []);
});

test("who needs a word first: late, then due today, then the lowest keep rate", () => {
  const order = coachOrder(demoCoached(TUESDAY), 15).map((a) => a.name);
  assert.equal(order[0], "Marcus Lee", "hasn't set the week, Tuesday: late");
  assert.deepEqual(order.slice(1), ["Dave Kim", "Jen Alvarez", "Amy Chen"]);
  const marcus = demoCoached(TUESDAY)[0];
  assert.deepEqual(attention(marcus, 15), { level: "now", words: "Marcus hasn't set this week's commitments" });
  assert.equal(attention(demoCoached(TUESDAY)[1], 15).words, "1 of 3 on track");
  assert.ok(Math.abs(teamKeepRate(demoCoached(TUESDAY))! - 0.7) < 1e-9);
});

test("the Coaching orb: coaches only, pulsing with how many are late", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = {
    nodes: [
      { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
      { id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 },
    ],
    edges: [],
  };
  assert.equal(withCoachNode(g, null, 15).nodes.some((n) => n.id === COACH_NODE), false, "not a coach: no orb");
  assert.equal(withCoachNode(g, [], 15).nodes.some((n) => n.id === COACH_NODE), false);
  const with4 = withCoachNode(g, demoCoached(TUESDAY), 15);
  const n = with4.nodes.find((x) => x.id === COACH_NODE)!;
  assert.equal(n.secondaryLabel, "1 agent needs a word from you");
  assert.equal(n.status, "action");
  assert.equal(needsOf(with4.nodes).get("go")?.level, "now", "the pulse leads to ONE YOU");
  assert.equal(withCoachNode(with4, demoCoached(TUESDAY), 15).nodes.filter((x) => x.id === COACH_NODE).length, 1, "replaced, never doubled");
});
