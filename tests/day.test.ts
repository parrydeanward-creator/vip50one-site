import { test } from "node:test";
import assert from "node:assert/strict";
import { demoGraph } from "../lib/graph/demo.ts";
import { indexGraph } from "../lib/graph/model.ts";
import { clock, completedBy, duration, isEvening, planDay, recap, type DayItem } from "../lib/day.ts";

const g = demoGraph("complete");
const ix = indexGraph(g);
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

test("today is planned in order, nothing overlaps, fixed times keep their place", () => {
  const slots = planDay(g.today!);
  assert.equal(slots.length, g.today!.length);
  for (let i = 1; i < slots.length; i++) assert.ok(toMin(slots[i].start) >= toMin(slots[i - 1].end), `${slots[i - 1].id} runs into ${slots[i].id}`);
  assert.equal(slots.find((s) => s.id === "day-marcus")!.start, "12:30");
  assert.equal(slots[0].kind, "call", "people first");
  assert.equal(slots[0].start, "08:00");
  assert.equal(slots.at(-1)!.kind, "follow_up");
});

test("every item points at a real node the agent has", () => {
  for (const d of g.today!) assert.ok(ix.byId.has(d.nodeId), d.id);
  const rel = demoGraph("relationship");
  assert.ok(rel.today!.every((d) => d.product === "go" || d.product === "move"));
});

test("a flexible item never lands on a fixed one", () => {
  const items: DayItem[] = [
    { id: "lunch", nodeId: "x", product: "move", kind: "meeting", what: "", minutes: 60, at: "08:00" },
    { id: "call", nodeId: "x", product: "move", kind: "call", what: "", minutes: 10 },
  ];
  const s = planDay(items);
  assert.equal(s.find((x) => x.id === "call")!.start, "09:00");
});

test("the recap counts done, VIP touches, time left and what carries to tomorrow", () => {
  const done = new Set(["day-jen", "day-approve", "day-marcus"]);
  const r = recap(planDay(g.today!, done));
  assert.equal(r.done, 3);
  assert.equal(r.vipTouches, 2, "Jen and Marcus are VIP touches; approving posts is not");
  assert.equal(r.carry.length, g.today!.length - 3);
  assert.equal(r.minutesLeft, r.carry.reduce((t, s) => t + s.minutes, 0));
});

test("ONE watching: a live signal completes the item it is about", () => {
  assert.deepEqual(completedBy(g.today!, "sig-go"), ["day-jen"]);
  assert.deepEqual(completedBy(g.today!, "nothing"), []);
});

test("evening is Mountain time; labels", () => {
  assert.equal(isEvening(new Date("2026-09-30T22:59:00Z")), false, "4:59 pm MT");
  assert.equal(isEvening(new Date("2026-09-30T23:00:00Z")), true, "5:00 pm MT");
  assert.equal(clock("08:00"), "8:00am");
  assert.equal(clock("12:30"), "12:30pm");
  assert.equal(clock("16:05"), "4:05pm");
  assert.equal(duration(45), "45 min");
  assert.equal(duration(80), "1 h 20 min");
});
