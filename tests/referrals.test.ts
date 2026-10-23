import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { REFERRALS_NODE, askNow, demoReferrals, headline, readReferrals, referralRate, withReferralsNode } from "../lib/referrals.ts";

const today = "2026-10-08";

test("readReferrals: checked, sorted, one entry per contact under its strongest reason", () => {
  const r = readReferrals({
    goal_year: { from: "2026-03-01", to: "2027-03-01" },
    goal: 12,
    count: 5,
    referrers: [
      { contact_id: "a", name: "Ann Ruiz", total: 3, this_year: 1, closed: 1, value: 455000 },
      { contact_id: "b", name: "Jane Smith", total: 2, this_year: 2, closed: 0, value: null },
      { name: "No id" },
    ],
    recent: [{ referred_contact_id: "x", referred_name: "Tom", referrer_contact_id: "b", at: "2026-09-01" }, { referred_name: "Old", at: "2026-01-01" }],
    vips: { count: 40, referred_ever: 8, referred_this_year: 4 },
    candidates: [
      { contact_id: "c", name: "Nina", why: "fully_touched", words: "x" },
      { contact_id: "a", name: "Ann Ruiz", why: "past_referrer_quiet", words: "Quiet 52 days" },
      { contact_id: "a", name: "Ann Ruiz", why: "recent_closing", words: "dup" },
      { contact_id: "d", name: "Bad", why: "made_up" },
    ],
  })!;
  assert.deepEqual(r.referrers.map((x) => x.name), ["Jane Smith", "Ann Ruiz"]); // most this goal year first
  assert.deepEqual(r.recent.map((x) => x.name), ["Tom", "Old"]);
  assert.deepEqual(r.candidates.map((c) => `${c.id}:${c.why}`), ["a:past_referrer_quiet", "c:fully_touched"]);
  assert.equal(r.goal, 12);
  assert.equal(readReferrals({ referrers: "no" }), null);
  assert.equal(readReferrals(null), null);
});

test("referral rate, ask-now and the headline", () => {
  const r = demoReferrals(today);
  assert.equal(Math.round(referralRate(r)! * 100), 10); // 5 of 48 VIPs this goal year
  assert.deepEqual(askNow(r).map((c) => c.why), ["past_referrer_quiet", "recent_closing"]);
  assert.equal(headline(r), "7 referrals of 12 this goal year");
  // (rewritten 17 Oct: the headline reads this_year when ONE MOVE sends it, so these set it too)
  assert.equal(headline({ ...r, count: 12, thisYear: 12 }), "12 referrals: goal of 12 reached");
  assert.equal(headline({ ...r, goal: null, count: 1, thisYear: 1 }), "1 referral this goal year");
  assert.equal(headline({ ...r, goal: null, count: 1, thisYear: null }), "1 referral this goal year"); // older answer: count
  assert.equal(referralRate({ ...r, vips: { count: 0, ever: 0, thisYear: 0 } }), null);
});

test("withReferralsNode: one orb under ONE YOU, yellow when someone is worth asking now", () => {
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  // every referral thanked, so the ask line shows (a thank-you owed now leads the line: see the §3r.3 test below)
  const demo = demoReferrals(today);
  // (rewritten 17 Oct: ONE MOVE's thank_you_owed list is now the source of "to thank", so it is emptied here too)
  const r = { ...demo, recent: demo.recent.map((x) => ({ ...x, thanked: true })), thankOwed: [] };
  const g = withReferralsNode(withReferralsNode(base, r), r);
  const n = g.nodes.filter((x) => x.id === REFERRALS_NODE);
  assert.equal(n.length, 1);
  assert.equal(n[0].status, "attention");
  assert.equal(n[0].secondaryLabel, "2 worth asking now");
  const calm = withReferralsNode(base, { ...r, candidates: r.candidates.filter((c) => c.why === "fully_touched") });
  assert.equal(calm.nodes.find((x) => x.id === REFERRALS_NODE)!.status, "healthy");
  assert.equal(withReferralsNode(base, null).nodes.length, 1);
  assert.equal(withReferralsNode({ ...base, nodes: [{ ...base.nodes[0], locked: true }] }, r).nodes.length, 1);
});

