import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { SIGNALS_NODE, demoSignals, readSignals, signalKind, withSignalsNode } from "../lib/webSignals.ts";

test("signals: checked, one per contact, seller first", () => {
  assert.equal(readSignals(null), null);
  const s = readSignals({ signals: [
    { contact_id: "a", name: "Came", came_back: true, at: "2026-10-13" },
    { contact_id: "b", name: "Sell", likely_seller: true, at: "2026-10-01" },
    { contact_id: "a", name: "Dup", high_interest: true },
    { contact_id: "c", name: "Nothing" },
    { name: "No id", came_back: true },
  ] })!;
  assert.deepEqual(s.map((x) => x.contactId), ["b", "a"]);
  assert.equal(signalKind(s[0]), "Likely seller");
});

test("the orb is yellow with the people round it; gone when no one is hot", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 1 }], edges: [] };
  const on = withSignalsNode(g, demoSignals());
  const orb = on.nodes.find((n) => n.id === SIGNALS_NODE)!;
  assert.equal(orb.status, "attention");
  assert.equal(orb.needCount, 3);
  const people = on.nodes.filter((n) => n.parentId === SIGNALS_NODE);
  assert.equal(people.length, 3);
  assert.ok(people.every((p) => p.contactId && p.type === "person"));
  assert.equal(withSignalsNode(on, []).nodes.some((n) => n.id.startsWith(SIGNALS_NODE)), false);
  assert.equal(withSignalsNode({ nodes: [{ ...g.nodes[0], locked: true }], edges: [] }, demoSignals()).nodes.some((n) => n.id === SIGNALS_NODE), false);
});
