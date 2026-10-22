import { test } from "node:test";
import assert from "node:assert/strict";
import { batches, blockHue, buildDay, busyHue, categoryHue, readDay, freeGaps, HUE, nextLine, readBlock, toMin, type Block } from "../lib/schedule.ts";
import type { PlanItem } from "../lib/plan.ts";

// one of the day's VIP touches unless the test says otherwise (19 Oct: only those go in the Power Hour, which is ONE
// MOVE's from 22 Oct: the Brain plans round it and never builds one)
const it = (ref: string, x: Partial<PlanItem> = {}): PlanItem => ({ ref, product: "move", kind: "call", title: `Call ${ref}`, contactId: null, link: null, minutes: 10, done: false, urgency: "today", vip: true, ...x });
const hours = { start: "08:00", end: "17:00" };
// ONE MOVE's one Power Hour, as GET /api/brain/day sends it (vip50-web-crm#371), read by the Brain's reader
const movePower = (start: string, end: string, refs: string[]): Block =>
  readDay({ date: "2026-10-22", hours: { start: "08:00", end: "17:00" }, busy: [], blocks: [{ id: "ph1", start, end, kind: "power_hour", title: `Power Hour: 0 of ${refs.length} done`, refs, why: "", done: false, follow_up: false, items: refs.map((r) => ({ task_id: null, ref: r, contact_id: null, name: r, kind: "call", what: "Call", done: false })) }] })!.blocks[0];

test("free time: working hours minus appointments, with 10 minutes either side, and never the past", () => {
  const g = freeGaps(hours, [{ start: "10:00", end: "11:00", title: null, source: "calendar" }], "08:30");
  assert.deepEqual(g, [[toMin("08:30"), toMin("09:50")], [toMin("11:10"), toMin("17:00")]]);
  const own = freeGaps(hours, [{ start: "12:00", end: "13:00", title: "Gym", source: "time_block" }]);
  assert.deepEqual(own[0], [toMin("08:00"), toMin("12:00")], "no buffer round the agent's own blocks");
});

// Rewritten 22 Oct (Parry: "there are 2 power hours on the daily clock calendar"): this asserted the Brain batched
// calls into Power Hours of up to 60 minutes (two for 8 calls). The Power Hour is ONE MOVE's now; the Brain builds none.
test("22 Oct: the Brain never batches Today's VIP touches into a Power Hour of its own", () => {
  const calls = Array.from({ length: 8 }, (_, k) => it(`c${k}`, { urgency: k === 7 ? "alert" : "today" }));
  assert.deepEqual(batches(calls), [], "every VIP touch is in ONE MOVE's Power Hour");
  const other = batches([it("move:fu", { vip: undefined, kind: "follow_up", title: "Call the Millers back", urgency: "alert" })]);
  assert.deepEqual(other.map((x) => x.kind), ["task"], "any other call is a task of its own");
});

// Rewritten 22 Oct: texts and notes went in the Brain's Power Hour; they are ONE MOVE's Power Hour's now.
test("approvals get one block; VIP texts and notes are left to ONE MOVE's Power Hour", () => {
  const g = batches([it("t1", { kind: "text" }), it("t2", { kind: "text" }), it("n1", { kind: "note", minutes: 5 }), it("a1", { kind: "approval", minutes: 15 })]);
  assert.deepEqual(g.map((x) => x.kind), ["approvals"]);
});

