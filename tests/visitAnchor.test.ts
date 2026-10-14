import { test } from "node:test";
import assert from "node:assert/strict";
import { groupChanges, visitAnchor } from "../lib/morning.ts";

test("Since you were last here counts from the last real visit, never the last reload", () => {
  const now = new Date("2026-10-14T22:00:00Z");
  // a reload 10 minutes after the last beat keeps the visit's starting point
  assert.equal(visitAnchor("2026-10-14T21:50:00Z", "2026-10-14T15:00:00Z", now), "2026-10-14T15:00:00Z");
  // back after more than two hours: count from where the last visit ended
  assert.equal(visitAnchor("2026-10-14T18:00:00Z", "2026-10-14T15:00:00Z", now), "2026-10-14T18:00:00Z");
  assert.equal(visitAnchor(null, null, now), null);
});

test("changes grouped by product with a count", () => {
  const g = groupChanges([{ id: "a", product: "move", what: "x", at: "2" }, { id: "b", product: "open", what: "y", at: "1" }, { id: "c", product: "move", what: "z", at: "0" }] as never);
  assert.deepEqual(g.map((x) => [x.product, x.count]), [["move", 2], ["open", 1]]);
});
