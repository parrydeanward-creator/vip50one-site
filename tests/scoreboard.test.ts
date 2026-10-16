import { test } from "node:test";
import assert from "node:assert/strict";
import { missionDot, missionLine, readScoreboard, scoreboardUrl, streakXpLines } from "../lib/scoreboard.ts";

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
  assert.equal(w.xp, "310 this week");
  assert.match(w.xpNote, /^1,240 last week · weekly score 44, 104, 96/);
  assert.equal(streakXpLines({ ...s, streak: 1, history: [] }).streak, "1 day");
  assert.equal(streakXpLines({ ...s, history: [] }).xpNote, "1,240 last week.");
});
