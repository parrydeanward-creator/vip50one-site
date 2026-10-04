import { test } from "node:test";
import assert from "node:assert/strict";
import { moveQuestion, noteDay, phoneLine, readHwc, withMoved } from "../lib/hwc.ts";

const raw = {
  date: "2026-10-04",
  today: { hot: true },
  people: [
    { id: "a", name: "Sarah Mitchell", class: "hot", phone: "+18015551234", last_note: "Wants to list in spring", last_note_at: "2026-10-02T17:10:00Z" },
    { id: "b", name: "Tom", class: "lukewarm" },
    { id: "", name: "No id", class: "cold" },
    { id: "c", name: "Ana Ruiz", class: "cold", phone: null },
  ],
};

test("readHwc keeps known classes and ids; today's boxes default off", () => {
  const h = readHwc(raw)!;
  assert.equal(h.people.length, 2);
  assert.deepEqual(h.today, { hot: true, warm: false, cold: false });
  assert.equal(readHwc({ today: {} }), null);
});

test("move question, optimistic move, note day", () => {
  const h = readHwc(raw)!;
  assert.equal(moveQuestion("Sarah", "warm"), "Move Sarah to Warm?");
  assert.equal(withMoved(h, "a", "warm").people[0].cls, "warm");
  assert.equal(noteDay("2026-10-02T17:10:00Z"), "2 Oct");
  assert.equal(noteDay("nope"), null);
});

test("phone line", () => {
  assert.equal(phoneLine("+18015551234"), "(801) 555-1234");
  assert.equal(phoneLine("8015551234"), "(801) 555-1234");
  assert.equal(phoneLine("+44 20 7946 0958"), "+44 20 7946 0958");
  assert.equal(phoneLine(null), null);
});
