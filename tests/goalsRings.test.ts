import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { goalFacts } from "../lib/goals.ts";
import { demoDeals, type Deal } from "../lib/deals.ts";
import { CHANCE } from "../lib/forecast.ts";
import { demoReferrals, readReferrals } from "../lib/referrals.ts";
import { demoLooksHot } from "../lib/looksHot.ts";
import { goalYear, likelyNext, pulseLine, ring, ringBig, weekMoves, weekOf } from "../lib/goalsRings.ts";

// Goals as three rings (Parry, 22 Oct: "mix of A and C"). The numbers on each card come from the agent's own goals as
// MASTER sends them (a live-shaped graph), and Likely next and This week use only the agent's own lists.

const today = "2026-10-22";
// MASTER's vip_summary goal stats, shaped as read live (lib/live.ts); goal year Jul 1, 2026 to Jun 30, 2027.
const ENV: SummaryEnvelope = {
  v: 1,
  product: "go",
  found: true,
  stats: [
    { key: "closings_goal", label: "Closings this goal year", value: 1, max: 20, pace: null, from: "2026-07-01", to: "2027-06-30" },
    { key: "referrals_goal", label: "Referrals this goal year", value: 1, max: 15, pace: 5, from: "2026-07-01", to: "2027-06-30" },
    { key: "gci_goal", label: "GCI this goal year", value: 45600, max: 500000, pace: null, from: "2026-07-01", to: "2027-06-30" },
  ],
  items: [],
};
const facts = goalFacts(liveGraph(ENV, { pkg: "complete", firstName: "Kim", reachable: true, today }).nodes);
const by = (k: string) => facts.find((g) => g.key === k)!;

test("the live graph carries the three goals the rings draw", () => {
  assert.deepEqual(facts.map((g) => g.key).sort(), ["closings_goal", "gci_goal", "referrals_goal"]);
});

test("closings ring: by today, on pace to finish, to get there", () => {
  // Jul 1 to Oct 22 is 113 of 364 days: 31.04% of the year.
  const share = 113 / 364;
  const r = ring(by("closings_goal"), today);
  assert.equal(r.byToday, Math.round(20 * share)); // 6
  assert.equal(r.byToday, 6);
  assert.equal(r.finish, Math.round(1 / share)); // 3
  assert.equal(r.finish, 3);
  // 19 to go in 251 days (35.9 weeks): about 0.53 a week, so 1 every 2 weeks.
  assert.equal(r.toGetThere, "1 every 2 weeks");
  assert.equal(r.state, "behind");
  assert.equal(r.done, 1 / 20);
  assert.equal(r.mark, 6 / 20);
});

test("referrals ring takes MASTER's pace for by today", () => {
  const r = ring(by("referrals_goal"), today);
  assert.equal(r.byToday, 5);
  assert.equal(r.finish, 3);
  assert.equal(r.toGetThere, "1 every 3 weeks");
  assert.equal(r.state, "behind");
});

test("GCI ring: money to the dollar, finish to the thousand, a weekly amount", () => {
  const share = 113 / 364;
  const r = ring(by("gci_goal"), today);
  assert.equal(r.byToday, Math.round(500000 * share));
  assert.equal(r.byToday, 155220);
  assert.equal(r.finish, Math.round(45600 / share / 1000) * 1000);
  assert.equal(r.finish, 147000);
  const weeks = (Date.parse("2027-06-30T12:00:00Z") - Date.parse("2026-10-22T12:00:00Z")) / (7 * 86_400_000);
  assert.equal(r.toGetThere, `$${Math.round((500000 - 45600) / weeks).toLocaleString("en-US")} a week`);
  assert.equal(ringBig("gci_goal", r.value), "$45.6K");
  assert.equal(ringBig("gci_goal", 500000), "$500K");
  assert.equal(ringBig("gci_goal", 1_250_000), "$1.3M");
  assert.equal(ringBig("closings_goal", 1), "1");
});

