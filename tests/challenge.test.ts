import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { TONE_HUE, applyTick, canTick, challengeCompleteUrl, challengeLine, challengeShown, challengeTickUrl, challengeStartUrl, challengeUrl, completedLine, demoChallenge, demoChallengeBody, groupLine, moveLink, readChallenge, readComplete, readStart, resultsLine, ringOf, runLine, runStatus, runsShown, safeUrl, startBody, STILL_RUNNING, tickBody, tilesOf, toneOf, withChallengeNode } from "../lib/challenge.ts";
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
  // Rewritten 17 Oct: the route is live, so a success carries the date and certificate, 404 now means "not enrolled"
  // (was "not there yet, go to the challenge page") and 409 means the 90 days are not up yet.
  assert.deepEqual(readComplete(200, { ok: true }), { kind: "done", completedAt: null, certificateUrl: null });
  assert.deepEqual(readComplete(204, null), { kind: "done", completedAt: null, certificateUrl: null });
  assert.deepEqual(readComplete(200, { ok: true, completed_at: "2026-10-17T15:00:00Z", certificate_url: "https://move.vip50one.com/certificate/abc" }), { kind: "done", completedAt: "2026-10-17", certificateUrl: "https://move.vip50one.com/certificate/abc" });
  assert.equal((readComplete(200, { ok: true, certificate_url: "https://evil.example.com/c" }) as { certificateUrl: string | null }).certificateUrl, null);
  assert.deepEqual(readComplete(409, { ok: false, error: "Your 90 days are not up yet." }), { kind: "not_yet", words: "Your 90 days are not up yet." });
  assert.deepEqual(readComplete(409, null), { kind: "not_yet", words: "Your 90 days are not up yet." });
  assert.equal(readComplete(404, { error: "Not found." }).kind, "not_enrolled");
  assert.deepEqual(readComplete(405, null), { kind: "elsewhere" });
  assert.equal(completedLine("2026-10-17"), "Completed on Sat, 17 Oct 2026");
  assert.deepEqual(readComplete(400, { ok: false, error: "Not day 90 yet." }), { kind: "error", words: "Not day 90 yet." });
  assert.equal(readComplete(500, null).kind, "error");
  assert.equal(readComplete(200, { ok: false }).kind, "error");
});

// ---- the challenge page (Parry, 22 Oct: "yes on both"; VIP-SUMMARY §3ap, proposed: days, boxes, stats, leaderboard, tick).

const enrolled = (raw: unknown, today = "2026-10-16") => {
  const c = readChallenge(raw, today);
  assert.ok(c && c.enrolled);
  return c as Extract<NonNullable<typeof c>, { enrolled: true }>;
};

test("ring from days: gold 100, green 70+, blue under 70, grey missed, faint to come; today outlined by its points", () => {
  // Day 6 of 90 from 2026-10-11; day 3 sent no entry (missed), today (day 6) 40 so far.
  const days = [
    { date: "2026-10-11", score: 100 },
    { date: "2026-10-12", score: 70 },
    { date: "2026-10-14", score: 69 },
    { date: "2026-10-15", score: 0 },
    { date: "2026-10-16", score: 40 },
  ];
  const c = enrolled({ ...LIVE, start_date: "2026-10-11", day: 6, days });
  const r = ringOf(c);
  assert.equal(r.mode, "days");
  assert.equal(r.segs.length, 90);
  assert.deepEqual(r.segs.slice(0, 7).map((s) => s.tone), ["perfect", "good", "missed", "low", "missed", "low", "future"]);
  assert.deepEqual(r.segs.filter((s) => s.today).map((s) => s.day), [6]);
  assert.equal(r.segs[5].score, 40);
  assert.equal(r.segs[2].date, "2026-10-13");
  assert.equal(r.toGo, 84);
  assert.equal(TONE_HUE.perfect, "#f5c542");
  assert.deepEqual([100, 85, 70, 69, 1, 0].map(toneOf), ["perfect", "good", "good", "low", "low", "missed"]);
  // Today with no points yet stays faint, still outlined.
  const zero = ringOf(enrolled({ ...LIVE, start_date: "2026-10-11", day: 6, days: days.slice(0, 4), today: { points: 0, arenas: [] } }));
  assert.equal(zero.segs[5].tone, "future");
  assert.ok(zero.segs[5].today);
  // Finished: every day coloured, none outlined.
  const fin = ringOf(enrolled({ ...LIVE, status: "completed", start_date: "2026-07-10", day: 90, days: [{ date: "2026-07-10", score: 100 }] }, "2026-10-20"));
  assert.equal(fin.day, 90);
  assert.equal(fin.segs.filter((s) => s.today).length, 0);
  assert.equal(fin.segs[0].tone, "perfect");
  assert.equal(fin.segs[89].tone, "missed");
});

