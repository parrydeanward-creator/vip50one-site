import { test } from "node:test";
import assert from "node:assert/strict";
import { demoCoached, readCoached, type Coached } from "../lib/coach.ts";
import {
  activeLabel, boardAgent, buildBoard, cardLine, demoCoachBoard, demoCoachedMore, eightWeeks, fallingTwo, keptLine, mondayOf, mountainDaysSince, nothingKeptRun, nudgeUrl,
  scoreLine, shortName, sparkOf, weekLabel, COLUMN_SHOW, QUIET_DAYS, REFRESH_MS,
} from "../lib/coachBoard.ts";
import { demoTeam, type Mate } from "../lib/team.ts";

// The Coaching board (Parry, 22 Oct, option A). These hold the column rules and the name rule.

const TODAY = "2026-10-21"; // a Wednesday
const base = (o: Partial<Coached["c"]> = {}): Coached["c"] => ({ today: TODAY, due: null, week: null, weekend: null, lastWeek: null, keepRate8w: 0.7, streak: 0, ...o });
const week = (n: number) => ({ id: "w", starts: TODAY, setAt: `${TODAY}T14:00:00Z`, checkedAt: null, items: Array.from({ length: n }, (_, k) => ({ id: `i${k}`, text: "Call 10", kind: "call" as const, target: 10, count: 2, result: null, note: null })) });
const agent = (o: Omit<Partial<Coached>, "c"> & { c?: Partial<Coached["c"]> } = {}): Coached => ({ id: "u1", name: "Annette Judd", setup: null, ...o, c: base({ week: week(3), ...(o.c ?? {}) }) });
const mate = (o: Partial<Mate> = {}): Mate => ({ id: "u1", name: "Annette", photo: null, score: 80, last4: [100, 104, 110, 101], streak: 0, tickedToday: true, me: false, away: false, last4Away: [false, false, false, false], earned: [], ...o });

test("a name shows as First L., never a login or email handle", () => {
  assert.equal(shortName("Annette Judd"), "Annette J.");
  assert.equal(shortName("Julie"), "Julie");
  assert.equal(shortName("Mary Ann van Dyke"), "Mary D.");
  assert.equal(shortName("travis99@example.com"), "Travis", "domain and digits gone");
  assert.equal(shortName("lisa.grant88@example.com"), "Lisa G.");
  assert.equal(shortName("jsmith42"), "Jsmith", "a bare handle loses its digits");
  assert.equal(shortName("darian_ortiz"), "Darian O.");
  assert.equal(shortName("  "), "Agent");
  // readCoached already drops the domain; the board drops the digits too
  const [a] = readCoached({ agents: [{ agent_id: "u9", name: "femi2024@x.com", due: null, keep_rate_8w: 0.5, streak: 0 }] }, TODAY);
  assert.equal(boardAgent(a, null, 100).short, "Femi");
});

test("Needs you now: gone quiet first, then nothing kept two weeks running, then not set", () => {
  const quiet = boardAgent(agent({ lastActive: "2026-10-12T10:00:00Z" }), mate(), 100);
  assert.equal(quiet.column, "now");
  assert.equal(quiet.why, "Gone quiet");
  assert.equal(quiet.quietDays, 9);
  // rewritten 23 Oct: the card says when they were last active (last_active_at), not "no sign-in N days"
  assert.match(cardLine(quiet), /Active 9 days ago/);
  // no activity data: no points the last two finished weeks is quiet
  assert.equal(boardAgent(agent(), mate({ last4: [90, 80, 0, 0] }), 100).why, "Gone quiet");
  // ...but an away week is not counted as no points
  assert.notEqual(boardAgent(agent(), mate({ last4: [90, 80, 0, 0], last4Away: [false, false, false, true] }), 100).why, "Gone quiet");
  const none = boardAgent(agent({ keptWeeks: [0.5, 0, 0, 0], lastActive: `${TODAY}T08:00:00Z` }), mate(), 100);
  assert.deepEqual([none.column, none.why], ["now", "Nothing kept in 3 weeks"]);
  const notSet = boardAgent(agent({ c: { week: null } }), mate(), 100);
  assert.deepEqual([notSet.column, notSet.why], ["now", "Hasn't set this week"]);
  // away this week: not set is not held against them
  const away = boardAgent(agent({ c: { week: null } }), mate({ away: true }), 100);
  assert.deepEqual([away.column, away.why], ["win", "Away this week"]);
});

