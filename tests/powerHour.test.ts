import { test } from "node:test";
import assert from "node:assert/strict";
import type { DayItem } from "../lib/day.ts";
import type { VipRoster } from "../lib/vips.ts";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { MAX_BEHIND, OUTCOMES, POWER_NODE, behindCount, bringUp, current, lineUp, mmss, newSession, outcomeWord, readSession, remaining, shown, touchesLine, withPowerNode, wrap } from "../lib/powerHour.ts";

const DAY = "2026-10-19"; // 19 of 31 days: with 4 VIP-50s, 2 should have had each touch by now

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// one of Today's VIP touches: a task ONE GO generated (go:task:<id>)
const item = (n: number, what: string, extra: Partial<DayItem> = {}): DayItem => ({ id: `day:i${n}`, nodeId: "go-today", product: "go", kind: "call", what, minutes: 5, ref: `go:task:${id(100 + n)}`, contactId: id(n), ...extra });
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

// Rewritten 19 Oct (Parry: "every day the system generates very specific people to call, text, social touch, send a
// letter etc..it is created in the tasks in today's vip touches...that is what I am talking about"; and "anything
// that is behind schedule ... set a max"). It used to be calls only, then every VIP-50 with no call this month.
test("lineUp: exactly Today's VIP touches, most urgent first, calls before texts; then up to five behind pace", () => {
  const calls = lineUp(
    [
      item(1, "Call Jen Alvarez", { urgency: "today" }),
      item(2, "Call Marcus Lee", { urgency: "alert" }),
      item(3, "Call Amy Chen", { urgency: "soon", special: true }),
      item(4, "Text Dave Kim", { kind: "text", urgency: "alert" }),
      item(5, "Call the Millers back", { kind: "follow_up", urgency: "today" }),
      item(6, "Call Kim Reyes, Saturday's open house visitor", { urgency: "today", ref: "move:visitor:6" }),
    ],
    roster,
    DAY,
  );
  assert.deepEqual(
    calls.map((c) => `${c.behind ? "behind " : ""}${c.kind} ${c.name}`),
    ["call Marcus Lee", "text Dave Kim", "call Amy Chen", "call Jen Alvarez", "call the Millers back", "behind call Ben Fox", "behind video_text Mia Stone", "behind video_text Ben Fox", "behind social Mia Stone", "behind social Ben Fox"],
  );
  assert.ok(!calls.some((c) => c.name === "Kim Reyes"), "not one of Today's VIP touches");
  assert.equal(calls[0].level, "now");
  assert.equal(calls[0].why, "Overdue");
  assert.equal(calls.find((c) => c.name === "the Millers back")!.taskId, id(105));
  assert.ok(calls.filter((c) => c.behind).every((c) => /^Behind pace: VIP-50, no (call|video text|social touch) this month/.test(c.why)));
});

test("shown: today's touches first; the behind ones only once every one of today's has a result", () => {
  const calls = lineUp([item(2, "Call Marcus Lee", { urgency: "alert" }), item(4, "Video text Dave Kim", { kind: "text", urgency: "today" })], roster, DAY);
  let s = newSession(DAY, calls);
  assert.equal(shown(calls, s).length, 2);
  s = { ...s, results: { [calls[0].id]: "talked" } };
  assert.equal(shown(calls, s).length, 2);
  s = { ...s, results: { ...s.results, [calls[1].id]: "skipped" } };
  assert.equal(shown(calls, s).length, calls.length);
  assert.ok(calls.length > 2);
});

test("behind pace: nobody early in the month, the shortfall later on, never more than five", () => {
  assert.equal(behindCount(50, 0, "2026-10-01"), 1);
  assert.equal(behindCount(50, 20, "2026-10-19"), 10);
  assert.equal(behindCount(50, 45, "2026-10-19"), 0);
  assert.equal(behindCount(4, 0, "bad"), 0);
  assert.equal(lineUp([], roster, "2026-10-02").length, 0, "on the 2nd nobody is behind yet");
  const many: VipRoster = { cap: 75, vip50: Array.from({ length: 40 }, (_, k) => ({ id: id(200 + k), name: `P ${k}`, month: null })), vip100: [] };
  assert.equal(lineUp([], many, "2026-10-31").length, MAX_BEHIND);
  assert.equal(MAX_BEHIND, 5);
});

