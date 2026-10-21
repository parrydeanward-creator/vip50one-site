import { test } from "node:test";
import assert from "node:assert/strict";
import { cardUrl, placeChips, readCard } from "../lib/myCard.ts";

const ok = { ready: true, name: "Sam Agent", photo: null, brokerage: "Real Broker, LLC", team: null, title: "Realtor", url: "https://move.vip50one.com/card/sam?e=Mixer", qr: "https://move.vip50one.com/api/card/qr/sam", events: ["Mixer", "Mixer", "", "Open house"] };

test("a ready card keeps its words, link and QR; repeats in events drop", () => {
  const c = readCard(ok);
  assert.equal(c?.ready, true);
  if (c?.ready) {
    assert.equal(c.name, "Sam Agent");
    assert.equal(c.qr, "https://move.vip50one.com/api/card/qr/sam");
    assert.deepEqual(c.events, ["Mixer", "Open house"]);
  }
});

test("not ready shows the why line; an unknown answer is null", () => {
  assert.deepEqual(readCard({ ready: false, why: "Add your page address.", set_at: "https://move.vip50one.com/profile" }), { ready: false, why: "Add your page address.", setAt: "https://move.vip50one.com/profile" });
  assert.equal((readCard({ ready: false }) as { why: string }).why, "Your card isn't ready yet.");
  assert.equal(readCard(null), null);
  assert.equal(readCard({ ready: true, name: "X" }), null); // no link or QR is not a card
  assert.equal(readCard({ ...ok, url: "javascript:alert(1)" }), null);
});

test("chips: the agent's own places first, then the three standing ones, no repeats", () => {
  assert.deepEqual(placeChips(["Coffee mixer", "open house"]), ["Coffee mixer", "open house", "Event", "Other"]);
  assert.deepEqual(placeChips([]), ["Open house", "Event", "Other"]);
});

test("the card address carries the place", () => {
  assert.equal(cardUrl(null), "https://move.vip50one.com/api/brain/card");
  assert.equal(cardUrl("Open house"), "https://move.vip50one.com/api/brain/card?e=Open%20house");
});
