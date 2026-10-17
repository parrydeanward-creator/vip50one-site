import { test } from "node:test";
import assert from "node:assert/strict";
import { DATES_STAT, EMPTY_LINE, EXAMPLE_ROW, demoUpcoming, dayLabel, exampleLine, readUpcoming, taskBody, taskUrl, upcomingUrl, withLifeUpcomingNode } from "../lib/lifeUpcoming.ts";
import { LIFE_NODE } from "../lib/lifeEvents.ts";
import { OPP_NODE, withOpportunities } from "../lib/opportunities.ts";

type N = { id: string; parentId?: string | null; celebrate?: boolean; status?: string; secondaryLabel?: string; stats?: { label: string; value: string }[] };
const move = { id: "move", type: "product", label: "ONE MOVE", parentId: null, product: "move", importance: 1, stats: [{ label: "Follow-ups overdue", value: "2" }, { label: DATES_STAT, value: "0" }] };
const g = { nodes: [move], edges: [] } as never;
const nodes = (x: unknown) => (x as { nodes: N[] }).nodes;

test("the routes are ONE MOVE's", () => {
  assert.equal(upcomingUrl, "https://move.vip50one.com/api/brain/life-events/upcoming");
  assert.equal(taskUrl, "https://move.vip50one.com/api/brain/life-events/task");
});

test("readUpcoming keeps ONE MOVE's order, drops bad rows and duplicates, refuses a wrong shape", () => {
  assert.equal(readUpcoming(null), null);
  assert.equal(readUpcoming({ count: 2 }), null);
  const u = readUpcoming({
    count: 4,
    people: [
      { contact_id: "b", first_name: "Bo", kind: "anniversary", on: "2026-10-25", line: "Anniversary Sun 25 Oct", touch: "Handwritten note", gentle: false },
      { contact_id: "a", first_name: "Ann", kind: "birthday", on: "2026-10-18", line: "Birthday Sun 18 Oct", touch: "Video text", gentle: false },
      { contact_id: "a", first_name: "Ann", kind: "birthday", on: "2026-10-18", line: "dup", touch: "x" },
      { contact_id: "c", first_name: "Cy", kind: "note_event", event: "loss", on: "2026-10-19", line: "A loss (from your note)", touch: "Sympathy note", gentle: true },
      { contact_id: "d", first_name: "Di", kind: "weird", on: "2026-10-19", line: "x" },
      { contact_id: "e", first_name: "Ed", kind: "birthday", on: "soon", line: "x" },
    ],
  })!;
  assert.deepEqual(u.people.map((p) => p.firstName), ["Bo", "Ann", "Cy"]); // as the route orders them
  assert.equal(u.count, 4);
  assert.equal(u.people[2].gentle, true);
  assert.equal(u.people[2].event, "loss");
  assert.deepEqual(taskBody(u.people[1]), { contact_id: "a", kind: "birthday", on: "2026-10-18" });
  assert.equal(readUpcoming({ people: [] })!.count, 0); // no count: the people's
});

test("the orb: gold glow while anything is coming up; ONE MOVE's birthdays line takes the count", () => {
  const u = readUpcoming({ count: 2, people: [{ contact_id: "a", first_name: "Ann", kind: "birthday", on: "2026-10-18", line: "Birthday Sun 18 Oct", touch: "Video text" }] })!;
  const out = nodes(withLifeUpcomingNode(g, u));
  const life = out.find((n) => n.id === LIFE_NODE)!;
  assert.equal(life.parentId, "move");
  assert.equal(life.celebrate, true);
  assert.equal(life.secondaryLabel, "2 coming up · Ann: Birthday Sun 18 Oct");
  assert.equal(out.find((n) => n.id === "move")!.stats!.find((s) => s.label === DATES_STAT)!.value, "2");
  const quiet = nodes(withLifeUpcomingNode(g, { count: 0, people: [] })).find((n) => n.id === LIFE_NODE)!;
  assert.ok(!quiet.celebrate);
  assert.equal(quiet.status, "healthy");
  assert.equal(quiet.secondaryLabel, "Nothing coming up");
  // no answer, or ONE MOVE locked: no orb
  assert.ok(!nodes(withLifeUpcomingNode(g, null)).some((n) => n.id === LIFE_NODE));
  assert.ok(!nodes(withLifeUpcomingNode({ nodes: [{ ...move, locked: true }], edges: [] } as never, u)).some((n) => n.id === LIFE_NODE));
});

test("Life events stays separate from Opportunities", () => {
  const u = demoUpcoming("2026-10-17");
  const out = nodes(withOpportunities(withLifeUpcomingNode(g, u)));
  assert.equal(out.find((n) => n.id === LIFE_NODE)!.parentId, "move");
  assert.ok(out.some((n) => n.id === OPP_NODE));
});

test("the example agent: a birthday, a home anniversary and a new baby from a note", () => {
  const u = demoUpcoming("2026-10-17");
  assert.equal(u.count, 3);
  assert.deepEqual(u.people.map((p) => p.kind).sort(), ["birthday", "home_anniversary", "note_event"]);
  assert.equal(u.people.find((p) => p.kind === "note_event")!.event, "baby");
  assert.equal(u.people.find((p) => p.kind === "birthday")!.line, "Birthday Tue 20 Oct");
  assert.equal(dayLabel("2026-10-20"), "Tue 20 Oct");
});

test("empty state: the plain line and one labelled example", () => {
  assert.equal(EMPTY_LINE, "Add birthdays, anniversaries and closing dates to your people; Pulse also reads your notes");
  assert.equal(exampleLine(), "Example: Jenny's birthday Tue 20 Oct: video text");
  assert.equal(EXAMPLE_ROW.example, true);
});
