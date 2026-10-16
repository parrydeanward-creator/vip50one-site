import { test } from "node:test";
import assert from "node:assert/strict";
import { WINS_NODE, demoWins, groupOf, inGroup, newSince, readWins, total, winsLine, winsUrl, weekWins, winHome, WEEK_WIN_KINDS } from "../lib/wins.ts";

const today = "2026-10-08";

test("readWins: checked, newest first, unknown kinds dropped", () => {
  const w = readWins({
    wins: [
      { kind: "closing", at: "2026-09-30T00:00:00Z", title: "Closed 1482 Maple Ridge Dr", detail: "Buyer side · $455,000", contact_id: "c1", amount: 455000 },
      { kind: "five_star", at: "2026-10-05", title: "Jane Smith" },
      { kind: "thank_you", at: "2026-10-06", title: "Not a kind yet" },
      { kind: "badge", at: "not a date", title: "Streak" },
      { kind: "referral", at: "2026-10-01", title: "" },
      { kind: "week_100", at: "2026-09-28", title: "Week of Sep 28: 112", amount: -5 },
    ],
    counts: { closing: 3, referral: 6, five_star: 0, week_100: 4, badge: 2, goal_reached: 0 },
  })!;
  assert.deepEqual(w.wins.map((x) => x.kind), ["five_star", "closing", "week_100"]);
  assert.equal(w.wins[1].at, "2026-09-30");
  assert.equal(w.wins[1].contactId, "c1");
  assert.equal(w.wins[2].amount, null);
  // MASTER's counts win over the list (the list is capped at 200)
  assert.equal(w.counts.referral, 6);
  assert.equal(w.counts.five_star, 0);
  assert.equal(total(w), 15);
  assert.equal(readWins({ counts: {} }), null);
  assert.equal(readWins(null), null);
});

test("readWins: counts from the list when MASTER sends none; a referral that closed sits with referrals but is not a second referral", () => {
  const w = readWins({
    wins: [
      { kind: "referral", at: "2026-09-01", title: "Jane Smith sent you Tom Lee" },
      { kind: "referral_closed", at: "2026-10-01", title: "Tom Lee closed" },
    ],
  })!;
  assert.equal(groupOf("referral_closed"), "referral");
  assert.equal(w.counts.referral, 1);
  assert.equal(inGroup(w, "referral").length, 2);
});

test("newSince: only wins after the last look; nothing new before a first look", () => {
  const w = demoWins(today);
  assert.equal(newSince(w, null).length, 0);
  const fresh = newSince(w, "2026-10-05");
  assert.ok(fresh.length >= 2);
  assert.ok(fresh.every((x) => x.at > "2026-10-05"));
});

test("winsLine and winsUrl", () => {
  assert.equal(winsLine(readWins({ wins: [] })!), "Your wins will gather here");
  assert.match(winsLine(demoWins(today)), /^\d+ wins this year$/);
  assert.equal(winsUrl(), "https://move.vip50one.com/api/brain/wins?days=365");
  assert.equal(winsUrl(90, "a b"), "https://move.vip50one.com/api/brain/wins?days=90&agent=a%20b");
});

test("Wins has no ONE YOU orb (Parry, 16 Oct); this week's wins are one list for the Scoreboard and the Weekly Review", async () => {
  // Rewritten: this asserted the Wins orb under ONE YOU, which Parry moved into the Scoreboard on 16 Oct.
  const m = (await import("../lib/wins.ts")) as Record<string, unknown>;
  assert.equal(m.withWinsNode, undefined);
  assert.equal(WINS_NODE, "go-wins");
  const w = demoWins(today);
  const { mine } = weekWins(w.wins, today);
  assert.ok(mine.every((x) => WEEK_WIN_KINDS.includes(x.kind)));
  assert.equal(mine.some((x) => x.kind === "week_100" || x.kind === "goal_reached"), false);
  assert.equal(winHome("five_star"), "review");
  assert.equal(winHome("referral_closed"), "referrals");
  assert.equal(winHome("badge"), "badges");
  assert.equal(winHome("closing"), "goals");
});

