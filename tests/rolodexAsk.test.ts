import { test } from "node:test";
import assert from "node:assert/strict";
import type { CommunityBiz } from "../lib/rolodex.ts";
import { askCommunity, askExamples, readAsk, stem } from "../lib/rolodexAsk.ts";

const biz = (key: string, name: string, category: string | null, city: string | null, n: number, family: CommunityBiz["family"] = "repair"): CommunityBiz => ({
  key, name, category, family, city, contact_name: null, phone: null, email: null, website: null, offer: null, image: null, in_mine: false,
  recommended_by: Array.from({ length: n }, (_, i) => ({ name: `Agent ${i}.`, me: false, since: null })),
});

const community = [
  biz("1", "Peak Roofing", "Roofing", "Draper", 4),
  biz("2", "Summit Roof Repair", "Roof repair", "Sandy", 6),
  biz("3", "Draper Roofers", "Roofer", "Draper", 1),
  biz("4", "Wasatch Plumbing", "Plumbing", "Draper", 3),
  biz("5", "Title One", "Title", "Salt Lake City", 2, "closing"),
];

test("stem brings roofer, roofing and roof together", () => {
  assert.equal(stem("roofer"), "roof");
  assert.equal(stem("roofing"), "roof");
  assert.equal(stem("roof"), "roof");
  assert.equal(stem("plumbers"), "plumb");
});

test("readAsk splits trade and a known place", () => {
  const a = readAsk("Who do agents trust for a roofer in Draper?", ["Draper", "Salt Lake City"]);
  assert.deepEqual(a.trade, ["roof"]);
  assert.equal(a.place, "draper");
  assert.equal(a.family, "repair");
  const b = readAsk("title company salt lake city", ["Salt Lake City"]);
  assert.equal(b.place, "salt lake city");
  assert.deepEqual(b.trade, ["title", "company"]);
});

test("readAsk takes an unknown place after a final 'in'", () => {
  const a = readAsk("a good plumber in Park City", ["Draper"]);
  assert.equal(a.place, "park city");
  assert.deepEqual(a.trade, ["plumb"]);
});

test("askCommunity ranks trade, then place, then trust", () => {
  const r = askCommunity("Who do agents trust for a roofer in Draper?", community, "Salt Lake City");
  assert.deepEqual(r.hits.map((h) => h.biz.key).slice(0, 3), ["1", "3", "2"]);
  assert.ok(r.hits.every((h, i) => i > 2 || h.exact));
  assert.match(r.line, /^2 businesses for a roofer in Draper VIP-50 agents trust\. Top: Peak Roofing, trusted by 4 agents\.$/);
});

test("same trade in another place is offered as the nearest fit", () => {
  const r = askCommunity("roofer in Park City", community, null);
  assert.equal(r.hits[0].biz.key, "2");
  assert.match(r.line, /^None shared in Park City yet\. Nearest fit: Summit Roof Repair \(Sandy\), trusted by 6 agents\.$/);
});

test("no exact trade falls back to the same group, and says so", () => {
  const r = askCommunity("electrician in Draper", community, null);
  assert.ok(r.hits.length > 0);
  assert.ok(r.hits.every((h) => !h.exact && h.biz.family === "repair"));
  assert.match(r.line, /No one has shared a business for an electrician yet\. Other Home repair businesses/);
});

test("nothing at all says what to do next", () => {
  const r = askCommunity("dog groomer", community, null);
  assert.equal(r.hits.length, 0);
  assert.match(r.line, /^No VIP-50 agent has shared a business for/);
});

test("answers never carry notes (community cards have none)", () => {
  const r = askCommunity("roof", community, null);
  for (const h of r.hits) assert.equal("notes" in h.biz, false);
});

test("askExamples come from what is shared, the agent's city first", () => {
  const ex = askExamples(community, "Draper");
  assert.equal(ex.length, 3);
  assert.ok(ex[0].endsWith("in Draper"));
});
