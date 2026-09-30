import { test } from "node:test";
import assert from "node:assert/strict";
import { FILM_PRODUCTS, productFilm } from "../lib/productFilms.ts";
import { shownAt, totalMs, watchPlaced } from "../lib/watch.ts";
import { claimsAction } from "../lib/ask.ts";

for (const p of FILM_PRODUCTS) {
  const f = productFilm(p);
  const ids = new Set(f.graph.nodes.map((n) => n.id));

  test(`${p}: about a minute, real nodes, lights only between nodes on screen`, () => {
    const ms = totalMs(f.steps);
    assert.ok(ms >= 35000 && ms <= 75000, String(ms));
    f.steps.forEach((s, i) => {
      const on = new Set(shownAt(i, f.steps, f.keep));
      for (const id of [...s.show, ...s.focus]) assert.ok(ids.has(id), `${s.id}: ${id}`);
      for (const id of s.focus) assert.ok(on.has(id), `${s.id}: framing ${id} off screen`);
      if (s.flight) for (const id of s.flight) assert.ok(on.has(id), `${s.id}: ${id} off screen`);
    });
  });

  test(`${p}: nothing on screen together overlaps`, () => {
    f.steps.forEach((s, i) => {
      const placed = watchPlaced(shownAt(i, f.steps, f.keep), f.graph, f.spots, f.center);
      for (let a = 0; a < placed.length; a++)
        for (let b = a + 1; b < placed.length; b++) {
          const x = placed[a], y = placed[b];
          assert.ok(Math.hypot(x.x - y.x, x.y - y.y) >= x.r + y.r + 12, `${s.id}: ${x.id} crowds ${y.id}`);
        }
    });
  });

  test(`${p}: honest captions, ending on Part of ONE`, () => {
    for (const s of f.steps) assert.ok(!claimsAction(`${s.title} ${s.line}`), s.id);
    assert.match(f.steps.at(-1)!.title, /Part of ONE\.$/);
  });
}

test("Marquee's film says nothing posts without the agent", () => {
  const f = productFilm("marquee");
  assert.ok(f.steps.some((s) => /Nothing posts until you approve it/.test(s.title) && /off until you turn it on/.test(s.line)));
});

test("ONE MOVE's film keeps open house visitors out of the VIP-50", () => {
  assert.ok(productFilm("move").steps.some((s) => /Never dropped into your VIP-50/.test(s.line)));
});
