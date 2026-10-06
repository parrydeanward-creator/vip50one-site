import { test } from "node:test";
import assert from "node:assert/strict";
import { batches, blockHue, buildDay, busyHue, categoryHue, readDay, freeGaps, HUE, nextLine, readBlock, toMin } from "../lib/schedule.ts";
import type { PlanItem } from "../lib/plan.ts";

const it = (ref: string, x: Partial<PlanItem> = {}): PlanItem => ({ ref, product: "move", kind: "call", title: `Call ${ref}`, contactId: null, link: null, minutes: 10, done: false, urgency: "today", ...x });
const hours = { start: "08:00", end: "17:00" };

test("free time: working hours minus appointments, with 10 minutes either side, and never the past", () => {
  const g = freeGaps(hours, [{ start: "10:00", end: "11:00", title: null, source: "calendar" }], "08:30");
  assert.deepEqual(g, [[toMin("08:30"), toMin("09:50")], [toMin("11:10"), toMin("17:00")]]);
  const own = freeGaps(hours, [{ start: "12:00", end: "13:00", title: "Gym", source: "time_block" }]);
  assert.deepEqual(own[0], [toMin("08:00"), toMin("12:00")], "no buffer round the agent's own blocks");
});

test("calls batch into Power Hours of up to 60 minutes, overdue first", () => {
  const calls = Array.from({ length: 8 }, (_, k) => it(`c${k}`, { urgency: k === 7 ? "alert" : "today" }));
  const g = batches(calls, [toMin("09:00"), toMin("11:00")]);
  assert.deepEqual(g.map((x) => [x.kind, x.items.length]), [["power_hour", 6], ["power_hour", 2]]);
  assert.equal(g[0].items[0].ref, "c7", "the overdue call leads");
  assert.match(g[0].why, /overdue/);
});

test("texts, notes and approvals each get one block", () => {
  const g = batches([it("t1", { kind: "text" }), it("t2", { kind: "text" }), it("n1", { kind: "note", minutes: 5 }), it("a1", { kind: "approval", minutes: 15 })], [540, 660]);
  assert.deepEqual(g.map((x) => x.kind).sort(), ["approvals", "notes", "texts"]);
  assert.equal(g.find((x) => x.kind === "texts")!.minutes, 20);
});

test("the day: Power Hour in the calling window, around the listing appointment, fixed lunch kept", () => {
  const d = buildDay({
    hours,
    busy: [{ start: "09:30", end: "10:30", title: null, source: "listing_appointment" }],
    items: [it("c1"), it("c2"), it("c3"), it("t1", { kind: "text" }), it("lunch", { kind: "meeting", title: "Lunch with Marcus", minutes: 60, at: "12:30" })],
    bestCalls: { start: "09:00", end: "11:00" },
  });
  const ph = d.blocks.find((b) => b.kind === "power_hour")!;
  assert.ok(toMin(ph.end) <= toMin("09:20") || toMin(ph.start) >= toMin("10:40"), "never inside the appointment or its buffer");
  assert.ok(toMin(ph.start) >= toMin("09:00") && toMin(ph.start) <= toMin("11:00"), "in the calling window");
  assert.ok(d.blocks.some((b) => b.start === "12:30" && b.refs[0] === "lunch"), "the fixed lunch keeps its time");
  assert.equal(d.later.length, 0);
});

test("honest load: never more than 85% of the free time; the rest moves to tomorrow with a reason", () => {
  const many = Array.from({ length: 30 }, (_, k) => it(`x${k}`, { kind: "other", title: `Task ${k}`, minutes: 30 }));
  const d = buildDay({ hours: { start: "09:00", end: "12:00" }, busy: [], items: many });
  assert.ok(d.plannedMin <= d.freeMin * 0.85);
  assert.ok(d.later.length > 0);
  assert.match(d.later[0].why, /full|gap/);
});

