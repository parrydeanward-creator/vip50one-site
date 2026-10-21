import { test } from "node:test";
import assert from "node:assert/strict";
import { nextOpenSlot, readClashAnswer, readPushNote } from "../lib/dayClash.ts";

test("a 409 is the question; a saved block carries its note; anything else keeps the old behaviour", () => {
  const a = readClashAnswer(409, { error: "x", question: "This overlaps Showing. Keep both?", clash: { with: "Showing" } });
  assert.deepEqual(a, { kind: "ask", ask: { question: "This overlaps Showing. Keep both?", with: "Showing" } });
  assert.deepEqual(readClashAnswer(200, { ok: true, note: "Power Hour moved to 2:00 PM." }), { kind: "ok", note: "Power Hour moved to 2:00 PM." });
  assert.deepEqual(readClashAnswer(200, { ok: true, note: null }), { kind: "ok", note: null });
  assert.deepEqual(readClashAnswer(409, {}), { kind: "other" });
  assert.deepEqual(readClashAnswer(500, null), { kind: "other" });
  assert.deepEqual(readClashAnswer(401, { error: "no" }), { kind: "other" });
});

test("a 409 with only the clash still asks in plain words", () => {
  const a = readClashAnswer(409, { clash: { with: "Listing appointment" } });
  assert.equal(a.kind === "ask" && a.ask.question, "This overlaps Listing appointment. Keep both?");
});

test("push note", () => {
  assert.equal(readPushNote({ note: "Texts moved to 3:00 PM." }), "Texts moved to 3:00 PM.");
  assert.equal(readPushNote({ note: null }), null);
  assert.equal(readPushNote(undefined), null);
});

test("next open slot: same length, after the clash, inside hours, none when full", () => {
  const hours = { start: "08:00", end: "17:30" };
  const busy = [{ start: "10:00", end: "11:00" }, { start: "11:00", end: "12:00" }];
  assert.deepEqual(nextOpenSlot(busy, hours, "10:30", "11:30"), { start: "12:00", end: "13:00" });
  assert.deepEqual(nextOpenSlot([], hours, "09:00", "09:30"), { start: "09:30", end: "10:00" });
  assert.equal(nextOpenSlot([{ start: "12:00", end: "17:30" }], hours, "11:00", "12:00"), null);
  assert.equal(nextOpenSlot([], hours, "10:00", "10:00"), null);
});
