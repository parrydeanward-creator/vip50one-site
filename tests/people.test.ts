import { test } from "node:test";
import assert from "node:assert/strict";
import { editText, editValue, gapsIn, listUrl, personTag, readGroups, readPage, readPerson, readTimeline, showDate, showValue, timelineUrl, type Field } from "../lib/people.ts";

const ID = "11111111-1111-4111-8111-111111111111";

// Shaped like vip50-web-crm#66 (VIP-SUMMARY §3k), read 5 Oct.
test("groups: the contract's shape, junk dropped, gaps read", () => {
  const g = readGroups({
    total: 9550,
    needs_you: 60,
    groups: [
      { key: "vip50", label: "VIP-50", kind: "tier", count: 49, needs_you: 6 },
      { key: "lofty", label: "Lofty", kind: "source", count: 629, needs_you: 0 },
      { key: "vip50", label: "dup", kind: "tier", count: 1 },
      { key: "Bad Key!", label: "x", count: 1 },
      { key: "to_sort", label: "New to sort", kind: "tier", count: -3 },
    ],
    gaps: { vip_no_birthday: 12, to_sort: 38, possible_duplicates: 3 },
  })!;
  assert.deepEqual(g.groups.map((x) => x.key), ["vip50", "lofty", "to_sort"]);
  assert.equal(g.groups[0].needsYou, 6);
  assert.equal(g.groups[1].kind, "source");
  assert.equal(g.groups[2].count, 0);
  assert.deepEqual(g.gaps, { vipNoBirthday: 12, toSort: 38, possibleDuplicates: 3 });
  assert.equal(readGroups({ groups: [] }), null);
  assert.equal(readGroups(null), null);
});

test("list: items, faces only from ONE MOVE's face route, cursor", () => {
  const p = readPage({
    total: 412,
    items: [
      { id: ID, name: "Sarah Mitchell", first_name: "Sarah", photo: `https://move.vip50one.com/api/face/${ID}?e=1&s=abc`, tier: "vip50", class: "hot", source_label: "Lofty", last_touch_on: "2026-09-30", pulse: { reason: "Birthday Thursday" } },
      { id: "nope", name: "Bad" },
      { id: ID.replace("1111-4", "2222-4"), name: "Tom", photo: "https://evil.example.com/x.jpg", class: "lukewarm" },
    ],
    next_cursor: "bzo0MA",
  })!;
  assert.equal(p.items.length, 2);
  assert.equal(p.items[0].pulse, "Birthday Thursday");
  assert.ok(p.items[0].photo?.startsWith("https://move.vip50one.com/api/face/"));
  assert.equal(p.items[1].photo, null);
  assert.equal(p.items[1].cls, null);
  assert.equal(p.next, "bzo0MA");
  assert.equal(p.total, 412);
});

test("person: whatever sections and fields ONE MOVE sends, in order", () => {
  const p = readPerson({
    id: ID,
    name: "Sarah Mitchell",
    first_name: "Sarah",
    phone: "(801) 555-0142",
    tier: "vip50",
    pulse: { line: "Birthday Thursday. A video text is the touch.", next_step: "text" },
    sections: [
      { key: "contact", label: "How to reach them", summary: "3 filled", fields: [{ key: "phone", label: "Phone", type: "phone", value: "(801) 555-0142", editable: true }] },
      { key: "family", label: "Family", summary: "2 kids", fields: [
        { key: "children", label: "Children", type: "list", value: ["Avery born 2016-10-18", "Kira (dog)"], editable: false },
        { key: "spouse_birthday", label: "Spouse's birthday", type: "date", value: "--03-05", editable: true },
        { key: "anniversary", label: "Anniversary", type: "date", value: null, editable: true },
      ] },
      { key: "deals", label: "Deals", summary: null, fields: [{ key: "gci", label: "GCI", type: "money", value: 12500, editable: true }, { key: "weird", label: "W", type: "hologram", value: 1 }] },
    ],
    timeline_count: 48,
  })!;
  assert.deepEqual(p.sections.map((s) => s.key), ["contact", "family", "deals"], "a new section shows with no Brain change");
  assert.equal(p.pulse?.nextStep, "text");
  assert.equal(p.sections[2].fields.length, 1, "an unknown field type is left out, never guessed");
  assert.equal(gapsIn(p.sections[1]), 1);
  assert.equal(showValue(p.sections[1].fields[1]), "Mar 5");
  assert.equal(showValue(p.sections[2].fields[0]), "$12,500");
  assert.equal(p.timelineCount, 48);
  assert.equal(readPerson({ id: ID, name: "x" }), null);
});

