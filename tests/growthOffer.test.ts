import { test } from "node:test";
import assert from "node:assert/strict";
import { GROWTH_ADD_URL, growthOffer, packageLine } from "../lib/pulseIntro.ts";
import { includes } from "../lib/products.ts";
import { packageOf } from "../lib/live.ts";

test("a Growth-only agent is not treated as Relationship: ONE MOVE yes, ONE GO no", () => {
  assert.equal(packageOf("growth"), "growth");
  assert.equal(includes("growth", "move"), true);
  assert.equal(includes("growth", "go"), false);
  // Rewritten 14 Oct: the plan line now reads "Your plan: ..." (Meet Pulse, short).
  assert.equal(packageLine("growth"), "Your plan: ONE Growth. Pulse works across ONE MOVE, your website and your Growth ads and leads.");
});

test("the add-on offer shows only to Complete or Elite without Growth", () => {
  assert.ok(growthOffer("complete", false)?.includes("$199/month"));
  assert.ok(growthOffer("elite", false));
  assert.equal(growthOffer("complete", true), null);
  assert.equal(growthOffer("relationship", false), null);
  assert.equal(growthOffer("growth", true), null);
  assert.equal(GROWTH_ADD_URL, "https://move.vip50one.com/join/growth");
});
