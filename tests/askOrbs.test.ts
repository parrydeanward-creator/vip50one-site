import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { ASK_PERSON, askOrbIds, withAskPeople } from "../lib/askOrbs.ts";

// Parry, 15 Oct: Ask Pulse's people are orbs on the map while the answer is open, and leave with it.
const g = (): { nodes: GraphNode[]; edges: GraphEdge[] } => ({ nodes: [{ id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 }] as GraphNode[], edges: [] });
const people = [
  { contactId: "c1", name: "Rosa Diaz", phone: "+15550100", reasons: ["VIP-50", "Last call 64 days ago"] },
  { contactId: "c2", name: "Ben Ortiz", phone: null, reasons: ["VIP-50", "No call logged"] },
];

test("each person is an orb under ONE with their reason, yellow, opening their card", () => {
  const out = withAskPeople(g(), people);
  const rosa = out.nodes.find((n) => n.id === `${ASK_PERSON}c1`)!;
  assert.equal(rosa.type, "person");
  assert.equal(rosa.contactId, "c1");
  assert.equal(rosa.secondaryLabel, "VIP-50");
  assert.equal(rosa.status, "attention");
  assert.deepEqual(askOrbIds(people, ["move-3"]), ["ask-p:c1", "ask-p:c2", "move-3"]);
});

test("they leave with the answer", () => {
  const out = withAskPeople(withAskPeople(g(), people), null);
  assert.ok(!out.nodes.some((n) => n.id.startsWith(ASK_PERSON)) && !out.edges.some((e) => e.target.startsWith(ASK_PERSON)));
});