test("fallbacks: no days, boxes, stats or leaderboard", () => {
  const c = enrolled(LIVE); // the route as live on 22 Oct: none of the §3ap fields
  assert.equal(c.days, null);
  assert.equal(c.stats, null);
  assert.equal(c.leaderboard, null);
  assert.ok(c.today.arenas.every((a) => a.boxes === null));
  // The ring splits days gone and days to come; results never colour a day.
  const r = ringOf(c);
  assert.equal(r.mode, "split");
  assert.deepEqual([...new Set(r.segs.slice(0, 22).map((s) => s.tone))], ["elapsed"]);
  assert.equal(r.segs[22].today, true);
  assert.equal(r.segs[22].tone, "low"); // 65 so far
  assert.deepEqual([...new Set(r.segs.slice(23).map((s) => s.tone))], ["future"]);
  // Tiles: the streak only (no average without results, no rank without a leaderboard).
  assert.deepEqual(tilesOf(c), [{ key: "streak", value: "6", label: "day streak" }]);
  // With results: the average from them, still no perfect days or rank.
  assert.deepEqual(tilesOf(enrolled({ ...LIVE, results: { days_scored: 20, average: 74 } })).map((t) => `${t.key}:${t.value}`), ["streak:6", "average:74"]);
  // With days but no stats: average and perfect days counted from the days.
  const fromDays = enrolled({ ...LIVE, start_date: "2026-10-14", day: 3, days: [{ date: "2026-10-14", score: 100 }, { date: "2026-10-15", score: 0 }, { date: "2026-10-16", score: 60 }] });
  assert.deepEqual(tilesOf(fromDays).map((t) => `${t.key}:${t.value}`), ["streak:6", "average:80", "perfect:1"]);
  // No boxes: nothing to tick here (the arena opens ONE MOVE instead).
  assert.equal(canTick(c), false);
  assert.equal(applyTick(c, "ch_biz_conversations", true), c);
});

test("§3ap fields read: boxes, stats, leaderboard (ranked, me as You, https photos only)", () => {
  const c = enrolled({
    ...LIVE,
    today: { date: "2026-10-16", points: 10, arenas: [{ key: "business", done: 2, of: 4, points: 10, boxes: [{ key: "ch_biz_conversations", label: "5 real conversations", done: true }, { key: "ch_biz_followup", label: "Follow up", done: true }, { key: "bad key!", label: "x" }, { key: "ch_biz_marketing", label: "Marketing", done: "yes" }] }] },
    stats: { average: 81.4, perfect_days: 19, best: 100 },
    leaderboard: [
      { user_id: "a", first_name: "Angelina Rose", last_initial: "t", day: 40, week_avg: 76, photo_url: "http://x.example/a.jpg" },
      { user_id: "me", first_name: "Kim", last_initial: "W", day: 23, week_avg: 81, me: true },
      { user_id: "j", first_name: "Julie", last_initial: "S", day: 61, week_avg: 94, photo_url: "https://cdn.example/j.jpg" },
      { user_id: "z", week_avg: 50 },
    ],
  });
  const biz = c.today.arenas.find((a) => a.key === "business")!;
  assert.deepEqual(biz.boxes, [
    { key: "ch_biz_conversations", label: "5 real conversations", done: true, sub: null },
    { key: "ch_biz_followup", label: "Follow up", done: true, sub: null },
    { key: "ch_biz_marketing", label: "Marketing", done: false, sub: null },
  ]);
  assert.deepEqual(c.stats, { average: 81, perfectDays: 19, best: 100 });
  assert.deepEqual(c.leaderboard!.map((r) => [r.rank, r.name, r.initials, r.weekAvg, r.me]), [
    [1, "Julie S.", "JS", 94, false],
    [2, "You", "YOU", 81, true],
    [3, "Angelina T.", "AT", 76, false],
  ]);
  assert.equal(c.leaderboard![0].photo, "https://cdn.example/j.jpg");
  assert.equal(c.leaderboard![2].photo, null);
  assert.deepEqual(tilesOf(c).map((t) => `${t.key}:${t.value}:${t.label}`), ["streak:6:day streak", "average:81:average", "perfect:19:perfect days", "rank:#2:in your group"]);
  // ONE MOVE's own rank wins (the agent below the top 5).
  const ranked = enrolled({ ...LIVE, group: null, leaderboard: [{ first_name: "Julie", week_avg: 94, rank: 1 }, { first_name: "Kim", week_avg: 40, rank: 9, me: true }] });
  assert.deepEqual(ranked.leaderboard!.map((r) => r.rank), [1, 9]);
  assert.equal(tilesOf(ranked).find((t) => t.key === "rank")?.label, "on your team");
});