test("Slipping: kept % or score down two weeks running, or under the minimum last week", () => {
  const kept = boardAgent(agent({ keptWeeks: [0.9, 0.8, 0.6] }), mate(), 100);
  assert.deepEqual([kept.column, kept.why, kept.down2], ["slip", "Kept less 2 weeks running", true]);
  const score = boardAgent(agent(), mate({ last4: [120, 115, 108, 102] }), 100);
  assert.deepEqual([score.column, score.why], ["slip", "Score down 2 weeks running"]);
  const under = boardAgent(agent(), mate({ last4: [100, 110, 90, 95] }), 100);
  assert.deepEqual([under.column, under.why, under.down2], ["slip", "Under 100 last week (95)", false]);
  assert.equal(fallingTwo([1, 1, 0.5]), false, "level then down is not two weeks running");
  assert.equal(fallingTwo([0.9, null, 0.5]), false);
  assert.equal(nothingKeptRun([0, 0.5, 0, 0]), 2);
});

test("Winning: everyone else, with the best true reason", () => {
  assert.equal(boardAgent(agent(), mate({ streak: 4, last4: [100, 104, 103, 110] }), 100).why, "4 weeks at 100");
  assert.equal(boardAgent(agent(), mate({ score: 104, last4: [100, 104, 103, 110] }), 100).why, "At 100 this week");
  const noTeam = boardAgent(agent(), null, 100);
  assert.equal(noTeam.column, "win", "no Team screen entry: nothing says they are behind");
  assert.equal(noTeam.why, "Set 3, 0 done so far");
});

test("the board: columns, the five counts and who is behind each", () => {
  const t = demoTeam(mondayOf(TODAY));
  const b = buildBoard(demoCoachBoard(TODAY), t);
  assert.equal(b.kpi.all.length, 11);
  assert.equal(b.now.length + b.slip.length + b.win.length, 11, "everyone is in exactly one column");
  assert.deepEqual(b.now.map((x) => x.why), ["Gone quiet", "Nothing kept in 3 weeks", "Hasn't set this week", "Hasn't set this week"]);
  assert.deepEqual(b.kpi.notSet.map((x) => x.short).sort(), ["Lisa G.", "Marcus L.", "Nina P.", "Sheri C."]);
  assert.ok(b.kpi.notSet.every((x) => !x.set));
  assert.ok(b.kpi.at100.every((x) => (x.score ?? 0) >= 100));
  assert.ok(b.kpi.down2.length >= 2 && b.kpi.down2.every((x) => x.down2));
  assert.ok(b.kpi.teamKept != null && b.kpi.teamKept > 0 && b.kpi.teamKept < 1);
  assert.ok(!b.kpi.keptList.some((x) => x.short === "Nina P."), "no commitments set: not in the team keep rate");
  assert.ok(COLUMN_SHOW >= 3 && COLUMN_SHOW <= 4);
  // the demo carries the coached route's new fields, so the demo board runs on the same rules as a live one
  const nina = b.agents.find((x) => x.short === "Nina P.")!;
  assert.equal(keptLine(nina), "No commitments set yet");
  assert.equal(eightWeeks(nina)!.values.length, 8);
  const marcus = b.agents.find((x) => x.short === "Marcus L.")!;
  assert.deepEqual(marcus.keptWeeks, [0.6, null, 0.4, 0.5], "a week with nothing set stays null in the demo");
  // a live coach with no Team route and the old coached answer: still a board, no scores, nobody in Slipping on scores
  const bare = buildBoard(demoCoached(TODAY), null);
  assert.equal(bare.kpi.at100.length, 0);
  assert.ok(bare.slip.every((x) => x.why.startsWith("Kept less")));
  assert.equal(demoCoachedMore(TODAY).length, 7);
});

test("the mini bar uses kept weeks when sent, else the weekly score against the minimum", () => {
  const k = boardAgent(agent({ keptWeeks: [1, 0.5, 0.2] }), mate(), 100);
  assert.deepEqual(sparkOf(k), { values: [1, 0.5, 0.2], kind: "kept" });
  const s = boardAgent(agent(), mate({ score: 50, last4: [100, 80, 120, 90] }), 100);
  assert.deepEqual(sparkOf(s), { values: [1, 0.8, 1.2, 0.9, 0.5], kind: "score" });
});

test("the nudge goes to ONE MOVE's coach route with a preset kind; the week label", () => {
  assert.equal(nudgeUrl("u-1"), "https://move.vip50one.com/api/brain/coach/nudge?agent=u-1&kind=push");
  assert.equal(weekLabel("2026-10-19"), "Week of Oct 19");
  assert.equal(mondayOf("2026-10-25"), "2026-10-19");
});

