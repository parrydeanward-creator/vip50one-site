import { test } from "node:test";
import assert from "node:assert/strict";
import { editText, editValue, gapsIn, listUrl, personTag, readGroups, readPage, readPerson, readTimeline, LEFT_EARLY_LINE, showDate, showValue, timelineUrl, type Field } from "../lib/people.ts";

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
  // Rewritten 23 Oct: gaps also carries noContact30 (the "No contact 30 days" group count, 0 when ONE MOVE does not send it).
  assert.deepEqual(g.gaps, { vipNoBirthday: 12, toSort: 38, possibleDuplicates: 3, noContact30: 0 });
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

test("§3k.7: red or yellow from ONE MOVE, safe when it is not sent yet", () => {
  const g = readGroups({ needs_you: 6, needs_now: 9, groups: [{ key: "vip50", label: "VIP-50", count: 49, needs_you: 4, needs_now: 1 }, { key: "lofty", label: "Lofty", count: 9, needs_you: 2 }] })!;
  assert.equal(g.needsNow, 6, "never more than needs_you");
  assert.equal(g.groups[0].needsNow, 1);
  assert.equal(g.groups[1].needsNow, 0, "not sent yet: yellow only");
  const p = readPage({ items: [
    { id: ID, name: "Tom", pulse: { reason: "Follow-up 3 days late", urgency: "now" } },
    { id: ID.replace("1111-4", "2222-4"), name: "Sue", pulse: { reason: "Birthday Thursday" } },
    { id: ID.replace("1111-4", "3333-4"), name: "Amy", pulse: null },
  ] })!;
  assert.deepEqual(p.items.map((i) => i.urgency), ["now", "today", null]);
  const one = readPerson({ id: ID, name: "Tom", pulse: { line: "Call Tom", urgency: "now" }, sections: [{ key: "contact", label: "Contact", fields: [] }] })!;
  assert.equal(one.pulse?.urgency, "now");
});

import { byName } from "../lib/people.ts";

test("byName sorts A-Z, ignoring case and accents", () => {
  assert.deepEqual(byName([{ name: "zoe" }, { name: "Émile" }, { name: "Amy" }, { name: "bob" }]).map((p) => p.name), ["Amy", "bob", "Émile", "zoe"]);
});

test("left_early: a partial lead carries the flag and Classic's words (LEADS §1.7b, 17 Oct)", () => {
  const base = { id: "11111111-1111-1111-1111-111111111111", name: "Ann", sections: [] };
  assert.equal(readPerson({ ...base, left_early: true })!.leftEarly, true);
  assert.equal(readPerson(base)!.leftEarly, false);
  assert.match(LEFT_EARLY_LINE, /^Left before giving a phone or email\./);
});

// Copied from vip50-web-crm components/contacts/RelationshipBoard.tsx (read 21 Oct): Julie's Biz VIPs must show in the Brain.
test("relationship groups: the board's rule, first match wins", async () => {
  const { relationshipColumn, inRelationshipGroup } = await import("../lib/people.ts");
  assert.equal(relationshipColumn({ tags: ["biz-vip"] }), "biz");
  assert.equal(relationshipColumn({ contactType: "vendor" }), "biz");
  assert.equal(relationshipColumn({ tags: ["rising-vip"] }), "rising");
  assert.equal(relationshipColumn({ tags: ["mayors-circle"], tier: "vip50" }), "mayors");
  assert.equal(relationshipColumn({ tags: ["mayors-circle"] }), "new"); // the circle needs the VIP-50 tier
  assert.equal(relationshipColumn({ tags: ["biz-vip"], tier: "vip50" }), "vip50"); // a tier outranks the flag
  assert.equal(relationshipColumn({ tags: ["biz-vip"], tier: "vip100" }), "vip100");
  assert.equal(relationshipColumn({ tags: ["biz-vip", "rising-vip"] }), "biz");
  assert.equal(relationshipColumn({ tags: ["biz-vip"] }, 3), "champion");
  assert.equal(relationshipColumn({ contactType: "sphere" }), "new");
  assert.equal(relationshipColumn({ tags: "biz-vip" }), "new"); // tags must be a list
  assert.equal(inRelationshipGroup("biz_vip", { contactType: "vendor" }), true);
  assert.equal(inRelationshipGroup("biz_vip", { tags: ["rising-vip"] }), false);
  assert.equal(inRelationshipGroup("vip50", { tags: ["biz-vip"] }), false);
});