test("Now and Next", () => {
  const blocks = [
    { id: "a", start: "09:00", end: "10:00", kind: "power_hour" as const, title: "Power Hour: 6 calls", refs: [], why: "", done: false },
    { id: "b", start: "13:00", end: "13:20", kind: "texts" as const, title: "Texts", refs: [], why: "", done: false },
  ];
  assert.equal(nextLine(blocks, "09:15"), "Now: Power Hour: 6 calls (until 10:00am)");
  assert.equal(nextLine(blocks, "12:48"), "Next: Texts in 12 min");
  assert.equal(nextLine(blocks, "11:00"), "Next: Texts at 1:00pm");
  assert.equal(nextLine(blocks, "14:00"), null);
});

test("a block in plain words", () => {
  assert.deepEqual(readBlock("Gym 6 to 7 every weekday"), { title: "Gym", start: "06:00", end: "07:00", repeat: "weekdays" });
  assert.deepEqual(readBlock("Lunch with Marcus 12:30"), { title: "Lunch with Marcus", start: "12:30", end: "13:30", repeat: "none" });
  assert.deepEqual(readBlock("School pickup 3:15-3:45 every day"), { title: "School pickup", start: "15:15", end: "15:45", repeat: "daily" });
  assert.deepEqual(readBlock("Team meeting 9am-10am"), { title: "Team meeting", start: "09:00", end: "10:00", repeat: "none" });
  assert.equal(readBlock("call mom"), null);
});

test("the chime rings five minutes before and at the start, once each, never for done blocks", async () => {
  const { dueChimes } = await import("../lib/chime.ts");
  const b = [{ id: "a", start: "09:00", done: false }, { id: "b", start: "09:03", done: true }];
  assert.deepEqual(dueChimes(b, 8 * 60 + 56, new Set()).map((x) => x.key), ["a:soon"]);
  assert.deepEqual(dueChimes(b, 8 * 60 + 57, new Set(["a:soon"])), []);
  assert.deepEqual(dueChimes(b, 9 * 60, new Set(["a:soon"])).map((x) => x.key), ["a:start"]);
});

test("reading §3o.2: checked rows only, titles kept private when null, sorted", async () => {

  const d = readDay({
    date: "2026-10-06",
    hours: { start: "07:30", end: "18:00" },
    busy: [{ start: "10:00", end: "11:00", source: "calendar", title: null }, { start: "12:00", end: "11:00" }, { start: "14:00", end: "14:45", source: "showing", title: "Showing" }],
    blocks: [{ id: "b2", start: "13:00", end: "13:20", kind: "texts", title: "Texts", refs: ["x"], why: "One sitting.", done: false, moved_from: "09:00" }, { id: "b1", start: "08:00", end: "09:00", kind: "dance", title: "Calls", refs: [1, "a"] }, { id: "bad" }],
    approved_at: null,
  });
  assert.ok(d);
  assert.deepEqual(d!.hours, { start: "07:30", end: "18:00" });
  assert.equal(d!.busy.length, 2, "an end before its start is dropped");
  assert.equal(d!.busy[0].title, null);
  assert.deepEqual(d!.blocks.map((b) => b.id), ["b1", "b2"]);
  assert.equal(d!.blocks[0].kind, "task", "an unknown kind is a task");
  assert.deepEqual(d!.blocks[0].refs, ["a"]);
  assert.equal(d!.blocks[1].movedFrom, "09:00");
  assert.equal(readDay({ hours: {} }), null);
  assert.deepEqual(readDay({ date: "2026-10-06", hours: { start: "18:00", end: "08:00" } })!.hours, { start: "08:00", end: "17:30" }, "nonsense hours fall back");
});

test("the agent's own blocks: one-offs on their day, weekday ones Monday to Friday from the day set", async () => {
  const { customsOn } = await import("../lib/schedule.ts");
  const all = [
    { id: "1", title: "Lunch", start: "12:30", end: "13:30", repeat: "none" as const, date: "2026-10-06" },
    { id: "2", title: "Gym", start: "06:00", end: "07:00", repeat: "weekdays" as const, date: "2026-10-06" },
    { id: "3", title: "Walk", start: "18:00", end: "18:30", repeat: "daily" as const, date: "2026-10-07" },
  ];
  assert.deepEqual(customsOn(all, "2026-10-06").map((c) => c.id), ["1", "2"]);
  assert.deepEqual(customsOn(all, "2026-10-10").map((c) => c.id), ["3"], "Saturday: no gym");
  assert.deepEqual(customsOn(all, "2026-10-05").map((c) => c.id), [], "nothing before it was set");
});

