import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyLayout, dailyUrl, fillOf, readDaily, scoreLine, weekLine, withTick } from "../lib/daily.ts";

// VIP-SUMMARY §3e (v1.9): the Daily Tracker in ONE Brain.
const box = (key: string, done = false, points = 1) => ({ key, label: key, points, done });
const day = {
  date: "2026-10-04",
  score: 3,
  max: 26,
  week: { score: 62, minimum: 100 },
  sections: [
    { key: "habits", label: "Daily Habits", boxes: [box("made_bed", true), box("affirmations", true), box("gratitudes"), box("exercise"), box("positive_reading")] },
    { key: "calls", label: "Calls", boxes: [box("call_1", true), box("call_2"), box("call_3"), box("call_4"), box("call_5")] },
    { key: "other", label: "Other Activities", boxes: [box("lunch_face_to_face", false, 2)] },
  ],
};

test("route is ONE MOVE's", () => {
  assert.equal(dailyUrl, "https://move.vip50one.com/api/brain/daily");
});

test("a day keeps only well-formed sections and boxes; a wrong shape is refused", () => {
  const d = readDaily({ ...day, sections: [...day.sections, { key: "bad key", label: "x", boxes: [box("a")] }, { key: "empty", label: "E", boxes: [] }] })!;
  assert.deepEqual(d.sections.map((s) => s.key), ["habits", "calls", "other"]);
  assert.equal(readDaily({ sections: "no" }), null);
  assert.equal(readDaily(null), null);
  assert.equal(readDaily({ ...day, week: null })!.week, null);
});

test("a tick moves the score by the box's points, once", () => {
  const d = readDaily(day)!;
  const a = withTick(d, "lunch_face_to_face", true);
  assert.equal(a.score, 5);
  assert.equal(withTick(a, "lunch_face_to_face", true).score, 5);
  assert.equal(withTick(a, "made_bed", false).score, 4);
  assert.equal(withTick(d, "nope", true).score, 3);
});

test("the core fills by score over max, never past full", () => {
  assert.equal(fillOf(readDaily(day)!), 3 / 26);
  assert.equal(fillOf(readDaily({ ...day, score: 40 })!), 1);
});

test("every box gets a seat, sections in order from the top, no two boxes overlap", () => {
  const { seats, arcs } = dailyLayout(readDaily(day)!.sections, 0, 0, 300);
  assert.equal(seats.length, 11);
  assert.deepEqual(arcs.map((a) => a.key), ["habits", "calls", "other"]);
  for (let i = 1; i < seats.length; i++) {
    const d = Math.hypot(seats[i].x - seats[i - 1].x, seats[i].y - seats[i - 1].y);
    assert.ok(d >= seats[i].r + seats[i - 1].r - 0.5, `boxes ${i - 1} and ${i} overlap`);
  }
  // A full Classic day (24 boxes + 3 custom) still fits.
  const full = [{ key: "all", label: "All", boxes: Array.from({ length: 27 }, (_, i) => box(`b${i}`)) }];
  const f = dailyLayout(full, 0, 0, 300).seats;
  assert.ok(Math.hypot(f[1].x - f[0].x, f[1].y - f[0].y) >= 2 * f[0].r);
});

test("plain words for the score and the week", () => {
  const d = readDaily(day)!;
  assert.equal(scoreLine(d), "3 of 26 points today. 23 to go.");
  assert.equal(scoreLine({ ...d, score: 26 }), "26 of 26 points today. Every box done.");
  assert.equal(weekLine(d), "This week: 62 of the 100-point minimum.");
  assert.equal(weekLine({ ...d, week: { score: 104, minimum: 100 } }), "This week: 104 points, past the 100 minimum.");
});
