import { test } from "node:test";
import assert from "node:assert/strict";
import { indexGraph } from "../lib/graph/model.ts";
import type { BusinessGraph, GraphNode } from "../lib/graph/types.ts";
import { movePageId } from "../lib/moveMenu.ts";
import { CHALLENGE_NODE } from "../lib/oneYou.ts";
import { demoEvents, withEventsNodes } from "../lib/outreach.ts";
import { readDaily } from "../lib/daily.ts";
import { readWeekly } from "../lib/weekly.ts";
import { TRACKERS_PARTS, menuTarget, demoDailyRaw, demoWeeklyRaw, groupParts, groupPulse, partExamples, partsFor, withDemoTrackers } from "../lib/examples/move.ts";

// Walker 18 Oct (Parry 06:48, "the side information is blank"): ONE MOVE's group heads open the group's own panel, each
// part with its count, its pulse and a few lines of what is in it.

const base = (extra: GraphNode[] = []): BusinessGraph => ({
  rootId: "one",
  nodes: [
    { id: "one", type: "core", label: "ONE", parentId: null, product: "go", importance: 1 },
    { id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 0.9 },
    { id: CHALLENGE_NODE, type: "feature", label: "90-Day Challenge", secondaryLabel: "Day 23", parentId: "go", product: "go", importance: 0.5 },
    { id: movePageId("/daily"), type: "feature", label: "Daily Tracker", parentId: "move", product: "move", importance: 0.3 },
    ...extra,
  ],
  edges: [],
});

test("the example agent gets a Trackers group with the Daily and Weekly Tracker under it, once", () => {
  const g = withDemoTrackers(base());
  const ix = indexGraph(g);
  const t = ix.byId.get("move-g-trackers")!;
  assert.equal(t.label, "Trackers");
  assert.ok(t.stats!.every((s) => s.label.startsWith("Example")));
  assert.equal(ix.byId.get(movePageId("/daily"))!.parentId, "move-g-trackers");
  assert.equal(ix.byId.get(movePageId("/weekly"))!.parentId, "move-g-trackers");
  assert.equal(g.nodes.filter((n) => n.id === movePageId("/daily")).length, 1);
  assert.deepEqual(withDemoTrackers(g), g);
});

test("a locked ONE MOVE gets no Trackers group", () => {
  const g = base();
  g.nodes[1] = { ...g.nodes[1], locked: true };
  assert.equal(withDemoTrackers(g), g);
});

test("each part finds its orb (the Brain's own view when ONE MOVE has no page orb), lit parts light the group", () => {
  const ix = indexGraph(withDemoTrackers(base()));
  const parts = groupParts(ix, "move-g-trackers", TRACKERS_PARTS);
  assert.deepEqual(parts.map((p) => p.label), ["Daily Tracker", "Weekly Tracker", "90-Day Challenge"]);
  assert.equal(parts[2].id, CHALLENGE_NODE);
  const daily = parts[0];
  assert.equal(daily.lit, true);
  assert.equal(daily.count, 1);
  assert.deepEqual(groupPulse(parts), { status: "attention", count: 1 });
  assert.deepEqual(groupPulse(parts.filter((p) => !p.lit)), { count: 0 });
});

test("Events lists what is on: the calendar's next 7 days, the VIP event and the mixer", () => {
  const today = "2026-10-18";
  const ix = indexGraph(withEventsNodes(base(), demoEvents(today)));
  const parts = groupParts(ix, "move-g-events", partsFor("events"));
  assert.deepEqual(parts.map((p) => p.label), ["Calendar", "VIP Events", "Mixer"]);
  const ex = partExamples("events", parts, { demo: false, today, events: demoEvents(today), learn: null, ix });
  assert.equal(ex[parts[0].id][0], "Today 9:30 am · Coffee with Marcus Webb");
  assert.match(ex[parts[1].id][0], /^VIP-50 Quarterly Mastermind · .* · Draper office$/);
  assert.match(ex[parts[2].id][1], /No invites sent this month/);
  assert.equal(parts[2].lit, true); // no mixer invites yet: a monthly VIP touch
});

test("invented lines only for the example agent; never a repeat of the row's own line", () => {
  const ix = indexGraph(withDemoTrackers(base()));
  const parts = groupParts(ix, "move-g-trackers", TRACKERS_PARTS);
  const weekly = parts.find((p) => p.label === "Weekly Tracker")!;
  const live = partExamples("trackers", parts, { demo: false, today: "2026-10-18", events: null, learn: null, ix });
  assert.equal(live[weekly.id], undefined);
  const demo = partExamples("trackers", parts, { demo: true, today: "2026-10-18", events: null, learn: null, ix });
  assert.ok(demo[weekly.id].length > 0);
  for (const p of parts) assert.ok(!(demo[p.id] ?? []).includes(p.line));
});

test("the example Daily and Weekly Tracker answers read as ONE MOVE's would", () => {
  const d = readDaily(demoDailyRaw("2026-10-18"))!;
  assert.equal(d.score, 18);
  assert.equal(d.sections.flatMap((s) => s.boxes).filter((b) => b.done).reduce((a, b) => a + b.points, 0), 18);
  const w = readWeekly(demoWeeklyRaw("2026-10-18"))!;
  assert.equal(w.score, 64);
  assert.equal(w.met, false);
  assert.equal(w.days[0].date, "2026-10-12");
});

test("a menu row with no page orb goes to the Brain's own view of it, else stays the page orb", () => {
  const has = (id: string) => id === CHALLENGE_NODE || id === movePageId("/daily");
  assert.equal(menuTarget("/challenge", has), CHALLENGE_NODE);
  assert.equal(menuTarget("/daily", has), movePageId("/daily"));
  assert.equal(menuTarget("/analytics", has), movePageId("/analytics"));
});

test("the example agent's Mixer, Newsletter, Overview and Learn home rows open their orbs", () => {
  const ids = new Set(["move-5", "move-6", "move-g-outreach", "move-g-learn"]);
  const has = (id: string) => ids.has(id);
  assert.equal(menuTarget("/mixer", has), "move-5");
  assert.equal(menuTarget("/newsletter", has), "move-6");
  assert.equal(menuTarget("/outreach", has), "move-g-outreach");
  assert.equal(menuTarget("/learn", has), "move-g-learn");
});
