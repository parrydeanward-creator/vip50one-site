import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CALL_FAILED,
  FROM_WORDS,
  canMakeCalls,
  demoFits,
  fitsCallBody,
  fitsCallUrl,
  fitsLine,
  fitsUrl,
  readCallAnswer,
  readFits,
} from "../lib/listingFits.ts";

const person = (i: number, extra: Record<string, unknown> = {}) => ({ contact_id: `c${i}`, first_name: `P${i}`, why: "3 beds, Draper", from: "need", ...extra });

test("routes", () => {
  assert.equal(fitsUrl("a b"), "https://move.vip50one.com/api/brain/listings/fits?listing_id=a%20b");
  assert.equal(fitsCallUrl, "https://move.vip50one.com/api/brain/listings/fits/call");
  assert.deepEqual(fitsCallBody("L1", ["a", "b"]), { listing_id: "L1", contact_ids: ["a", "b"] });
});

test("unreadable, missing or failed answers read as not_linked", () => {
  for (const bad of [null, undefined, "x", 3, [], {}, { ok: false }, { ok: false, reason: "weird" }]) {
    assert.equal(readFits(bad).reason, "not_linked");
  }
  assert.equal(fitsLine(readFits(null)), "Matching starts when your MLS link is confirmed.");
});

test("reasons and the words", () => {
  assert.equal(fitsLine(readFits({ ok: true, reason: "waiting_feed", count: 0, people: [] })), "Matching starts when the MLS feed is on.");
  assert.equal(readFits({ ok: false, reason: "waiting_feed" }).reason, "waiting_feed");
  assert.equal(fitsLine(readFits({ ok: true, count: 0, people: [] })), "None of your people fit this home yet.");
  assert.equal(fitsLine(readFits({ ok: true, count: 1, people: [person(1)] })), "1 of your people fits this home");
  assert.equal(fitsLine(readFits({ ok: true, count: 2, people: [person(1), person(2)] })), "2 of your people fit this home");
  assert.equal(FROM_WORDS.need, "your buyer need");
  assert.equal(FROM_WORDS.site_search, "their saved search on your site");
});

test("bad rows are dropped, at most 15, duplicates once", () => {
  const rows = [person(1), person(1), person(2, { from: "email" }), person(3, { why: "" }), person(4, { first_name: 5 }), { x: 1 }, null, ...Array.from({ length: 30 }, (_, i) => person(100 + i))];
  const f = readFits({ ok: true, count: 33, people: rows });
  assert.equal(f.people.length, 15);
  assert.equal(f.people[0].contactId, "c1");
  assert.ok(!f.people.some((p) => ["c2", "c3", "c4"].includes(p.contactId)));
  assert.equal(f.count, 33);
});

test("button only when there are people and no reason", () => {
  assert.equal(canMakeCalls(readFits({ ok: true, count: 1, people: [person(1)] })), true);
  assert.equal(canMakeCalls(readFits({ ok: true, count: 0, people: [] })), false);
  assert.equal(canMakeCalls(readFits(null)), false);
  assert.equal(canMakeCalls(readFits({ ok: true, reason: "waiting_feed", count: 2, people: [person(1)] })), false);
});

test("call answers", () => {
  assert.deepEqual(readCallAnswer({ ok: true, task_ids: ["t1", 5, "t2"] }), { ok: true, taskIds: ["t1", "t2"] });
  assert.deepEqual(readCallAnswer({ ok: false, words: "Already on your list." }), { ok: false, words: "Already on your list." });
  assert.deepEqual(readCallAnswer({ ok: true }, false), { ok: false, words: CALL_FAILED });
  assert.deepEqual(readCallAnswer(null), { ok: false, words: CALL_FAILED });
});

test("demo: Maple has two fits, Aspen none", () => {
  const m = demoFits("demo-maple");
  assert.equal(m.count, 2);
  assert.deepEqual(m.people.map((p) => p.from), ["need", "site_search"]);
  assert.equal(demoFits("demo-aspen").count, 0);
  assert.equal(fitsLine(demoFits("demo-aspen")), "None of your people fit this home yet.");
});
