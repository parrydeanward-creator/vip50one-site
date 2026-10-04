import { test } from "node:test";
import assert from "node:assert/strict";
import { dayName, readWeekly, tickable, weeklyFill, weeklyLine, withWeeklyTick } from "../lib/weekly.ts";

const raw = {
  week_start: "2026-09-28", score: 74, minimum: 100, met: false, daily_points: 49, bonus_points: 25,
  days: [{ date: "2026-09-28", points: 12 }, { date: "2026-09-29", points: 0 }],
  sections: [
    { key: "bonus", label: "Weekly Activities", boxes: [
      { key: "lead_gen_crm_drip", label: "Lead Gen / CRM / Drip", points: 5, done: true, auto: false },
      { key: "mixer_invite_sent", label: "Mixer invite sent", points: 5, done: false, auto: true },
      { key: "open_houses", label: "Open Houses", points: 10, done: false, auto: false },
      { key: "Bad Key", label: "x", points: 5, done: false } ] },
    { key: "custom", label: "Custom", boxes: [{ key: "custom_field_1", label: "Podcast", points: 10, done: true }] },
  ],
};

test("readWeekly keeps good parts, refuses bad shapes", () => {
  const w = readWeekly(raw)!;
  assert.equal(w.weekStart, "2026-09-28");
  assert.equal(w.sections[0].boxes.length, 3);
  assert.equal(w.sections[0].boxes[1].auto, true);
  assert.equal(w.days.length, 2);
  assert.equal(readWeekly({ sections: [] }), null);
  assert.equal(readWeekly(null), null);
});

test("a tick moves the score and met; custom boxes do not tick here", () => {
  const w = readWeekly(raw)!;
  const a = withWeeklyTick(w, "open_houses", true);
  assert.equal(a.score, 84);
  assert.equal(a.bonusPoints, 35);
  const b = withWeeklyTick({ ...w, score: 95 }, "open_houses", true);
  assert.equal(b.met, true);
  const c = withWeeklyTick(w, "custom_field_1", false);
  assert.equal(c.score, 74);
  assert.equal(tickable("custom"), false);
});

test("fill, line and day names", () => {
  const w = readWeekly(raw)!;
  assert.equal(weeklyFill(w), 0.74);
  assert.equal(weeklyLine(w), "74 of the 100-point minimum this week. 26 to go.");
  assert.equal(weeklyLine({ ...w, score: 120 }), "120 points this week, past the 100 minimum.");
  assert.equal(dayName("2026-09-28"), "Mon");
  assert.equal(dayName("2026-10-04"), "Sun");
});
