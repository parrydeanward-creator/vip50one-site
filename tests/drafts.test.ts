import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_CHARS, fairHousingFlags, factsFrom, mailHref, readDraftRequest, rulesDraft, smsHref } from "../lib/drafts.ts";

const facts = { first: "Jane", lastTalk: "Called 3 weeks ago: Sold their house", family: ["Spouse: Mike"], favourites: ["Favorite Restaurant: Cafe Rio"], comingUp: ["Birthday in 4 days (Oct 13)"], openItems: [] };

test("readDraftRequest: kind and a first name required; facts trimmed; nothing else kept", () => {
  const r = readDraftRequest({ kind: "text", facts: { ...facts, phone: "801", notes: "secret" }, agentFirst: "Parry", ask: " short " })!;
  assert.equal(r.kind, "text");
  assert.deepEqual(Object.keys(r.facts).sort(), ["comingUp", "family", "favourites", "first", "lastTalk", "openItems"]);
  assert.equal(r.ask, "short");
  assert.equal(readDraftRequest({ kind: "fax", facts }), null);
  assert.equal(readDraftRequest({ kind: "text", facts: { first: " " } }), null);
});

test("factsFrom: Call Prep's lines only", () => {
  const f = factsFrom({ name: "Jane Smith", first: "Jane", pulse: null, lastTalk: null, family: [], favourites: ["a", "b", "c", "d", "e", "f", "g"], comingUp: [], openItems: [], ask: ["x"] });
  assert.equal(f.favourites.length, 6);
  assert.ok(!("ask" in f) && !("pulse" in f));
});

test("rulesDraft: true, short, from the facts; each kind within its length", () => {
  for (const kind of ["text", "email", "video_text", "note"] as const) {
    const d = rulesDraft(kind, facts, "Parry");
    assert.ok(d.body.length <= MAX_CHARS[kind]);
    assert.match(d.body, /Jane/);
    assert.equal(d.source, "rules");
    assert.deepEqual(d.flags, []);
  }
  assert.match(rulesDraft("text", facts, null).body, /your birthday is coming up/);
  assert.match(rulesDraft("text", facts, null).body, /Cafe Rio/);
  assert.ok(rulesDraft("email", facts, "Parry").subject);
  assert.equal(rulesDraft("note", { ...facts, comingUp: [], favourites: [] }, null).body.includes("crossed my mind"), true);
});

test("fairHousingFlags: FAIR-HOUSING.md §1 words, a plain reason each", () => {
  assert.deepEqual(fairHousingFlags("Great home, perfect for families, in a safe neighborhood"), ["Describes who the home suits (families)", "Uses a coded area word"]);
  assert.deepEqual(fairHousingFlags("Happy birthday Jane, lunch at Cafe Rio soon?"), []);
  assert.equal(fairHousingFlags("No Section 8").length, 1);
});

test("sms and mail links carry the draft", () => {
  assert.equal(smsHref("+18015551234", "Hi Jane & Mike", true), "sms:+18015551234&body=Hi%20Jane%20%26%20Mike");
  assert.equal(smsHref("+18015551234", "Hi", false), "sms:+18015551234?body=Hi");
  assert.equal(mailHref("j@x.com", "Hi there", "Body"), "mailto:j@x.com?subject=Hi%20there&body=Body");
  assert.equal(mailHref("j@x.com", null, "Body"), "mailto:j@x.com?body=Body");
});
