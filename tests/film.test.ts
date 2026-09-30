import { test } from "node:test";
import assert from "node:assert/strict";
import { FILM_MS, FILM_SPOTS, FILM_STEPS, filmGraph } from "../lib/film.ts";
import { shownAt, watchPlaced } from "../lib/watch.ts";
import { claimsAction } from "../lib/ask.ts";

const g = filmGraph();
const ids = new Set(g.nodes.map((n) => n.id));

test("the film runs about 90 to 115 seconds", () => {
  assert.ok(FILM_MS >= 90000 && FILM_MS <= 115000, String(FILM_MS));
});

test("every step names real nodes, and lights only travel between nodes on screen", () => {
  FILM_STEPS.forEach((s, i) => {
    for (const id of [...s.show, ...s.focus]) assert.ok(ids.has(id), `${s.id}: ${id}`);
    const on = new Set(shownAt(i, FILM_STEPS));
    for (const id of s.focus) assert.ok(on.has(id), `${s.id}: framing ${id}, which is not on screen`);
    if (s.flight) for (const id of s.flight) assert.ok(on.has(id), `${s.id}: ${id} not on screen`);
  });
});

test("nothing on screen together overlaps", () => {
  FILM_STEPS.forEach((s, i) => {
    const placed = watchPlaced(shownAt(i, FILM_STEPS), g, FILM_SPOTS);
    for (let a = 0; a < placed.length; a++)
      for (let b = a + 1; b < placed.length; b++) {
        const p = placed[a], q = placed[b];
        assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= p.r + q.r + 20, `${s.id}: ${p.id} crowds ${q.id}`);
      }
  });
});

test("honesty: no caption claims ONE acted for the agent; goals and the hand-offs are marked Coming; Your day is built", () => {
  for (const id of ["f-day", "f-recap"]) assert.ok(!FILM_STEPS.find((s) => s.id === id)!.coming, id);
  for (const s of FILM_STEPS) assert.ok(!claimsAction(`${s.title} ${s.line}`), s.id);
  for (const id of ["move", "go", "one", "f-goals"]) assert.ok(FILM_STEPS.find((s) => s.id === id)!.coming, id);
  assert.match(FILM_STEPS.find((s) => s.id === "f-marquee")!.line, /Nothing posts until you approve it/);
});

test("your day: every task starts open and is done by the end of the day", async () => {
  const { graphAt } = await import("../lib/watch.ts");
  const start = graphAt(g, FILM_STEPS.findIndex((s) => s.id === "f-day"), FILM_STEPS);
  const end = graphAt(g, FILM_STEPS.findIndex((s) => s.id === "f-recap"), FILM_STEPS);
  for (const id of ["d1", "d2", "d3", "d4", "d5", "d6"]) {
    assert.notEqual(start.nodes.find((n) => n.id === id)!.status, "healthy", id);
    assert.equal(end.nodes.find((n) => n.id === id)!.status, "healthy", id);
  }
  assert.equal(g.nodes.find((n) => n.id === "d1")!.status, "opportunity", "the base graph is never changed");
});
