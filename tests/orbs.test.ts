import { test } from "node:test";
import assert from "node:assert/strict";
import { focusFace, focusRings } from "../lib/orbs.ts";

test("few people get big faces; many get smaller ones", () => {
  assert.equal(focusFace(2), 62);
  assert.equal(focusFace(9), 52);
  assert.equal(focusFace(40), 30);
  assert.ok(focusFace(200) >= 25);
  for (let n = 1; n < 120; n++) assert.ok(focusFace(n + 1) <= focusFace(n));
});

test("rings clear the centre orb and each other", () => {
  const [a, b] = focusRings(190, 62);
  assert.equal(a, 190 + 62 + 64);
  assert.ok(b - a >= 2 * 62 + 10);
});
