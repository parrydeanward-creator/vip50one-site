import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { LEADS_NODE, demoNewLeads, readNewLeads, withNewLeadsNode } from "../lib/newLeads.ts";

test("new leads: checked, untouched first", () => {
  assert.equal(readNewLeads(null), null);
  assert.equal(readNewLeads({ new_leads: {} }), null);
  const l = readNewLeads({ today: "2026-10-14", new_leads: { people: [
    { id: "a", name: "Reached", touched: true, at: "2026-10-14T16:00:00Z" },
    { id: "b", name: "Waiting", touched: false, at: "2026-10-14T10:00:00Z" },
    { id: "b", name: "Dup" }, { name: "No id" },
  ] } })!;
  assert.deepEqual(l.people.map((p) => p.id), ["b", "a"]);
  assert.equal(l.count, 2);
  assert.equal(l.untouched, 1);
});

test("the orb is red while anyone is unreached, green when all are, gone with none", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 1 }], edges: [] };
  const red = withNewLeadsNode(g, demoNewLeads());
  const orb = red.nodes.find((n) => n.id === LEADS_NODE)!;
  assert.equal(orb.status, "action");
  assert.equal(orb.needCount, 1);
  assert.equal(red.nodes.filter((n) => n.parentId === LEADS_NODE).length, 2);
  const all = demoNewLeads();
  const green = withNewLeadsNode(g, { ...all, untouched: 0, people: all.people.map((p) => ({ ...p, touched: true })) });
  assert.equal(green.nodes.find((n) => n.id === LEADS_NODE)!.status, "healthy");
  assert.equal(withNewLeadsNode(g, { today: null, count: 0, untouched: 0, people: [] }).nodes.some((n) => n.id === LEADS_NODE), false);
});
