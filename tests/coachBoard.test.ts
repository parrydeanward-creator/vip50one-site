import { test } from "node:test";
import assert from "node:assert/strict";
import { demoCoached, readCoached, type Coached } from "../lib/coach.ts";
import { boardAgent, buildBoard, cardLine, demoCoachedMore, fallingTwo, nothingKeptRun, nudgeUrl, shortName, sparkOf, weekLabel, mondayOf, COLUMN_SHOW } from "../lib/coachBoard.ts";
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
  assert.match(cardLine(quiet), /no sign-in 9 days/);
  // no sign-in data: no points the last two finished weeks is quiet
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
  const b = buildBoard([...demoCoached(TODAY), ...demoCoachedMore(TODAY)], t);
  assert.equal(b.kpi.all.length, 10);
  assert.equal(b.now.length + b.slip.length + b.win.length, 10, "everyone is in exactly one column");
  assert.deepEqual(b.now.map((x) => x.why), ["Gone quiet", "Nothing kept in 3 weeks", "Hasn't set this week"]);
  assert.deepEqual(b.kpi.notSet.map((x) => x.short).sort(), ["Lisa G.", "Marcus L.", "Sheri C."]);
  assert.ok(b.kpi.notSet.every((x) => !x.set));
  assert.ok(b.kpi.at100.every((x) => (x.score ?? 0) >= 100));
  assert.ok(b.kpi.down2.length >= 2 && b.kpi.down2.every((x) => x.down2));
  assert.ok(b.kpi.teamKept != null && b.kpi.teamKept > 0 && b.kpi.teamKept < 1);
  assert.ok(COLUMN_SHOW >= 3 && COLUMN_SHOW <= 4);
  // a live coach with no Team route: still a board, no scores, nobody in Slipping on scores
  const bare = buildBoard(demoCoached(TODAY), null);
  assert.equal(bare.kpi.at100.length, 0);
  assert.ok(bare.slip.every((x) => x.why.startsWith("Kept less")));
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

test("readCoached takes the optional photo, kept weeks and last sign-in when MASTER sends them", () => {
  const [a] = readCoached(
    { agents: [{ agent_id: "u1", name: "Jen", due: null, keep_rate_8w: 0.5, streak: 0, photo_url: "https://x/y.jpg", kept_by_week: [0.5, "x", 2], last_sign_in_at: "2026-10-20T10:00:00Z" }] },
    TODAY,
  );
  assert.equal(a.photo, "https://x/y.jpg");
  assert.deepEqual(a.keptWeeks, [0.5, null, 1]);
  assert.equal(a.lastActive, "2026-10-20T10:00:00Z");
  const [b] = readCoached({ agents: [{ agent_id: "u2", name: "Al", due: null, keep_rate_8w: null, streak: 0, photo_url: "javascript:x" }] }, TODAY);
  assert.equal(b.photo, null, "only an https face");
  assert.equal(b.keptWeeks, undefined);
});
