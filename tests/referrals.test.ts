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
  const r = demoReferrals(today);
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