test("states: on pace, ahead, reached, no goal, just started", () => {
  const base = { label: "x", from: "2026-07-01", to: "2027-06-30", pace: null };
  assert.equal(ring({ ...base, key: "closings_goal", value: 7, max: 22 }, today).state, "on"); // on pace for 23 of 22: within 5%
  assert.equal(ring({ ...base, key: "closings_goal", value: 10, max: 20 }, today).state, "ahead");
  const done = ring({ ...base, key: "closings_goal", value: 21, max: 20 }, today);
  assert.equal(done.state, "reached");
  assert.equal(done.toGetThere, "Goal reached");
  assert.equal(done.done, 1);
  const none = ring({ ...base, key: "referrals_goal", value: 2, max: null }, today);
  assert.equal(none.state, "none");
  assert.equal(none.byToday, null);
  const early = ring({ ...base, key: "closings_goal", value: 0, max: 20, from: "2026-10-15", to: "2027-10-14" }, today);
  assert.equal(early.state, "early");
  assert.equal(early.finish, null);
});

test("the goal year chip: Jul 1 to Jun 30, week 17 of 52", () => {
  assert.deepEqual(goalYear(facts, today), { from: "2026-07-01", to: "2027-06-30", week: 17, weeks: 52 });
  assert.equal(goalYear([], today), null);
});

