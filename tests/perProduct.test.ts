import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphNode } from "../lib/graph/types.ts";
import { perProduct, pickLine } from "../lib/perProduct.ts";

const n = (o: Partial<GraphNode> & { id: string }): GraphNode => ({ type: "task", label: o.id, product: "move", importance: 0.5, ...o }) as GraphNode;

test("one pick per product: red before yellow, then importance; groups, locked and quiet orbs left out", () => {
  const nodes = [
    n({ id: "move", type: "product", status: "action" }),
    n({ id: "move-g", type: "category", parentId: "move", status: "action" }),
    n({ id: "m1", parentId: "move-g", status: "attention", importance: 0.99 }),
    n({ id: "m2", parentId: "move-g", status: "action", importance: 0.2, secondaryLabel: "overdue 2 days" }),
    n({ id: "q1", product: "marquee", status: "attention", importance: 0.4 }),
    n({ id: "q2", product: "marquee", status: "attention", importance: 0.9, label: "2 pieces to approve" }),
    n({ id: "s1", product: "showly", status: "action", locked: true }),
    n({ id: "o1", product: "open", status: "healthy" }),
  ];
  const picks = perProduct(nodes);
  assert.deepEqual(picks.map((p) => `${p.product}:${p.id}`), ["move:m2", "marquee:q2"]);
  // Rewritten 14 Oct (audit stage 2): the rest of a product's items show as a count.
  assert.equal(pickLine(picks[0]), "ONE MOVE: m2, overdue 2 days (+1 more)");
  assert.equal(pickLine(picks[1]), "Marquee: 2 pieces to approve (+1 more)");
  assert.deepEqual(perProduct([]), []);
});

test("audit stage 2: the item holding the most people wins; a product with nothing due says all good", () => {
  const nodes = [
    n({ id: "open", type: "product", product: "open" }),
    n({ id: "showly", type: "product", product: "showly" }),
    n({ id: "o-setup", product: "open", status: "attention", importance: 0.95, label: "Set Up Open House" }),
    n({ id: "o-vis", product: "open", status: "attention", importance: 0.5, needCount: 9, label: "9 visitors waiting on a Day 0 video text" }),
  ];
  const picks = perProduct(nodes);
  assert.deepEqual(picks.map((p) => [p.product, p.id, p.level, p.more]), [["open", "o-vis", "attention", 1], ["showly", "showly", "ok", 0]]);
  assert.equal(pickLine(picks[1]), "Showly: all good");
});
