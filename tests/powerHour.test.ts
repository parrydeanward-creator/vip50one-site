import { test } from "node:test";
import assert from "node:assert/strict";
import type { DayItem } from "../lib/day.ts";
import type { VipRoster } from "../lib/vips.ts";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { MAX_CALLS, POWER_NODE, bringUp, current, lineUp, mmss, newSession, readSession, remaining, withPowerNode, wrap } from "../lib/powerHour.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const item = (n: number, what: string, extra: Partial<DayItem> = {}): DayItem => ({ id: `day:i${n}`, nodeId: "go-today", product: "go", kind: "call", what, minutes: 5, ref: `i${n}`, contactId: id(n), ...extra });
const roster: VipRoster = {
  cap: 75,
  vip50: [
    { id: id(1), name: "Jen Alvarez", month: { call: false }, last_touch_on: "2026-09-01" },
    { id: id(20), name: "Raj Patel", month: { call: false }, last_touch_on: "2026-07-01" },
    { id: id(21), name: "Mia Stone", month: { call: true } },
    { id: id(22), name: "Ben Fox", month: null, last_touch_on: null },
  ],
  vip100: [],
};

test("lineUp: overdue, then special days, then due today, then VIP-50 with no call, longest unheard first", () => {
  const calls = lineUp(
    [
      item(1, "Call Jen Alvarez", { urgency: "today" }),
      item(2, "Call Marcus Lee", { urgency: "alert" }),
      item(3, "Call Amy Chen", { urgency: "soon", special: true }),
      item(4, "Text Dave Kim", { kind: "text", urgency: "alert" }),
      item(5, "Call the Millers back", { kind: "follow_up", urgency: "today", ref: `go:task:${id(55)}` }),
    ],
    roster,
  );
  assert.deepEqual(calls.map((c) => c.name), ["Marcus Lee", "Amy Chen", "Jen Alvarez", "the Millers back", "Ben Fox", "Raj Patel"]);
  assert.equal(calls[0].level, "now");
  assert.equal(calls[0].why, "Overdue");
  assert.equal(calls.find((c) => c.name === "the Millers back")!.taskId, id(55));
  assert.ok(!calls.some((c) => c.name === "Mia Stone"), "already called this month");
  assert.equal(calls.filter((c) => c.contactId === id(1)).length, 1, "Jen once, though she is due and in the VIP-50");
});

test("lineUp: at most ten calls", () => {
  const many = Array.from({ length: 14 }, (_, k) => item(k + 30, `Call Person ${k}`, { urgency: "today" }));
  assert.equal(lineUp(many, null).length, MAX_CALLS);
});

test("the session: countdown, the call now, bring someone up, and what got done", () => {
  const calls = lineUp([item(1, "Call Jen Alvarez", { urgency: "today" }), item(2, "Call Marcus Lee", { urgency: "alert" })], null);
  let s = newSession("2026-10-07", calls, 30);
  assert.equal(remaining(s, 1000), null);
  s = { ...s, startedAt: 0 };
  assert.equal(mmss(remaining(s, 61_000)!), "28:59");
  assert.equal(remaining(s, 31 * 60_000), 0);
  assert.equal(current(calls, s)!.name, "Marcus Lee");
  s = bringUp(s, calls[1].id);
  assert.equal(current(calls, s)!.name, "Jen Alvarez");
  s = { ...s, results: { [calls[1].id]: "talked" } };
  assert.equal(current(calls, s)!.name, "Marcus Lee");
  assert.equal(wrap(calls, s).line, "1 conversation. 1 still to call.");
  s = { ...s, results: { ...s.results, [calls[0].id]: "message" } };
  assert.equal(current(calls, s), null);
  assert.equal(wrap(calls, s).line, "1 conversation, 1 message left.");
});

test("readSession: today's only, checked", () => {
  assert.equal(readSession({ date: "2026-10-06" }, "2026-10-07"), null);
  const s = readSession({ date: "2026-10-07", minutes: 99, startedAt: 5, order: ["a", 3], results: { a: "talked", b: "maybe" } }, "2026-10-07")!;
  assert.equal(s.minutes, 60);
  assert.deepEqual(s.order, ["a"]);
  assert.deepEqual(s.results, { a: "talked" });
});

test("withPowerNode: one orb under ONE YOU, pulsing with the most urgent call left", () => {
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const calls = lineUp([item(2, "Call Marcus Lee", { urgency: "alert" })], roster);
  const g = withPowerNode(base, calls, null);
  const n = g.nodes.find((x) => x.id === POWER_NODE)!;
  assert.equal(n.status, "action");
  assert.equal(n.secondaryLabel, "4 calls lined up");
  const done = withPowerNode(g, calls, { ...newSession("d", calls), results: Object.fromEntries(calls.map((c) => [c.id, "talked"])) });
  assert.equal(done.nodes.filter((x) => x.id === POWER_NODE).length, 1);
  assert.match(done.nodes.find((x) => x.id === POWER_NODE)!.secondaryLabel!, /^Done: 4 conversations/);
  assert.equal(withPowerNode({ ...base, nodes: [{ ...base.nodes[0], locked: true }] }, calls, null).nodes.length, 1);
});

test("lineUp: the name without the sentence, the reason in the item's own words, each person once", () => {
  const calls = lineUp([item(9, "Jen Alvarez. Her birthday is tomorrow.", { urgency: "soon", special: true, contactId: undefined })], roster);
  assert.equal(calls[0].name, "Jen Alvarez");
  assert.equal(calls[0].why, "A special day: Her birthday is tomorrow");
  assert.equal(calls.filter((c) => c.name === "Jen Alvarez").length, 1, "not again from the VIP-50");
});
