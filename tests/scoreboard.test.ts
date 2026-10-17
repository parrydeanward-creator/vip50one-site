import { test } from "node:test";
import assert from "node:assert/strict";
import { missionDot, missionLine, readScoreboard, scoreWeeks, scoreboardUrl, streakXpLines, weeklyScoreLines } from "../lib/scoreboard.ts";
import { pulseRead } from "../lib/pulseCoach.ts";

// ONE MOVE's `GET /api/brain/scoreboard` (vip50-web-crm#281): the shape is app/api/brain/scoreboard/route.ts there
// (lib/mission.ts buildMissionRows mapped to snake_case `progress_label`; streak a day count; xp {week, last_week}).
const answer = {
  week_start: "2026-10-12",
  mission: [
    { title: "Agent Attraction", earns: "Earns +25 XP each · 50 XP max weekly", progress_label: "1 of 2 complete", percent: 50, status: "In Progress" },
    { title: "Set Up Open House", earns: "Earns +50 XP (biweekly)", progress_label: "Complete · Open Houses tracker checked", percent: 100, status: "Complete" },
    { title: "Complete Daily Tracker", earns: "Earns +25 XP", progress_label: "0 / 5 days", percent: 0, status: "Not Started" },
    { title: "", earns: "x", progress_label: "x", percent: 10, status: "Complete" },
    { title: "Odd", earns: 4, progress_label: null, percent: 250, status: "Done?" },
    null,
  ],
  streak: 12,
  xp: { week: 310, last_week: 1240 },
  history: [
    { week_start_date: "2026-09-28", combined_total: 96 },
    { week_start_date: "2026-10-12", combined_total: 44 },
    { week_start_date: "2026-10-05", combined_total: 104 },
    { week_start_date: "bad", combined_total: 1 },
  ],
};

test("readScoreboard: the route's shape, checked", () => {
  assert.equal(scoreboardUrl, "https://move.vip50one.com/api/brain/scoreboard");
  const s = readScoreboard(answer)!;
  assert.equal(s.weekStart, "2026-10-12");
  assert.deepEqual(s.mission.map((m) => m.title), ["Agent Attraction", "Set Up Open House", "Complete Daily Tracker", "Odd"]);
  assert.equal(s.mission[0].progressLabel, "1 of 2 complete");
  assert.equal(s.mission[0].status, "In Progress");
  // out of range is held in range; an unknown status is "Not Started", never thrown
  assert.equal(s.mission[3].percent, 100);
  assert.equal(s.mission[3].status, "Not Started");
  assert.equal(s.mission[3].earns, "");
  assert.equal(s.streak, 12);
  assert.deepEqual(s.xp, { week: 310, lastWeek: 1240 });
  assert.deepEqual(s.history.map((h) => h.weekStart), ["2026-10-12", "2026-10-05", "2026-09-28"]);
});

test("readScoreboard: not an answer is null, never a throw", () => {
  for (const bad of [null, undefined, 3, "x", [], {}, { error: "Not signed in." }, { week_start: "2026-10-12" }, { week_start: "x", mission: [] }])
    assert.equal(readScoreboard(bad), null);
  const bare = readScoreboard({ week_start: "2026-10-12", mission: [] })!;
  assert.deepEqual(bare, { weekStart: "2026-10-12", mission: [], streak: 0, xp: { week: 0, lastWeek: 0 }, history: [] });
});

test("Mission Control and Streak and XP words come from ONE MOVE's numbers", () => {
  const s = readScoreboard(answer)!;
  assert.equal(missionLine(s.mission), "1 of 4 complete");
  assert.equal(missionDot("Complete"), "healthy");
  assert.equal(missionDot("In Progress"), "attention");
  assert.equal(missionDot("Not Started"), "idle");
  const w = streakXpLines(s);
  assert.equal(w.streak, "12 days");
  // Rewritten 17 Oct (Walker's re-check): XP is named XP, and the stale weekly_totals history is no longer called
  // "weekly score" beside it (the weekly score comes from weeklyScoreLines, the Weekly Review's weeks).
  assert.equal(w.xp, "310 XP this week");
  assert.match(w.xpNote, /^1,240 XP last week\./);
  assert.doesNotMatch(w.xpNote, /44, 104, 96/);
  assert.equal(streakXpLines({ ...s, streak: 1, history: [] }).streak, "1 day");
  assert.equal(streakXpLines({ ...s, history: [] }).xpNote, w.xpNote);
});

