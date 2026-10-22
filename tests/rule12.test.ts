import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demoGraph } from "../lib/graph/demo.ts";
import { statGo } from "../lib/statOpen.ts";
import { badgePath } from "../lib/badges.ts";
import { missionPath } from "../lib/scoreboard.ts";
import { PART_DO, type ReadKey } from "../lib/pulseCoach.ts";
import { IN_BRAIN, MENU_ORB } from "../lib/moveMenu.ts";
import { SCORE_NODE } from "../lib/oneYou.ts";

// Parry, 19 Oct (PROTOCOL rule 12): "everything we do must have action available." The 20 Oct walk of ONE YOU, the product
// orbs and My Profile: every number, name and row that stood alone now carries an action. Pure places are checked here; the
// rows in components are checked for their marker, as the screen test (Playwright) clicks them.

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const pageOk = (path: string) => IN_BRAIN.has(path) || path in MENU_ORB;

test("every stat on a product orb in the demo opens something", () => {
  const g = demoGraph();
  const orbs = ["marquee", "showly", "open", "go", "move"];
  let seen = 0;
  for (const id of orbs) {
    const n = g.nodes.find((x) => x.id === id)!;
    assert.ok(n, id);
    for (const s of n.stats ?? []) {
      const go = statGo(id, s.label);
      assert.ok(go, `${id}: "${s.label}" has somewhere to go`);
      assert.ok(go.ids?.length || go.page || go.power || go.team, `${id}: "${s.label}" names a place`);
      if (go.page) assert.ok(pageOk(go.page), `${id}: ${go.page} opens in the Brain`);
      seen++;
    }
  }
  assert.ok(seen >= 10);
});

test("the Scoreboard and Today's VIP touches stats open the tracker, Power Hour or the team", () => {
  assert.deepEqual(statGo(SCORE_NODE, "Daily score"), { page: "/daily" });
  assert.deepEqual(statGo(SCORE_NODE, "Weekly score"), { page: "/weekly" });
  assert.deepEqual(statGo(SCORE_NODE, "Leaderboard"), { team: true });
  assert.deepEqual(statGo("go-today", "VIP-50 tasks left"), { power: true });
  assert.deepEqual(statGo("go-today", "Streak"), { page: "/daily" });
  assert.equal(statGo("marquee", "Posting"), null); // a plain explanation line has nothing behind it
});

test("live stat labels reach the same tools as the demo's", () => {
  assert.deepEqual(statGo("showly", "New answers, 7 days")?.ids, ["showly-tool-answers"]);
  assert.deepEqual(statGo("showly", "New buyer reactions")?.ids, ["showly-tool-answers"]);
  assert.deepEqual(statGo("marquee", "Active listings")?.ids, ["marquee-tool-listings"]);
  assert.deepEqual(statGo("open", "Prep tasks left")?.ids, ["open-tool-open_houses"]);
});

test("every Mission Control target and every weekly badge has a page", () => {
  for (const t of ["Agent Attraction", "Set Up Open House", "Complete Daily Tracker", "VIP-50 Touches", "Scheduled Tasks", "App Check-In Streak", "Relationship Momentum"]) {
    const p = missionPath(t);
    assert.ok(p && pageOk(p), t);
  }
  for (const b of ["Touch Titan", "Task Crusher", "Consistency King", "Social Spark", "Note Ninja", "Relationship Builder", "Momentum Maker", "Market Mayor", "Something new"]) {
    assert.ok(pageOk(badgePath(b)), b);
  }
});

test("every part of Pulse's read has a place to work on it", () => {
  const keys: Exclude<ReadKey, "focus">[] = ["trend", "touches", "days", "habits", "keep"];
  for (const k of keys) {
    const d = PART_DO[k];
    assert.ok(d.label.length > 0, k);
    if (d.do.kind === "page") assert.ok(pageOk(d.do.path), k);
    else assert.equal(d.do.view, "commitments");
  }
});

// The rows themselves: each fixed card or row carries its action marker.
const MARKS: [string, string[]][] = [
  ["components/brain/ScoreboardPanel.tsx", ['act="mission"', 'act="leader"', 'act="partner"', 'act="badge"', 'act="streak"', 'act="score"', 'act="xp"']],
  ["components/brain/ReferralsView.tsx", ['data-r12="referred-person"', 'data-r12="referrer-contact"', 'data-r12="candidate-contact"']],
  ["components/brain/ChallengePanel.tsx", ['data-act="challenge-row"']],
  ["components/brain/ChallengeView.tsx", ['data-act="challenge-row"', 'data-act="challenge-stat"', 'data-act="challenge-arena"', 'data-act="challenge-box"', 'data-act="challenge-leader"', 'data-act="challenge-cert"', 'data-act="challenge-tick"']],
  ["components/brain/GoalsView.tsx", ['data-act="goals-closed"', 'data-act="goals-week-row"', 'data-act="goals-likely"', 'data-act="goals-week-move"', 'data-act="goals-add-deal"']],
  ["components/brain/HotWarmCold.tsx", ['data-act="hwc-count"']],
  ["components/brain/PlanMyDay.tsx", ['data-act="plan-points"', 'data-act="suggest-open"']],
  ["components/brain/ProfileCards.tsx", ['data-act="badge-tile"']],
  ["components/brain/ReviewView.tsx", ['data-act="read-part"']],
];
for (const [file, marks] of MARKS) {
  test(`${file.split("/").pop()}: fixed rows carry an action`, () => {
    const text = src(file);
    for (const m of marks) assert.ok(text.includes(m), `${file} has ${m}`);
  });
}

test("every Scoreboard row button names where it goes", () => {
  const text = src("components/brain/ScoreboardPanel.tsx");
  // each <Go ...> has a label (aria) and a click
  const gos = text.match(/<Go [^>]*>/g) ?? [];
  assert.ok(gos.length >= 9);
  for (const g of gos) assert.ok(/label=/.test(g) && /onClick=/.test(g), g);
});

test("the Brain opens a stat's place: orb, Power Hour, team or page", () => {
  const text = src("components/brain/Brain.tsx");
  assert.ok(text.includes("statGo(focus.id, st.label)"));
  assert.ok(text.includes("open={statOpens}"));
  assert.ok(text.includes("const goPage ="));
});
