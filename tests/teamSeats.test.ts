import { test } from "node:test";
import assert from "node:assert/strict";
import { addSeatResult, readSeats, seatsLine } from "../lib/teamSeats.ts";

// Seats (TEAM-ONBOARDING §2; vip50-web-crm#259): comped teams see nothing; paid teams see seats and confirm before a
// charge; a declined card says so and nothing changes.
test("comped team: nothing shown; unusable answer: hidden", () => {
  assert.equal(readSeats(true, { ok: true, comped: true, used: 17 }), null);
  assert.equal(readSeats(false, { ok: true }), undefined);
  assert.equal(readSeats(true, { ok: true, comped: false, seats: 5 }), undefined, "no confirm words, no button");
});

test("paid team: the line and the confirm words", () => {
  const s = readSeats(true, { ok: true, comped: false, plan: "team", interval: "month", seats: 5, used: 5, free: 0, price: 5000, price_words: "$50 a month", confirm: "Add one seat for $50 a month, charged to the team's card now (prorated)?" })!;
  assert.equal(seatsLine(s), "5 of 5 in use, none free. Another seat is $50 a month.");
  assert.match(s.confirm, /\$50 a month/);
  assert.equal(seatsLine({ ...s, used: 3, free: 2 }), "3 of 5 in use, 2 free. Another seat is $50 a month.");
});

test("Add seat answers in plain words", () => {
  assert.deepEqual(addSeatResult(200, { ok: true, seats: 6, used: 5 }), { ok: true, line: "Seat added. You now have 6 seats.", seats: 6, used: 5 });
  assert.equal(addSeatResult(402, {}).line, "The card was declined. Nothing was changed.");
  assert.equal(addSeatResult(402, { error: "Your card was declined. Nothing changed." }).line, "Your card was declined. Nothing changed.");
  assert.equal(addSeatResult(0, null).ok, false);
});
