import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { demoGraph, oneYouView } from "../lib/graph/demo.ts";
import { CHALLENGE, CHALLENGE_NODE, COMING, RETIRED_YOU_ORBS, SCOREBOARD_SECTIONS, SCORE_NODE, challengeDay, leaderRows, withoutRetired } from "../lib/oneYou.ts";
import { demoTeam } from "../lib/team.ts";
import { nextThings, review, type Review } from "../lib/review.ts";
import { commitWay, demoCommitments, queueDraft, readQueued } from "../lib/commitments.ts";
import type { GraphNode } from "../lib/graph/types.ts";

// ONE YOU reshaped (Parry, 16 Oct; walker inbox 2026-10-16-1905 to -1950).

const ENV: SummaryEnvelope = {
  v: 1,
  product: "go",
  found: true,
  stats: [
    { key: "daily_points", label: "Daily score", value: 11, max: 26 },
    { key: "weekly_score", label: "Weekly score", value: 64, max: 100 },
    { key: "challenge_day", label: "90-Day Challenge", value: 23, max: 90 },
    { key: "closings_goal", label: "Closings this goal year", value: 4, max: 12, pace: 6, from: "2026-03-01", to: "2027-02-28" },
  ],
  streak: 5,
  weekly_rank: 3,
  items: [],
};
const OPTS = { pkg: "complete" as const, firstName: "Kim", reachable: true, today: "2026-10-16" };
const under = (nodes: GraphNode[], id: string) => nodes.filter((n) => n.parentId === id).map((n) => n.id).sort();

test("the live ONE YOU has the Scoreboard and the 90-Day Challenge, as the demo does", () => {
  const g = liveGraph(ENV, OPTS);
  assert.deepEqual(under(g.nodes, "go"), ["go-challenge", "go-goals", "go-score", "go-today"]);
  const score = g.nodes.find((n) => n.id === SCORE_NODE)!;
  assert.equal(score.label, "Scoreboard");
  assert.equal(score.secondaryLabel, "#3 this week");
  assert.deepEqual(score.stats?.map((s) => s.label), ["Daily score", "Weekly score", "Streak", "Leaderboard"]);
  const ch = g.nodes.find((n) => n.id === CHALLENGE_NODE)!;
  assert.equal(ch.secondaryLabel, "Day 23 of 90");
  assert.deepEqual(challengeDay(ch.stats), { day: 23, of: 90 });
  assert.equal(ch.summary, CHALLENGE.what);
  // not started: the orb still explains it
  const fresh = liveGraph({ ...ENV, stats: ENV.stats!.filter((s) => s.key !== "challenge_day") }, OPTS).nodes.find((n) => n.id === CHALLENGE_NODE)!;
  assert.equal(fresh.secondaryLabel, "Five arenas, 100 a day");
  assert.equal(challengeDay(fresh.stats), null);
});

test("every orb the demo ONE YOU shows is in the live ONE YOU too (walker: nothing in the film the agent can't find)", () => {
  const demo = oneYouView(demoGraph("complete"));
  const live = liveGraph(ENV, OPTS);
  assert.deepEqual(under(demo.nodes, "go"), under(live.nodes, "go"));
});

test("the retired ONE YOU orbs (Energy, Time off, Wins, Partners, Pulse Coach, Income Map, Income forecast) are dropped", () => {
  assert.deepEqual([...RETIRED_YOU_ORBS].sort(), ["go-energy", "go-forecast", "go-income", "go-partners", "go-pulse-coach", "go-time-off", "go-wins"]);
  const nodes: GraphNode[] = [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }, ...RETIRED_YOU_ORBS.map((id) => ({ id, type: "feature" as const, label: id, parentId: "go", product: "go" as const, importance: 1 }))];
  const edges = RETIRED_YOU_ORBS.map((id) => ({ id: `go>${id}`, source: "go", target: id, relationshipType: "belongs_to" as const, strength: 1 }));
  const g = withoutRetired({ nodes, edges });
  assert.deepEqual(g.nodes.map((n) => n.id), ["go"]);
  assert.equal(g.edges.length, 0);
  const clean = { nodes: [nodes[0]], edges: [] };
  assert.equal(withoutRetired(clean), clean, "untouched when there is nothing to drop");
});

test("the Scoreboard's sections in Parry's order; the leaderboard names others by first name only", () => {
  assert.deepEqual([...SCOREBOARD_SECTIONS], ["Mission Control", "Leaderboard", "Your partners", "Badges this week", "Streak and XP", "This week's wins"]);
  assert.equal(COMING, "Coming from ONE MOVE");
  const t = demoTeam("2026-10-12");
  const rows = leaderRows(t);
  assert.equal(rows.find((r) => r.me)!.name, "You");
  assert.ok(rows.every((r) => !r.name.includes(" ")));
  const low = { ...t, agents: t.agents.map((a) => ({ ...a, me: a.name === "Amy" })) };
  const r2 = leaderRows(low, 2);
  assert.equal(r2.length, 3, "the agent is added when outside the top rows");
  assert.equal(r2[2].name, "You");
});

