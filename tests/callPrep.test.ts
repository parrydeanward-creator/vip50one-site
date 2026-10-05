import { test } from "node:test";
import assert from "node:assert/strict";
import { callPrep, nextOccurrence } from "../lib/callPrep.ts";
import type { Person, Timeline } from "../lib/people.ts";

const today = new Date(Date.UTC(2026, 9, 5)); // 5 Oct 2026

const person = (fields: Record<string, string | string[] | null>, extra: Partial<Person> = {}): Person => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Sarah Mitchell",
  firstName: "Sarah",
  lastName: "Mitchell",
  photo: null,
  phone: "(801) 555-0142",
  email: null,
  tier: "vip50",
  cls: null,
  stage: null,
  tags: [],
  source: null,
  pulse: null,
  sections: [{ key: "all", label: "All", summary: null, fields: Object.entries(fields).map(([key, value]) => ({ key, label: key, type: Array.isArray(value) ? "list" : "text", value, editable: true })) }],
  timelineCount: 0,
  ...extra,
});

test("next occurrence of a date, with or without a year", () => {
  assert.deepEqual(nextOccurrence("1980-10-09", today), { days: 4, label: "Oct 9" });
  assert.deepEqual(nextOccurrence("--10-05", today), { days: 0, label: "Oct 5" });
  assert.equal(nextOccurrence("--03-05", today)?.days, 151, "already passed this year: next year");
  assert.equal(nextOccurrence("soon", today), null);
});

test("the card: last talk, family, favourites, coming up, open items, what to ask", () => {
  const t: Timeline = { events: [{ at: "2026-09-14T15:00:00Z", kind: "call", product: "go", title: "Talked about the remodel", detail: null }], next: null };
  const c = callPrep(
    person({ spouse_name: "Mike", children: ["Avery born 2016-10-18", "Kira (dog)"], favorite_restaurant: "Cafe Rio", sports_team: "Utah Jazz", birthday: "1980-10-09", next_followup: "2026-10-02", vip_notes: "Wants to downsize next spring" }, { pulse: { line: "Birthday Thursday", nextStep: "call", urgency: "today" } }),
    t,
    today,
  );
  assert.equal(c.lastTalk, "Called 3 weeks ago: Talked about the remodel");
  assert.deepEqual(c.family, ["Spouse: Mike", "Kids: Avery born 2016-10-18, Kira (dog)"]);
  assert.deepEqual(c.favourites, ["Favorite restaurant: Cafe Rio", "Favorite sport: Utah Jazz"]);
  assert.deepEqual(c.comingUp, ["Birthday in 4 days (Oct 9)"]);
  assert.deepEqual(c.openItems, ["Follow-up was due 3 days ago", "Your note: Wants to downsize next spring"]);
  assert.deepEqual(c.ask, ["Ask Sarah about birthday plans.", "Ask how Avery is doing.", "Ask about Utah Jazz."]);
  assert.equal(c.pulse, "Birthday Thursday");
});

test("nothing filled in: one honest prompt, nothing invented", () => {
  const c = callPrep(person({}), { events: [], next: null }, today);
  assert.equal(c.lastTalk, null);
  assert.deepEqual([c.family, c.favourites, c.comingUp, c.openItems], [[], [], [], []]);
  assert.deepEqual(c.ask, ["Ask Sarah what is new, and fill in what you learn."]);
});

test("birthday today and how to serve them", () => {
  const c = callPrep(person({ birthday: "--10-05", how_can_i_serve: "Send me listings in Draper" }), null, today);
  assert.deepEqual(c.comingUp, ["Birthday today"]);
  assert.equal(c.ask[0], "Wish Sarah a happy birthday.");
  assert.equal(c.ask[1], 'They told you how to serve them: "Send me listings in Draper"');
});
