import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demoReferrals, readReferrals } from "../lib/referrals.ts";
import {
  closestLine, demoNetworkItems, goalGauge, movesFor, owedRows, readNetworkItems, thankDraft, tiles, tradePartners, treeOf, warmingRows,
} from "../lib/referralNetwork.ts";

// The Brain's Referral Network page (VIP-SUMMARY §3aq; Parry, 22 Oct: "yes on referral network").

const today = "2026-10-22";

test("goal gauge: count of goal, on-pace marker, what it takes from here", () => {
  // goal year Mar 1 2026 to Mar 1 2027; Oct 22 is 235 of 365 days in: on pace = 15 x 0.644 = 9.66 -> 10
  const g = goalGauge({ count: 1, goal: 15, from: "2026-03-01", to: "2027-03-01", today });
  assert.equal(g.share, 1 / 15);
  assert.equal(g.paceCount, 10);
  assert.ok(g.pace! > 0.64 && g.pace! < 0.65);
  assert.equal(g.left, 14);
  // 130 days left = 18.6 weeks; 14 to go -> 1 every 1.33 weeks -> "1 every week"
  assert.equal(g.line, "14 to go · 1 every week");
  // a fresh year: 52 weeks for 14 -> 1 every 4 weeks (3.7 rounds to 4)
  assert.equal(goalGauge({ count: 1, goal: 15, from: "2026-10-22", to: "2027-10-22", today }).line, "14 to go · 1 every 4 weeks");
  // more than one a week
  assert.equal(goalGauge({ count: 0, goal: 20, from: "2026-01-01", to: "2026-12-01", today }).line, "20 to go · 4 a week");
  // reached: share caps at 1
  const done = goalGauge({ count: 16, goal: 15, from: "2026-03-01", to: "2027-03-01", today });
  assert.equal(done.share, 1);
  assert.equal(done.left, 0);
  assert.equal(done.line, "Goal reached");
  // no goal year: no pace marker, still the count to go
  const noYear = goalGauge({ count: 3, goal: 12, from: null, to: null, today });
  assert.equal(noYear.pace, null);
  assert.equal(noYear.line, "9 to go");
  // no goal: just the count
  const none = goalGauge({ count: 3, goal: null, from: "2026-03-01", to: "2027-03-01", today });
  assert.equal(none.share, null);
  assert.equal(none.line, null);
});

const liveAnswer = {
  goal_year: { from: "2026-03-01", to: "2027-03-01" },
  goal: 15,
  count: 1,
  this_year: 1,
  referrers: [{ contact_id: "11111111-1111-4111-8111-111111111111", name: "Matt Rowe", total: 1, this_year: 1, closed: 0 }],
  recent: [{ referral_id: "f1", referred_contact_id: "22222222-2222-4222-8222-222222222222", referred_name: "Jake Hill", referrer_contact_id: "11111111-1111-4111-8111-111111111111", at: "2026-10-21", thanked: false, thank_open: false }],
  vips: { count: 40, referred_ever: 1, referred_this_year: 1 },
  candidates: [],
  thank_you_owed: [{ contact_id: "11111111-1111-4111-8111-111111111111", first_name: "Matt", sent: 1, last_sent_at: "2026-10-21" }],
  ready_to_ask: [],
};

test("fallbacks: before GO/MOVE ships §3aq, the tiles hide, warming is computed or hidden, the tree draws from recent", () => {
  const r = readReferrals(liveAnswer)!;
  assert.equal(r.warming, null);
  assert.equal(r.asksThisMonth, null);
  assert.deepEqual(tiles(r), []); // thanks, asks and GCI tiles hide
  // warming: hidden with no roster
  assert.deepEqual(warmingRows(r, null), { rows: [], from: null });
  // warming: computed from this month's VIP roster; referrers, the fully touched and the untouched stay out
  const month = (n: number) => Object.fromEntries(["call", "video_text", "social", "newsletter", "mixer"].map((k, i) => [k, i < n]));
  const roster = {
    cap: 50,
    vip50: [
      { id: "11111111-1111-4111-8111-111111111111", name: "Matt Rowe", month: month(4) },
      { id: "a", name: "Amy Chen", month: month(4) },
      { id: "b", name: "Dave Kim", month: month(2) },
      { id: "c", name: "Full Done", month: month(5) },
      { id: "d", name: "Not Yet", month: month(0) },
    ],
    vip100: [],
  };
  const w = warmingRows(r, roster);
  assert.equal(w.from, "roster");
  assert.deepEqual(w.rows.map((x) => `${x.name} ${x.done}/${x.due}`), ["Amy Chen 4/5", "Dave Kim 2/5"]);
  assert.equal(w.rows[0].next, "Next: mixer invite this month");
  assert.equal(closestLine(w.rows[0]), "Amy Chen is one touch away.");
  assert.equal(closestLine(w.rows[1]), "Dave Kim is 3 touches away.");
  assert.equal(closestLine(undefined), null);
  // tree: referrer -> client from recent
  const t = treeOf(r, null);
  assert.equal(t.length, 1);
  assert.equal(t[0].name, "Matt Rowe");
  assert.deepEqual(t[0].leaves.map((l) => l.name), ["Jake Hill"]);
  assert.equal(t[0].leaves[0].contactId, "22222222-2222-4222-8222-222222222222");
  // tree fallback: referrers only when nothing is recent
  const onlyRefs = treeOf({ ...r, recent: [] }, null);
  assert.deepEqual(onlyRefs.map((b) => [b.name, b.leaves.length]), [["Matt Rowe", 0]]);
  // thank-you owed carries who they sent; the draft names them
  const o = owedRows(r, today);
  assert.deepEqual(o.map((x) => [x.first, x.name, x.clients.map((c) => c.name).join()]), [["Matt", "Matt Rowe", "Jake Hill"]]);
  assert.equal(thankDraft("Matt", ["Jake Hill", "Lena Hill"]), "Matt, thank you for sending Jake & Lena my way. It means a lot that you trust me with the people you care about.");
  // an older answer with no thank_you_owed: one row per referrer from the unthanked referrals
  const older = owedRows({ ...r, thankOwed: null }, today);
  assert.deepEqual(older.map((x) => [x.id, x.sent]), [["11111111-1111-4111-8111-111111111111", 1]]);
});

