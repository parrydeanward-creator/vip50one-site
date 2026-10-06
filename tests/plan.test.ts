import { test } from "node:test";
import assert from "node:assert/strict";
import { dropIndex, firstPlan, fromDay, orbMark, placeAt, planSeats, pointsLeft, putBody, readPlan, shift, suggest, timed, PLAN_MAX } from "../lib/plan.ts";
import type { DayItem } from "../lib/day.ts";

const d = (id: string, extra: Partial<DayItem> = {}): DayItem => ({
  id: `day:${id}`,
  nodeId: `live:${id}`,
  product: "move",
  kind: "call",
  what: `Call ${id}`,
  minutes: 10,
  urgency: "today",
  ...extra,
});

test("Pulse suggests: red first, then special days, then yellow; the products' order inside each", () => {
  const out = suggest([d("a"), d("b", { urgency: "alert" }), d("c", { special: true }), d("e", { urgency: "soon" }), d("f", { urgency: "alert" })]);
  assert.deepEqual(out.map((p) => p.ref), ["b", "f", "c", "a", "e"]);
});

test("never more than 15 tasks shown at once (Parry, 6 Oct): the 15 most urgent", () => {
  const many = [...Array.from({ length: 20 }, (_, i) => d(`y${i}`)), ...Array.from({ length: 5 }, (_, i) => d(`r${i}`, { urgency: "alert" }))];
  const s = suggest(many);
  assert.equal(s.length, 15);
  assert.deepEqual(s.slice(0, 5).map((p) => p.ref), ["r0", "r1", "r2", "r3", "r4"], "every red one is kept");
});

test("the same thing twice is offered once", () => {
  assert.equal(suggest([d("a"), d("a")]).length, 1);
});

test("a day item's ref is its summary item id; hwc keeps its own", () => {
  assert.equal(fromDay(d("go:task:1")).ref, "go:task:1");
  assert.equal(fromDay(d("x", { id: "day:hwc:hot", ref: "hwc:hot" })).ref, "hwc:hot");
});

test("the first plan keeps every red and special item and fills about three hours with the rest", () => {
  const pool = suggest([d("r1", { urgency: "alert", minutes: 120 }), d("r2", { urgency: "alert", minutes: 90 }), d("y1", { minutes: 10 }), d("s1", { special: true, minutes: 5 })]);
  assert.deepEqual(firstPlan(pool).map((p) => p.ref), ["r1", "r2", "s1"], "over budget: yellow waits in Pulse suggests");
  assert.deepEqual(firstPlan(suggest([d("y1"), d("y2")])).map((p) => p.ref), ["y1", "y2"]);
  assert.equal(firstPlan(suggest(Array.from({ length: 40 }, (_, i) => d(`r${i}`, { urgency: "alert", minutes: 1 })))).length, PLAN_MAX);
});

test("times follow the agent's order from the start time", () => {
  const t = timed(suggest([d("a", { minutes: 10 }), d("b", { minutes: 30 })]), "07:45");
  assert.deepEqual(t.map((x) => [x.start, x.end]), [["07:45", "07:55"], ["07:55", "08:25"]]);
  assert.equal(timed(suggest([d("a")]), "nonsense")[0].start, "08:00");
});

test("move up and down; out of range changes nothing", () => {
  assert.deepEqual(shift([1, 2, 3], 2, -1), [1, 3, 2]);
  assert.deepEqual(shift([1, 2, 3], 0, -1), [1, 2, 3]);
  assert.deepEqual(shift([1, 2, 3], 2, 1), [1, 2, 3]);
});

test("the §3l.2 body: only what MASTER keeps, https links only, titles cut, at most 15", () => {
  const items = suggest([d("a", { link: "javascript:alert(1)", what: "x".repeat(200), contactId: "c1" })]);
  const b = putBody({ start: "9:00", items });
  assert.equal(b.start, "08:00", "a bad start time falls back");
  assert.deepEqual(Object.keys(b.items[0]).sort(), ["at", "contact_id", "kind", "link", "minutes", "product", "ref", "title"]);
  assert.equal(b.items[0].link, null);
  assert.equal(b.items[0].title.length, 120);
  assert.equal(b.items[0].contact_id, "c1");
});

