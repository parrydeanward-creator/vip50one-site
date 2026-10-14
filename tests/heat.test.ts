import { test } from "node:test";
import assert from "node:assert/strict";
import { HEAT_NODE, demoHeat, heatIdOf, heatNodeId, readHeat, readHeatAnswer, withHeatNodes } from "../lib/heat.ts";
import { demoGraph } from "../lib/graph/demo.ts";

test("Looks Hot: read, drop bad rows, https photos only", () => {
  const s = readHeat({ suggestions: [
    { id: "a", name: "Amy", reason: "saved", homes: [{ property_key: "k", photo: "http://x/p.jpg", price: 500000 }] },
    { id: "a", name: "dup" }, { name: "no id" },
  ] })!;
  assert.equal(s.length, 1);
  assert.equal(s[0].homes[0].photo, null);
  assert.equal(s[0].title, "Looks Hot: Amy");
  assert.equal(readHeat({}), null);
});

test("Looks Hot: one yellow orb under ONE MOVE with a person per suggestion; gone when empty", () => {
  const g = withHeatNodes(demoGraph("complete"), demoHeat());
  const orb = g.nodes.find((n) => n.id === HEAT_NODE)!;
  assert.equal(orb.parentId, "move");
  assert.equal(orb.status, "attention");
  const kid = g.nodes.find((n) => n.id === heatNodeId("h1"))!;
  assert.equal(kid.parentId, HEAT_NODE);
  assert.equal(heatIdOf(kid.id), "h1");
  assert.equal(withHeatNodes(g, []).nodes.some((n) => n.id === HEAT_NODE), false);
});

test("Looks Hot: answers; the Buyer Need link only after Move to Hot, https only", () => {
  assert.deepEqual(readHeatAnswer(true, { ok: true, need_url: "https://move.vip50one.com/needs/new?x=1" }), { ok: true, accepted: true, needUrl: "https://move.vip50one.com/needs/new?x=1", error: null });
  assert.deepEqual(readHeatAnswer(true, { ok: true, status: "dismissed" }), { ok: true, accepted: false, needUrl: null, error: null });
  assert.equal(readHeatAnswer(true, { ok: true, need_url: "javascript:x" }).needUrl, null);
  assert.equal(readHeatAnswer(false, { error: "nope" }).error, "nope");
});
