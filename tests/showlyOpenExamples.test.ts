import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOWLY_LENDER, SHOWLY_LENDER_REQUESTS, SHOWLY_RECAPS, SHOWLY_TOURS, answerTally, tallyWords } from "../lib/examples/showly.ts";
import { OPEN_PROTOCOL, OPEN_VISITORS, clockWords, currentPhase, isExampleTool, minWords, protocolProgress, ratingCounts } from "../lib/examples/open.ts";
import { openToolOrbs, showlyToolOrbs } from "../lib/productTools.ts";

// Parry, 18 Oct: the Showly and ONE Open side panels show the example itself, never a blank.

test("Showly example: a tour of 5 homes, 2 recaps, 2 letter requests, no money on the lender side", () => {
  assert.equal(SHOWLY_TOURS[0].homes.length, 5);
  assert.equal(SHOWLY_RECAPS.length, 2);
  assert.equal(SHOWLY_LENDER_REQUESTS.length, 2);
  const lenderWords = JSON.stringify([SHOWLY_LENDER, SHOWLY_LENDER_REQUESTS]);
  assert.doesNotMatch(lenderWords, /\$|\d{3},\d{3}|income|credit score|amount/i);
  // invented phone numbers only (555-01xx)
  assert.match(SHOWLY_LENDER.phoneShown, /555-01\d\d/);
});

test("answer tally and words", () => {
  assert.deepEqual(answerTally(SHOWLY_TOURS[0].homes), { yes: 2, maybe: 2, no: 1, none: 0 });
  assert.equal(tallyWords(SHOWLY_TOURS[0].homes), "2 Yes · 2 Maybe · 1 No");
  assert.equal(tallyWords([{ answer: null }]), "No answers yet");
});

test("ONE Open example: 14 visitors, first name and one initial, rated", () => {
  assert.equal(OPEN_VISITORS.length, 14);
  assert.ok(OPEN_VISITORS.every((v) => /^\p{L}+ \p{L}$/u.test(v.name) && v.source.length > 0));
  const c = ratingCounts(OPEN_VISITORS);
  assert.equal(c.hot + c.warm + c.cold, 14);
  assert.deepEqual(c, { hot: 3, warm: 6, cold: 5 });
});

test("protocol: four phases in order, the current one is the first not finished", () => {
  const p = protocolProgress(OPEN_PROTOCOL);
  assert.deepEqual(p.map((x) => x.label), ["Plan", "Prepare", "Host", "Follow Up"]);
  assert.equal(currentPhase(OPEN_PROTOCOL), "prepare");
  assert.equal(currentPhase(OPEN_PROTOCOL.map((s) => ({ ...s, done: true }))), "done");
});

test("clock and duration words", () => {
  assert.equal(clockWords(3909), "1:05:09");
  assert.equal(clockWords(249), "4:09");
  assert.equal(clockWords(-5), "0:00");
  assert.equal(minWords(30), "30 min");
  assert.equal(minWords(60), "1 hr");
  assert.equal(minWords(150), "2 hr 30");
});

test("a tool showing its labelled example is told apart from the agent's own", () => {
  // Door hangers (vip-open#65) is link-only, never an example, so it is left out of the examples.
  const demo = [...showlyToolOrbs(null, "2026-10-18"), ...openToolOrbs(null).filter((t) => t.key !== "hangers")];
  assert.ok(demo.every((t) => isExampleTool({ secondaryLabel: t.sub, summary: t.summary })));
  assert.equal(isExampleTool({ secondaryLabel: "2 tours in 60 days", summary: "One tour per showing day." }), false);
});