import { applyThank, thankUrl, thankWords, unthanked, withReferralsNode as withRefs, demoReferrals as demoRefs, readReferrals as readRefs, REFERRALS_NODE as RNODE } from "../lib/referrals.ts";
test("thank-you (§3r.3): only when ONE MOVE says unthanked, last 90 days, no open task; oldest first", () => {
  const r = readRefs({
    referrers: [{ contact_id: "a", name: "Jane Smith", total: 2 }],
    vips: { count: 1 },
    recent: [
      { referral_id: "f1", referred_name: "Tom Lee", referrer_contact_id: "a", at: "2026-10-01", thanked: false },
      { referral_id: "f2", referred_name: "Amy Fox", referrer_contact_id: "a", at: "2026-09-01", thanked: false },
      { referral_id: "f3", referred_name: "Old One", referrer_contact_id: "a", at: "2026-05-01", thanked: false },
      { referral_id: "f4", referred_name: "Open Task", referrer_contact_id: "a", at: "2026-10-02", thanked: false, thank_open: true },
      { referral_id: "f5", referred_name: "Done", referrer_contact_id: "a", at: "2026-10-03", thanked: true },
      { referred_name: "No word", referrer_contact_id: "a", at: "2026-10-04" },
    ],
  })!;
  const list = unthanked(r, "2026-10-09");
  assert.deepEqual(list.map((x) => x.name), ["Amy Fox", "Tom Lee"]);
  assert.equal(thankWords(r, list[0]), "Thank Jane Smith for referring Amy Fox");
  assert.deepEqual(unthanked(applyThank(r, "f2"), "2026-10-09").map((x) => x.name), ["Tom Lee"]);
  assert.equal(thankUrl, "https://move.vip50one.com/api/brain/referrals/thank");
});

test("the Referrals orb pulses for a thank-you owed, and says so first", () => {
  const g = { nodes: [{ id: "go", type: "product", label: "ONE YOU", importance: 1 } as never], edges: [] as never[] };
  const n = withRefs(g, demoRefs("2026-10-09"), "2026-10-09").nodes.find((x: { id: string }) => x.id === RNODE) as unknown as { status: string; secondaryLabel: string };
  assert.equal(n.status, "attention");
  assert.equal(n.secondaryLabel, "1 to thank · 2 worth asking");
});

import { THANK_KINDS, applyThanked, readReadyToAsk, readThankOwed, readThanked, thankCount, thankedUrl, withReferralCount, yearCount, yearLine } from "../lib/referrals.ts";

test("thank_you_owed and ready_to_ask: checked, first names, safe defaults when missing", () => {
  const base = { referrers: [], vips: { count: 0 } };
  const old = readRefs(base)!;
  assert.equal(old.thisYear, null);
  assert.equal(old.thankOwed, null);
  assert.equal(old.readyToAsk, null);
  const r = readRefs({
    ...base,
    count: 3,
    this_year: 4,
    thank_you_owed: [
      { contact_id: "a", first_name: "Ann Ruiz", sent: 2, last_sent_at: "2026-09-01T10:00:00Z" },
      { contact_id: "b", first_name: "Bo", sent: 1, last_sent_at: "2026-10-01" },
      { contact_id: "b", first_name: "Bo", sent: 1, last_sent_at: "2026-10-01" },
      { first_name: "No id" },
      null,
      { contact_id: "c", first_name: "Cy", sent: "x" },
    ],
    ready_to_ask: [1, 2, 3, 4, 5, 6].map((k) => ({ contact_id: `p${k}`, first_name: `P${k}`, why: k === 2 ? "" : `Why ${k}` })),
  })!;
  assert.equal(r.thisYear, 4);
  assert.equal(yearCount(r), 4); // this_year wins over count
  assert.equal(yearCount(old), 0);
  assert.deepEqual(r.thankOwed!.map((x) => `${x.firstName}:${x.sent}:${x.lastSentAt}`), ["Bo:1:2026-10-01", "Ann:2:2026-09-01", "Cy:0:null"]);
  assert.equal(r.readyToAsk!.length, 5);
  assert.equal(r.readyToAsk![1].why, "Worth asking now");
  assert.equal(readThankOwed("no"), null);
  assert.deepEqual(readReadyToAsk([]), []);
  assert.equal(thankCount(r, "2026-10-17"), 3);
  assert.deepEqual(applyThanked(r, "b").thankOwed!.map((x) => x.id), ["a", "c"]);
  assert.equal(thankCount(applyThanked(r, "b"), "2026-10-17"), 2);
});

