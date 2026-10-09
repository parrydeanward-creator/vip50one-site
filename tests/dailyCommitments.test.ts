import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import {
  WEEK_NODE, applyDailySet, applyDailyTick, dailyDoneUrl, dailyUrl, dailyWords, dayTickable, daysKept, demoCommitments, readCommitments, readDaily, setDailyBody, withWeekNode,
  type Commitments,
} from "../lib/commitments.ts";
import { commitmentWork } from "../lib/assist.ts";

// 5 Oct 2026 is a Monday; 8 Oct a Thursday
const week = (done: boolean[], due = [true, true, true, true, true, false, false]) =>
  ["05", "06", "07", "08", "09", "10", "11"].map((d, k) => ({ day: `2026-10-${d}`, due: due[k], done: done[k] ?? false }));

const answer = {
  today: "2026-10-08",
  due: null,
  week: null,
  weekend: null,
  daily: {
    items: [
      { id: "a", text: "Five calls before 10", kind: "call", target: 5, days: "weekdays", today: { due: true, done: false, count: 2 }, week: week([true, false, true]) },
      { id: "b", text: "Walk", kind: "yes_no", target: 9, days: "every_day", today: { due: true, done: true, count: 4 }, week: week([true, true, true, true], [true, true, true, true, true, true, true]) },
      { id: "c", text: "", kind: "yes_no" },
      { id: "d", text: "Odd kind", kind: "juggling", target: 2, days: "monthly", today: {}, week: [] },
    ],
    today: { due: 2, done: 1 },
    week: { due: 8, done: 6 },
    last_week: null,
  },
};

test("urls: the §3n.6 routes", () => {
  assert.equal(dailyUrl, "https://move.vip50one.com/api/brain/commitments/daily");
  assert.equal(dailyDoneUrl, "https://move.vip50one.com/api/brain/commitments/daily/done");
});

test("reading §3n.6: checked; empty text dropped; unknown kind is yes or no; unknown days are weekdays", () => {
  const c = readCommitments(answer)!;
  const d = c.daily!;
  assert.deepEqual(d.items.map((i) => i.id), ["a", "b", "d"]);
  assert.deepEqual([d.items[1].target, d.items[1].today.count], [null, null], "yes or no has no number");
  assert.deepEqual([d.items[2].kind, d.items[2].days, d.items[2].target], ["yes_no", "weekdays", null]);
  assert.deepEqual(d.today, { due: 2, done: 1 });
  assert.equal(d.lastWeek, null);
  assert.equal(readCommitments({ today: "2026-10-08" })!.daily, null, "ONE MOVE before daily: none");
  assert.equal(readDaily({ items: "x" }), null);
});

test("words: today's count, and days kept this week up to today", () => {
  const d = readCommitments(answer)!.daily!;
  assert.equal(dailyWords(d), "1 of 2 daily commitments done today");
  assert.equal(daysKept(d.items[0], "2026-10-08"), "2 of 4 days");
  assert.equal(dailyWords({ ...d, today: { due: 2, done: 2 } }), "Every daily commitment done today");
  assert.equal(dailyWords({ ...d, items: [], today: { due: 0, done: 0 } }), "No daily commitments yet");
});

test("ticks: today or earlier this week while due; never ahead, never a day it was not due", () => {
  const c = readCommitments(answer)!;
  const a = c.daily!.items[0];
  assert.equal(dayTickable(a.week[1], c.today), true, "Tuesday, caught up");
  assert.equal(dayTickable(a.week[4], c.today), false, "Friday is ahead");
  assert.equal(dayTickable(a.week[5], c.today), false, "Saturday not due");
  const t = applyDailyTick(c, "a", "2026-10-08", true);
  assert.equal(t.daily!.items[0].today.done, true);
  assert.deepEqual(t.daily!.today, { due: 2, done: 2 });
  const back = applyDailyTick(t, "a", "2026-10-06", true);
  assert.equal(back.daily!.items[0].week[1].done, true);
  assert.equal(applyDailyTick(c, "a", "2026-10-09", true), c, "ahead: refused");
  assert.equal(applyDailyTick(c, "nope", "2026-10-08", true), c);
});

test("ticks never touch the weekly keep rate or streak", () => {
  const c = { ...demoCommitments("2026-10-08") };
  const t = applyDailyTick(c, c.daily!.items[0].id, c.today, true);
  assert.deepEqual([t.keepRate8w, t.streak, t.week], [c.keepRate8w, c.streak, c.week]);
});

test("setting: 0 to 5; counted ones need a number; blanks dropped; the body is §3n.6", () => {
  const six = Array.from({ length: 6 }, (_, k) => ({ text: `d${k}`, kind: "yes_no" as const, target: null, days: "weekdays" as const }));
  assert.deepEqual(setDailyBody(six), { error: "Up to 5 daily commitments." });
  assert.deepEqual(setDailyBody([{ text: "Calls", kind: "call", target: 0, days: "weekdays" }]), { error: 'Give "Calls" a number from 1 to 100.' });
  assert.deepEqual(setDailyBody([{ text: "  ", kind: "yes_no", target: null, days: "weekdays" }]), { items: [] }, "an empty list clears them");
  assert.deepEqual(setDailyBody([{ text: " Walk ", kind: "yes_no", target: 3, days: "every_day" }]), { items: [{ text: "Walk", kind: "yes_no", target: null, days: "every_day" }] });
});

test("the example agent's set keeps an unchanged item's ticks and starts a new one today", () => {
  const c = readCommitments(answer)!;
  const n = applyDailySet(c, [{ text: "Walk", kind: "yes_no", target: null, days: "every_day" }, { text: "Read my list", kind: "yes_no", target: null, days: "weekdays" }]);
  assert.equal(n.daily!.items[0].id, "b");
  const fresh = n.daily!.items[1];
  assert.deepEqual(fresh.week.map((w) => w.due), [false, false, false, true, true, false, false]);
  assert.equal(fresh.today.due, true);
});

const g = (): { nodes: GraphNode[]; edges: GraphEdge[] } => ({
  nodes: [
    { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
    { id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 },
  ],
  edges: [],
});

test("This week orb: yellow while a daily commitment is undone today, green once all are; a due step still wins", () => {
  const c = readCommitments(answer)!;
  const n = withWeekNode(g(), c, 10).nodes.find((x) => x.id === WEEK_NODE)!;
  assert.deepEqual([n.status, n.secondaryLabel], ["attention", "1 of 2 daily commitments done today"]);
  assert.deepEqual(n.stats, [{ label: "Today", value: "1 / 2" }]);
  const all = applyDailyTick(c, "a", c.today, true);
  assert.equal(withWeekNode(g(), all, 10).nodes.find((x) => x.id === WEEK_NODE)!.status, "healthy");
  const late: Commitments = { ...c, today: "2026-10-06", due: "set_week" };
  assert.equal(withWeekNode(g(), late, 10).nodes.find((x) => x.id === WEEK_NODE)!.status, "action");
});

test("today's work: a counted daily commitment's rest of today, until ticked", () => {
  const c = readCommitments(answer)!;
  assert.deepEqual(commitmentWork(c, c.today).map((p) => p.title), ["Calls: 3 today (daily commitment)"]);
  assert.deepEqual(commitmentWork(applyDailyTick(c, "a", c.today, true), c.today), []);
});

test("demo: three daily ones, today still to tick", () => {
  const d = demoCommitments("2026-10-08").daily!;
  assert.equal(d.items.length, 3);
  assert.equal(d.today.done, 0);
  assert.ok(d.week.done > 0);
});