// Rewritten 22 Oct: the Brain placed its own Power Hour in the calling window; now ONE MOVE's stays where ONE MOVE put
// it and the day is planned round it.
test("the day: ONE MOVE's one Power Hour kept as sent, the rest round it, the appointment and the fixed lunch kept", () => {
  const ph = movePower("11:00", "12:00", ["c1", "c2", "c3", "t1"]);
  const d = buildDay({
    hours,
    busy: [{ start: "09:30", end: "10:30", title: null, source: "listing_appointment" }],
    items: [it("c1"), it("c2"), it("c3"), it("t1", { kind: "text" }), it("x", { vip: undefined, kind: "other", title: "Write the CMA", minutes: 90 }), it("lunch", { kind: "meeting", title: "Lunch with Marcus", minutes: 60, at: "12:30" })],
    touch: [ph],
  });
  const hours1 = d.blocks.filter((b) => b.kind === "power_hour");
  assert.equal(hours1.length, 1, "exactly one Power Hour");
  assert.deepEqual([hours1[0].start, hours1[0].end, hours1[0].items?.length], ["11:00", "12:00", 4]);
  const refs = d.blocks.flatMap((b) => b.refs);
  for (const r of ["c1", "c2", "c3", "t1"]) assert.equal(refs.filter((x) => x === r).length, 1, `${r} planned once, in the Power Hour`);
  const cma = d.blocks.find((b) => b.refs[0] === "x")!;
  assert.ok(toMin(cma.end) <= toMin("09:20") || toMin(cma.start) >= toMin("12:00"), "never on the Power Hour or the appointment");
  assert.ok(d.blocks.some((b) => b.start === "12:30" && b.refs[0] === "lunch"), "the fixed lunch keeps its time");
  assert.equal(d.plannedMin, 60 + 90, "the Power Hour counts as work planned");
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
  assert.equal(busyHue({ source: "time_block", title: "Lunch", category: "personal" }), "personal"); // as MASTER calendar_color decides
  assert.equal(busyHue({ source: "time_block", title: "exercise", category: "personal" }), "personal");
  assert.equal(busyHue({ source: "fixed", title: "Team meeting", category: "Appointment" }), "meeting");
});

test("the day from MOVE keeps each busy item's category", () => {
  const d = readDay({ date: "2026-10-06", busy: [{ start: "09:00", end: "10:00", title: "Calls (2)", source: "time_block", category: "revenue" }] });
  assert.equal(d?.busy[0].category, "revenue");
});

test("a colour key from MASTER's day feed is final, so all three apps match", () => {
  assert.equal(busyHue({ source: "time_block", title: "Lunch", category: "personal" }), "personal"); // as MASTER calendar_color decides
  assert.equal(busyHue({ source: "time_block", title: "Lunch", category: "meal" }), "meal");
  assert.equal(busyHue({ source: "time_block", title: "Coffee with Jen", category: "people" }), "people");
  assert.equal(busyHue({ source: "fixed", title: "Anything", category: "busy" }), "busy");
  assert.equal(busyHue({ source: "time_block", title: "Drive", category: "drive" }), "drive");
});

test("readDay: ONE MOVE's face_to_face and tasks blocks keep their colours", async () => {
  const { readDay, blockHue } = await import("../lib/schedule.ts");
  const d = readDay({ date: "2026-10-07", blocks: [
    { id: "a", start: "09:00", end: "10:00", kind: "face_to_face", title: "Coffee" },
    { id: "b", start: "10:00", end: "10:30", kind: "tasks", title: "Admin" },
  ] })!;
  assert.deepEqual(d.blocks.map((b) => blockHue(b.kind)), ["people", "tasks"]);
});

// ---- Plan my day audit 3.1 (Parry, 16 Oct: "fix all issues") ----------------------------------------------------