test("the tick: its route, exactly {key, done}, applied at once and undone by the reverse tick", () => {
  assert.equal(challengeTickUrl, "https://move.vip50one.com/api/brain/challenge/tick");
  assert.equal(tickBody("ch_biz_marketing", true), '{"key":"ch_biz_marketing","done":true}');
  assert.deepEqual(JSON.parse(tickBody("ch_biz_marketing", false)), { key: "ch_biz_marketing", done: false });
  const c = demoChallenge("2026-10-22")!;
  assert.ok(canTick(c));
  const t = applyTick(c, "ch_biz_marketing", true);
  assert.ok(t.enrolled && c.enrolled);
  if (!t.enrolled || !c.enrolled) return;
  const biz = t.today.arenas.find((a) => a.key === "business")!;
  assert.equal(biz.done, 3);
  assert.equal(biz.points, 15);
  assert.equal(t.today.points, 75);
  assert.equal(t.days!.find((d) => d.date === "2026-10-22")!.score, 75);
  assert.equal(ringOf(t).segs[73].score, 75);
  // Rolled back (ONE MOVE refused): the same as before.
  assert.deepEqual(applyTick(t, "ch_biz_marketing", false), c);
  // A finished challenge is not ticked here.
  assert.equal(canTick(readChallenge({ ...demoChallengeBody("2026-10-22"), status: "completed" }, "2026-10-22")), false);
});

test("the demo is the approved mockup: day 74, 70 today, 12-day streak, 81 average, 19 perfect, #3", () => {
  const c = demoChallenge("2026-10-22")!;
  assert.ok(c.enrolled);
  if (!c.enrolled) return;
  assert.equal(c.day, 74);
  assert.equal(c.startDate, "2026-08-10");
  assert.equal(c.today.points, 70);
  assert.deepEqual(c.today.arenas.map((a) => a.done), [4, 3, 3, 2, 2]);
  assert.ok(c.today.arenas.every((a) => a.boxes?.length === 4));
  assert.deepEqual(tilesOf(c).map((t) => t.value), ["12", "81", "19", "#3"]);
  const r = ringOf(c);
  assert.equal(r.mode, "days");
  assert.equal(r.toGo, 16);
  assert.ok(r.segs[73].today && r.segs[73].tone === "good");
  assert.ok(r.segs.slice(74).every((s) => s.tone === "future"));
  assert.ok(new Set(r.segs.slice(0, 73).map((s) => s.tone)).size >= 3);
});

test("a live agent never sees the example agent's challenge", () => {
  let asked = 0;
  const demo = () => {
    asked++;
    return demoChallenge("2026-10-22");
  };
  assert.equal(challengeShown(true, null, demo), null); // still loading, or no answer: nothing, never the example
  const mine = readChallenge(LIVE);
  assert.equal(challengeShown(true, mine, demo), mine);
  assert.equal(asked, 0);
  const shown = challengeShown(false, mine, demo);
  assert.ok(shown?.enrolled && shown.day === 74);
  // The Brain passes the demo only when signed out (the example agent).
  const brain = readFileSync(new URL("../components/brain/Brain.tsx", import.meta.url), "utf8");
  assert.ok(brain.includes("const shownChallenge = challengeShown(live, challenge, () => demoCh);"));
  assert.ok(brain.includes("const demoCh = useMemo(() => (live ? null : demoChallenge()), [live]);"));
});

// ---- every run kept (Parry, 22 Oct: "yes keep every run"; VIP-SUMMARY §3ap) ----

const RUNS = [
  { run: 1, start_date: "2026-07-10", completed_at: "2026-10-22", status: "completed", certificate_url: "https://move.vip50one.com/certificate/abc" },
  { run: 2, start_date: "2026-10-22", completed_at: null, status: "active", certificate_url: null },
];

