import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { PULSE_COACH_NODE, demoHistory, pulseRead, readHistory, run, withPulseCoachNode, type History } from "../lib/pulseCoach.ts";

const today = "2026-10-07"; // a Wednesday: the week of 5 Oct is not finished, so it is left out

test("run: weeks in a row a number has fallen or risen, ending last week", () => {
  assert.equal(run([4, 3, 2, 1, 0], -1), 4);
  assert.equal(run([1, 3, 2, 1], -1), 2);
  assert.equal(run([1, 2, 3], -1), 0);
  assert.equal(run([1, 2, 3], 1), 2);
});

test("readHistory: oldest first, checked, zeros for what is missing", () => {
  const h = readHistory({ weeks: [{ start: "2026-09-28", score: 90, minimum: 100, counts: { call: 4, bogus: 9 } }, { start: "2026-09-21", score: "x" }, { start: "bad" }], weekdays: [{ dow: 2, avg_points: 20 }, { dow: 9, avg_points: 1 }] })!;
  assert.deepEqual(h.weeks.map((w) => w.start), ["2026-09-21", "2026-09-28"]);
  assert.equal(h.weeks[0].score, null);
  assert.equal(h.weeks[1].counts.call, 4);
  assert.equal(h.weeks[1].counts.face_to_face, 0);
  assert.deepEqual(h.weekdays, [{ dow: 2, avg: 20 }]);
  assert.equal(readHistory({ weeks: [] }), null);
});

test("pulseRead on the example agent: the slipping face-to-faces lead, with one focus to commit to", () => {
  const r = pulseRead(demoHistory(today), null, today)!;
  const touches = r.parts.find((p) => p.key === "touches")!;
  assert.equal(touches.line, "Face-to-faces dropped three weeks running");
  assert.equal(touches.level, "today");
  assert.equal(r.focus!.kind, "face_to_face");
  assert.match(r.focus!.text, /^\d+ face-to-faces next week$/);
  assert.match(r.focus!.why, /dropped three weeks running; your best week had 4/);
  const days = r.parts.find((p) => p.key === "days")!;
  assert.equal(days.line, "Tuesday is your best day; Friday goes quiet");
  const trend = r.parts.find((p) => p.key === "trend")!;
  assert.equal(trend.big, "92");
  assert.equal(trend.level, "today");
});

test("pulseRead: a best week is named, and nothing slipping means no focus beyond the score", () => {
  const flat = (start: string, score: number) => ({ start, score, minimum: 100, counts: { call: 20, video_text: 8, text: 5, social: 5, handwritten_note: 2, face_to_face: 3, drop_by: 1, newsletter: 1, mixer: 1 }, habits: { made_bed: 6, affirmations: 6, gratitudes: 6, exercise: 5, positive_reading: 4 }, hwc: { hot: 4, warm: 4, cold: 4 } });
  const h: History = { weeks: [flat("2026-08-31", 120), flat("2026-09-07", 101), flat("2026-09-14", 104), flat("2026-09-21", 103), flat("2026-09-28", 125)], weekdays: [] };
  const r = pulseRead(h, null, today)!;
  assert.equal(r.headline, "Best week in 5 weeks");
  assert.equal(r.parts.find((p) => p.key === "touches")!.line, "Steady across the board");
  assert.equal(r.focus, null);
  h.weeks[4] = flat("2026-09-28", 110);
  assert.equal(pulseRead(h, null, today)!.headline, "Best week since August 31");
});

test("withPulseCoachNode: one orb under ONE YOU, yellow when part of the read needs the agent", () => {
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const r = pulseRead(demoHistory(today), null, today);
  const n = withPulseCoachNode(withPulseCoachNode(base, r), r).nodes.filter((x) => x.id === PULSE_COACH_NODE);
  assert.equal(n.length, 1);
  assert.equal(n[0].status, "attention");
  assert.match(n[0].secondaryLabel!, /^Focus: /);
  assert.equal(withPulseCoachNode(base, null).nodes.length, 1);
});
