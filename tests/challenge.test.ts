import { test } from "node:test";
import assert from "node:assert/strict";
import { challengeCompleteUrl, challengeLine, challengeUrl, groupLine, moveLink, readChallenge, readComplete, resultsLine, safeUrl, withChallengeNode } from "../lib/challenge.ts";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { CHALLENGE, CHALLENGE_NODE } from "../lib/oneYou.ts";

// The 90-Day Challenge's live numbers from ONE MOVE's /api/brain/challenge (vip50-web-crm#277).

const LIVE = {
  enrolled: true,
  status: "active",
  start_date: "2026-09-24",
  day: 23,
  of: 90,
  today: {
    date: "2026-10-16",
    points: 65,
    arenas: [
      { key: "body", label: "Body", done: 3, of: 4, points: 15 },
      { key: "spirit", label: "Spirit", done: 4, of: 4, points: 20 },
      { key: "relationships", label: "Relationships", done: 2, of: 4, points: 10 },
      { key: "business", label: "Business", done: 4, of: 4, points: 20 },
      { key: "nonsense", label: "X", done: 9, of: 4, points: 99 },
    ],
  },
  streak: 6,
  identity_statement: "I am becoming someone who keeps every promise.",
  enemy: ["Doom scrolling", { label: "Late nights" }, 4, ""],
  group: { name: "Luxury Lions", emoji: "*", members: [{ first_name: "Kim" }, { name: "Travis Evenden" }, "Annette"], scored_today: 2 },
  url: "https://move.vip50one.com/challenge",
};

test("the route is ONE MOVE's", () => {
  assert.equal(challengeUrl, "https://move.vip50one.com/api/brain/challenge");
});

test("readChallenge: enrolled, every arena in Parry's order, values clamped", () => {
  const c = readChallenge(LIVE)!;
  assert.ok(c.enrolled);
  if (!c.enrolled) return;
  assert.equal(c.day, 23);
  assert.equal(c.of, 90);
  assert.equal(c.startDate, "2026-09-24");
  assert.equal(c.today.points, 65);
  assert.deepEqual(c.today.arenas.map((a) => a.key), CHALLENGE.arenas.map((a) => a.key));
  assert.deepEqual(c.today.arenas.map((a) => a.points), [15, 20, 10, 20, 0]); // legacy missing: 0, unknown key ignored
  assert.equal(c.today.arenas[4].label, "Legacy");
  assert.equal(c.streak, 6);
  assert.equal(c.identity, "I am becoming someone who keeps every promise.");
  assert.deepEqual(c.enemy, ["Doom scrolling", "Late nights"]);
  assert.deepEqual(c.group, { name: "Luxury Lions", emoji: "*", members: 3, names: ["Kim", "Travis", "Annette"], scoredToday: 2 });
  assert.equal(c.url, "https://move.vip50one.com/challenge");
});

test("readChallenge: points at most 100 and arena points at most 20; boxes never above of", () => {
  const c = readChallenge({ ...LIVE, today: { points: 140, arenas: [{ key: "body", done: 7, of: 4, points: 35 }] } })!;
  assert.ok(c.enrolled);
  if (!c.enrolled) return;
  assert.equal(c.today.points, 100);
  assert.equal(c.today.arenas[0].points, 20);
  assert.equal(c.today.arenas[0].done, 4);
  assert.equal(c.today.date, null);
});

test("readChallenge: not enrolled, a numeric group, and refusals", () => {
  assert.deepEqual(readChallenge({ enrolled: false, url: "https://move.vip50one.com/challenge" }), { enrolled: false, url: "https://move.vip50one.com/challenge" });
  const c = readChallenge({ enrolled: true, day: 2, today: {}, group: { name: "Team", members: 5, scored_today: 9 } })!;
  assert.ok(c.enrolled);
  if (!c.enrolled) return;
  assert.equal(c.of, 90);
  assert.equal(c.today.points, 0);
  assert.equal(c.identity, null);
  assert.deepEqual(c.enemy, []);
  assert.deepEqual(c.group, { name: "Team", emoji: "", members: 5, names: [], scoredToday: 5 });
  assert.equal(c.url, CHALLENGE.pageUrl);
  assert.equal(readChallenge(null), null);
  assert.equal(readChallenge([]), null);
  assert.equal(readChallenge({ error: "unauthorized" }), null);
  const noName = readChallenge({ enrolled: true, group: { members: 3 } });
  assert.ok(noName?.enrolled);
  if (noName?.enrolled) assert.equal(noName.group, null); // a group needs a name
});