test("reading §3l.1: checked, the Brain's own orb kept, unknown kinds become other", () => {
  const p = readPlan(
    { date: "2026-10-05", sent_at: "2026-10-05T14:00:00Z", start: "07:30", items: [{ ref: "a", product: "move", kind: "call", title: "Call a", contact_id: null, link: "https://move.vip50one.com/x", minutes: 10, done: true }, { ref: "b", product: "nope", kind: "dance", title: "B", minutes: -3 }, { title: "no ref" }] },
    [{ ref: "a", nodeId: "live:a", urgency: "alert" }],
  );
  assert.ok(p);
  assert.equal(p!.sentAt, "2026-10-05T14:00:00Z");
  assert.equal(p!.start, "07:30");
  assert.equal(p!.items.length, 2);
  assert.deepEqual([p!.items[0].done, p!.items[0].nodeId, p!.items[0].urgency], [true, "live:a", "alert"]);
  assert.deepEqual([p!.items[1].product, p!.items[1].kind, p!.items[1].minutes], ["move", "other", 10]);
  assert.equal(readPlan({ items: [] }), null, "no date: not a plan");
  assert.equal(readPlan(null), null);
});

test("points still needed for 100 this week", () => {
  assert.equal(pointsLeft({ score: 62, minimum: 100 }), 38);
  assert.equal(pointsLeft({ score: 130, minimum: 100 }), 0);
  assert.equal(pointsLeft(undefined), null);
});

test("a fixed time keeps its time when the plan reaches it early; the agent's order stays", () => {
  const t = timed(suggest([d("a", { minutes: 10 }), d("lunch", { minutes: 60, at: "12:30" }), d("b", { minutes: 10 })]), "08:00");
  assert.deepEqual(t.map((x) => [x.ref, x.start, x.end]), [["a", "08:00", "08:10"], ["lunch", "12:30", "13:30"], ["b", "13:30", "13:40"]]);
  const late = timed(suggest([d("a", { minutes: 300 }), d("lunch", { minutes: 60, at: "12:30" })]), "08:00");
  assert.equal(late[1].start, "13:00", "running late: it starts when the one before ends");
  assert.equal(putBody({ start: "08:00", items: suggest([d("lunch", { at: "12:30" })]) }).items[0].at, "12:30");
});

test("the first plan puts a fixed-time lunch where the day reaches it", () => {
  const plan = firstPlan(suggest([d("lunch", { minutes: 60, at: "08:25", urgency: "alert" }), d("a"), d("b"), d("c")]));
  assert.deepEqual(plan.map((p) => p.ref), ["a", "b", "lunch", "c"]);
});

test("the orb ring: first at the top, clockwise; a short plan is an arc over the top", () => {
  const items = suggest([d("a"), d("b"), d("c")]);
  const s = planSeats(items, 500, 500, 300);
  assert.equal(s.length, 3);
  assert.ok(Math.abs(s[1].x - 500) < 1e-9 && s[1].y < 500, "the middle one at the top");
  assert.ok(s[0].x < 500 && s[2].x > 500, "left to right, clockwise");
  const eight = planSeats(suggest(Array.from({ length: 8 }, (_, i) => d(`x${i}`))), 500, 500, 300);
  assert.ok(Math.abs(eight[0].x - 500) < 1e-9 && eight[0].y === 200, "a full ring starts at the top");
});

test("dropping an orb: its place round the ring, or off the plan", () => {
  // 8 items, 45 degrees apart from the top
  assert.equal(dropIndex(500, 200, 500, 500, 300, 8, 110), 0, "on the first seat: first");
  assert.equal(dropIndex(500, 800, 500, 500, 300, 8, 110), 4, "on the fifth seat: fifth");
  assert.equal(dropIndex(500 + 300 * Math.sin(Math.PI / 8), 500 - 300 * Math.cos(Math.PI / 8), 500, 500, 300, 8, 110), 1, "between the first two: second");
  assert.equal(dropIndex(500, 500, 500, 500, 300, 8, 110), null, "in the core");
  assert.equal(dropIndex(500, 50, 500, 500, 300, 8, 110), null, "far outside: taken off");
});

