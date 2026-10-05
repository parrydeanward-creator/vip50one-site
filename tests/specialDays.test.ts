import { test } from "node:test";
import assert from "node:assert/strict";
import { celebrateIds, ordinal, specialDaysOf, specialSentence, whenLine, withSpecialDays, yearsLine } from "../lib/specialDays.ts";
import { liveData, liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { rankToday } from "../lib/rank.ts";
import { rulesNote } from "../lib/note.ts";
import { indexGraph } from "../lib/graph/model.ts";
import { morningTop } from "../lib/morning.ts";

const MIKE = "11111111-1111-4111-8111-111111111111";
const ANN = "22222222-2222-4222-8222-222222222222";

// Shaped like MASTER's vip_summary after vip50-web-crm#65 (special_days, 14 days).
const ENV: SummaryEnvelope = {
  v: 1,
  product: "go",
  found: true,
  items: [
    { id: `go:birthday:${MIKE}:2026-10-05`, kind: "birthday", title: "Birthday: Mike Smith", detail: "Mon Oct 05", urgency: "today", due: "2026-10-05", why: ["On your VIP-50.", "Birthday on Oct 05."], link: `https://move.vip50one.com/contacts/${MIKE}`, seen: null, contact_id: MIKE },
  ],
  special_days: [
    { contact_id: ANN, name: "Emma", contact_name: "Ann Lee", kind: "child_birthday", date: "2026-10-04", days_until: 0, years: 17 },
    { contact_id: MIKE, name: "Mike Smith", contact_name: "Mike Smith", kind: "birthday", date: "2026-10-05", days_until: 1, years: 43 },
    { contact_id: MIKE, name: "Biscuit", contact_name: "Mike Smith", kind: "pet_birthday", date: "2026-10-09", days_until: 5, years: null, pet_type: "Dog" },
    { contact_id: ANN, name: "Ann Lee", contact_name: "Ann Lee", kind: "anniversary", date: "2026-10-14", days_until: 10, years: 49 },
    { contact_id: ANN, name: "Ann Lee", contact_name: "Ann Lee", kind: "home_anniversary", date: "2026-10-16", days_until: 12, years: 1 },
    { contact_id: "not-a-uuid", name: "X", contact_name: "X", kind: "birthday", date: "2026-10-06", days_until: 2, years: 3 },
    { contact_id: ANN, name: "Odd", contact_name: "Ann Lee", kind: "graduation", date: "2026-10-06", days_until: 2, years: 3 },
  ],
};

test("special days: only well-formed rows, soonest first", () => {
  const days = specialDaysOf(ENV);
  assert.equal(days.length, 5);
  assert.deepEqual(days.map((d) => d.days_until), [0, 1, 5, 10, 12]);
  assert.equal(days[2].pet_type, "dog");
  assert.deepEqual(specialDaysOf({ v: 1, product: "go", found: true }), []);
  assert.deepEqual(specialDaysOf(null), []);
});

test("special days: plain words, no year when the year is unknown", () => {
  const [emma, mike, biscuit, ann, home] = specialDaysOf(ENV);
  assert.equal(specialSentence(emma), "Emma (Ann Lee's child) turns 17 today.");
  assert.equal(specialSentence(mike), "Mike Smith turns 43 tomorrow.");
  assert.equal(specialSentence(biscuit), "Biscuit (Mike Smith's dog) has a birthday on Fri Oct 09.");
  assert.equal(specialSentence(ann), "Ann Lee's 49th wedding anniversary is on Wed Oct 14.");
  assert.equal(yearsLine(home), "1 year in the home");
  assert.equal(yearsLine(biscuit), "");
  assert.equal(whenLine(emma), "Today");
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
});

test("special days: MASTER's own birthday item gets the age, family and home become items", () => {
  const env = withSpecialDays(ENV)!;
  const items = env.items!;
  const own = items.find((i) => i.id === `go:birthday:${MIKE}:2026-10-05`)!;
  assert.equal(own.detail, "Mon Oct 05 · turns 43");
  // Not duplicated: Mike's own birthday stays one item.
  assert.equal(items.filter((i) => i.contact_id === MIKE && i.due === "2026-10-05").length, 1);
  const emma = items.find((i) => i.title === "Child's birthday: Emma")!;
  assert.equal(emma.urgency, "today");
  assert.equal(emma.detail, "Ann Lee's child · Today · turns 17");
  assert.equal(emma.link, `https://move.vip50one.com/contacts/${ANN}`);
  assert.equal(emma.kind, "birthday");
  // Ann's anniversary was not in MASTER's items, so it is added.
  assert.ok(items.some((i) => i.title === "Anniversary: Ann Lee" && i.urgency === "soon"));
  assert.ok(items.some((i) => i.title === "Home anniversary: Ann Lee"));
  assert.equal(items.length, 5);
  // Idempotent.
  assert.equal(withSpecialDays(env)!.items!.length, 5);
});

test("special days: gold glow only for today's, on every orb of that VIP", () => {
  assert.deepEqual([...celebrateIds(ENV)], [ANN]);
  const g = liveGraph(ENV, { pkg: "complete", firstName: "Sarah", reachable: true, today: "2026-10-04" });
  assert.deepEqual(g.celebrate, [ANN]);
  const ix = indexGraph(g);
  const lit = g.nodes.filter((n) => n.celebrate);
  assert.ok(lit.length >= 1);
  assert.ok(lit.every((n) => n.contactId === ANN));
  const emma = g.nodes.find((n) => n.label === "Emma")!;
  assert.equal(emma.parentId, "move-dates");
  assert.equal(emma.type, "person");
  assert.ok(ix.byId.has(emma.id));
});

test("special days: today's family birthday leads the morning note", () => {
  const data = liveData(ENV, { firstName: "Sarah", email: "s@example.com", pkg: "complete", founding: false }, "2026-10-04", true);
  const ranked = rankToday(data);
  assert.equal(ranked[0].title, "Child's birthday: Emma");
  assert.match(rulesNote(data, ranked).note, /Child's birthday: Emma/);
});

test("special days: nothing changes when MASTER did not answer", () => {
  assert.equal(withSpecialDays(null), null);
  const off = { ...ENV, found: false };
  assert.equal(withSpecialDays(off), off);
  assert.deepEqual(liveGraph(ENV, { pkg: "complete", firstName: "S", reachable: false, today: "2026-10-04" }).nodes.filter((n) => n.celebrate), []);
});

test("special days: today's come first in the Morning Pulse tour", () => {
  const ix = indexGraph(liveGraph(ENV, { pkg: "complete", firstName: "Sarah", reachable: true, today: "2026-10-04" }));
  assert.equal(ix.byId.get(morningTop(ix)[0])!.label, "Emma");
});