test("the Goals referrals line counts the same as the Referrals orb", () => {
  const r = { ...demoRefs("2026-10-17"), thisYear: 9 };
  const goals = [
    { key: "closings_goal", value: 3 },
    { key: "referrals_goal", value: 2 },
  ];
  assert.deepEqual(withReferralCount(goals, r).map((g) => g.value), [3, 9]);
  assert.equal(withReferralCount(goals, null), goals);
  assert.equal(yearLine(r), "9 referrals this goal year of 12");
  assert.equal(yearLine({ ...r, thisYear: 1, goal: null }), "1 referral this goal year");
});

test("logging a thank-you: plain words, nothing sent", () => {
  assert.equal(thankedUrl, "https://move.vip50one.com/api/brain/referrals/thanked");
  assert.deepEqual(THANK_KINDS.map((k) => k.kind), ["call", "note", "text", "email", "gift"]); // rewritten 23 Oct: gift joins (GO/MOVE accepts it)
  assert.deepEqual(THANK_KINDS.map((k) => k.label), ["Called", "Sent a note", "Texted", "Emailed", "Sent a gift"]);
  assert.deepEqual(readThanked(200, { ok: true, thanked: true, touch_credited: true }), { ok: true, words: "Thank-you logged; counted as a touch." });
  assert.deepEqual(readThanked(200, { ok: true, thanked: true, touch_credited: false }), { ok: true, words: "Thank-you logged." });
  assert.equal(readThanked(200, { ok: false, reason: "nothing_owed" }).ok, true);
  assert.equal(readThanked(500, null).ok, false);
  assert.equal(readThanked(404, null).ok, false);
  assert.equal(readThanked(200, null).ok, false);
});

test("the demo shows example people in both lists", () => {
  const d = demoRefs("2026-10-17");
  assert.ok(d.thankOwed!.length >= 1);
  assert.ok(d.readyToAsk!.length >= 1);
  assert.equal(yearCount(d), 7);
});

test("the people behind the stat tiles, the pace, and the gift thank-you", async () => {
  const { THANK_TITLE, readMonthPeople, readGciClosings, readPace } = await import("../lib/referrals.ts");
  const r = readReferrals({
    referrers: [], recent: [], candidates: [], vips: {},
    asks_this_month: 2, thanks_this_month: 1,
    asked_this_month: [{ contact_id: "a1", name: "Ann Lee", at: "2026-10-02", how: "text" }, { name: "" }, { contact_id: "a2", name: "Bo Ray", at: "2026-10-05", how: null }],
    thanked_this_month: [{ contact_id: "t1", name: "Cy Dunn", at: "2026-10-03", how: "gift" }],
    referral_gci_closings: [{ contact_id: "c1", name: "Di Fox", closed_on: "2026-08-01", gci: 4200 }, { contact_id: null, name: null, closed_on: "2026-09-10", gci: "3000.5" }],
    pace: { pace: 4, to_go: 8, cadence: "1 every 3 weeks" },
  })!;
  assert.deepEqual(r.askedThisMonth!.map((x) => x.id), ["a2", "a1"]); // newest first, nameless dropped
  assert.deepEqual(r.thankedThisMonth, [{ id: "t1", name: "Cy Dunn", at: "2026-10-03", how: "gift" }]);
  assert.deepEqual(r.gciClosings!.map((x) => [x.id, x.name, x.gci]), [[null, "A referral closing", 3000.5], ["c1", "Di Fox", 4200]]);
  assert.deepEqual(r.pace, { pace: 4, toGo: 8, cadence: "1 every 3 weeks" });
  // an older answer sends none of it: null, never invented
  const old = readReferrals({ referrers: [], recent: [], candidates: [], vips: {} })!;
  assert.equal(old.askedThisMonth, null);
  assert.equal(old.thankedThisMonth, null);
  assert.equal(old.gciClosings, null);
  assert.equal(old.pace, null);
  assert.equal(readMonthPeople("x"), null);
  assert.equal(readGciClosings({}), null);
  assert.equal(readPace(null), null);
  // gift: "Sent a gift", and the button says it is not a VIP touch
  const gift = THANK_KINDS.find((k) => k.kind === "gift")!;
  assert.equal(gift.label, "Sent a gift");
  assert.match(THANK_TITLE.gift, /does not count as a VIP touch/);
  assert.match(THANK_TITLE.call, /counts as a VIP touch/);
  // the tiles open their people (rule 12)
  const net = (await import("node:fs")).readFileSync(new URL("../components/brain/ReferralNetwork.tsx", import.meta.url), "utf8");
  assert.ok(net.includes("data.thankedThisMonth") && net.includes("data.askedThisMonth") && net.includes("data.gciClosings"));
});