test("place an orb: move within the plan, or insert from Pulse suggests", () => {
  const [a, b, c] = suggest([d("a"), d("b"), d("c")]);
  assert.deepEqual(placeAt([a, b, c], a, 1).map((p) => p.ref), ["b", "a", "c"], "dropped on the second seat: second");
  assert.deepEqual(placeAt([a, b, c], a, 9).map((p) => p.ref), ["b", "c", "a"]);
  assert.deepEqual(placeAt([a, b, c], c, 0).map((p) => p.ref), ["c", "a", "b"]);
  const [x] = suggest([d("x")]);
  assert.deepEqual(placeAt([a, b], x, 1).map((p) => p.ref), ["a", "x", "b"]);
});

test("orb marks: a person's initials, else the kind", () => {
  assert.equal(orbMark(fromDay(d("a", { what: "Call Jen Alvarez. Her birthday is tomorrow." }))), "JA");
  assert.equal(orbMark(fromDay(d("a", { what: "Clear the 4 overdue follow-ups.", kind: "follow_up" }))), "↻");
});

test("ONE GO's plan orb: pulses until planned, then counts what is left, green when done", async () => {
  const { withPlanNode, PLAN_NODE } = await import("../lib/plan.ts");
  const { needsOf } = await import("../lib/needs.ts");
  const g: { rootId: string; nodes: import("../lib/graph/types.ts").GraphNode[]; edges: import("../lib/graph/types.ts").GraphEdge[] } = {
    rootId: "one",
    nodes: [
      { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
      { id: "go", type: "product", label: "ONE GO", parentId: "one", product: "go", importance: 1 },
    ],
    edges: [],
  };
  const none = withPlanNode(g, null);
  assert.equal(none.nodes.find((n) => n.id === PLAN_NODE)?.label, "Plan my day");
  assert.deepEqual(needsOf(none.nodes).get("go"), { count: 1, level: "today" }, "an unplanned day pulses ONE GO");
  const some = withPlanNode(none, { items: [{ done: true }, { done: false }, { done: false }] });
  const n = some.nodes.find((x) => x.id === PLAN_NODE)!;
  assert.equal(some.nodes.filter((x) => x.id === PLAN_NODE).length, 1, "replaced, never doubled");
  assert.deepEqual([n.label, n.secondaryLabel, n.stats?.[0].value], ["Today's plan", "1 of 3 done", "1 / 3"]);
  assert.deepEqual(needsOf(some.nodes).get("one"), { count: 2, level: "today" });
  const all = withPlanNode(some, { items: [{ done: true }] });
  assert.equal(all.nodes.find((x) => x.id === PLAN_NODE)?.status, "healthy");
  assert.equal(needsOf(all.nodes).has("go"), false);
  const locked = withPlanNode({ ...g, nodes: g.nodes.map((x) => (x.id === "go" ? { ...x, locked: true } : x)) }, null);
  assert.equal(locked.nodes.some((x) => x.id === PLAN_NODE), false);
});

test("the demo's ONE YOU holds only the agent's own pieces; the films keep the whole ONE GO app", async () => {
  const { demoGraph, oneYouView } = await import("../lib/graph/demo.ts");
  const full = demoGraph("complete");
  const g = oneYouView(full);
  const under = (id: string) => g.nodes.filter((n) => n.parentId === id).map((n) => n.id).sort();
  assert.deepEqual(under("go"), ["go-challenge", "go-score", "go-today"]);
  assert.ok(!g.nodes.some((n) => n.id === "go-daily" || n.id === "dt-video"), "tracker copies are gone, with everything inside them");
  assert.ok(g.edges.every((e) => g.nodes.some((n) => n.id === e.source) && g.nodes.some((n) => n.id === e.target)), "no edge points at a removed orb");
  assert.ok((g.today ?? []).every((d) => g.nodes.some((n) => n.id === d.nodeId)), "every item of the day still opens a real orb");
  assert.ok(full.nodes.some((n) => n.id === "go-daily"), "the full demo is untouched");
  assert.ok(g.nodes.some((n) => n.id === "move" ) && g.nodes.length < full.nodes.length);
});
