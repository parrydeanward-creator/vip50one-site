import { test } from "node:test";
import assert from "node:assert/strict";
import { needsOf, needWords } from "../lib/needs.ts";
import type { GraphNode } from "../lib/graph/types.ts";

const n = (id: string, parentId: string | null, extra: Partial<GraphNode> = {}): GraphNode => ({
  id,
  parentId,
  type: "task",
  label: id,
  product: "move",
  importance: 0.5,
  ...extra,
});

const graph: GraphNode[] = [
  n("one", null, { type: "core", product: "one" }),
  n("move", "one", { type: "product", status: "action" }),
  n("contacts", "move", { type: "category", status: "action" }),
  n("vip", "contacts", { type: "category", status: "action" }),
  n("sarah", "vip", { type: "person", status: "attention" }),
  n("tom", "vip", { type: "person", status: "action" }),
  n("amy", "vip", { type: "person", status: "opportunity" }),
  n("hot", "contacts", { type: "category", status: "attention" }),
  n("ben", "hot", { type: "person", status: "attention" }),
  n("marquee", "one", { type: "product", product: "marquee", locked: true }),
  n("m1", "marquee", { product: "marquee", locked: true, status: "action" }),
];

test("the pulse follows the trail: person, group, Contacts, ONE MOVE, ONE", () => {
  const m = needsOf(graph);
  assert.deepEqual(m.get("sarah"), { count: 1, level: "today" });
  assert.deepEqual(m.get("tom"), { count: 1, level: "now" });
  assert.deepEqual(m.get("vip"), { count: 2, level: "now" }, "red wins over amber");
  assert.deepEqual(m.get("hot"), { count: 1, level: "today" });
  assert.deepEqual(m.get("contacts"), { count: 3, level: "now" });
  assert.deepEqual(m.get("move"), { count: 3, level: "now" });
  assert.deepEqual(m.get("one"), { count: 3, level: "now" });
});

test("opportunities, healthy and locked products never pulse", () => {
  const m = needsOf(graph);
  assert.equal(m.has("amy"), false);
  assert.equal(m.has("m1"), false);
  assert.equal(m.has("marquee"), false);
});

test("a group's own status does not count twice; only its people do", () => {
  const m = needsOf([n("one", null, { type: "core" }), n("g", "one", { type: "category", status: "action" })]);
  assert.deepEqual(m.get("g"), { count: 1, level: "now" }, "a group with nothing loaded under it counts once");
  const m2 = needsOf([n("one", null, { type: "core" }), n("g", "one", { type: "category", status: "action" }), n("p", "g", { type: "person" })]);
  assert.equal(m2.has("g"), false, "its people decide");
});

test("a loop in parent ids cannot hang the count", () => {
  const m = needsOf([n("a", "b", { status: "action" }), n("b", "a", { type: "category" })]);
  assert.equal(m.get("a")?.count ?? 0, 0, "a has a child, so it is not a leaf");
});

test("words for screen readers", () => {
  assert.equal(needWords({ count: 1, level: "now" }, true), "needs you now");
  assert.equal(needWords({ count: 3, level: "today" }, false), "3 need you today");
  assert.equal(needWords({ count: 1, level: "now" }, false), "1 needs you, some overdue");
  assert.equal(needWords(undefined, false), "");
});

test("a page orb counts the people inside it (Touch Audit with 3 due today counts 3)", () => {
  const m = needsOf([
    n("one", null, { type: "core" }),
    n("audit", "one", { type: "category", status: "attention", dueContacts: [{ id: "a", title: "x", level: "today" }, { id: "b", title: "y", level: "today" }, { id: "c", title: "z", level: "today" }] }),
  ]);
  assert.deepEqual(m.get("audit"), { count: 3, level: "today" });
  assert.deepEqual(m.get("one"), { count: 3, level: "today" });
});