// Parry's live weeks (weekly_scores, 17 Oct): the Weekly Review said 92 last week, the Scoreboard 45, 56, 50, 58.
const PARRY_WEEKS = [
  { start: "2026-09-14", score: 26, minimum: 100 },
  { start: "2026-09-21", score: 9, minimum: 100 },
  { start: "2026-09-28", score: 39, minimum: 100 },
  { start: "2026-10-05", score: 92, minimum: 100 },
  { start: "2026-10-12", score: 15, minimum: 100 },
];

test("weeklyScoreLines: the Weekly Review's weeks, last full week big, this week and the weeks before in the note", () => {
  const w = weeklyScoreLines(PARRY_WEEKS, "2026-10-17")!;
  assert.equal(w.big, "92 last week");
  assert.equal(w.note, "8 short of 100 · 15 this week so far · before that 39, 9, 26 (newest first). Daily tracker points plus the weekly bonus boxes; the standard is 100.");
  assert.equal(weeklyScoreLines([{ start: "2026-10-05", score: 104, minimum: 100 }], "2026-10-17")!.note.startsWith("Above the 100."), true);
  assert.equal(weeklyScoreLines([{ start: "2026-10-12", score: 15, minimum: 100 }], "2026-10-17")!.big, "15 this week so far");
  assert.equal(weeklyScoreLines([], "2026-10-17"), null);
  assert.equal(weeklyScoreLines(null, "2026-10-17"), null);
  assert.equal(weeklyScoreLines([{ start: "2026-10-05", score: null, minimum: 100 }], "2026-10-17"), null);
});

test("weeklyScoreLines agrees with Pulse's read: the same last week as the Weekly Review", () => {
  const h = { weeks: PARRY_WEEKS.map((w) => ({ ...w, counts: { call: 0, video_text: 0, social: 0, newsletter: 0, mixer: 0, face_to_face: 0, handwritten: 0, drop_by: 0 } as never, habits: {} as never, hwc: { hot: 0, warm: 0, cold: 0 } })), weekdays: [] };
  const read = pulseRead(h, null, "2026-10-17");
  const card = read?.parts.find((p) => p.title === "Weekly score");
  assert.equal(card?.big, "92");
  assert.equal(weeklyScoreLines(PARRY_WEEKS, "2026-10-17")!.big, `${card?.big} last week`);
});

// vip50-web-crm#287: `history` is now [{week_start_date, score, minimum}] newest first, from weekly_scores.
test("readScoreboard: the new history shape; the old weekly_totals rows read but marked legacy", () => {
  const s = readScoreboard({
    week_start: "2026-10-12",
    mission: [],
    history: [
      { week_start_date: "2026-09-28", score: 39, minimum: 100 },
      { week_start_date: "2026-10-12", score: 15, minimum: 100 },
      { week_start_date: "2026-10-05", score: 92, minimum: null },
      { week_start_date: "bad", score: 1, minimum: 100 },
      { week_start_date: "2026-09-21", score: "x" },
    ],
  })!;
  assert.deepEqual(s.history, [
    { weekStart: "2026-10-12", score: 15, minimum: 100 },
    { weekStart: "2026-10-05", score: 92, minimum: 100 },
    { weekStart: "2026-09-28", score: 39, minimum: 100 },
  ]);
  const old = readScoreboard(answer)!;
  assert.ok(old.history.every((h) => h.legacy));
  assert.deepEqual(old.history[0], { weekStart: "2026-10-12", score: 44, minimum: 100, legacy: true });
});

test("scoreWeeks: one source, the scoreboard route's weeks; the history route's only when it sends none", () => {
  const s = readScoreboard({ week_start: "2026-10-12", mission: [], history: [{ week_start_date: "2026-10-12", score: 15, minimum: 100 }, { week_start_date: "2026-10-05", score: 92, minimum: 100 }] })!;
  const fallback = [{ start: "2026-10-05", score: 1, minimum: 100 }];
  assert.deepEqual(scoreWeeks(s, fallback), [{ start: "2026-10-12", score: 15, minimum: 100 }, { start: "2026-10-05", score: 92, minimum: 100 }]);
  assert.equal(weeklyScoreLines(scoreWeeks(s, fallback), "2026-10-17")!.big, "92 last week");
  // the old stale rows never become the weekly score
  assert.equal(scoreWeeks(readScoreboard(answer), fallback), fallback);
  assert.equal(scoreWeeks(null, fallback), fallback);
  assert.equal(scoreWeeks(null, []), null);
  assert.equal(scoreWeeks(undefined, null), null);
});
