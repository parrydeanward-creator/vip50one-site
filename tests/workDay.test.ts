import { test } from "node:test";
import assert from "node:assert/strict";
import { dayStart, isoWeekday, nextWorkingDay, readWeek, startWords, weekTemplateUrl, worksOn } from "../lib/workDay.ts";
import { dayIsDone } from "../lib/dayView.ts";
import { planState, withPlanNode } from "../lib/plan.ts";
import { readDay } from "../lib/schedule.ts";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";

// Walker, 17 Oct 07:40 MT (a Saturday): Plan my day said "Today's working day is over. Open it to see tomorrow's plan."
// before the day had started. A day off says so and offers the next working day's plan; a working day not begun says
// when it starts; "over" only once it is. Times are America/Denver wall clock (the Brain's denverNow()).
const week = readWeek({ days: { 1: { start: "09:00", end: "17:30" }, 2: { start: "09:00", end: "17:30" }, 3: { start: "09:00", end: "17:30" }, 4: { start: "09:00", end: "17:30" }, 5: { start: "09:00", end: "17:30" }, 6: null, 7: null }, standing: [], best_calls: { start: "09:00", end: "11:00" }, set: true })!;
const hours = { start: "09:00", end: "17:30" };
const SAT = "2026-10-17";
const FRI = "2026-10-16";

test("the week is read from ONE MOVE's week template", () => {
  assert.equal(weekTemplateUrl, "https://move.vip50one.com/api/brain/week-template");
  assert.equal(readWeek(null), null);
  assert.equal(readWeek({ days: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null } }), null);
  assert.equal(isoWeekday(SAT), 6);
  assert.equal(worksOn(SAT, week), false);
  assert.equal(worksOn(FRI, week), true);
  assert.equal(worksOn(SAT, null), true, "until the agent saves a week, ONE MOVE plans every day");
  assert.equal(nextWorkingDay(SAT, week), "2026-10-19");
  assert.equal(nextWorkingDay(FRI, week), "2026-10-19");
  assert.equal(nextWorkingDay(SAT, null), "2026-10-18");
  assert.equal(startWords("09:00"), "9:00");
  assert.equal(startWords("13:30"), "1:30 pm");
});

test("Saturday 07:40, a day off: no working hours today, see Monday's plan, never over", () => {
  const s = dayStart({ date: SAT, now: "07:40", hours, week });
  assert.equal(s.kind, "off");
  assert.ok(s.kind === "off");
  assert.equal(s.line, "No working hours today (Saturday)");
  assert.equal(s.button, "See Monday's plan");
  assert.equal(s.nextDate, "2026-10-19");
  assert.equal(dayIsDone("07:40", hours, 0, 5, true), false);
  assert.equal(dayIsDone("19:00", hours, 0, 5, true), false);
  // ONE MOVE's day answer for a day off: hours null, day_off true
  const d = readDay({ date: SAT, hours: null, day_off: true, busy: [], blocks: [] })!;
  assert.equal(d.dayOff, true);
  assert.equal(dayStart({ date: SAT, now: "07:40", hours: d.hours, dayOff: d.dayOff }).kind, "off");
  assert.equal(planState({ approvedAt: null, sent: null, blocks: 0, off: true }), "off");
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE GO", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const g = withPlanNode(base, null, "off");
  const orb = g.nodes.find((n) => n.id === "go-plan")!;
  assert.equal(orb.status, "healthy");
  assert.ok(!/over/.test(orb.summary ?? ""));
});

test("a weekday at 07:40: your day starts at 9:00, never over", () => {
  const s = dayStart({ date: FRI, now: "07:40", hours, week });
  assert.deepEqual(s, { kind: "before", line: "Your day starts at 9:00" });
  // nothing planned yet and leftovers waiting for tomorrow: still not over before the start
  assert.equal(dayIsDone("07:40", hours, 0, 5), false);
  // no week known (the default: every day 8:00 to 5:30), a Saturday at 07:40 is a working day not begun
  assert.deepEqual(dayStart({ date: SAT, now: "07:40", hours: { start: "08:00", end: "17:30" }, week: null }), { kind: "before", line: "Your day starts at 8:00" });
});

test("a weekday at 18:00: the day is over (the words for that stay)", () => {
  assert.deepEqual(dayStart({ date: FRI, now: "18:00", hours, week }), { kind: "on" });
  assert.equal(dayIsDone("18:00", hours, 2, 0), true);
  assert.equal(dayIsDone("12:00", hours, 0, 3), true, "under way, nothing left today and something waits: done");
  assert.equal(readDay({ date: FRI, hours, busy: [], blocks: [] })!.dayOff, false);
});
