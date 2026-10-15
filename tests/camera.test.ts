import { test } from "node:test";
import assert from "node:assert/strict";
// Walker audit 02 (Parry, 15 Oct): zoomed in, ONE YOU slid under the Pulse bar and could not be clicked.
import { keepInBand, toScreen as ts2 } from "../lib/brain/camera.ts";
test("keepInBand: orbs that fit are nudged inside the band; when they cannot, the top one stays clear of the bar", () => {
  const vp = { width: 1000, height: 800 };
  const fits = keepInBand({ x: 0, y: 0, scale: 1 }, vp, [-380, 100], 120, 720);
  assert.ok(ts2(fits, vp, 0, -380).y >= 120 - 1e-9 && ts2(fits, vp, 0, 100).y <= 720 + 1e-9);
  const big = keepInBand({ x: 0, y: 0, scale: 2 }, vp, [-300, 300], 120, 720);
  assert.ok(Math.abs(ts2(big, vp, 0, -300).y - 120) < 1e-9, "the top orb sits at the top of the clear band");
  const fine = { x: 0, y: 0, scale: 1 };
  assert.deepEqual(keepInBand(fine, vp, [-100, 100], 120, 720), fine, "nothing moves when all is clear");
});