// Parry, 21 Oct: "biz vip as the main orb and then mayors circle and rising inside biz vip or as sub orbs".
const grp = (key: string, label: string, count: number, needsYou = 0, needsNow = 0) => ({ key, label, kind: "tier" as const, count, needsYou, needsNow });
const flat = [grp("vip50", "VIP-50", 5), grp("biz_vip", "Biz VIP", 4, 1, 0), grp("rising_vip", "Rising VIP", 3, 1, 0), grp("mayors_circle", "Mayor's Circle", 2, 1, 1), grp("lofty", "Lofty", 9)];

test("biz vip nest: the ring has one Biz VIP orb, the two others are sub-orbs", async () => {
  const { nestBizVip } = await import("../lib/people.ts");
  const { ring, subs } = nestBizVip(flat);
  assert.deepEqual(ring.map((g) => g.key), ["vip50", "biz_vip", "lofty"]);
  assert.equal(ring.filter((g) => g.key === "rising_vip" || g.key === "mayors_circle").length, 0);
  assert.deepEqual(subs.map((g) => g.label), ["Mayor's Circle", "Rising VIP"]);
  assert.deepEqual(subs.map((g) => g.count), [2, 3]); // each sub-orb keeps its own count and pulse
  assert.equal(subs[0].needsNow, 1);
});

test("biz vip nest: the roll-up adds the three, counts a person once, red beats yellow", async () => {
  const { nestBizVip } = await import("../lib/people.ts");
  const biz = nestBizVip(flat).ring.find((g) => g.key === "biz_vip")!;
  assert.deepEqual([biz.count, biz.needsYou, biz.needsNow], [9, 3, 1]);
  const p = (id: string, pulse: string | null = null, urgency: "now" | "today" | null = null) => ({ id, pulse, urgency });
  const lists = {
    biz_vip: [p("a"), p("b", "call", "today"), p("c"), p("d")],
    rising_vip: [p("b", "call", "today"), p("e"), p("f")], // b sits in two groups
    mayors_circle: [p("g", "call", "now"), p("a")], // and so does a
  };
  const deduped = nestBizVip(flat, lists).ring.find((g) => g.key === "biz_vip")!;
  assert.equal(deduped.count, 7);
  assert.equal(deduped.needsYou, 2); // b's second pulse is dropped
  assert.equal(deduped.needsNow, 1); // red stays red
  const partial = nestBizVip(flat, { biz_vip: lists.biz_vip }).ring.find((g) => g.key === "biz_vip")!;
  assert.equal(partial.count, 9); // a list not loaded in full cannot prove an overlap
  const red = nestBizVip([grp("biz_vip", "Biz VIP", 1), grp("rising_vip", "Rising VIP", 1, 1, 1)]).ring[0];
  assert.deepEqual([red.needsYou, red.needsNow], [1, 1]);
});

test("biz vip nest: a sub-group opens inside Biz VIP; Back goes to Biz VIP, then all groups", async () => {
  const { parentGroup, groupTrail, isBizSub, nestBizVip } = await import("../lib/people.ts");
  assert.equal(parentGroup("mayors_circle"), "biz_vip");
  assert.equal(parentGroup("rising_vip"), "biz_vip");
  assert.equal(parentGroup("biz_vip"), null);
  assert.equal(parentGroup("vip50"), null);
  assert.deepEqual(groupTrail("rising_vip"), ["biz_vip", "rising_vip"]);
  assert.deepEqual(groupTrail("biz_vip"), ["biz_vip"]);
  assert.equal(isBizSub("mayors_circle"), true);
  assert.equal(isBizSub("biz_vip"), false);
  // no Biz VIP of its own sent: the parent orb still stands for the sub-groups
  assert.deepEqual(nestBizVip([grp("rising_vip", "Rising VIP", 2)]).ring.map((g) => [g.key, g.count]), [["biz_vip", 2]]);
});
