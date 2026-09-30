import { test } from "node:test";
import assert from "node:assert/strict";
import { demoGraph } from "../lib/graph/demo.ts";
import { indexGraph } from "../lib/graph/model.ts";
import { candidates } from "../lib/ask.ts";
import { TOUR_STOPS, changesSince, firstVisitToday, morningTop, orbsToPing, sinceLabel } from "../lib/morning.ts";

const g = demoGraph("complete");
const ix = indexGraph(g);

test("morning top three: real, answerable nodes, ONE's own recommendations first", () => {
  const top = morningTop(ix);
  assert.equal(top.length, TOUR_STOPS);
  const ok = new Set(candidates(ix).map((n) => n.id));
  for (const id of top) assert.ok(ok.has(id), id);
  assert.equal(top[0], "p-jen", "the birthday call ONE recommends comes first");
  assert.equal(new Set(top).size, top.length);
});

test("first visit of the day, in the agent's local day", () => {
  const now = new Date("2026-09-30T15:00:00Z"); // 9:00 MT
  assert.equal(firstVisitToday(null, now), true);
  assert.equal(firstVisitToday("garbage", now), true);
  assert.equal(firstVisitToday("2026-09-30T14:00:00Z", now), false, "8:00 MT the same morning");
  assert.equal(firstVisitToday("2026-09-30T05:00:00Z", now), true, "11 pm MT the night before is yesterday there");
  assert.equal(firstVisitToday("2026-09-29T20:00:00Z", now), true);
});

test("since you were last here: only real nodes, newest first, filtered by the last visit", () => {
  const all = changesSince(g.changes, null, ix);
  assert.ok(all.length >= 3);
  for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].at >= all[i].at);
  for (const c of all) assert.ok(ix.byId.has(c.id), c.id);
  const recent = changesSince(g.changes, new Date(Date.now() - 6 * 3600_000).toISOString(), ix);
  assert.ok(recent.length > 0 && recent.length < all.length);
});

test("orbs to ping: one product orb per product, only products the agent has", () => {
  assert.deepEqual(orbsToPing(changesSince(g.changes, null, ix), ix).sort(), ["marquee", "move", "open", "showly"]);
  const rel = demoGraph("relationship");
  const rix = indexGraph(rel);
  const pinged = orbsToPing(changesSince(rel.changes, null, rix), rix);
  assert.ok(pinged.every((p) => p === "go" || p === "move"), pinged.join());
});

test("since label", () => {
  const now = new Date("2026-09-30T15:00:00Z");
  assert.equal(sinceLabel(null, now), "Since yesterday");
  assert.equal(sinceLabel("2026-09-30T00:12:00Z", now), "Since yesterday at 6:12 PM");
  assert.equal(sinceLabel("2026-09-30T14:05:00Z", now), "Since 8:05 AM today");
});
