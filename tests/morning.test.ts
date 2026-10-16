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

test("speakable: Listen says it as a person would (Parry, 16 Oct)", async () => {
  const { speakable, houseWords, dollarWords, numberWords } = await import("../lib/spoken.ts");
  assert.equal(speakable("Your VIP-50 and VIP-100"), "Your VIP fifty and VIP one hundred.");
  assert.equal(speakable("Drop by 450 E 100 S #20 today"), "Drop by four fifty East one hundred South, number twenty today.");
  assert.equal(speakable("Showing at 1482 Maple Ridge Dr. Then lunch"), "Showing at fourteen eighty-two Maple Ridge Drive. Then lunch.");
  assert.equal(speakable("77 Juniper Ct, 9 Elm St, 12 Oak Ave, 5 Pine Ln, 3 Main Rd, 8 State Blvd"), "seventy-seven Juniper Court, nine Elm Street, twelve Oak Avenue, five Pine Lane, three Main Road, eight State Boulevard.");
  assert.equal(speakable("Call at 9:30am"), "Call at nine thirty a.m.");
  assert.equal(speakable("Lunch 12:05 PM, coffee 3pm"), "Lunch twelve oh five p.m., coffee three p.m.");
  assert.equal(speakable("Fee $1,500 on $240,000"), "Fee fifteen hundred dollars on two hundred forty thousand dollars.");
  // pauses kept, never a run-on
  assert.equal(speakable("Score 82 · 18 to go\nCall Jen — today"), "Score 82, 18 to go. Call Jen, today.");
  // a title before a name is not a street
  assert.equal(speakable("Call Dr Smith"), "Call Dr Smith.");
  assert.equal(houseWords(309), "three oh nine");
  assert.equal(houseWords(1300), "thirteen hundred");
  assert.equal(houseWords(2000), "two thousand");
  assert.equal(dollarWords(12.5), "twelve dollars and fifty cents");
  assert.equal(numberWords(42), "forty-two");
});
