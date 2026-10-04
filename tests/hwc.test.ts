import { test } from "node:test";
import assert from "node:assert/strict";
import { moveQuestion, noteDay, phoneLine, readHwc, withMoved } from "../lib/hwc.ts";

const raw = {
  date: "2026-10-04",
  today: { hot: true },
  people: [
    { id: "a", name: "Sarah Mitchell", class: "hot", phone: "+18015551234", last_note: "Wants to list in spring", last_note_at: "2026-10-02T17:10:00Z" },
    { id: "b", name: "Tom", class: "lukewarm" },
    { id: "", name: "No id", class: "cold" },
    { id: "c", name: "Ana Ruiz", class: "cold", phone: null },
  ],
};

test("readHwc keeps known classes and ids; today's boxes default off", () => {
  const h = readHwc(raw)!;
  assert.equal(h.people.length, 2);
  assert.deepEqual(h.today, { hot: true, warm: false, cold: false });
  assert.equal(readHwc({ today: {} }), null);
});

test("move question, optimistic move, note day", () => {
  const h = readHwc(raw)!;
  assert.equal(moveQuestion("Sarah", "warm"), "Move Sarah to Warm?");
  assert.equal(withMoved(h, "a", "warm").people[0].cls, "warm");
  assert.equal(noteDay("2026-10-02T17:10:00Z"), "2 Oct");
  assert.equal(noteDay("nope"), null);
});

test("phone line", () => {
  assert.equal(phoneLine("+18015551234"), "(801) 555-1234");
  assert.equal(phoneLine("8015551234"), "(801) 555-1234");
  assert.equal(phoneLine("+44 20 7946 0958"), "+44 20 7946 0958");
  assert.equal(phoneLine(null), null);
});

// §3h.6-8 (v1.16): Pulse keeps the agent on top of every person.
import { daysBetween, dueList, picksFrom, reminderLine, trend, warmth, WINDOW } from "../lib/hwc.ts";

const person = (id: string, cls: "hot" | "warm" | "cold", extra: Record<string, unknown> = {}) => ({ id, name: `P ${id}`, class: cls, ...extra });

test("Pulse's due list works from the dates until ONE MOVE sends its own", () => {
  const h = readHwc({
    date: "2026-10-04",
    today: {},
    people: [
      person("a", "hot", { last_note_at: "2026-09-25T18:00:00Z" }), // 9 days: due (window 7)
      person("b", "hot", { last_touch_at: "2026-10-01T18:00:00Z" }), // 3 days: not due
      person("c", "warm", { added_at: "2026-09-01T18:00:00Z" }), // 33 days: due (21)
      person("d", "cold", { added_at: "2026-09-01T18:00:00Z" }), // 33 days: not due (60)
      person("e", "cold", { follow_up_on: "2026-10-04", follow_up_by: "pulse", last_note: "Call after the 3rd", last_touch_at: "2026-10-01T18:00:00Z" }),
    ],
  })!;
  assert.equal(h.fromMove, false);
  assert.deepEqual(h.reminders.map((r) => r.id), ["c", "a", "e"]); // most overdue first
  assert.equal(h.reminders.find((r) => r.id === "a")!.why, "Hot, not touched in 9 days.");
  assert.equal(h.reminders.find((r) => r.id === "e")!.why, "You asked to follow up today: Call after the 3rd");
  assert.deepEqual(h.picks.map((p) => p.id), ["a", "c", "e"]); // one per class, Hot first
  assert.deepEqual(WINDOW, { hot: 7, warm: 21, cold: 60 });
});

test("ONE MOVE's reminders and picks win once it sends them; unknown people are dropped", () => {
  const h = readHwc({
    date: "2026-10-04",
    today: {},
    people: [person("a", "hot"), person("b", "warm")],
    pulse_reminders: [{ id: "b", class: "warm", due_on: "2026-10-01", days_over: 3, why: "Warm, not touched in 24 days." }, { id: "zz", class: "hot", due_on: "2026-10-01" }],
    pulse_picks: [{ id: "b", class: "warm", reason: "Longest untouched in Warm" }],
  })!;
  assert.equal(h.fromMove, true);
  assert.deepEqual(h.reminders, [{ id: "b", cls: "warm", dueOn: "2026-10-01", daysOver: 3, why: "Warm, not touched in 24 days." }]);
  assert.deepEqual(h.picks, [{ id: "b", cls: "warm", reason: "Longest untouched in Warm" }]);
});

test("faces cool over the window; trails for a move up or down this week", () => {
  const [p] = readHwc({ date: "2026-10-04", today: {}, people: [person("a", "hot", { last_touch_at: "2026-10-04T15:00:00Z", previous_class: "warm", class_since: "2026-10-02T15:00:00Z" })] })!.people;
  assert.equal(warmth(p, "2026-10-04"), 1);
  assert.ok(Math.abs(warmth(p, "2026-10-07") - 4 / 7) < 1e-9);
  assert.equal(warmth(p, "2026-10-20"), 0);
  assert.equal(trend(p, "2026-10-04"), "up");
  assert.equal(trend(p, "2026-10-12"), null); // more than a week ago
  assert.equal(trend({ ...p, cls: "cold" }, "2026-10-04"), "down");
  assert.equal(daysBetween("2026-09-30", "2026-10-04"), 4);
});

test("the reminder line on a card", () => {
  const ppl = readHwc({ date: "2026-10-04", today: {}, people: [
    person("a", "warm", { follow_up_on: "2027-03-01", follow_up_by: "pulse" }),
    person("b", "warm", { follow_up_on: "2026-10-10", follow_up_by: "agent" }),
    person("c", "hot", { last_touch_at: "2026-10-03T15:00:00Z" }),
    person("d", "hot", { last_touch_at: "2026-09-20T15:00:00Z" }),
  ] })!.people;
  assert.equal(reminderLine(ppl[0], "2026-10-04"), "Pulse set a reminder for 1 Mar from your note.");
  assert.equal(reminderLine(ppl[1], "2026-10-04"), "Reminder set for 10 Oct.");
  assert.equal(reminderLine(ppl[2], "2026-10-04"), "Pulse: next touch due 10 Oct.");
  assert.equal(reminderLine(ppl[3], "2026-10-04"), "Pulse: overdue by 7 days.");
  assert.deepEqual(picksFrom(dueList(ppl, "2026-10-04")).map((x) => x.id), ["d"]);
});

test("notes come through newest first, capped, and bad ones dropped", () => {
  const notes = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, note: `note ${i}`, at: "2026-10-01T10:00:00Z" }));
  const [p] = readHwc({ date: "2026-10-04", today: {}, people: [person("a", "hot", { notes: [...notes, { id: 5 }, null] })] })!.people;
  assert.equal(p.notes.length, 50);
  assert.equal(p.notes[0].note, "note 0");
});
