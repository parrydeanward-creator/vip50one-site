import { test } from "node:test";
import assert from "node:assert/strict";
import { floor5, groupHead, groupName, groupRows, nowStrip, slideSlots } from "../lib/dayView.ts";
import type { Slot } from "../lib/day.ts";

const s = (id: string, start: string, minutes: number, kind = "call", done = false): Slot =>
  ({ id, nodeId: "move", product: "move", kind, what: id, minutes, start, end: "", done } as unknown as Slot);

test("always on time: a passed row moves up to now and says where it came from; the top undone row is now", () => {
  const rows = slideSlots([s("a", "13:35", 10, "call", true), s("b", "13:45", 10), s("c", "14:40", 10)], "14:37");
  assert.equal(rows[0].start, "13:35"); // done keeps its time
  assert.deepEqual([rows[1].start, rows[1].movedFrom, rows[1].isNow], ["14:35", "13:45", true]);
  assert.deepEqual([rows[2].start, rows[2].movedFrom, rows[2].isNow], ["14:45", null, false]);
  // no row that is not done ever shows above now
  assert.ok(rows.filter((r) => !r.done).every((r) => r.start >= "14:35"));
});

test("two screens built in the same five minutes give the same first task", () => {
  const slots = [s("b", "13:45", 10), s("c", "14:40", 10)];
  assert.deepEqual(slideSlots(slots, "14:36")[0], slideSlots(slots, "14:39")[0]);
  assert.equal(floor5("14:39"), "14:35");
});

test("blocks are named for what is in them: Power Hour only for a run of calls", () => {
  assert.equal(groupName([s("a", "10:00", 5), s("b", "10:05", 5), s("c", "10:10", 5), s("d", "10:15", 5)]), "Power Hour · 4 calls");
  assert.equal(groupName([s("a", "10:00", 5, "follow_up"), s("b", "10:05", 5, "follow_up")]), "2 tasks");
  const g = groupRows(slideSlots([s("x", "14:35", 10, "follow_up"), s("y", "14:45", 10, "follow_up"), s("z", "14:55", 10)], "14:35"));
  assert.equal(groupHead(g[0]), "Now · 2:35pm to 2:55pm · 2 tasks");
  assert.equal(nowStrip(g), "Now: 2 tasks (until 2:55pm)");
});

test("a fixed appointment never moves, even once its time has passed", () => {
  const rows = slideSlots([s("lunch", "12:30", 60, "meeting"), s("b", "13:45", 10)], "16:05");
  assert.deepEqual([rows[0].start, rows[0].movedFrom], ["12:30", null]);
  assert.deepEqual([rows[1].start, rows[1].movedFrom, rows[1].isNow], ["16:05", "13:45", true]);
});

test("no calls at night: past the end of the working day rows move to tomorrow (walker 14 Oct, Parry approved)", () => {
  const hours = { start: "08:00", end: "17:30" };
  const rows = slideSlots([s("a", "09:00", 10), s("b", "09:10", 10), s("c", "09:20", 10)], "20:35", hours);
  assert.ok(rows.every((r) => r.tomorrow && !r.isNow));
  const g = groupRows(rows);
  assert.equal(g[0].key, "tomorrow");
  assert.equal(nowStrip(g, "20:35", hours), "Day done · 3 move to tomorrow");
  assert.match(groupHead(g[0]), /^Tomorrow · 3/);
  // late afternoon: what fits stays today, the rest goes to tomorrow
  const late = slideSlots([s("a", "09:00", 20), s("b", "09:20", 20), s("c", "09:40", 20)], "17:00", hours);
  assert.deepEqual(late.map((r) => r.tomorrow), [false, false, true]);
  assert.equal(nowStrip(groupRows(late), "17:00", hours), "Now: Power Hour · 2 calls (until 5:40pm)");
});

test("before the working day: the pill says when today starts", () => {
  const hours = { start: "08:00", end: "17:30" };
  const g = groupRows(slideSlots([s("a", "08:00", 10), s("b", "08:10", 10)], "06:40", hours));
  assert.equal(nowStrip(g, "06:40", hours), "Today starts 8:00am with Power Hour · 2 calls");
});