test("lineUp: video text, social and handwritten note titles from ONE GO, and the buttons for each kind", () => {
  const c = lineUp(
    [
      item(7, "Social media touch — Ryan Cole", { kind: "text", urgency: "today" }),
      item(8, "Video text Megan", { kind: "text", urgency: "today" }),
      item(9, "Write Dave Kim a handwritten note.", { kind: "note", urgency: "today" }),
    ],
    null,
    DAY,
  );
  assert.deepEqual(c.map((x) => `${x.kind} ${x.name}`), ["video_text Megan", "social Ryan Cole", "note Dave Kim"]);
  assert.deepEqual(OUTCOMES.call, ["talked", "message", "no_answer", "skipped"]);
  assert.deepEqual(OUTCOMES.note, ["sent", "skipped"]);
  assert.equal(outcomeWord("video_text", "sent"), "Sent");
  assert.equal(outcomeWord("social", "sent"), "Done");
  assert.equal(outcomeWord("note", "sent"), "Done");
  assert.equal(touchesLine(c), "1 video text, 1 social touch, 1 handwritten note");
});

test("the session: countdown, the call now, bring someone up, and what got done", () => {
  const calls = lineUp([item(1, "Call Jen Alvarez", { urgency: "today" }), item(2, "Call Marcus Lee", { urgency: "alert" })], null, DAY);
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
  assert.equal(wrap(calls, s).line, "1 conversation. 1 still to do.");
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

test("withPowerNode: one orb under ONE YOU, pulsing with the most urgent touch left", () => {
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const calls = lineUp([item(2, "Call Marcus Lee", { urgency: "alert" })], roster, DAY);
  const g = withPowerNode(base, calls, null);
  const n = g.nodes.find((x) => x.id === POWER_NODE)!;
  assert.equal(n.status, "action");
  assert.equal(n.secondaryLabel, "1 touch lined up", "today's touch only; the behind ones wait until it is done");
  const done = withPowerNode(g, calls, { ...newSession("d", calls), results: Object.fromEntries(calls.map((c) => [c.id, "talked"])) });
  assert.equal(done.nodes.filter((x) => x.id === POWER_NODE).length, 1);
  assert.match(done.nodes.find((x) => x.id === POWER_NODE)!.secondaryLabel!, new RegExp(`^Done: ${calls.length} conversations`));
  assert.equal(withPowerNode({ ...base, nodes: [{ ...base.nodes[0], locked: true }] }, calls, null).nodes.length, 1);
});

test("lineUp: the name without the sentence, the reason in the item's own words, each person once", () => {
  const calls = lineUp([item(9, "Jen Alvarez. Her birthday is tomorrow.", { urgency: "soon", special: true, contactId: undefined })], roster, DAY);
  assert.equal(calls[0].name, "Jen Alvarez");
  assert.equal(calls[0].why, "A special day: Her birthday is tomorrow");
  assert.equal(calls.filter((c) => c.kind === "call" && c.name === "Jen Alvarez").length, 1, "her call not again from the VIP-50");
});

test("lineUp: names read cleanly (no trailing full stop, no leading Send)", () => {
  const c = lineUp([item(11, "Video text the Millers.", { kind: "text", urgency: "today" }), item(12, "Send 2 video texts to your VIP-50.", { kind: "text", urgency: "today", contactId: undefined })], null, DAY);
  assert.deepEqual(c.map((x) => x.name), ["the Millers", "2 video texts to your VIP-50"]);
});

test("lineUp: a reason after a comma is the reason, not part of the name", () => {
  const c = lineUp([item(13, "Call Kim Reyes, Saturday's open house visitor.", { urgency: "today" })], null, DAY);
  assert.equal(c[0].name, "Kim Reyes");
  assert.equal(c[0].why, "Due today: Saturday's open house visitor");
});

test("lineUp: a bracket after the name is the reason", () => {
  const c = lineUp([item(14, "Call Nina Brooks (VIP-100, 90-day call).", { urgency: "today" })], null, DAY);
  assert.equal(c[0].name, "Nina Brooks");
  assert.equal(c[0].why, "Due today: VIP-100 · 90-day call");
});