test("3.1.1 one row per appointment: the same time and title from the calendar and from ONE count once", async () => {
  const { dedupeBusy } = await import("../lib/schedule.ts");
  const d = readDay({
    date: "2026-10-15",
    busy: [
      { start: "09:00", end: "09:30", source: "calendar", title: "Morning Brief" },
      { start: "09:00", end: "09:30", source: "one_event", title: "morning  brief " },
      { start: "13:00", end: "14:00", source: "calendar", title: null },
      { start: "13:00", end: "14:00", source: "one_event", title: "Real Estate Appointments" },
      { start: "16:00", end: "16:30", source: "one_event", title: "Amy E." },
      { start: "16:00", end: "16:30", source: "calendar", title: "Amy E." },
    ],
  })!;
  assert.equal(d.busy.length, 3, "6 rows for 3 appointments become 3");
  assert.deepEqual(d.busy.map((b) => [b.start, b.source, b.title]), [["09:00", "one_event", "morning  brief "], ["13:00", "one_event", "Real Estate Appointments"], ["16:00", "one_event", "Amy E."]]);
  // the richer copy keeps the other's title; two different appointments at the same time both stay
  assert.deepEqual(dedupeBusy([{ start: "10:00", end: "11:00", source: "calendar", title: "Dentist" }, { start: "10:00", end: "11:00", source: "one_event", title: null }]), [{ start: "10:00", end: "11:00", source: "one_event", title: "Dentist", category: null }]);
  assert.equal(dedupeBusy([{ start: "10:00", end: "11:00", source: "calendar", title: "Dentist" }, { start: "10:00", end: "11:00", source: "calendar", title: "Team call" }]).length, 2);
  assert.equal(dedupeBusy([{ start: "10:00", end: "11:00", source: "calendar", title: "Dentist" }, { start: "10:00", end: "10:30", source: "calendar", title: "Dentist" }]).length, 2, "a different end is a different appointment");
});

test("3.1.4 after the working day the reason is that the day is over; 'Today is full' only when it is", async () => {
  const { DAY_OVER_WHY, FULL_WHY } = await import("../lib/schedule.ts");
  // 22 Oct: a and b are not VIP touches here (those are ONE MOVE's Power Hour's and never move to tomorrow from the Brain)
  const items = [it("a", { vip: undefined, ref: "move:a" }), it("b", { kind: "text", vip: undefined, ref: "move:b" }), it("c", { kind: "other", title: "Write the CMA", minutes: 45 })];
  const night = buildDay({ hours, busy: [], items, notBefore: "21:20" });
  assert.equal(night.later.length, 3);
  assert.ok(night.later.every((l) => l.why === DAY_OVER_WHY), "at 9:20pm nothing says the day is full");
  assert.ok(buildDay({ hours, busy: [], items, notBefore: "17:00" }).later.every((l) => l.why === DAY_OVER_WHY), "at the end of the day too");
  // a day that is really full still says so
  const full = buildDay({ hours: { start: "08:00", end: "09:00" }, busy: [], items: [it("x", { kind: "other", title: "Write the CMA", minutes: 45 }), it("y", { kind: "other", title: "Update the listing", minutes: 30 })], notBefore: "08:00" });
  assert.deepEqual(full.later.map((l) => l.why), [FULL_WHY]);
});

test("3.1.6 an appointment's arc shows its title for every source that has one; a drive stays 'Drive'", async () => {
  const { busyArcLabel } = await import("../lib/schedule.ts");
  assert.equal(busyArcLabel({ source: "one_event", title: "Morning Brief" }), "Morning Brief");
  assert.equal(busyArcLabel({ source: "showing", title: "Showing, 12 Elm" }), "Showing, 12 Elm");
  assert.equal(busyArcLabel({ source: "calendar", title: "Real Estate Appointments" }), "Real Estate", "long titles cut at a word");
  assert.equal(busyArcLabel({ source: "listing_appointment", title: "418 Oak Lane" }), "418 Oak Lane");
  assert.equal(busyArcLabel({ source: "travel", title: "Drive to the office" }), "Drive");
  assert.equal(busyArcLabel({ source: "one_event", title: null }), "Event", "no title: the kind");
  assert.equal(busyArcLabel({ source: "calendar", title: null }), "Busy");
});

