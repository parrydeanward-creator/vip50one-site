import { test } from "node:test";
import assert from "node:assert/strict";
import { demoGraph } from "../lib/graph/demo.ts";
import { indexGraph } from "../lib/graph/model.ts";
import { MAX_SHOWN, dayOffset, inWindow, offsetLabel, windowTitle } from "../lib/timeline.ts";

const g = demoGraph("complete");
const ix = indexGraph(g);
const now = new Date();

test("day offsets are local (Mountain) days", () => {
  const n = new Date("2026-09-30T15:00:00Z"); // 9:00 MT Wed
  assert.equal(dayOffset("2026-09-30T05:30:00Z", n), -1, "11:30 pm MT Tuesday is yesterday");
  assert.equal(dayOffset("2026-09-30T23:00:00Z", n), 0);
  assert.equal(dayOffset("2026-10-01T06:30:00Z", n), 1, "00:30 MT Thursday is tomorrow");
  assert.equal(dayOffset("2026-10-14T18:00:00Z", n), 14);
});

test("today shows nothing extra; the past and the future each show their own side", () => {
  assert.deepEqual(inWindow(g.dated, 0, now, ix), []);
  const past = inWindow(g.dated, -30, now, ix);
  const future = inWindow(g.dated, 30, now, ix);
  assert.ok(past.length > 0 && past.every((d) => d.day <= 0 && d.day >= -30));
  assert.ok(future.length > 0 && future.every((d) => d.day >= 0 && d.day <= 30));
  assert.ok(future.some((d) => d.id === "p-jen" && d.day === 1), "Jen's birthday tomorrow");
});

test("dragging further shows more, nearest to today first", () => {
  const w7 = inWindow(g.dated, 7, now, ix), w30 = inWindow(g.dated, 30, now, ix);
  assert.ok(w30.length > w7.length);
  for (let i = 1; i < w30.length; i++) assert.ok(w30[i - 1].day <= w30[i].day);
  const b3 = inWindow(g.dated, -3, now, ix);
  assert.deepEqual(b3.map((d) => d.id), ["p-millers"]);
});

test("only what the agent has, and never more than the map can hold", () => {
  const rel = demoGraph("relationship");
  const rix = indexGraph(rel);
  for (const off of [-30, 30]) {
    const w = inWindow(rel.dated, off, now, rix);
    assert.ok(w.every((d) => d.product === "go" || d.product === "move"), w.map((d) => d.product).join());
  }
  const many = Array.from({ length: 30 }, (_, i) => ({ ...g.dated![0], id: ["p-jen", "p-amy", "p-dave", "p-marcus", "p-millers", "p-parkers", "open-2", "open-3", "showly-3", "go-dates", "go-event", "task-report"][i % 12], at: new Date(Date.now() + (i % 12) * 86400_000).toISOString() }));
  assert.ok(new Set(inWindow(many, 30, now, ix).map((d) => d.id)).size <= MAX_SHOWN);
});

test("labels", () => {
  assert.equal(offsetLabel(0), "Today");
  assert.equal(offsetLabel(-1), "Yesterday");
  assert.equal(offsetLabel(-14), "14 days ago");
  assert.equal(offsetLabel(7), "In 7 days");
  assert.equal(windowTitle(-14), "The last 14 days");
  assert.equal(windowTitle(30), "The next 30 days");
});