test("a block the agent adds is planned round, like an appointment", async () => {
  const { buildDay, customItem } = await import("../lib/schedule.ts");
  const lunch = customItem({ id: "l", title: "Lunch with Marcus", start: "12:30", end: "13:30", repeat: "none" });
  assert.equal(lunch.minutes, 60);
  const out = buildDay({ hours: { start: "12:00", end: "14:00" }, busy: [], items: [lunch, { ...lunch, ref: "t", at: null, title: "Write the CMA", kind: "other", minutes: 45 }] });
  const lb = out.blocks.find((b) => b.refs[0] === "blk:l")!;
  assert.deepEqual([lb.start, lb.end], ["12:30", "13:30"]);
  assert.ok(out.later.some((x) => x.item.ref === "t"), "45 minutes does not fit in the half hours round lunch");
});

test("the clock face: the working day once round, a tap reads to the quarter hour", async () => {
  const { angleOf, timeAtPoint, hm, dayPutBody } = await import("../lib/schedule.ts");
  const hours = { start: "08:00", end: "18:00" };
  assert.equal(angleOf("08:00", hours), 0);
  assert.ok(Math.abs(angleOf("13:00", hours) - Math.PI) < 1e-9, "half the day is the bottom");
  assert.equal(timeAtPoint(500, 800, 500, 500, hours), "13:00");
  assert.equal(timeAtPoint(800, 500, 500, 500, hours), "10:30", "a quarter round");
  assert.equal(hm(210), "3h 30m");
  assert.equal(hm(45), "45m");
  assert.equal(hm(120), "2h");
  const b = dayPutBody("2026-10-06", [{ id: "x", start: "08:00", end: "09:00", kind: "power_hour", title: "P", refs: ["a"], why: "w", done: false }]);
  assert.deepEqual(Object.keys(b.blocks[0]).sort(), ["end", "kind", "refs", "start", "title"]);
});

test("the why stays true: approvals that cannot land before noon do not claim to", async () => {
  const { buildDay } = await import("../lib/schedule.ts");
  const a = { ref: "ap", product: "marquee" as const, kind: "approval" as const, title: "Approve 5 posts", contactId: null, link: null, minutes: 15, done: false };
  const late = buildDay({ hours: { start: "08:00", end: "17:00" }, busy: [], items: [a], notBefore: "12:30" });
  assert.equal(late.blocks[0].why, "Posts wait on your approval: first free time today.");
  const early = buildDay({ hours: { start: "08:00", end: "17:00" }, busy: [], items: [a] });
  assert.equal(early.blocks[0].why, "Before posting time, so nothing waits on you.");
});

test("Tell Pulse your day: Parry's own words read into three appointments", async () => {
  const { readOverview } = await import("../lib/overview.ts");
  const t = readOverview("Hey Pulse I have a dr apt this morning form 8:00-9:00. I have a one hour meeting with aaron at 11:00 and a lunch apt at 12:30. plan my other duties or tasks around that schedule.");
  assert.deepEqual(t.map((x) => [x.title, x.start, x.end, x.where]), [
    ["Doctor's appointment", "08:00", "09:00", "out"],
    ["Meeting with Aaron", "11:00", "12:00", "unsure"],
    ["Lunch", "12:30", "13:30", "out"],
  ]);
  assert.deepEqual(readOverview("Plan my day around my calls please"), [], "no time: nothing to plan round");
  assert.deepEqual(readOverview("showing at 2 and a zoom at 4:30 for half an hour").map((x) => [x.start, x.end, x.where]), [["14:00", "14:45", "out"], ["16:30", "17:00", "phone"]]);
});