test("safeUrl: only https on ONE MOVE, else the challenge page", () => {
  assert.equal(safeUrl("https://move.vip50one.com/challenge?x=1"), "https://move.vip50one.com/challenge?x=1");
  assert.equal(safeUrl("http://move.vip50one.com/challenge"), CHALLENGE.pageUrl);
  assert.equal(safeUrl("https://evil.example.com/challenge"), CHALLENGE.pageUrl);
  assert.equal(safeUrl("javascript:alert(1)"), CHALLENGE.pageUrl);
  assert.equal(safeUrl(undefined), CHALLENGE.pageUrl);
});

test("the orb's side line: Day N of 90 · P today", () => {
  assert.equal(challengeLine(readChallenge(LIVE)), "Day 23 of 90 · 65 today");
  assert.equal(challengeLine(readChallenge({ enrolled: false })), null);
  assert.equal(challengeLine(readChallenge({ enrolled: true, day: 0 })), null);
  assert.equal(challengeLine(null), null);
  assert.equal(groupLine({ name: "Luxury Lions", emoji: "", members: 1, names: [], scoredToday: 0 }), "Luxury Lions: 1 member, 0 scored today");
});

const ENV: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [{ key: "challenge_day", label: "90-Day Challenge", value: 22, max: 90 }], items: [] };
const OPTS = { pkg: "complete" as const, firstName: "Kim", reachable: true, today: "2026-10-16" };

test("withChallengeNode puts the live numbers on the live orb; nothing changes without an answer", () => {
  const g = liveGraph(ENV, OPTS);
  assert.equal(withChallengeNode(g, null), g);
  const on = withChallengeNode(g, readChallenge(LIVE)).nodes.find((n) => n.id === CHALLENGE_NODE)!;
  assert.equal(on.secondaryLabel, "Day 23 of 90 · 65 today");
  assert.deepEqual(on.stats, [{ label: "Day", value: "23 / 90" }, { label: "Today", value: "65 / 100" }, { label: "Streak", value: "6 days" }]);
  const off = withChallengeNode(g, readChallenge({ enrolled: false })).nodes.find((n) => n.id === CHALLENGE_NODE)!;
  assert.equal(off.secondaryLabel, "Five arenas, 100 a day");
  assert.equal(off.stats, undefined);
});

// After day 90 (Walker, 17 Oct: Parry started 10 Jul, the challenge ended on 7 Oct (a Wednesday; the note said Tue), and the orb still said "Day 90 of
// 90 · 0 days to go"). ONE MOVE holds day at 90 and status "active", so the end comes from the start date.
const PARRY = { ...LIVE, start_date: "2026-07-10", day: 90, status: "active" };

test("readChallenge: past the last day it is finished, on start + 89 days, never a frozen day 90", () => {
  const c = readChallenge(PARRY, "2026-10-17")!;
  assert.ok(c.enrolled);
  if (!c.enrolled) return;
  assert.deepEqual(c.finished, { date: "2026-10-07", label: "Wed 7 Oct", short: "7 Oct" });
  assert.equal(c.results, null); // the route sends no results yet
  assert.equal(c.letter, null);
  assert.equal(challengeLine(c), "Finished 7 Oct · start again");
  // On the last day itself it is still day 90, not finished.
  const last = readChallenge(PARRY, "2026-10-07")!;
  assert.ok(last.enrolled && last.finished === null);
  assert.equal(challengeLine(last), "Day 90 of 90 · 65 today");
  // Day 23 is never finished, whatever today is.
  const mid = readChallenge(LIVE, "2027-06-01")!;
  assert.ok(mid.enrolled && mid.finished === null);
});

test("readChallenge: status completed is finished; results and the letter when ONE MOVE sends them", () => {
  const c = readChallenge({ ...PARRY, status: "completed", results: { days_scored: 81, average: 72.4 }, letter: " Dear me, you did it. " }, "2026-10-08")!;
  assert.ok(c.enrolled);
  if (!c.enrolled) return;
  assert.equal(c.finished?.label, "Wed 7 Oct");
  assert.deepEqual(c.results, { daysScored: 81, average: 72 });
  assert.equal(c.letter, "Dear me, you did it.");
  const noStart = readChallenge({ enrolled: true, status: "completed", day: 90 }, "2026-10-08")!;
  assert.ok(noStart.enrolled);
  if (noStart.enrolled) assert.equal(challengeLine(noStart), "Finished · start again");
});