test("timeline: events in order, unknown kinds as other", () => {
  const t = readTimeline({ events: [{ at: "2026-10-01T15:00:00Z", kind: "call", product: "go", title: "Call" }, { at: "2026-09-01", kind: "teleport", title: "Odd" }, { title: "no date" }], next_cursor: null })!;
  assert.deepEqual(t.events.map((e) => e.kind), ["call", "other"]);
  assert.equal(t.next, null);
});

test("urls: group, search, sort, a page", () => {
  assert.equal(listUrl({ group: "vip50", q: " sarah ", sort: "name", limit: 500 }), "https://move.vip50one.com/api/brain/people?group=vip50&q=sarah&sort=name&limit=100");
  assert.equal(listUrl({ group: "../x" }), "https://move.vip50one.com/api/brain/people?sort=pulse&limit=40");
  assert.equal(timelineUrl(ID, "bzo2MA"), `https://move.vip50one.com/api/brain/people/${ID}/timeline?cursor=bzo2MA`);
});

test("dates: shown plainly, typed the way agents type them", () => {
  const f: Field = { key: "birthday", label: "Birthday", type: "date", value: "1980-03-05", editable: true };
  assert.equal(showDate("1980-03-05"), "Mar 5, 1980");
  assert.equal(editText(f), "03-05-1980");
  assert.equal(editText({ ...f, value: "--03-05" }), "03-05");
  assert.deepEqual(editValue(f, "3/5/1980"), { value: "1980-03-05" });
  assert.deepEqual(editValue(f, "03-05"), { value: "--03-05" });
  assert.deepEqual(editValue(f, "02-29"), { value: "--02-29" });
  assert.deepEqual(editValue(f, "1980-03-05"), { value: "1980-03-05" });
  assert.deepEqual(editValue(f, "3/5/80"), { value: "1980-03-05" });
  assert.ok("error" in editValue(f, "02-30-1980"));
  assert.ok("error" in editValue(f, "next tuesday"));
  assert.deepEqual(editValue(f, "  "), { value: null }, "empty clears");
});

test("other types: numbers, lists, choices, email", () => {
  const money: Field = { key: "price", label: "Price", type: "money", value: null, editable: true };
  assert.deepEqual(editValue(money, "$450,000"), { value: 450000 });
  assert.ok("error" in editValue(money, "lots"));
  assert.deepEqual(editValue({ ...money, type: "list", label: "Hobbies" }, "golf, fishing\nskiing"), { value: ["golf", "fishing", "skiing"] });
  const yes: Field = { key: "dnc", label: "Do not call", type: "choice", value: "No", editable: true, choices: ["Yes", "No"] };
  assert.deepEqual(editValue(yes, "Yes"), { value: "Yes" });
  assert.ok("error" in editValue(yes, "Maybe"));
  assert.ok("error" in editValue({ ...money, type: "email", label: "Email" }, "sarah at home"));
});

test("tags: VIP tier and class first, else where they came from", () => {
  assert.equal(personTag({ tier: "vip50", cls: "hot", source: "Lofty" }), "VIP-50 · Hot");
  assert.equal(personTag({ tier: "contact", cls: null, source: "Open house" }), "Open house");
});
