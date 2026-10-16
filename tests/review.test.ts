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
  // Rewritten on purpose (Parry, 16 Oct, audit 3.3.7): on a Tuesday the three things are for the rest of this week.
  assert.deepEqual(r.next, ["Reach 100 by Sunday: 18 to go from 82."]);
  assert.equal(r.nextTitle, "Three things for the rest of this week");
});

test("Monday to Thursday: the rest of this week; Friday to Sunday: next week (audit 3.3.7)", () => {
  const at = (today: string) => review({ today, week: { score: 82, minimum: 100 }, roster: null, commitments: null, goals: [] });
  assert.equal(at("2026-10-12").nextTitle, "Three things for the rest of this week"); // Monday
  assert.equal(at("2026-10-15").nextTitle, "Three things for the rest of this week"); // Thursday
  assert.equal(at("2026-10-16").nextTitle, "Three things for next week"); // Friday
  assert.equal(at("2026-10-18").nextTitle, "Three things for next week"); // Sunday
  assert.deepEqual(at("2026-10-16").next, ["Reach 100 next week: this week is at 82."]);
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
  // Rewritten on purpose (Parry, 16 Oct, audit 3.3.2): the orb shows the week's count and names the week, not the
  // 8-week keep rate; the keep rate moves to the rows.
  assert.equal(k.big, "1/5");
  assert.equal(k.tag, "LAST WEEK");
  assert.equal(k.line, "Last week: 1 kept, 1 partly, 3 missed");
  assert.equal(k.level, "today");
  assert.equal(k.rows[0].text, "You keep 50% of your commitments");
  assert.equal(r.next[0], "Set commitments you can keep: last week 3 of 5 were missed.");
});

test("commitments: this week's check-in wins over last week's, and says so (audit 3.3.2)", () => {
  const c = demoCommitments(today);
  const items = [
    { id: "a", text: "Ten calls", kind: "yes_no" as const, target: null, count: null, result: "kept" as const, note: null },
    { id: "b", text: "Two coffees", kind: "yes_no" as const, target: null, count: null, result: "missed" as const, note: null },
    { id: "c", text: "Newsletter", kind: "yes_no" as const, target: null, count: null, result: null, note: null },
  ];
  const week = { id: "w", starts: "2026-10-19", setAt: null, checkedAt: null, items };
  const k = review({ today, week: null, roster: null, commitments: { ...c, week, lastWeek: { kept: 3, partly: 0, missed: 0 } }, goals: [] }).cards.find((x) => x.key === "commitments")!;
  assert.equal(k.big, "1/2");
  assert.equal(k.tag, "THIS WEEK");
  assert.equal(k.line, "This week: 1 kept, 0 partly, 1 missed");
});

test("VIP touches in counts, not a percentage (audit 3.3.3)", () => {
  const t = review({ today, week: null, roster: demoRoster(), commitments: null, goals: [] }).cards.find((x) => x.key === "touches")!;
  assert.match(t.big, /^\d+$/);
  assert.equal(t.tag, "OF 60"); // 12 VIP-50 x 5 monthly touches
  assert.match(t.line, /^\d+ of 60 touches this month\. Behind the month: /);
  assert.equal(t.word, "Touches");
});

test("goals behind pace pulse and name the first behind", () => {
  const r = review({ today, week: null, roster: null, commitments: null, goals: [{ label: "Closings", line: "3 of 12", behind: true }, { label: "Referrals", line: "5 of 10", behind: false }] });
  const g = r.cards.find((x) => x.key === "goals")!;
  // Rewritten on purpose (audit 3.3.4): the number in the orb, the words under it.
  assert.equal(g.big, "1");
  assert.equal(g.tag, "BEHIND PACE");
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
  // Rewritten on purpose (audit 3.3.1): the line names the week.
  assert.deepEqual([c.big, c.line, c.level], ["2", "This week: 1 closing, 1 referral", null]);
  assert.equal(review({ today: "2026-10-09", week: null, roster: null, commitments: null, goals: [] }).cards.some((x) => x.key === "wins"), false);
});

test("imported reviews never count as this week's wins; a review counts in the week it was written (audit 3.3.1)", async () => {
  const { readWins, total } = await import("../lib/wins.ts");
  const reviews = Array.from({ length: 35 }, (_, k) => ({ kind: "five_star", at: "2026-10-15", title: `Reviewer ${k}` }));
  const w = readWins({
    wins: [...reviews, { kind: "five_star", at: "2026-10-15", written_on: "2026-10-14", title: "Written this week" }, { kind: "closing", at: "2026-10-13", title: "Closed 9 Elm" }],
    counts: { closing: 1, referral: 0, five_star: 36, week_100: 0, badge: 0, goal_reached: 0 },
  })!;
  assert.equal(w.wins.filter((x) => x.imported).length, 35);
  assert.equal(w.wins.find((x) => x.title === "Written this week")!.at, "2026-10-14");
  const r = review({ today: "2026-10-16", week: null, roster: null, commitments: null, goals: [], wins: w.wins, winsYear: total(w) });
  const c = r.cards.find((x) => x.key === "wins")!;
  assert.equal(c.big, "2");
  assert.ok(c.rows.some((x) => x.text === "35 reviews brought in from other sites"));
  // one source: the year's count is the Wins orb's count
  assert.ok(c.rows.some((x) => x.text === "37 wins this year"));
  // a few reviews on one day are real reviews, not an import
  const few = readWins({ wins: [{ kind: "five_star", at: "2026-10-15", title: "A" }, { kind: "five_star", at: "2026-10-15", title: "B" }] })!;
  assert.equal(few.wins.some((x) => x.imported), false);
  // GO/MOVE sends the written day as `reviewed_on` (16 Oct)
  const named = readWins({ wins: [{ kind: "five_star", at: "2026-10-15", reviewed_on: "2026-09-02", title: "Old review" }] })!;
  assert.equal(named.wins[0].at, "2026-09-02");
});

test("the Weekly Review's Wins number reads ONE MOVE's week (`?week=this`) when it answered, the same as the Scoreboard", async () => {
  const { readWeekWins } = await import("../lib/wins.ts");
  const live = readWeekWins({
    from: "2026-10-12", to: "2026-10-15",
    wins: [{ kind: "closing", at: "2026-10-13", title: "Closed with Tom Lee" }, { kind: "five_star", at: "2026-10-14", title: "Jane Smith" }],
  })!;
  const yearOnly = [{ kind: "referral" as const, at: "2026-10-14", title: "Year list only", detail: null, contactId: null, amount: null }];
  const r = review({ today: "2026-10-15", week: { score: 80, minimum: 100 }, roster: null, commitments: null, goals: [], wins: yearOnly, weekWins: live });
  const c = r.cards.find((x) => x.key === "wins")!;
  assert.equal(c.big, "2");
  assert.deepEqual(c.rows.slice(0, 2).map((x) => x.text), ["Jane Smith", "Closed with Tom Lee"]); // newest first
  // ONE MOVE's week alone is enough for the card.
  assert.equal(review({ today: "2026-10-15", week: null, roster: null, commitments: null, goals: [], weekWins: live }).cards.find((x) => x.key === "wins")?.big, "2");
  // Without it, the year's list still counts (the demo, or ONE MOVE not answering the week).
  assert.equal(review({ today: "2026-10-15", week: { score: 80, minimum: 100 }, roster: null, commitments: null, goals: [], wins: yearOnly }).cards.find((x) => x.key === "wins")?.big, "1");
});
