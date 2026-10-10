import { test } from "node:test";
import assert from "node:assert/strict";
import { REVIEW_NODE, demoRoster, goalsFromGraph, monthShare, review, withReviewNode } from "../lib/review.ts";
import { demoCommitments } from "../lib/commitments.ts";
import { titleHue } from "../lib/schedule.ts";

const today = "2026-10-20";

test("month share: how far through the month today is", () => {
  assert.equal(monthShare("2026-10-31"), 1);
  assert.ok(Math.abs(monthShare("2026-10-20") - 20 / 31) < 1e-9);
  assert.equal(monthShare("nope"), 0);
});

test("score below the 100 minimum pulses yellow and leads next week", () => {
  const r = review({ today, week: { score: 82, minimum: 100 }, roster: null, commitments: null, goals: [] });
  const s = r.cards.find((c) => c.key === "score")!;
  assert.equal(s.big, "82");
  assert.equal(s.line, "18 short of 100");
  assert.equal(s.level, "today");
  assert.deepEqual(r.next, ["Reach 100 next week: this week ended at 82."]);
});

test("score at the minimum is still green, and an all-good week says so", () => {
  const r = review({ today, week: { score: 104, minimum: 100 }, roster: null, commitments: null, goals: [] });
  assert.equal(r.cards[0].level, null);
  assert.equal(r.cards[0].good, true);
  assert.equal(r.next.length, 1);
  assert.match(r.next[0], /Keep the same rhythm/);
});

test("VIP-50 not reached this month: named, oldest touch first, red past mid-month", () => {
  const r = review({ today, week: null, roster: demoRoster(), commitments: null, goals: [] });
  const u = r.cards.find((c) => c.key === "untouched")!;
  assert.equal(u.big, "3");
  assert.equal(u.level, "now"); // the 20th is past half the month
  assert.equal(u.rows[0].text, "Jen Alvarez"); // last touch 10 Aug, the oldest
  assert.match(r.next[0], /^Reach the 3 VIP-50 you haven't touched this month, starting with Jen, Marcus and Amy\.$/);
});

test("touches behind the month are listed, weakest first", () => {
  const r = review({ today, week: null, roster: demoRoster(), commitments: null, goals: [] });
  const t = r.cards.find((c) => c.key === "touches")!;
  assert.equal(t.level, "today");
  assert.ok(t.rows.some((x) => x.text.startsWith("Mixer invite: 0 of 12") && /^Behind/.test(x.sub ?? "")));
  assert.match(r.next[1], /^Mixer invite: 12 of your VIP-50 still need one this month/);
});

test("commitments: last week's results and the keep rate", () => {
  const c = demoCommitments(today);
  const r = review({ today, week: null, roster: null, commitments: { ...c, lastWeek: { kept: 1, partly: 1, missed: 3 }, keepRate8w: 0.5 }, goals: [] });
  const k = r.cards.find((x) => x.key === "commitments")!;
  assert.equal(k.big, "50%");
  assert.equal(k.line, "Last week: 1 kept, 1 partly, 3 missed");
  assert.equal(k.level, "today");
  assert.equal(r.next[0], "Set commitments you can keep: last week 3 of 5 were missed.");
});

test("goals behind pace pulse and name the first behind", () => {
  const r = review({ today, week: null, roster: null, commitments: null, goals: [{ label: "Closings", line: "3 of 12", behind: true }, { label: "Referrals", line: "5 of 10", behind: false }] });
  const g = r.cards.find((x) => x.key === "goals")!;
  assert.equal(g.big, "1 behind");
  assert.equal(r.next[0], "Closings is behind pace (3 of 12).");
});

test("never more than three things for next week", () => {
  const c = demoCommitments(today);
  const r = review({ today, week: { score: 50, minimum: 100 }, roster: demoRoster(), commitments: { ...c, lastWeek: { kept: 0, partly: 0, missed: 4 } }, goals: [{ label: "GCI", line: "$1 of $9", behind: true }] });
  assert.equal(r.next.length, 3);
});

test("the Weekly Review orb sits under ONE YOU and pulses with the worst card", () => {
  const g = { nodes: [{ id: "one", type: "core", label: "ONE" }, { id: "go", type: "product", label: "ONE YOU", parentId: "one" }] as never[], edges: [] as never[] };
  const r = review({ today, week: { score: 82, minimum: 100 }, roster: demoRoster(), commitments: null, goals: [] });
  const out = withReviewNode(g, r);
  const n = out.nodes.find((x: { id: string }) => x.id === REVIEW_NODE) as unknown as { status: string; parentId: string };
  assert.equal(n.parentId, "go");
  assert.equal(n.status, "action"); // the untouched card is red
  assert.equal(withReviewNode(out, null).nodes.some((x: { id: string }) => x.id === REVIEW_NODE), false);
});

test("goals come from ONE YOU's goal orbs; unset goals are left out", () => {
  const nodes = [
    { id: "go-closings_goal", type: "goal", label: "Closings", parentId: "go-goals", secondaryLabel: "3 of 12", status: "attention", pace: { headline: "On pace for this point in the year: 5" } },
    { id: "go-gci_goal", type: "goal", label: "GCI", parentId: "go-goals", secondaryLabel: "No goal set" },
  ] as never[];
  assert.deepEqual(goalsFromGraph(nodes), [{ label: "Closings", line: "3 of 12", behind: true, pace: "On pace for this point in the year: 5" }]);
});

test("nap, rest and break are personal time", () => {
  assert.equal(titleHue("Take a nap"), "personal");
  assert.equal(titleHue("Rest"), "personal");
  assert.equal(titleHue("Coffee break"), "meal");
});

test("wins (PULSE-ROADMAP #8): this week's wins sit next to the score, never pulse; absent when ONE MOVE has not answered", () => {
  const w = (kind: "closing" | "referral" | "five_star", at: string, title: string) => ({ kind, at, title, detail: null, contactId: null, amount: null });
  const r = review({
    today: "2026-10-09",
    week: { score: 104, minimum: 100 },
    roster: null,
    commitments: null,
    goals: [],
    wins: [w("closing", "2026-10-07", "1482 Maple Ridge closed"), w("referral", "2026-10-06", "Jane sent Tom"), w("referral", "2026-10-01", "Last week")],
  });
  const c = r.cards.find((x) => x.key === "wins")!;
  assert.deepEqual([r.cards[0].key, r.cards[1].key], ["score", "wins"]);
  assert.deepEqual([c.big, c.line, c.level], ["2", "1 closing, 1 referral", null]);
  assert.equal(review({ today: "2026-10-09", week: null, roster: null, commitments: null, goals: [] }).cards.some((x) => x.key === "wins"), false);
});