// ONE MOVE's `GET /api/brain/wins?week=this` (vip50-web-crm#278): `{days, from, to, wins[], counts}`, Monday to today in
// Mountain time; the shape is app/api/brain/wins/route.ts + lib/wins.ts buildWins there (snake_case `contact_id`).
const weekAnswer = {
  days: 4,
  from: "2026-10-12",
  to: "2026-10-15",
  wins: [
    { kind: "badge", at: "2026-10-15", title: "VIP Touch Master", detail: null, contact_id: null, amount: null },
    { kind: "five_star", at: "2026-10-14", title: "Jane Smith", detail: "Made it easy.", contact_id: null, amount: null },
    { kind: "closing", at: "2026-10-13", title: "Closed with Tom Lee", detail: "Buyer side · $455,000", contact_id: "c1", amount: 12000 },
    { kind: "week_100", at: "2026-10-12", title: "Week of Oct 12: 104", detail: null, contact_id: null, amount: null },
    { kind: "referral", at: "2026-10-09", title: "Last week", detail: null, contact_id: null, amount: null },
    { kind: "thank_you", at: "2026-10-14", title: "Not a kind" },
    { kind: "referral", at: "bad", title: "No date" },
  ],
  counts: { closing: 1, referral: 0, referral_closed: 0, five_star: 1, week_100: 1, badge: 1, goal_reached: 0 },
};

test("readWeekWins: the route's shape, checked; only this week's counted kinds, inside from..to, newest first", async () => {
  const { readWeekWins, weekWinsUrl } = await import("../lib/wins.ts");
  assert.equal(weekWinsUrl(), "https://move.vip50one.com/api/brain/wins?week=this");
  assert.equal(weekWinsUrl("a b"), "https://move.vip50one.com/api/brain/wins?week=this&agent=a%20b");
  const w = readWeekWins(weekAnswer)!;
  assert.equal(w.from, "2026-10-12");
  assert.equal(w.to, "2026-10-15");
  assert.deepEqual(w.wins.map((x) => x.kind), ["badge", "five_star", "closing"]);
  assert.equal(w.wins[2].contactId, "c1");
  assert.equal(w.wins[2].amount, 12000);
  // Five reviews written the same day are five wins: ONE MOVE already dated them, so no import guess here.
  const five = readWeekWins({ ...weekAnswer, wins: Array.from({ length: 5 }, (_, k) => ({ kind: "five_star", at: "2026-10-14", title: `R${k}` })) })!;
  assert.equal(five.wins.length, 5);
  assert.equal(five.wins.some((x) => x.imported), false);
});

test("readWeekWins: not an answer is null, never a throw", async () => {
  const { readWeekWins } = await import("../lib/wins.ts");
  for (const bad of [null, undefined, 3, "x", [], {}, { from: "2026-10-12", to: "2026-10-15" }, { from: "x", to: "2026-10-15", wins: [] }, { from: "2026-10-16", to: "2026-10-15", wins: [] }, { error: "Not signed in." }])
    assert.equal(readWeekWins(bad), null);
  assert.deepEqual(readWeekWins({ from: "2026-10-12", to: "2026-10-12", wins: [null, 4, "x"] })!.wins, []);
});

test("weekWinsFrom: ONE MOVE's week when it is this week, else counted from the year's list (demo and fallback)", async () => {
  const { readWeekWins, weekWinsFrom } = await import("../lib/wins.ts");
  const live = readWeekWins(weekAnswer)!;
  const year = demoWins("2026-10-15").wins;
  assert.deepEqual(weekWinsFrom(live, year, "2026-10-15")!.mine.map((x) => x.title), ["VIP Touch Master", "Jane Smith", "Closed with Tom Lee"]);
  assert.deepEqual(weekWinsFrom(live, null, "2026-10-15")!.mine.length, 3);
  // A stale answer from last week is not this week's: the year's list counts instead.
  assert.deepEqual(weekWinsFrom(live, year, "2026-10-20"), weekWins(year, "2026-10-20"));
  assert.deepEqual(weekWinsFrom(null, year, "2026-10-15"), weekWins(year, "2026-10-15"));
  assert.equal(weekWinsFrom(null, null, "2026-10-15"), null);
});