test("Pulse asks only what it cannot know, one question at a time", async () => {
  const { readOverview, nextQuestion } = await import("../lib/overview.ts");
  const t = readOverview("doctor 8 to 9, meeting with Aaron at 11, lunch at 12:30");
  const q1 = nextQuestion(t, {})!;
  assert.equal(q1.text, "Where are you headed after the doctor, and how long is the drive?");
  const q2 = nextQuestion(t, { t1: { after: { to: "office", min: 30 } } })!;
  assert.equal(q2.kind, "where", "the meeting: office or out?");
  const q3 = nextQuestion(t, { t1: { after: { to: "office", min: 30 } }, t2: { where: "out" } })!;
  assert.equal(q3.options[0].label, "Straight to lunch · 15 min", "half an hour to lunch: going straight comes first");
  assert.equal(nextQuestion(t, { t1: { after: { to: "office", min: 30 } }, t2: { where: "office" }, t3: { after: { to: "office", min: 15 } } }), null, "a meeting at the office needs no drive");
});

test("the drives go round the appointments: 8-9 doctor, 9-9:30 drive to the office", async () => {
  const { readOverview, toldBusy } = await import("../lib/overview.ts");
  const t = readOverview("doctor 8 to 9, meeting with Aaron at 11, lunch at 12:30");
  const b = toldBusy(t, { t1: { after: { to: "office", min: 30 } }, t2: { where: "out", after: { to: "next", min: 15 } }, t3: { after: { to: "office", min: 15 } } }, "08:00");
  assert.deepEqual(b.map((x) => [x.start, x.end, x.title]), [
    ["08:00", "09:00", "Doctor's appointment"],
    ["09:00", "09:30", "Drive to the office"],
    ["10:45", "11:00", "Drive to meeting with Aaron"],
    ["11:00", "12:00", "Meeting with Aaron"],
    ["12:00", "12:15", "Drive to lunch"],
    ["12:30", "13:30", "Lunch"],
    ["13:30", "13:45", "Drive to the office"],
  ]);
});

test("answers in the agent's own words", async () => {
  const { readReply } = await import("../lib/overview.ts");
  const after = { id: "t1", kind: "after" as const, text: "", options: [] };
  assert.deepEqual(readReply(after, "back to the office, about 30 minutes"), { after: { to: "office", min: 30 } });
  assert.deepEqual(readReply(after, "straight to lunch, fifteen"), null, "words for numbers it cannot read: it asks again");
  assert.deepEqual(readReply(after, "home, half an hour"), { after: { to: "home", min: 30 } });
  assert.deepEqual(readReply(after, "I'm done for the day"), { after: { to: "done", min: 0 } });
  assert.deepEqual(readReply({ ...after, kind: "where" }, "it's on zoom"), { where: "phone" });
});

test("the 12-hour face: morning on the inner ring, afternoon on the outer, noon splits", async () => {
  const { faceArcs, faceTimeAt, soundsLikeDay } = await import("../lib/overview.ts");
  const lunch = faceArcs("11:30", "12:30");
  assert.equal(lunch.length, 2);
  assert.deepEqual(lunch.map((x) => x.pm), [false, true]);
  assert.ok(Math.abs(lunch[1].a1) < 1e-9, "the afternoon half starts at the top");
  assert.ok(Math.abs(faceArcs("15:00", "16:00")[0].a1 - Math.PI / 2) < 1e-9, "3 o'clock is to the right");
  assert.equal(faceTimeAt(500, 800, 500, 500, 280), "18:00", "bottom of the outer ring: 6pm");
  assert.equal(faceTimeAt(500, 750, 500, 500, 280), "06:00", "bottom of the inner ring: 6am");
  assert.equal(soundsLikeDay("Hey Pulse I have a dr apt from 8-9, plan around that"), true);
  assert.equal(soundsLikeDay("Who should I call today?"), false);
});

test("ONE MOVE's live day: told appointments, drives and other calendars come back as busy", async () => {

  const d = readDay({
    date: "2026-10-06",
    hours: { start: "08:00", end: "17:30" },
    busy: [
      { start: "08:00", end: "09:00", source: "fixed", title: "Doctor's appointment" },
      { start: "09:00", end: "09:30", source: "travel", title: "Drive to the office" },
      { start: "15:00", end: "16:00", source: "calendar", title: null },
    ],
    blocks: [],
    load: { planned_min: 0, free_min: 300 },
    approved_at: null,
  });
  assert.deepEqual(d!.busy.map((b) => b.source), ["fixed", "travel", "calendar"]);
  assert.equal(d!.busy[2].title, null, "other calendars stay busy-only");
  assert.equal(d!.approvedAt, null);
});

