import { test } from "node:test";
import assert from "node:assert/strict";
import { demoTeam, readTeam } from "../lib/team.ts";
import { mateOf, paceOf, teamPace } from "../lib/teamPace.ts";

test("pace: away weeks never count; help when 3 of the last 4 counted weeks are under 100", () => {
  const t = demoTeam("2026-10-05");
  const dave = mateOf(t, "t4")!;
  assert.deepEqual(paceOf(dave, 100), { line: "91 this week · 0 of the last 4 at 100", help: "Under 100 4 of the last 4 weeks" });
  const amy = mateOf(t, "t5")!;
  assert.equal(paceOf(amy, 100).help, null);
  const away = { ...dave, last4Away: [true, true, false, false] };
  assert.equal(paceOf(away, 100).help, null, "two counted weeks are too few to say");
  assert.equal(paceOf({ ...dave, away: true }, 100).line, "Away this week");
});

test("team pace: average leaves out the coach and away agents; help list lowest score first; ids narrow it", () => {
  const t = demoTeam("2026-10-05");
  const all = teamPace(t);
  assert.equal(all.counted, 7, "Sarah (me) left out");
  assert.deepEqual(all.help.map((h) => h.mate.name), ["Lisa", "Annette", "Travis", "Dave", "Marcus"]);
  const mine = teamPace(t, new Set(["t2", "t4"]));
  assert.deepEqual(mine.help.map((h) => h.mate.name), ["Dave", "Marcus"]);
  assert.equal(teamPace(readTeam({ minimum: 100, agents: [] })!).average, null);
});
