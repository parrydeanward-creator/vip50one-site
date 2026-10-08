import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { IN_BRAIN, MOVE_COACH, MOVE_GROUPS, moveGroupId, moveGroupsFor, movePageId, withMoveCoach } from "../lib/moveMenu.ts";

const base = () => ({ nodes: [{ id: "move", type: "product", label: "ONE MOVE", product: "move" } as unknown as GraphNode], edges: [] as GraphEdge[] });

test("Coach is last and for admins only", () => {
  assert.deepEqual(moveGroupsFor(false), MOVE_GROUPS);
  assert.equal(moveGroupsFor(true).at(-1)?.key, "coach");
  assert.ok(MOVE_COACH.pages.some((p) => p.path === "/admin/review-calls"));
  assert.ok(IN_BRAIN.has("/admin/review-calls")); // opens in place, like the other menu pages
});

test("withMoveCoach adds the group and its pages for an admin, nothing otherwise, and never twice", () => {
  const g = withMoveCoach(base(), true);
  assert.ok(g.nodes.some((n) => n.id === moveGroupId("coach")));
  assert.equal(g.nodes.filter((n) => n.parentId === moveGroupId("coach")).length, MOVE_COACH.pages.length);
  assert.ok(g.nodes.some((n) => n.id === movePageId("/admin/revenue")));
  assert.equal(withMoveCoach(g, true).nodes.length, g.nodes.length);
  assert.equal(withMoveCoach(g, false).nodes.length, 1);
  assert.equal(withMoveCoach(base(), false).nodes.length, 1);
});