test("withChallengeNode: a finished challenge shows Finished on the orb, with results when there are any", () => {
  const g = liveGraph(ENV, OPTS);
  const fin = withChallengeNode(g, readChallenge(PARRY, "2026-10-17")).nodes.find((n) => n.id === CHALLENGE_NODE)!;
  assert.equal(fin.secondaryLabel, "Finished 7 Oct · start again");
  assert.deepEqual(fin.stats, [{ label: "Finished", value: "7 Oct" }]);
  const res = withChallengeNode(g, readChallenge({ ...PARRY, results: { days_scored: 81, average: 72 } }, "2026-10-17")).nodes.find((n) => n.id === CHALLENGE_NODE)!;
  assert.deepEqual(res.stats, [{ label: "Finished", value: "7 Oct" }, { label: "Days scored", value: "81 / 90" }, { label: "Average", value: "72 / 100" }]);
  assert.ok(!/Day 90 of 90/.test(fin.secondaryLabel ?? ""));
});

// vip50-web-crm#287: the true day count, the letter on Day 90, completed_at, results and the certificate.
test("readChallenge: days_since_start decides the finish; letter_waiting, completed_at and certificate_url read", () => {
  // Day 100 by the true count: finished, the letter waiting until the agent completes it.
  const w = readChallenge({ ...PARRY, days_since_start: 100, letter_waiting: true, completed_at: null, results: { days_scored: 23, average: 47.4 }, letter: "Dear me." }, "2000-01-01")!;
  assert.ok(w.enrolled);
  if (!w.enrolled) return;
  assert.ok(w.finished); // from days_since_start, whatever the clock says
  assert.equal(w.daysSinceStart, 100);
  assert.equal(w.letterWaiting, true);
  assert.equal(w.completedAt, null);
  assert.equal(w.certificateUrl, null);
  assert.equal(w.letter, "Dear me.");
  assert.equal(resultsLine(w.results), "23 days scored · 47 a day on average");
  assert.equal(challengeLine(w), "Finished 7 Oct · your letter is open");
  // Day 90 itself: not finished yet, but the letter is open and completing is offered.
  const d90 = readChallenge({ ...PARRY, days_since_start: 90, letter_waiting: true }, "2026-12-31")!;
  assert.ok(d90.enrolled && d90.finished === null && d90.letterWaiting);
  // Day 23 by the true count is never finished, even on a late clock.
  const mid = readChallenge({ ...LIVE, days_since_start: 23 }, "2027-06-01")!;
  assert.ok(mid.enrolled && mid.finished === null && !mid.letterWaiting);
  // Completed: the certificate on ONE MOVE only, and no letter waiting.
  const c = readChallenge({ ...PARRY, status: "completed", days_since_start: 101, letter_waiting: false, completed_at: "2026-10-09T15:00:00Z", certificate_url: "https://move.vip50one.com/certificate/abc" }, "2026-10-18")!;
  assert.ok(c.enrolled);
  if (!c.enrolled) return;
  assert.equal(c.completedAt, "2026-10-09");
  assert.equal(c.certificateUrl, "https://move.vip50one.com/certificate/abc");
  assert.equal(c.letterWaiting, false);
  assert.equal(challengeLine(c), "Finished 7 Oct · start again");
  const bad = readChallenge({ ...PARRY, completed_at: "2026-10-09", certificate_url: "https://evil.example.com/c", letter_waiting: true }, "2026-10-18")!;
  assert.ok(bad.enrolled && bad.certificateUrl === null && bad.letterWaiting === false); // completed_at wins
  assert.equal(moveLink("http://move.vip50one.com/x"), null);
});

test("resultsLine and readComplete", () => {
  assert.equal(resultsLine(null), null);
  assert.equal(resultsLine({ daysScored: 1, average: 60 }), "1 day scored · 60 a day on average");
  assert.equal(resultsLine({ daysScored: 0, average: 0 }), "No days scored yet");
  assert.equal(challengeCompleteUrl, "https://move.vip50one.com/api/brain/challenge/complete");
  assert.deepEqual(readComplete(200, { ok: true }), { kind: "done" });
  assert.deepEqual(readComplete(204, null), { kind: "done" });
  assert.deepEqual(readComplete(404, { error: "Not found." }), { kind: "elsewhere" });
  assert.deepEqual(readComplete(405, null), { kind: "elsewhere" });
  assert.deepEqual(readComplete(400, { ok: false, error: "Not day 90 yet." }), { kind: "error", words: "Not day 90 yet." });
  assert.equal(readComplete(500, null).kind, "error");
  assert.equal(readComplete(200, { ok: false }).kind, "error");
});