test("§3aq additions read when ONE MOVE sends them", () => {
  const r = readReferrals({
    ...liveAnswer,
    asks_this_month: 2,
    thanks_this_month: 1,
    referral_gci_year: 9200,
    warming: [
      { contact_id: "b", name: "Dave Kim", touches_done: 2, touches_due: 6, next: "Handwritten note due" },
      { contact_id: "a", name: "Amy Chen", touches_done: 5, touches_due: 6 },
      { contact_id: "a", name: "Dup" },
      { name: "No id" },
    ],
    recent: [{ ...liveAnswer.recent[0], client: { contact_id: "22222222-2222-4222-8222-222222222222", name: "Jake & Lena", kind: "buying" } }],
  })!;
  assert.deepEqual(tiles(r), ["thanks", "asks", "gci"]);
  assert.deepEqual(r.warming!.map((w) => w.name), ["Amy Chen", "Dave Kim"]); // closest first
  assert.equal(warmingRows(r, null).from, "one_move");
  assert.equal(treeOf(r, null)[0].leaves[0].line, "buying, Oct 21");
  assert.equal(owedRows(r, today)[0].clients[0].kind, "buying");
});

test("agent to agent: the five-step track only when stage is sent; the same moves as ONE MOVE's page", () => {
  const n = readNetworkItems({
    sent: [{ id: "s1", status: "sent", status_words: "Waiting for an answer", kind: "buyer", area: "Boise", other: { name: "Ryan Shaw" }, client: { first_name: "Hale" }, fee_terms: "25%" }],
    received: [
      { id: "r1", status: "under_contract", status_words: "Under contract", kind: "buyer", area: "Draper", other: { name: "Kate Morgan" }, client: { first_name: "The", last_name: "Ortegas" }, stage: "under_contract" },
      { id: "r2", status: "sent", status_words: "Waiting for an answer", kind: "seller", other: { name: "Jill Parker" }, client: { first_name: "Sam" }, stage: "made_up" },
      { status: "sent" },
    ],
  })!;
  assert.equal(n.received.length, 2);
  assert.equal(n.received[0].stage, "under_contract");
  assert.equal(n.received[1].stage, null); // unknown stage: the status words show instead
  assert.deepEqual(movesFor(n.received[1]).map((m) => m.label), ["Accept and agree to the fee", "Decline"]);
  assert.deepEqual(movesFor(n.received[0]).map((m) => m.label), ["Move to Closed", "Lost"]);
  assert.deepEqual(movesFor(n.sent[0]).map((m) => m.label), ["Cancel referral"]);
  assert.deepEqual(tradePartners(n).map((p) => p.name), ["Jill Parker", "Kate Morgan", "Ryan Shaw"]);
  // the tree adds a ONE agent who sent a client
  const t = treeOf(readReferrals(liveAnswer)!, n);
  assert.deepEqual(t.map((b) => b.kind), ["sphere", "agent", "agent"]);
  assert.equal(readNetworkItems({ sent: "x" }), null);
});

test("live never shows the example agent's people", () => {
  const r = readReferrals(liveAnswer)!;
  const demo = demoReferrals(today);
  const demoNames = new Set([...demo.referrers.map((x) => x.name), ...demo.recent.map((x) => x.name), ...(demo.warming ?? []).map((x) => x.name), ...demoNetworkItems(today).received.map((x) => x.other)]);
  const shown = [
    ...treeOf(r, null).flatMap((b) => [b.name, ...b.leaves.map((l) => l.name)]),
    ...owedRows(r, today).map((x) => x.name),
    ...warmingRows(r, null).rows.map((x) => x.name),
  ];
  for (const n of shown) assert.ok(!demoNames.has(n), `${n} is an example person`);
  // the page takes the example lists only for the example agent; Brain passes the live answer otherwise
  const src = readFileSync(new URL("../components/brain/ReferralNetwork.tsx", import.meta.url), "utf8");
  assert.match(src, /useState<[^>]*>\(\(\) => \(live \? null : demoNetworkItems\(today\)\)\)/);
  assert.equal((src.match(/demoNetworkItems\(/g) ?? []).length, 1);
  assert.match(src, /if \(demo\) return setAgents\(demoAgents/);
  assert.doesNotMatch(src, /demoReferrals/);
  assert.doesNotMatch(src, /EXAMPLE_/);
  const brain = readFileSync(new URL("../components/brain/Brain.tsx", import.meta.url), "utf8");
  assert.match(brain, /<ReferralNetwork\s+data=\{refs\}\s+live=\{live\}/);
});

test("the example agent sees the whole page filled", () => {
  const d = demoReferrals(today);
  assert.deepEqual(tiles(d), ["thanks", "asks", "gci"]);
  assert.ok(treeOf(d, demoNetworkItems(today)).length >= 4);
  assert.ok(owedRows(d, today).length >= 1);
  assert.ok(warmingRows(d, null).rows.length >= 2);
});