test("the 90-Day Challenge explained: five arenas at 20 points, the Day 1 setup, the letter and certificate", () => {
  assert.deepEqual(CHALLENGE.arenas.map((a) => a.name), ["Body", "Spirit", "Relationships", "Business", "Legacy"]);
  assert.deepEqual(CHALLENGE.day1.map((d) => d.title), ["Who you are doing this for", "Your identity statement", "The enemy", "The sealed letter"]);
  assert.match(CHALLENGE.day1[1].line, /Right now I am someone who.*I am becoming someone who/);
  assert.match(CHALLENGE.end, /Day 90/);
  assert.equal(CHALLENGE.pageUrl, "https://move.vip50one.com/challenge");
});

test("Weekly Review's three things: Pulse's focus first, at most three, each a commitment draft", () => {
  const r: Review = review({ today: "2026-10-16", week: { score: 50, minimum: 100 }, roster: null, commitments: null, goals: [{ label: "GCI", line: "$1 of $9", behind: true }] });
  const things = nextThings(r, { text: "3 face-to-faces next week", kind: "face_to_face", target: 3, why: "None in two weeks." });
  assert.ok(things.length <= 3);
  assert.equal(things[0].focus, true);
  assert.deepEqual(things[0].draft, { text: "3 face-to-faces next week", kind: "face_to_face", target: 3 });
  assert.ok(things.slice(1).every((t) => !t.focus && t.draft.kind === "yes_no" && t.draft.text.length <= 140 && !t.draft.text.endsWith(".")));
  assert.equal(nextThings(r, null)[0].focus, false);
});

test("Make it a commitment: set now only while this week is not set (Mon-Thu); otherwise first in next Monday's form", () => {
  const d = { text: "Reach 100 next week", kind: "yes_no" as const, target: null };
  const c = demoCommitments("2026-10-13");
  const unset = { ...c, week: null };
  const now = commitWay(unset, d, false);
  assert.equal(now.way, "set_now");
  assert.deepEqual(now.way === "set_now" ? now.body : null, { period: "week", items: [d] });
  assert.equal(commitWay(unset, d, true).way, "queue", "Friday to Sunday it is for next week");
  assert.equal(commitWay({ ...c, week: { id: "w", starts: "2026-10-12", setAt: "x", checkedAt: null, items: [{ id: "i", text: "x", kind: "yes_no", target: null, count: null, result: null, note: null }] } }, d, false).way, "queue", "a set week is never replaced");
  assert.equal(commitWay(null, d, false).way, "queue");
  // the queue: Pulse Coach's single focus still reads; no repeats; at most 3
  assert.deepEqual(readQueued(JSON.stringify({ text: "Two coffees", kind: "face_to_face", target: 2 })), [{ text: "Two coffees", kind: "face_to_face", target: 2 }]);
  assert.deepEqual(readQueued("not json"), []);
  let q = queueDraft([], d);
  q = queueDraft(q, d);
  assert.equal(q.length, 1);
  for (const t of ["a", "b", "c"]) q = queueDraft(q, { text: t, kind: "yes_no", target: null });
  assert.deepEqual(q.map((x) => x.text), ["a", "b", "c"]);
});

test("the Weekly Review's Wins card reads the Scoreboard's list: weeks at 100 and goals reached are not this week's wins", () => {
  const w = (kind: "closing" | "week_100" | "goal_reached" | "five_star", at: string, title: string) => ({ kind, at, title, detail: null, contactId: null, amount: null });
  const r = review({ today: "2026-10-16", week: { score: 104, minimum: 100 }, roster: null, commitments: null, goals: [], wins: [w("closing", "2026-10-14", "Closed"), w("week_100", "2026-10-13", "Week"), w("goal_reached", "2026-10-13", "Goal"), w("five_star", "2026-10-15", "Ann")] });
  assert.equal(r.cards.find((c) => c.key === "wins")!.big, "2");
});

// Every ONE YOU tool in one look (Walker, 17 Oct: the left list showed 9 tools, then "+5 more in the panel").
test("the ONE YOU rail lists every tool; the cap of 9 stays only for other orbs", () => {
  const b = readFileSync("components/brain/Brain.tsx", "utf8");
  assert.match(b, /: focus\.id === "go"\s*\n\s*\? childrenOf\(ix, focus\.id\) \/\/ ONE YOU: every tool in one look/);
  assert.match(b, /!ask && !tour && childrenOf\(ix, focus\.id\)\.length > railCount \? \(/);
  assert.match(readFileSync("app/globals.css", "utf8"), /\.rail\.rail-full \{[^}]*scrollbar-width: thin/);
});
