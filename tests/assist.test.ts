import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, assistNow, commitmentWork, slide, weekdaysLeft } from "../lib/assist.ts";
import type { Block, Busy } from "../lib/schedule.ts";
import type { Commitments } from "../lib/commitments.ts";

const hours = { start: "08:00", end: "17:30" };
const blk = (id: string, start: string, end: string, extra: Partial<Block> = {}): Block => ({ id, start, end, kind: "power_hour", title: "Power Hour", refs: [id], why: "", done: false, ...extra });

test("slide: a missed block moves to the next free gap and the agent is told", () => {
  const busy: Busy[] = [{ start: "13:00", end: "14:00", title: "Showing", source: "showing" }];
  const r = slide([blk("a", "09:00", "10:00"), blk("b", "12:30", "12:45", { kind: "texts", title: "Texts" })], busy, hours, "12:20");
  assert.deepEqual(r.moved.map((m) => [m.title, m.from, m.to]), [["Power Hour", "09:00", "14:10"]]);
  assert.equal(r.note, "Moved Power Hour to 2:10pm.");
  assert.equal(r.blocks.find((b) => b.id === "a")!.movedFrom, "09:00");
});

test("slide: done and fixed blocks never move; what can't fit goes to tomorrow", () => {
  const r = slide([blk("a", "09:00", "10:00", { done: true }), blk("c", "09:00", "09:30", { kind: "custom", title: "Gym" }), blk("d", "10:00", "11:00")], [], hours, "17:00");
  assert.equal(r.moved.length, 0);
  assert.deepEqual(r.tomorrow.map((b) => b.id), ["d"]);
  assert.equal(r.note, "Moved Power Hour to tomorrow.");
  assert.equal(slide([blk("a", "09:00", "10:00")], [], hours, "08:30").note, null);
});

const cm = (items: { kind: string; target: number | null; count: number | null; result?: string | null }[]): Commitments => ({
  today: "2026-10-07",
  due: null,
  week: { id: "w", starts: "2026-10-05", setAt: "2026-10-05", checkedAt: null, items: items.map((x, k) => ({ id: `i${k}`, text: "t", kind: x.kind as never, target: x.target, count: x.count, result: (x.result ?? null) as never, note: null })) },
  weekend: null,
  lastWeek: null,
  keepRate8w: null,
  streak: 0,
});

test("commitmentWork: the week's commitments become today's share (Wednesday: three weekdays left)", () => {
  assert.equal(weekdaysLeft("2026-10-07"), 3);
  assert.equal(weekdaysLeft("2026-10-10"), 0);
  const w = commitmentWork(cm([{ kind: "call", target: 15, count: 6 }, { kind: "face_to_face", target: 2, count: 0 }, { kind: "yes_no", target: null, count: null }, { kind: "call", target: 5, count: 5 }]), "2026-10-07");
  assert.deepEqual(w.map((p) => p.title), ["Calls: 3 today, 9 to go this week (commitment)", "Face-to-faces: 1 today, 2 to go this week (commitment)"]);
  assert.equal(w[0].kind, "call");
  assert.equal(w[0].minutes, 18);
  assert.deepEqual(commitmentWork(cm([{ kind: "call", target: 15, count: 0 }]), "2026-10-10"), [], "nothing on a weekend");
});

test("assistNow: leave by, then prep, for what is coming", () => {
  const busy: Busy[] = [
    { start: "09:40", end: "10:00", title: "Drive", source: "travel" },
    { start: "10:00", end: "11:00", title: "Listing appointment, 418 Oak Lane", source: "listing_appointment" },
  ];
  const a = assistNow({ date: "2026-10-07", now: "09:35", hours, busy, blocks: [], later: [] });
  assert.equal(a[0].title, "Leave by 9:40am for Listing appointment, 418 Oak Lane");
  assert.equal(a[1].title, "Next: Listing appointment, 418 Oak Lane at 10:00am");
  assert.match(a[1].lines.join(" "), /MLS/);
});

test("assistNow: how did it go, once, with a thank-you block tomorrow", () => {
  const busy: Busy[] = [{ start: "10:00", end: "11:00", title: "Coffee with Marcus", source: "fixed" }];
  const a = assistNow({ date: "2026-10-07", now: "11:30", hours, busy, blocks: [], later: [] }).find((x) => x.kind === "howgo")!;
  assert.equal(a.title, "How did Coffee with Marcus go?");
  assert.deepEqual(a.action!.block, { title: "Thank-you text: Coffee with Marcus", start: "09:00", end: "09:15", date: "2026-10-08" });
  assert.equal(assistNow({ date: "2026-10-07", now: "11:30", hours, busy, blocks: [], later: [], answered: new Set([a.key]) }).filter((x) => x.kind === "howgo").length, 0);
});

test("assistNow: a short gap gets one suggestion; a birthday a week out gets a card errand two days before", () => {
  const busy: Busy[] = [{ start: "10:30", end: "12:00", title: "Team meeting", source: "calendar" }];
  const a = assistNow({ date: "2026-10-07", now: "09:50", hours, busy, blocks: [], later: [], vipsNoVideo: 12, dated: [{ id: "p-jen", product: "move", at: "2026-10-12T12:00:00Z", what: "Jen's birthday" }] });
  const gap = a.find((x) => x.kind === "gap")!;
  assert.equal(gap.title, "30m free at 9:50am");
  assert.match(gap.lines[0], /6 video texts/);
  const ahead = a.find((x) => x.kind === "ahead")!;
  assert.equal(ahead.title, "Jen's birthday in 5 days");
  assert.equal(ahead.action!.block.date, addDays("2026-10-12", -2));
});

test("assistNow: the day's wrap near the end of the day", () => {
  const a = assistNow({ date: "2026-10-07", now: "17:10", hours, busy: [], blocks: [blk("a", "09:00", "10:00", { done: true }), blk("b", "15:00", "15:20", { title: "Texts", kind: "texts" })], later: [] });
  const w = a.find((x) => x.kind === "wrap")!;
  assert.deepEqual(w.lines, ["1 of 2 blocks done.", "Left: Texts."]);
});
