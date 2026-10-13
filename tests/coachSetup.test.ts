import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { demoCoached, readCoached, readSetup, setupLate, setupWords, teamSetup, withCoachNode, COACH_NODE } from "../lib/coach.ts";

const today = "2026-10-13";

test("readSetup checks the shape and counts what is done", () => {
  assert.equal(readSetup(null), null);
  assert.equal(readSetup({ steps: [] }), null);
  const s = readSetup({ done: 99, of: 99, since: "2026-09-01T00:00:00Z", steps: [{ key: "profile", label: "Photo", done: true }, { key: "contacts", label: "50 contacts", done: false, count: 12 }, { bad: 1 }] })!;
  assert.equal(s.done, 1); // counted here, not trusted from the answer
  assert.equal(s.of, 2);
  assert.equal(s.since, "2026-09-01");
  assert.equal(s.steps[1].count, 12);
  assert.equal(setupWords(s), "1 of 2 set up");
});

test("under half after 14 days is late; no start day is never late", () => {
  const mk = (done: number, since: string | null) => readSetup({ since, steps: Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, label: "x", done: i < done })) });
  assert.equal(setupLate(mk(3, "2026-09-20"), today), true);
  assert.equal(setupLate(mk(4, "2026-09-20"), today), false); // half is not under half
  assert.equal(setupLate(mk(3, "2026-10-05"), today), false); // only 8 days in
  assert.equal(setupLate(mk(0, null), today), false);
  assert.equal(setupLate(null, today), false);
});

test("the coached answer carries setup per agent", () => {
  const a = readCoached({ agents: [{ agent_id: "u1", name: "Jen", setup: { steps: [{ key: "profile", label: "Photo", done: true }] } }, { agent_id: "u2", name: "Dave" }] }, today);
  assert.equal(a.find((x) => x.id === "u1")?.setup?.done, 1);
  assert.equal(a.find((x) => x.id === "u2")?.setup, null);
});

test("team setup and the orb's yellow for a late setup", () => {
  const agents = demoCoached(today);
  const ts = teamSetup(agents)!;
  assert.equal(ts.of, 4);
  assert.equal(ts.full, 1);
  const marcus = agents.find((a) => a.id === "t2")!;
  assert.equal(setupLate(marcus.setup, today), true);
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const calm = agents.map((a) => ({ ...a, c: { ...a.c, due: null } }));
  assert.equal(withCoachNode(g, calm, 10).nodes.find((n) => n.id === COACH_NODE)?.status, "attention");
});
