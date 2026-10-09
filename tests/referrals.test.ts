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
  assert.equal(headline({ ...r, count: 12 }), "12 referrals: goal of 12 reached");
  assert.equal(headline({ ...r, goal: null, count: 1 }), "1 referral this goal year");
  assert.equal(referralRate({ ...r, vips: { count: 0, ever: 0, thisYear: 0 } }), null);
});

test("withReferralsNode: one orb under ONE YOU, yellow when someone is worth asking now", () => {
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  // every referral thanked, so the ask line shows (a thank-you owed now leads the line: see the §3r.3 test below)
  const demo = demoReferrals(today);
  const r = { ...demo, recent: demo.recent.map((x) => ({ ...x, thanked: true })) };
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
  const n = withRefs(g, demoRefs("2026-10-09"), "2026-10-09").nodes.find((x: { id: string }) => x.id === RNODE) as { status: string; secondaryLabel: string };
  assert.equal(n.status, "attention");
  assert.equal(n.secondaryLabel, "1 to thank · 2 worth asking");
});
