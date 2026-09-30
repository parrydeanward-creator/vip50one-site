import { test } from "node:test";
import assert from "node:assert/strict";
import { WATCH_MS, WATCH_STEPS, shownAt, watchGraph, watchPlaced } from "../lib/watch.ts";
import { claimsAction } from "../lib/ask.ts";

const g = watchGraph();
const ids = new Set(g.nodes.map((n) => n.id));

test("the story runs 20 to 30 seconds", () => {
  assert.ok(WATCH_MS >= 20000 && WATCH_MS <= 30000, String(WATCH_MS));
});

test("every step names real nodes, and a light only travels between nodes already shown", () => {
  WATCH_STEPS.forEach((s, i) => {
    for (const id of [...s.show, ...s.focus]) assert.ok(ids.has(id), `${s.id}: ${id}`);
    if (s.flight) {
      const on = new Set(shownAt(i));
      for (const id of s.flight) assert.ok(on.has(id), `${s.id}: ${id} not on screen`);
    }
  });
});

test("every node in the story has a place, and none overlap", () => {
  const placed = watchPlaced(shownAt(WATCH_STEPS.length - 1));
  assert.equal(placed.length, g.nodes.length);
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const p = placed[i], q = placed[j];
      assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= p.r + q.r + 20, `${p.id} crowds ${q.id}`);
    }
});

test("honesty: nothing claims ONE acted for the agent; the hand-offs between products are marked coming", () => {
  for (const s of WATCH_STEPS) assert.ok(!claimsAction(`${s.title} ${s.line}`), s.id);
  for (const id of ["move", "go", "one"]) assert.ok(WATCH_STEPS.find((s) => s.id === id)!.coming, id);
  assert.match(WATCH_STEPS.find((s) => s.id === "go")!.title, /suggests.*You accept/);
});
