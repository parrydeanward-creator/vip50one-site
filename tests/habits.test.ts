import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { HABITS_NODE, demoHabitsDay, doneCount, habitsLine, habitsToday, mondayOf, withHabitsNode } from "../lib/habits.ts";
import { demoHistory } from "../lib/pulseCoach.ts";
import { withTick } from "../lib/daily.ts";

const today = "2026-10-08"; // a Thursday

test("mondayOf: the week's Monday", () => {
  assert.equal(mondayOf("2026-10-08"), "2026-10-05");
  assert.equal(mondayOf("2026-10-05"), "2026-10-05");
  assert.equal(mondayOf("2026-10-11"), "2026-10-05");
});

test("habitsToday: the Daily Tracker's habits section, with this week's days when the history has the week", () => {
  const day = demoHabitsDay(today);
  const h0 = habitsToday(day, null, today);
  assert.equal(h0.length, 6);
  assert.equal(doneCount(h0), 3);
  assert.ok(h0.every((x) => x.week == null));
  const hist = demoHistory(today);
  hist.weeks.push({ ...hist.weeks[hist.weeks.length - 1], start: "2026-10-05", habits: { made_bed: 3, affirmations: 0, gratitudes: 2, exercise: 1, positive_reading: 0 } });
  const h = habitsToday(day, hist, today);
  assert.equal(h.find((x) => x.key === "made_bed")!.week, 3);
  assert.equal(h.find((x) => x.key === "affirmations")!.week, 1); // ticked today, history not caught up: at least 1
  assert.equal(h.find((x) => x.key === "tracked_macros")!.week, null); // not in the history
  assert.deepEqual(habitsToday(null, hist, today), []);
  assert.deepEqual(habitsToday({ ...day, sections: [{ key: "calls", label: "Calls", boxes: [] }] }, null, today), []);
});

test("habitsLine and the orb: yellow until every habit is ticked, then green", () => {
  const day = demoHabitsDay(today);
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const h = habitsToday(day, null, today);
  assert.equal(habitsLine(h), "3 of 6 habits today");
  const g = withHabitsNode(withHabitsNode(base, h), h);
  assert.equal(g.nodes.filter((n) => n.id === HABITS_NODE).length, 1);
  assert.equal(g.nodes.find((n) => n.id === HABITS_NODE)!.status, "attention");
  let all = day;
  for (const b of day.sections[0].boxes) all = withTick(all, b.key, true);
  const ha = habitsToday(all, null, today);
  assert.equal(habitsLine(ha), "All 6 habits done today");
  assert.equal(withHabitsNode(base, ha).nodes.find((n) => n.id === HABITS_NODE)!.status, "healthy");
  assert.equal(withHabitsNode(base, []).nodes.length, 1);
  assert.equal(withHabitsNode({ ...base, nodes: [{ ...base.nodes[0], locked: true }] }, h).nodes.length, 1);
});