test("readCoached takes the photo, kept weeks and last ACTIVE time; never the sign-in time", () => {
  // rewritten 23 Oct (vip50-web-crm#399): the last sign-in used to stand in for activity; it only moves on a typed
  // password or code, so the board now reads last_active_at and ignores last_sign_in_at
  const [a] = readCoached(
    {
      agents: [
        {
          agent_id: "u1", name: "Jen", due: null, keep_rate_8w: 0.5, streak: 0, photo_url: "https://x/y.jpg",
          kept_by_week: [{ week: "2026-09-28", kept: 0.5, away: false }, { week: "2026-10-05", kept: null, away: false }, { week: "2026-10-12", kept: 2, away: false }],
          last_sign_in_at: "2026-09-01T10:00:00Z", last_active_at: "2026-10-20T10:00:00Z", last_active_source: "touch",
        },
      ],
    },
    TODAY,
  );
  assert.equal(a.photo, "https://x/y.jpg");
  assert.deepEqual(a.keptWeeks, [0.5, null, 1], "{week, kept} objects; a null week stays null");
  assert.equal(a.lastActive, "2026-10-20T10:00:00Z");
  assert.equal(a.lastActiveSource, "touch");
  const [b] = readCoached({ agents: [{ agent_id: "u2", name: "Al", due: null, keep_rate_8w: null, streak: 0, photo_url: "javascript:x", last_sign_in_at: "2026-10-20T10:00:00Z" }] }, TODAY);
  assert.equal(b.photo, null, "only an https face");
  assert.equal(b.keptWeeks, undefined);
  assert.equal(b.lastActive, null, "a sign-in time alone is not activity");
  // bare numbers still read (older answers)
  const [c] = readCoached({ agents: [{ agent_id: "u3", name: "Bo", due: null, keep_rate_8w: 0.5, streak: 0, kept_by_week: [0.5, "x", 2] }] }, TODAY);
  assert.deepEqual(c.keptWeeks, [0.5, null, 1]);
});

// The live answer of 23 Oct (ONE MOVE's proof for vip50-web-crm#399), shaped as the coached route sends it.
const LIVE_TODAY = "2026-10-23";
const mondays = (n: number) => Array.from({ length: n }, (_, k) => new Date(Date.parse("2026-10-19T12:00:00Z") - (n - k) * 7 * 86_400_000).toISOString().slice(0, 10));
const scores = (xs: number[]) => xs.map((score, k) => ({ week: mondays(8)[k], score, daily: score, bonus: 0, away: false }));
const LIVE = {
  agents: [
    {
      agent_id: "annette", name: "Annette Judd", due: null, week: null, weekend: null, keep_rate_8w: 0.6, streak: 0,
      last_sign_in_at: "2026-09-02T15:00:00Z", last_active_at: "2026-10-23T14:10:00Z", last_active_source: "touch",
      score_this_week: 104, scores_by_week: scores([259, 110, 137, 101, 20, 147, 175, 121]),
      kept_counts_8w: { set: 5, kept: 3, partly: 0, missed: 0, not_checked: 2 }, has_commitments: true,
      kept_by_week: [{ week: "2026-10-05", kept: 1, away: false }, { week: "2026-10-12", kept: null, away: false }],
    },
    {
      agent_id: "aaron", name: "Aaron", due: null, week: null, weekend: null, keep_rate_8w: 1, streak: 1,
      last_sign_in_at: "2026-08-01T15:00:00Z", last_active_at: "2026-10-21T18:00:00Z", last_active_source: "app",
      score_this_week: 15, scores_by_week: scores([0, 0, 0, 0, 0, 0, 30, 30]),
      kept_counts_8w: { set: 4, kept: 4, partly: 0, missed: 0, not_checked: 0 }, has_commitments: true, kept_by_week: [],
    },
    {
      agent_id: "angelina", name: "Angelina", due: null, week: null, weekend: null, keep_rate_8w: 0, streak: 0,
      last_sign_in_at: "2026-07-01T15:00:00Z", last_active_at: "2026-10-22T20:15:00Z", last_active_source: "contact",
      score_this_week: 12, scores_by_week: scores([0, 0, 0, 0, 0, 0, 0, 0]),
      kept_counts_8w: { set: 0, kept: 0, partly: 0, missed: 0, not_checked: 0 }, has_commitments: false, kept_by_week: [],
    },
    {
      agent_id: "greg", name: "Greg James", due: null, week: null, weekend: null, keep_rate_8w: 0, streak: 0,
      last_sign_in_at: "2026-10-01T15:00:00Z", last_active_at: "2026-10-14T16:00:00Z", last_active_source: "tracker",
      score_this_week: 14, scores_by_week: scores([5, 13, 10, 19, 59, 37, 104, 27]),
      kept_counts_8w: { set: 1, kept: 0, partly: 0, missed: 1, not_checked: 0 }, has_commitments: true, kept_by_week: [{ week: "2026-10-12", kept: 0, away: false }],
    },
  ],
};