test("readChallenge reads run and runs; no runs field means null (the old route)", () => {
  const c = readChallenge({ ...LIVE, run: 2, runs: [RUNS[1], RUNS[0], { run: "x" }, { run: 3, certificate_url: "https://evil.example/c" }] })!;
  assert.ok(c.enrolled);
  if (!c.enrolled) return;
  assert.equal(c.run, 2);
  assert.deepEqual(c.runs!.map((r) => r.run), [1, 2, 3]); // oldest first, junk dropped
  assert.equal(c.runs![0].certificateUrl, "https://move.vip50one.com/certificate/abc");
  assert.equal(c.runs![2].certificateUrl, null); // off ONE MOVE: refused
  const old = readChallenge(LIVE)!;
  assert.ok(old.enrolled);
  if (!old.enrolled) return;
  assert.equal(old.run, null);
  assert.equal(old.runs, null);
});

test("runLine and runsShown: newest first, only with more than one run or a completed one", () => {
  const c = readChallenge({ ...LIVE, run: 2, runs: RUNS })!;
  assert.equal(runLine(c.enrolled ? c.runs![0] : (null as never)), "Run 1 · Jul 10 – Oct 22, 2026 · Completed");
  assert.deepEqual(runsShown(c)!.map((r) => r.run), [2, 1]);
  assert.equal(runLine(runsShown(c)![0]), "Run 2 · Started Oct 22, 2026 · In progress");
  assert.equal(runsShown(readChallenge({ ...LIVE, run: 1, runs: [RUNS[1]] })), null);
  assert.ok(runsShown(readChallenge({ ...LIVE, run: 1, runs: [RUNS[0]] })));
  assert.equal(runsShown(readChallenge(LIVE)), null); // no runs field
  const across = readChallenge({ ...LIVE, runs: [{ run: 1, start_date: "2025-12-01", completed_at: "2026-03-01", status: "completed" }] })!;
  assert.equal(runLine(across.enrolled ? across.runs![0] : (null as never)), "Run 1 · Dec 1, 2025 – Mar 1, 2026 · Completed");
});

test("the start posts to ONE MOVE with the identity statement, or an empty body", () => {
  assert.equal(challengeStartUrl, "https://move.vip50one.com/api/brain/challenge/start");
  assert.deepEqual(JSON.parse(startBody("  I am becoming a closer.  ")), { identity_statement: "I am becoming a closer." });
  assert.deepEqual(JSON.parse(startBody("   ")), {});
});

test("readStart: the whole new answer, 409 in plain words, anything else an error", () => {
  const ok = readStart(200, { ...LIVE, run: 2, runs: RUNS });
  assert.equal(ok.kind, "started");
  if (ok.kind === "started" && ok.challenge.enrolled) assert.equal(ok.challenge.run, 2);
  assert.deepEqual(readStart(409, { error: "active" }), { kind: "running", words: "Your current 90 days are still running." });
  assert.equal(STILL_RUNNING, "Your current 90 days are still running.");
  assert.equal(readStart(500, { error: "boom" }).kind, "error");
  assert.equal(readStart(200, { nonsense: true }).kind, "error"); // 2xx that is not a challenge: nothing replaced
});

test("the view: the form posts /start when runs exist, Classic otherwise; the demo has a past run and the current one", () => {
  const demo = readChallenge(demoChallengeBody("2026-10-22"), "2026-10-22")!;
  assert.ok(demo.enrolled);
  if (!demo.enrolled) return;
  assert.equal(demo.run, 2);
  assert.deepEqual(demo.runs!.map((r) => [r.run, runStatus(r)]), [[1, "Completed"], [2, "In progress"]]);
  assert.ok(demo.runs![0].certificateUrl);
  assert.equal(demo.runs![0].completedAt! < demo.startDate!, true);
  const live = readChallenge(LIVE)!;
  assert.ok(live.enrolled && live.runs === null && live.run === null); // a live agent on the old route sees no example runs
  const view = readFileSync(new URL("../components/brain/ChallengeView.tsx", import.meta.url), "utf8");
  assert.ok(view.includes("fetch(challengeStartUrl"));
  assert.ok(view.includes('if (!canStart) return open("a new Day 1 setup");')); // old route: Classic
  assert.ok(view.includes("const canStart = !!on?.runs;"));
});
