import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import {
  ENERGY_NODE, KEEP_GOING, applyCheck, bestWeeksLine, demoEnergy, energyLine, energyUrl, needsRest, readEnergy, saveBody, strip, todayCheck, weekPairs, withEnergyNode,
  type Energy, type Level,
} from "../lib/energy.ts";

const today = "2026-10-09";
const day = (k: number) => new Date(Date.parse(`${today}T12:00:00Z`) - k * 86_400_000).toISOString().slice(0, 10);
const of = (levels: Level[], weeks: { week_start: string; score: number }[] = []): Energy =>
  readEnergy({ today, checks: levels.map((level, k) => ({ day: day(k + 1), level })), weeks }, today)!;

test("energyUrl: the §3w route", () => {
  assert.equal(energyUrl(), "https://move.vip50one.com/api/brain/energy?days=84");
});

test("readEnergy: checked, one per day, newest first, bad levels dropped", () => {
  const e = readEnergy({
    today,
    checks: [
      { day: "2026-10-07", level: 4 },
      { day: "2026-10-08", level: 2 },
      { day: "2026-10-08", level: 5 },
      { day: "2026-10-06", level: 0 },
      { day: "2026-10-05", level: 6 },
      { day: "bad", level: 3 },
      { day: "2026-10-04", level: "3" },
    ],
    weeks: [{ week_start: "2026-09-28", score: 104.4 }, { week_start: "x", score: 1 }],
  }, "2000-01-01")!;
  assert.deepEqual(e.checks, [{ day: "2026-10-08", level: 2 }, { day: "2026-10-07", level: 4 }]);
  assert.deepEqual(e.weeks, [{ weekStart: "2026-09-28", score: 104 }]);
  assert.equal(e.today, today);
  assert.equal(readEnergy({ nope: true }, today), null);
  assert.equal(readEnergy({ checks: [] }, today)!.today, today, "falls back to the Brain's today");
});

test("applyCheck: today's check replaced, never doubled; the POST body is §3w.3", () => {
  const e = applyCheck(applyCheck(of([3, 3]), 2), 4);
  assert.deepEqual(todayCheck(e), { day: today, level: 4 });
  assert.equal(e.checks.filter((c) => c.day === today).length, 1);
  assert.deepEqual(saveBody(e, 5), { day: today, level: 5 });
});

test("needsRest: 3 of the last 4 low, or the last 7 averaging 2.4 or less", () => {
  assert.equal(needsRest(of([2, 1, 4, 2])), true);
  assert.equal(needsRest(of([2, 4, 4, 2, 1])), false);
  assert.equal(needsRest(of([3, 2, 3, 2, 2, 2, 2])), true, "7 averaging 2.3");
  assert.equal(needsRest(of([3, 2, 3, 2, 2, 3, 2])), false, "7 averaging 2.43 is above 2.4");
  assert.equal(needsRest(of([3, 3, 3, 2, 2, 3, 3])), false);
  assert.equal(needsRest(of([2, 3])), false, "too few to say");
});

test("bestWeeksLine: only with 3 weeks at 100 and 3 below; else the keep-going line", () => {
  // weeks start on Mondays; give every day of each week the same level
  const mon = (w: number) => {
    const t = Date.parse("2026-10-05T12:00:00Z") - 7 * w * 86_400_000;
    return new Date(t).toISOString().slice(0, 10);
  };
  const checks: { day: string; level: Level }[] = [];
  const weeks: { week_start: string; score: number }[] = [];
  const plan: [number, Level][] = [[110, 4], [101, 5], [104, 4], [80, 2], [90, 3], [70, 2]];
  plan.forEach(([score, level], k) => {
    weeks.push({ week_start: mon(k + 1), score });
    for (let d = 0; d < 7; d++) checks.push({ day: new Date(Date.parse(`${mon(k + 1)}T12:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10), level });
  });
  const e = readEnergy({ today, checks, weeks }, today)!;
  assert.equal(weekPairs(e).length, 6);
  assert.equal(bestWeeksLine(e), "Your 100 weeks averaged 4.3; the others 2.3");
  const thin = readEnergy({ today, checks, weeks: weeks.slice(0, 4) }, today)!;
  assert.equal(bestWeeksLine(thin), null);
  assert.ok(KEEP_GOING.startsWith("Keep checking in"));
});

test("strip: the last 14 days oldest first, gaps as null", () => {
  const s = strip(of([4, 3]), 14);
  assert.equal(s.length, 14);
  assert.equal(s[13].day, today);
  assert.equal(s[13].level, null);
  assert.equal(s[12].level, 4);
  assert.equal(s[11].level, 3);
  assert.equal(s[0].level, null);
});

test("withEnergyNode: yellow from 5 am to noon until checked; still after; never red; gone when locked", () => {
  const base = {
    nodes: [{ id: "go", type: "product", label: "ONE YOU", importance: 1 } as GraphNode],
    edges: [] as GraphEdge[],
  };
  const e = of([4, 4]);
  const morning = withEnergyNode(base, e, 8).nodes.find((n) => n.id === ENERGY_NODE)!;
  assert.equal(morning.status, "attention");
  assert.equal(morning.secondaryLabel, "How's your energy?");
  const afternoon = withEnergyNode(base, e, 14).nodes.find((n) => n.id === ENERGY_NODE)!;
  assert.equal(afternoon.status, "healthy");
  assert.equal(afternoon.secondaryLabel, "No check today");
  const done = withEnergyNode(base, applyCheck(e, 5), 8).nodes.find((n) => n.id === ENERGY_NODE)!;
  assert.equal(done.status, "healthy");
  assert.equal(done.secondaryLabel, "Full of energy today");
  assert.equal(withEnergyNode(base, null, 8).nodes.length, 1);
  const locked = { ...base, nodes: [{ ...base.nodes[0], locked: true }] };
  assert.equal(withEnergyNode(locked, e, 8).nodes.length, 1);
  const twice = withEnergyNode(withEnergyNode(base, e, 8), e, 8);
  assert.equal(twice.nodes.filter((n) => n.id === ENERGY_NODE).length, 1);
  assert.equal(twice.edges.length, 1);
});

test("energyLine: rest shows beside today's level", () => {
  assert.equal(energyLine(applyCheck(of([2, 1, 2]), 1), 9), "Running on empty today · Pulse suggests a lighter day");
});

test("demoEnergy: today unchecked, best weeks readable", () => {
  const e = demoEnergy(today);
  assert.equal(todayCheck(e), null);
  assert.ok(e.checks.length >= 28);
  assert.ok(bestWeeksLine(e), "the demo shows the best-weeks line");
});