test("Pulse's line names how many goals are behind and the by-today numbers", () => {
  const p = pulseLine(facts.map((g) => ring(g, today)))!;
  assert.equal(p.behind, 3);
  assert.equal(p.lead, "All three goals are behind pace.");
  // the rings are drawn in the order Closings, Referrals, GCI; here in the graph's order
  assert.match(p.rest, /^You'd be at .* by today\.$/);
  assert.match(p.rest, /6 closings/);
  assert.match(p.rest, /5 referrals/);
  assert.match(p.rest, /\$155,220/);
  assert.equal(pulseLine([]), null);
});

// ---- Likely next: only the agent's own deals and Hot list ----------------------------------------------------------

const DEMO_NAMES = /Jane Smith|Mike Torres|Linda Park|Sara Lee|Amy Chen|Marcus Lee|Priya Shah|Jen Alvarez|Nina Brooks|Ann|Chris/;
const deal = (id: string, name: string | null, settle: string | null, extra: Partial<Deal> = {}): Deal => ({
  id, contact: name ? { id: `c-${id}`, name } : null, address: `${id} Oak St, Provo`, side: "sell", status: "under_contract", form: "2027",
  acceptedOn: "2026-10-01", deadlineTime: "17:00", next: null,
  dates: settle ? [{ key: "settlement", label: "Settlement", on: settle, effectiveOn: null, movedReason: null, daysLeft: null }] : [],
  ...extra,
});

test("Likely next: the agent's deals under contract, soonest first, then their Hot people", () => {
  const deals = [
    deal("a", "Rosa Vega", "2026-12-04", { gci: 12000 }),
    deal("b", "Tom Hale", "2026-11-08", { side: "buy" }),
    deal("c", "Old Closed", "2026-10-01", { status: "closed" }),
    deal("d", null, null),
  ];
  const hot = [{ cls: "hot" as const, name: "Lena Brooks", contactId: "h1" }, { cls: "hot" as const, name: "Rosa Vega", contactId: "c-a" }];
  const rows = likelyNext(deals, hot, 10000, today);
  assert.deepEqual(rows.map((r) => r.name), ["Tom Hale", "Rosa Vega", "d Oak St, Provo", "Lena Brooks"]);
  assert.equal(rows[0].stage, "Under contract · closes Nov 8");
  assert.equal(rows[0].side, "buy");
  assert.equal(rows[0].gci, 10000 * CHANCE.contract); // no GCI of its own: the forecast's estimate
  assert.equal(rows[0].est, true);
  assert.equal(rows[1].gci, 12000); // the deal's own GCI
  assert.equal(rows[1].est, false);
  assert.equal(rows[2].contactId, null); // a deal with no client yet opens Deals
  assert.equal(rows[3].stage, "Hot · on your Hot list");
  assert.equal(rows[3].gci, 10000 * CHANCE.hot);
  // Rosa is under contract already, so she is not listed again as Hot
  assert.equal(rows.filter((r) => r.name === "Rosa Vega").length, 1);
  for (const r of rows) assert.doesNotMatch(r.name, DEMO_NAMES);
});

test("Likely next is empty for a live agent with no deals and no Hot people (no example rows)", () => {
  assert.deepEqual(likelyNext(null, null, 10000, today), []);
  assert.deepEqual(likelyNext([], [], 10000, today), []);
  assert.deepEqual(likelyNext([deal("x", "Gone", "2026-09-01", { status: "fell_through" })], [{ cls: "warm", name: "W", contactId: null }], 10000, today), []);
});

test("the demo keeps its example rows", () => {
  const rows = likelyNext(demoDeals(today), [{ cls: "hot", name: "Amy Chen", contactId: null }], 10000, today);
  assert.ok(rows.some((r) => r.name === "Jane Smith"));
  assert.ok(rows.some((r) => r.name === "Amy Chen"));
});

test("GoalsView reads Likely next only from the props the Brain passes (its deals and Hot list), never demo data", () => {
  const view = readFileSync(new URL("../components/brain/GoalsView.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(view, /demoDeals|demoReferrals|demoLooksHot|demoClasses/);
  assert.match(view, /likelyNext\(deals \?\? null, hot \?\? null/);
  const brain = readFileSync(new URL("../components/brain/Brain.tsx", import.meta.url), "utf8");
  const at = brain.indexOf("<GoalsView");
  const block = brain.slice(at, brain.indexOf("/>", brain.indexOf("onClose={() => setGoalsOpen(false)}", at)));
  assert.match(block, /deals=\{deals\}/);
  assert.match(block, /hot=\{hotPeople\}/);
  assert.match(block, /refs=\{refs\}/);
  assert.match(block, /looks=\{looks\}/);
});

// ---- This week's moves: only what real lists back ------------------------------------------------------------------

test("This week: referral asks, Hot follow-ups and likely sellers, each with the people behind it", () => {
  const refs = demoReferrals(today);
  const moves = weekMoves(refs, [{ cls: "hot", name: "Lena Brooks", contactId: "h1" }, { cls: "hot", name: "Tom Hale", contactId: null }], demoLooksHot());
  assert.equal(moves[0].key, "ask");
  assert.equal(moves[0].title, `Ask ${Math.min(3, refs.readyToAsk!.length)} of your VIP-50 for a referral`);
  assert.deepEqual(moves[0].people.map((p) => p.contactId), refs.readyToAsk!.slice(0, 3).map((r) => r.id));
  assert.equal(moves[1].title, "Follow up your 2 Hot people");
  assert.deepEqual(moves[1].people, [{ name: "Lena Brooks", contactId: "h1" }, { name: "Tom Hale", contactId: null }]);
  const sellers = demoLooksHot().filter((p) => p.kind === "seller");
  if (sellers.length) assert.equal(moves[2].key, "sellers");
});

test("This week leaves out any move with no one behind it", () => {
  assert.deepEqual(weekMoves(null, null, null), []);
  const empty = readReferrals({ count: 0, referrers: [], recent: [], candidates: [], ready_to_ask: [] });
  assert.deepEqual(weekMoves(empty, [], []), []);
  const one = weekMoves(null, [{ cls: "hot", name: "Lena Brooks", contactId: "h1" }], null);
  assert.deepEqual(one.map((m) => m.key), ["hot"]);
  assert.equal(one[0].title, "Follow up your 1 Hot person");
});

test("ticks are kept for the week starting Monday", () => {
  assert.equal(weekOf("2026-10-22"), "2026-10-19");
  assert.equal(weekOf("2026-10-19"), "2026-10-19");
  assert.equal(weekOf("2026-10-25"), "2026-10-19");
});