test("the live answer: score this week and the 8 bars come from scores_by_week, not from commitments", () => {
  const b = buildBoard(readCoached(LIVE, LIVE_TODAY), null);
  const by = (n: string) => b.agents.find((x) => x.a.name === n)!;
  const raw = (n: string) => eightWeeks(by(n))!.raw;
  assert.deepEqual(raw("Annette Judd"), [259, 110, 137, 101, 20, 147, 175, 121]);
  assert.deepEqual(raw("Aaron"), [0, 0, 0, 0, 0, 0, 30, 30]);
  assert.deepEqual(raw("Angelina"), [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(raw("Greg James"), [5, 13, 10, 19, 59, 37, 104, 27]);
  for (const n of ["Annette Judd", "Aaron", "Angelina", "Greg James"]) {
    const w = eightWeeks(by(n))!;
    assert.equal(w.kind, "score");
    assert.equal(w.values.length, 8, "eight finished weeks, eight bars");
  }
  assert.deepEqual([by("Annette Judd").score, by("Aaron").score, by("Angelina").score, by("Greg James").score], [104, 15, 12, 14]);
  assert.match(scoreLine(by("Annette Judd"))!, /^Score 104 this week/);
  assert.equal(scoreLine(by("Greg James")), "Score 14 this week · 1 of the last 4 at 100");
});

test("the live answer: kept % of how many, and 'No commitments set yet' (never 0%) when none were set", () => {
  const b = buildBoard(readCoached(LIVE, LIVE_TODAY), null);
  const by = (n: string) => b.agents.find((x) => x.a.name === n)!;
  assert.equal(keptLine(by("Annette Judd")), "60% kept of 5");
  assert.equal(keptLine(by("Aaron")), "100% kept of 4");
  assert.equal(keptLine(by("Greg James")), "0% kept of 1", "one set and missed is a real 0%");
  assert.equal(by("Angelina").kept, null);
  assert.equal(keptLine(by("Angelina")), "No commitments set yet");
  assert.doesNotMatch(cardLine(by("Angelina")), /0% kept/);
  assert.ok(!b.kpi.keptList.some((x) => x.a.name === "Angelina"), "not counted in the team keep rate");
  assert.equal(b.kpi.teamKept, (0.6 + 1 + 0) / 3);
});

test("the live answer: last active words from last_active_at in Mountain days; gone quiet only at 7+", () => {
  const b = buildBoard(readCoached(LIVE, LIVE_TODAY), null);
  const by = (n: string) => b.agents.find((x) => x.a.name === n)!;
  assert.match(cardLine(by("Annette Judd")), /Active today/);
  assert.match(cardLine(by("Angelina")), /Active yesterday/, "active Oct 22");
  assert.match(cardLine(by("Aaron")), /Active 2 days ago/);
  assert.match(cardLine(by("Greg James")), /Active 9 days ago/);
  assert.equal(by("Greg James").why, "Gone quiet");
  for (const n of ["Annette Judd", "Aaron", "Angelina"]) assert.notEqual(by(n).why, "Gone quiet", `${n} signed in long ago but is active`);
  // Mountain days, not UTC: 23:30 MT on Oct 22 is yesterday on Oct 23
  assert.equal(mountainDaysSince("2026-10-23T05:30:00Z", LIVE_TODAY), 1);
  assert.equal(QUIET_DAYS, 7);
  const at = (d: number) => boardAgent({ ...readCoached(LIVE, LIVE_TODAY)[0], lastActive: `2026-10-${String(23 - d).padStart(2, "0")}T18:00:00Z` }, null, 100);
  assert.notEqual(at(6).why, "Gone quiet");
  assert.equal(at(7).why, "Gone quiet");
  assert.equal(activeLabel(null), "No activity yet");
  assert.equal(REFRESH_MS, 300_000, "an open board reads the route again every 5 minutes");
});

test("kept weeks: a null week is an empty slot, never a 0 bar; never padded to 8", () => {
  const [a] = readCoached(
    { agents: [{ agent_id: "u1", name: "Jen Alvarez", due: null, keep_rate_8w: 0.5, streak: 0, kept_by_week: [{ week: "a", kept: 0.5 }, { week: "b", kept: null }, { week: "c", kept: 0 }, { week: "d", kept: 1 }] }] },
    TODAY,
  );
  const w = eightWeeks(boardAgent(a, null, 100))!;
  assert.equal(w.kind, "kept");
  assert.deepEqual(w.values, [0.5, null, 0, 1], "four weeks stay four; null stays null; a real 0 stays 0");
});
