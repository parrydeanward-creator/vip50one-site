import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { LIFE_NODE, applyKeep, demoRadar, detect, fromTimeline, keepBody, keepUrl, lifeEventsUrl, open, quote, readRadar, touchFor, withLifeEventsNode } from "../lib/lifeEvents.ts";

test("urls: the §3y.5 routes", () => {
  assert.equal(lifeEventsUrl(), "https://move.vip50one.com/api/brain/life-events?days=90");
  assert.equal(keepUrl, "https://move.vip50one.com/api/brain/life-events/keep");
});

test("detect: the agent's own words, each event once", () => {
  assert.deepEqual(detect("Jane and Tom are expecting their second in March!"), ["baby"]);
  assert.deepEqual(detect("Got engaged in June; wedding is next spring"), ["wedding"]);
  assert.deepEqual(detect("Mike got promoted to regional manager"), ["new_job"]);
  assert.deepEqual(detect("Retiring from the district in May"), ["retirement"]);
  assert.deepEqual(detect("Oldest is off to college at USU"), ["empty_nest"]);
  assert.deepEqual(detect("They closed on their new house in Lehi"), ["new_home"]);
  assert.deepEqual(detect("Linda's mom passed away last week"), ["loss"]);
  assert.deepEqual(detect("Going through a divorce, be gentle"), ["hard_time"]);
});

test("detect: negations, look-alikes and buyer talk do not count", () => {
  assert.deepEqual(detect("Amy is not pregnant, people keep asking"), []);
  assert.deepEqual(detect("No wedding plans yet"), []);
  assert.deepEqual(detect("Never retired, still teaching"), []);
  assert.deepEqual(detect("25th wedding anniversary dinner at Ruth's"), []);
  assert.deepEqual(detect("Looking for a new home in Draper"), [], "buyer intent is not a life event");
  assert.deepEqual(detect("Spring promotion on carpet cleaning"), []);
  assert.deepEqual(detect("They called off the wedding"), ["hard_time"]);
});

test("quote: the sentence that says it", () => {
  assert.equal(quote("Great call. Mike got promoted to manager. Loves golf.", "new_job"), "Mike got promoted to manager.");
});

test("touch: celebrate with a note; loss gets sympathy and no business; hard times a call only", () => {
  assert.equal(touchFor("baby", "Jane").draft, "note");
  const loss = touchFor("loss", "Linda");
  assert.match(loss.line, /sympathy/);
  assert.match(loss.ask!, /No business/);
  const hard = touchFor("hard_time", "Sam");
  assert.deepEqual([hard.draft, hard.ask], [null, null]);
  assert.match(hard.line, /No card, no home value/);
});

test("fromTimeline: newest mention per event; listings and web visits are not the agent's words", () => {
  const f = fromTimeline("c1", "Jane Smith", {
    next: null,
    events: [
      { at: "2026-09-01T10:00:00Z", kind: "note", product: "move", title: "Note", detail: "Jane is pregnant" },
      { at: "2026-10-01T10:00:00Z", kind: "call", product: "move", title: "Call", detail: "Baby girl due in March" },
      { at: "2026-10-02T10:00:00Z", kind: "web", product: "open", title: "Viewed 'Perfect for newlyweds'", detail: null },
    ],
  });
  assert.equal(f.length, 1);
  assert.deepEqual([f[0].event, f[0].at], ["baby", "2026-10-01T10:00:00Z"]);
  assert.equal(fromTimeline("c1", "Jane", null).length, 0);
});

test("readRadar: checked; one finding per contact and event; kept read", () => {
  const r = readRadar({
    today: "2026-10-09",
    notes: [
      { contact_id: "a", name: "Jane", at: "2026-10-01T00:00:00Z", text: "expecting in March" },
      { contact_id: "a", name: "Jane", at: "2026-10-05T00:00:00Z", text: "baby shower Saturday, she's pregnant with twins" },
      { contact_id: "b", name: "", at: "2026-10-05", text: "pregnant" },
      { contact_id: "c", name: "Bo", at: "bad", text: "pregnant" },
    ],
    kept: [{ contact_id: "a", event: "baby", state: "done", at: "2026-10-06" }, { contact_id: "a", event: "juggling", state: "done", at: "2026-10-06" }],
  }, "2000-01-01")!;
  assert.equal(r.found.length, 1);
  assert.equal(r.found[0].at, "2026-10-05T00:00:00Z");
  assert.equal(r.kept.length, 1);
  assert.equal(readRadar({ today: "2026-10-09" }, "x"), null);
});

test("open: kept ones put away for 180 days; a newer mention after the keep comes back", () => {
  const r = demoRadar("2026-10-09");
  const list = open(r);
  assert.deepEqual(list.map((f) => f.name), ["Jane Smith", "Mike Torres", "Linda Park", "Dave Ortiz"], "Sara's wedding was done; Amy's 'not pregnant' never counted");
  const after = applyKeep(r, "r1", "baby", "not_this");
  assert.equal(open(after).some((f) => f.contactId === "r1"), false);
  const newer = { ...after, found: after.found.map((f) => (f.contactId === "r1" ? { ...f, at: "2026-10-10T00:00:00Z" } : f)), today: "2026-10-11" };
  assert.equal(open(newer).some((f) => f.contactId === "r1"), true);
  assert.deepEqual(keepBody("r1", "baby", "done"), { contact_id: "r1", event: "baby", state: "done" });
});

test("orb: under ONE MOVE, yellow while one from the last 14 days is untouched; gone when locked or no route", () => {
  const g = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", importance: 1 } as GraphNode], edges: [] as GraphEdge[] };
  const n = withLifeEventsNode(g, demoRadar("2026-10-09")).nodes.find((x) => x.id === LIFE_NODE)!;
  assert.deepEqual([n.status, n.secondaryLabel], ["attention", "3 new · Jane Smith: New baby"]);
  assert.equal(withLifeEventsNode(g, null).nodes.length, 1);
  const quiet = withLifeEventsNode(g, { today: "2026-10-09", found: [], kept: [] }).nodes.find((x) => x.id === LIFE_NODE)!;
  assert.deepEqual([quiet.status, quiet.secondaryLabel], ["healthy", "Nothing new"]);
  const twice = withLifeEventsNode(withLifeEventsNode(g, demoRadar("2026-10-09")), demoRadar("2026-10-09"));
  assert.equal(twice.nodes.filter((x) => x.id === LIFE_NODE).length, 1);
});

import { readDraftRequest, rulesDraft } from "../lib/drafts.ts";
test("drafts: a life event opens with its own line; a loss never reads like a check-in", () => {
  const f = { first: "Linda", lastTalk: null, family: [], favourites: ["Favorite Restaurant: Cafe Rio"], comingUp: [], openItems: [] };
  const d = rulesDraft("note", f, "Parry", "loss");
  assert.match(d.body, /sorry to hear of your loss/);
  assert.doesNotMatch(d.body, /Cafe Rio|checking in|crossed my mind/i);
  assert.equal(rulesDraft("email", f, null, "baby").subject, "Congratulations, Linda");
  assert.equal(readDraftRequest({ kind: "note", facts: { first: "Linda" }, event: "loss" })!.event, "loss");
  assert.equal(readDraftRequest({ kind: "note", facts: { first: "Linda" }, event: "toString" })!.event, null, "only known events");
});