test("telling Pulse more later: adds, moves and cancels, and keeps what was not mentioned", async () => {
  const { readOverview, mergeTold, carryAnswers } = await import("../lib/overview.ts");
  const morning = readOverview("doctor 8 to 9, meeting with Aaron at 11, lunch at 12:30");
  const added = mergeTold(morning, "I also have a showing at 3");
  assert.deepEqual(added.map((t) => [t.title, t.start]), [["Doctor's appointment", "08:00"], ["Meeting with Aaron", "11:00"], ["Lunch", "12:30"], ["Showing", "15:00"]]);
  assert.equal(added[3].id, "t4", "a new id, never one already used");
  const moved = mergeTold(added, "move my meeting with Aaron to 1:30 for an hour");
  assert.deepEqual(moved.find((t) => t.title === "Meeting with Aaron")!.start, "13:30");
  const both = mergeTold(morning, "I also have a showing at 3, and the lunch is cancelled");
  assert.deepEqual(both.map((t) => t.title), ["Doctor's appointment", "Meeting with Aaron", "Showing"], "one sentence can add one and cancel another");
  const cancelled = mergeTold(moved, "the lunch is cancelled");
  assert.ok(!cancelled.some((t) => t.title === "Lunch"));
  assert.equal(cancelled.length, 3);
  const answers = carryAnswers(morning, { t1: { after: { to: "office" as const, min: 30 } }, t2: { where: "out" as const } }, moved);
  assert.deepEqual(answers.t1, { after: { to: "office", min: 30 } }, "the doctor's drive answer stays");
  assert.deepEqual(answers.t2, { where: "out" }, "Aaron moved, and still out of the office");
});

test("colour by kind: work by block kind, appointments by their words", () => {
  assert.equal(blockHue("power_hour"), "calls");
  assert.equal(blockHue("texts"), "texts");
  assert.equal(blockHue("custom"), "tasks");
  assert.equal(busyHue({ source: "travel", title: "Drive" }), "drive");
  assert.equal(busyHue({ source: "showing", title: null }), "client");
  assert.equal(busyHue({ source: "fixed", title: "Lunch with Matt" }), "meal");
  assert.equal(busyHue({ source: "fixed", title: "Doctor" }), "personal");
  assert.equal(busyHue({ source: "fixed", title: "Team meeting" }), "meeting");
  assert.equal(busyHue({ source: "fixed", title: "Showing at 1482 Maple" }), "client");
  assert.equal(busyHue({ source: "fixed", title: "Luxury Agency" }), "meeting");
  assert.equal(busyHue({ source: "calendar", title: null }), "busy");
  for (const h of Object.values(HUE)) assert.match(h.color, /^#[0-9a-f]{6}$/);
});

test("colour by MOVE/GO category first, then the words", () => {
  assert.equal(categoryHue("revenue"), "calls");
  assert.equal(categoryHue("Travel"), "drive");
  assert.equal(categoryHue("nope"), null);
  assert.equal(busyHue({ source: "time_block", title: "Client & Pipeline Work", category: "clients" }), "client");
  assert.equal(busyHue({ source: "time_block", title: "Admin & CRM Update", category: "admin" }), "tasks");
  assert.equal(busyHue({ source: "time_block", title: "Lunch", category: "personal" }), "meal");
  assert.equal(busyHue({ source: "time_block", title: "exercise", category: "personal" }), "personal");
  assert.equal(busyHue({ source: "fixed", title: "Team meeting", category: "Appointment" }), "meeting");
});

test("the day from MOVE keeps each busy item's category", () => {
  const d = readDay({ date: "2026-10-06", busy: [{ start: "09:00", end: "10:00", title: "Calls (2)", source: "time_block", category: "revenue" }] });
  assert.equal(d?.busy[0].category, "revenue");
});
