import { test } from "node:test";
import assert from "node:assert/strict";
import { lastMonth, monthWords } from "../lib/marketPulse.ts";

// Rewritten 17 Oct: Market Pulse folded into the Market Report (HOME-REPORT v0.4 box 3; Parry, 16 Oct: "1 yes"). Its orb,
// its reader and its send left the Brain with /api/brain/market-pulse, so their tests went with them (the readMarketPulse
// shape, the note as sent, the orb's yellow until all sent, "Starts when the MLS feed is live"). The two month helpers the
// Market Report still uses keep their tests unchanged.

test("plain words", () => {
  assert.equal(monthWords("2026-10"), "October 2026");
});

test("lastMonth is the finished month before today", () => {
  assert.equal(lastMonth("2026-10-10"), "2026-09");
  assert.equal(lastMonth("2027-01-01"), "2026-12");
});
