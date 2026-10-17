import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { SIGNALS_NODE, demoSignals, readSignals, signalKind } from "../lib/webSignals.ts";
import { LOOKS_NODE, fromSignals, withLooksHot } from "../lib/looksHot.ts";

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

// Rewritten 17 Oct (walker, Parry "yes"): "Hot on your website" is folded into the one Looks Hot orb (lib/looksHot.ts);
// its own orb is gone and an old one is cleared from the map.
test("website signals show in Looks Hot, yellow with the people round it; no separate orb", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 1 }, { id: SIGNALS_NODE, type: "feature", label: "Hot on your website", parentId: "move", product: "move", importance: 1 }], edges: [] };
  const on = withLooksHot(g, fromSignals(demoSignals()));
  assert.equal(on.nodes.some((n) => n.id === SIGNALS_NODE), false);
  const orb = on.nodes.find((n) => n.id === LOOKS_NODE)!;
  assert.equal(orb.status, "attention");
  assert.equal(orb.needCount, 3);
  const people = on.nodes.filter((n) => n.parentId === LOOKS_NODE);
  assert.equal(people.length, 3);
  assert.ok(people.every((p) => p.contactId && p.type === "person"));
  assert.equal(withLooksHot({ nodes: [{ ...g.nodes[0], locked: true }], edges: [] }, fromSignals(demoSignals())).nodes.some((n) => n.id === LOOKS_NODE), false);
});
