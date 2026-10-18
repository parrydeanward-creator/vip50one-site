import { test } from "node:test";
import assert from "node:assert/strict";
import { actionBody, dateWords, demoFound, foundNote, offerLine, readActionResult, readFound } from "../lib/closingsFound.ts";

test("closingsFound: reads offers, drops bad and duplicate ones, newest first", () => {
  const s = readFound({ linked: true, offers: [
    { listing_id: "a", close_date: "2026-09-01", side: "buy", sides_words: "Buyer side", address: "1 Elm St" },
    { listing_id: "b", close_date: "2026-10-05T00:00:00Z", side: "weird", address: "  " },
    { listing_id: "a", close_date: "2026-09-01", side: "buy" },
    { listing_id: "", close_date: "2026-10-01" },
    { listing_id: "c" },
    "junk",
  ] });
  assert.equal(s.linked, true);
  assert.deepEqual(s.offers.map((o) => o.listingId), ["b", "a"]);
  assert.equal(s.offers[0].side, "sell");
  assert.equal(s.offers[0].sidesWords, "Listing side");
  assert.equal(s.offers[0].address, null);
});

test("closingsFound: not linked and unreachable states", () => {
  assert.equal(foundNote(readFound({ linked: false, offers: [{ listing_id: "x", close_date: "2026-01-01" }] })), "Closings from the MLS show here once your MLS link is confirmed.");
  assert.equal(readFound({ linked: false, offers: [{ listing_id: "x" }] }).offers.length, 0);
  assert.equal(foundNote(readFound({ linked: null })), "Could not reach the MLS just now.");
  assert.equal(foundNote(readFound(null)), "Could not reach the MLS just now.");
  assert.equal(foundNote(readFound({ linked: true, offers: [] })), null);
  assert.equal(foundNote(null), null);
});

test("closingsFound: words, action body and result", () => {
  assert.equal(dateWords("2026-10-09"), "9 Oct 2026");
  assert.equal(dateWords("soon"), "soon");
  assert.equal(offerLine(demoFound().offers[0]), "Closed 9 Oct 2026 · Listing side · 412 Maple Ridge Dr, Bountiful");
  assert.deepEqual(actionBody("a", "log"), { listing_id: "a", action: "log" });
  assert.equal(actionBody("a", "delete"), null);
  assert.equal(actionBody("", "log"), null);
  assert.deepEqual(readActionResult({ ok: true, id: "1", already: true }), { ok: true, already: true });
  assert.deepEqual(readActionResult({ ok: false, error: "No." }), { ok: false, error: "No." });
  assert.equal(readActionResult(null).ok, false);
  assert.equal(demoFound().offers.length, 2);
});