test("3.1.9 tomorrow's plan: what moves to tomorrow, planned with the same rules over tomorrow's hours", async () => {
  const { tomorrowPlan } = await import("../lib/schedule.ts");
  const p = tomorrowPlan([it("a", { at: "09:00" }), it("b"), it("w", { vip: undefined, kind: "other", title: "Write the CMA", minutes: 30 })], hours, [{ start: "10:00", end: "11:00", title: "Listing appointment", source: "listing_appointment" }]);
  assert.equal(p.later.length, 0);
  // 22 Oct: VIP touches are in ONE MOVE's Power Hour for tomorrow (rewritten: they made a Brain Power Hour here before)
  assert.deepEqual(p.blocks.map((b) => b.kind), ["task"], "a carried time is not kept: it is planned again");
  assert.deepEqual(tomorrowPlan([it("a"), it("b")], hours, [], [], [movePower("09:00", "10:00", ["a", "b"])]).blocks.map((b) => b.kind), ["power_hour"], "ONE MOVE's Power Hour for tomorrow, once");
  assert.ok(p.blocks.every((b) => toMin(b.start) >= toMin(hours.start)), "planned from the start of the day, not from now");
  assert.ok(p.blocks.every((b) => !b.done));
  assert.ok(p.blocks.every((b) => !/\btoday\b/i.test(b.why)), "its reasons speak of tomorrow, never \"Due today.\"");
  const tight = tomorrowPlan([it("x", { kind: "other", title: "Write the CMA", minutes: 45 }), it("y", { kind: "other", title: "Update the listing", minutes: 30 })], { start: "08:00", end: "09:00" });
  assert.match(tight.later[0].why, /^Tomorrow is full/);
});

// Rewritten 22 Oct: a long list of touches made two Brain Power Hours (the second one Parry saw); ONE MOVE's one holds
// them all, however many there are.
test("22 Oct: however many touches, the day has exactly one Power Hour", () => {
  const refs = Array.from({ length: 12 }, (_, k) => `go:task:${k}`);
  const d = buildDay({ hours, busy: [], items: refs.map((r) => it(r)), touch: [movePower("09:00", "10:00", refs)] });
  assert.equal(d.blocks.filter((b) => b.kind === "power_hour").length, 1);
  assert.equal(d.blocks.length, 1, "no touch planned a second time");
  assert.equal(buildDay({ hours, busy: [], items: refs.map((r) => it(r)) }).blocks.length, 0, "no Power Hour until ONE MOVE sends it");
});

// Rewritten 22 Oct: asserted the Brain's Power Hour held only the VIP touches; the Brain holds none now.
test("19 Oct: only Today's VIP touches are the Power Hour's; any other call is a task of its own", () => {
  const g = batches([it("go:task:a"), it("move:fu", { vip: undefined, kind: "follow_up", title: "Call the Millers back" }), it("go:task:n", { kind: "note" })]);
  assert.deepEqual(g.map((x) => [x.kind, x.items[0].ref]), [["task", "move:fu"]]);
});

test("20 Oct: the day's drop-bys are one run on the clock, named", () => {
  const g = batches([it("d1", { kind: "other", title: "Drop by Alex" }), it("d2", { kind: "other", title: "Drop by Wesley" }), it("d3", { kind: "other", title: "Drop by Chris" }), it("x", { kind: "other", title: "Write the CMA" })]);
  const run = g.filter((x) => /Drop/.test(x.title));
  assert.equal(run.length, 1);
  assert.equal(run[0].title, "Drop-bys: Alex, Wesley, Chris");
  assert.equal(run[0].kind, "in_person");
  assert.equal(run[0].items.length, 3);
  assert.ok(g.some((x) => x.title === "Write the CMA"));
});

test("20 Oct: a calendar copy of one of today's tasks is not busy time (Plan my day places the task itself)", async () => {
  const { withoutTaskCopies } = await import("../lib/schedule.ts");
  const busy = [
    { start: "09:00", end: "09:15", title: "Call Brent", source: "time_block" as const },
    { start: "09:00", end: "09:30", title: "Morning Brief", source: "calendar" as const },
    { start: "10:00", end: "11:00", title: "Call Brent", source: "calendar" as const },
    { start: "13:00", end: "14:00", title: "Gym", source: "time_block" as const },
  ];
  const left = withoutTaskCopies(busy, ["Call Brent", "Video text Becky"]);
  assert.deepEqual(left.map((b) => `${b.start} ${b.title}`), ["09:00 Morning Brief", "10:00 Call Brent", "13:00 Gym"]);
});
