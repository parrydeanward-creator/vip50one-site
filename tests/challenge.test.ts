import { test } from "node:test";
import assert from "node:assert/strict";
import { challengeLine, challengeUrl, groupLine, readChallenge, safeUrl, withChallengeNode } from "../lib/challenge.ts";
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
