import { test } from "node:test";
import assert from "node:assert/strict";
import { agoWords, cameInWords, clockTime, denverDay } from "../lib/leadClock.ts";

// Denver is UTC-6 in October (MDT). 2026-10-18T01:25Z is 7:25 pm on Sat 17 Oct in Denver.
const NOW = Date.parse("2026-10-18T01:25:00Z");

test("clock: today with hours, minutes or just now", () => {
  assert.equal(cameInWords("2026-10-17T12:25:00Z", NOW), "Came in 6:25 am · 13 hours ago");
  assert.equal(cameInWords("2026-10-18T01:05:00Z", NOW), "Came in 7:05 pm · 20 minutes ago");
  assert.equal(cameInWords("2026-10-18T01:24:00Z", NOW), "Came in 7:24 pm · 1 minute ago");
  assert.equal(cameInWords("2026-10-18T01:24:30Z", NOW), "Came in 7:24 pm · just now");
  assert.equal(cameInWords("2026-10-18T00:25:00Z", NOW), "Came in 6:25 pm · 1 hour ago");
});

test("clock: yesterday, a weekday this week, a date further back", () => {
  assert.equal(cameInWords("2026-10-16T12:25:00Z", NOW), "Came in yesterday 6:25 am");
  assert.equal(cameInWords("2026-10-13T12:25:00Z", NOW), "Came in Tue 6:25 am");
  assert.equal(cameInWords("2026-10-06T12:25:00Z", NOW), "Came in Oct 6, 6:25 am");
});

test("clock: the day is Denver's, not UTC's", () => {
  // 11:59 pm Fri 16 Oct in Denver, seen at 12:01 am Sat 17 Oct
  assert.equal(cameInWords("2026-10-17T05:59:00Z", Date.parse("2026-10-17T06:01:00Z")), "Came in yesterday 11:59 pm");
  assert.equal(denverDay(Date.parse("2026-10-17T05:59:00Z")), "2026-10-16");
  assert.equal(clockTime(Date.parse("2026-10-17T18:00:00Z")), "12:00 pm");
});

test("clock: nothing for a missing or broken time; a time a little ahead says just now", () => {
  assert.equal(cameInWords(null, NOW), null);
  assert.equal(cameInWords("not a time", NOW), null);
  assert.equal(agoWords(NOW + 30_000, NOW), "just now");
});
