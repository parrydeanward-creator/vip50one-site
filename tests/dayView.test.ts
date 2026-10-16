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

// ---- Plan my day audit 3.1.2 (Parry, 16 Oct): one count for "moves to tomorrow" on every screen --------------------

test("3.1.2 the ONE panel, the Now pill, Your day and the Day Clock read one 'moves to tomorrow' list", async () => {
  const { withTomorrow } = await import("../lib/dayView.ts");
  const { DAY_OVER_WHY: DAY_OVER } = await import("../lib/schedule.ts");
  const hours = { start: "08:00", end: "17:30" };
  // Your day at 9:23pm: 8 rows, 2 of them fixed appointments (which never move) and 1 done
  const slots = [s("a", "09:00", 10), s("b", "09:10", 10), s("lunch", "12:30", 60, "meeting"), s("c", "13:30", 10, "follow_up"), s("d", "14:00", 10, "text"), s("e", "15:00", 10, "call", true), s("mtg", "16:00", 30, "meeting"), s("f", "16:30", 10)];
  // the Day Clock's plan could not fit 6 items: 2 of them are rows of Your day, 4 are not (commitments, carried work)
  const it = (ref: string) => ({ item: { ref, product: "go" as const, kind: "call" as const, title: `Item ${ref}`, contactId: null, link: null, minutes: 10, done: false }, why: DAY_OVER });
  const later = [it("a"), it("d"), it("cm:1"), it("cm:2"), it("x"), it("y")];
  const { rows, tomorrow } = withTomorrow(slideSlots(slots, "21:23", hours), later, "21:23", hours);
  const groups = groupRows(rows);
  const pill = nowStrip(groups, "21:23", hours);
  const tomorrowGroup = groups.find((g) => g.key === "tomorrow")!;
  // a, b, c, d, f (undone work rows) + cm:1, cm:2, x, y: 9, each once; the done row and the two appointments stay out
  assert.equal(tomorrow.length, 9);
  assert.deepEqual(new Set(tomorrow.map((t) => t.ref)), new Set(["a", "b", "c", "d", "f", "cm:1", "cm:2", "x", "y"]));
  assert.equal(tomorrowGroup.rows.length, tomorrow.length, "Your day's Tomorrow group");
  assert.equal(pill, `Day done · ${tomorrow.length} move to tomorrow`, "the Now pill");
  assert.ok(tomorrow.every((t) => t.why === DAY_OVER), "after hours every reason is that the day is over");
});

test("3.1.2 during the day: what the plan cannot fit leaves today on Your day too, so the counts still agree", async () => {
  const { withTomorrow } = await import("../lib/dayView.ts");
  const hours = { start: "08:00", end: "17:30" };
  const slots = [s("a", "10:00", 10), s("b", "10:10", 10), s("c", "10:20", 10)];
  const later = [{ item: { ref: "c", product: "move" as const, kind: "call" as const, title: "Call c", contactId: null, link: null, minutes: 10, done: false }, why: "Today is full: this keeps the day doable." }];
  const { rows, tomorrow } = withTomorrow(slideSlots(slots, "10:00", hours), later, "10:00", hours);
  const groups = groupRows(rows);
  assert.deepEqual(tomorrow.map((t) => t.ref), ["c"]);
  assert.equal(groups.find((g) => g.key === "tomorrow")!.rows.length, 1);
  assert.equal(nowStrip(groups, "10:00", hours), "Now: Power Hour · 2 calls (until 10:20am)");
  assert.equal(tomorrow[0].why, "Today is full: this keeps the day doable.", "the plan's own reason is kept when it is true");
});

test("3.1.9 the day is done after its working hours, or when nothing is left today and something waits for tomorrow", async () => {
  const { dayIsDone } = await import("../lib/dayView.ts");
  const hours = { start: "08:00", end: "17:30" };
  assert.equal(dayIsDone("21:23", hours, 3, 0), true);
  assert.equal(dayIsDone("17:30", hours, 0, 0), true);
  assert.equal(dayIsDone("14:00", hours, 0, 2), true);
  assert.equal(dayIsDone("14:00", hours, 0, 0), false, "a new agent with nothing planned still sees today");
  assert.equal(dayIsDone("14:00", hours, 2, 4), false);
  assert.equal(dayIsDone(null, hours, 0, 4), false, "before the clock starts in the browser");
});
