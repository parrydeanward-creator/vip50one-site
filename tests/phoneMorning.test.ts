import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphNode } from "../lib/graph/types.ts";
import { MORNING_LINK, needCounts, noteLines, phoneMorning } from "../lib/phoneMorning.ts";

const note = { opening: "Good morning, Parry.", note: "Three VIPs are due a call. Jane's due diligence ends today! Lunch with Marcus at 12:30. One more thing here.", cards: {}, source: "rules" as const };

test("noteLines: sentences, at most four, never empty", () => {
  assert.deepEqual(noteLines(note), ["Good morning, Parry.", "Three VIPs are due a call.", "Jane's due diligence ends today!", "Lunch with Marcus at 12:30."]);
  assert.deepEqual(noteLines({ ...note, opening: "", note: "" }), ["Your day is ready."]);
  assert.ok(noteLines({ ...note, opening: "", note: "x".repeat(400) })[0].length <= 160);
});

test("needCounts: leaf orbs only, locked left out, a page orb counts what is inside", () => {
  const nodes = [
    { id: "move", type: "product", parentId: "one", status: "action" },
    { id: "a", type: "task", parentId: "move", status: "action", needCount: 3 },
    { id: "b", type: "person", parentId: "move", status: "attention" },
    { id: "c", type: "person", parentId: "move", status: "attention", locked: true },
    { id: "d", type: "feature", parentId: "move", status: "healthy" },
  ] as unknown as GraphNode[];
  assert.deepEqual(needCounts(nodes), { red: 3, yellow: 1 });
});

test("phoneMorning: the shape ONE GO reads", () => {
  const m = phoneMorning(note, [], "2026-10-11");
  assert.equal(m.title, "Morning Pulse");
  assert.equal(m.link, MORNING_LINK);
  assert.deepEqual(m.counts, { red: 0, yellow: 0 });
  assert.equal(m.date, "2026-10-11");
});
