import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { OUTCOMES, POWER_NODE, bringUp, callsFromTouch, current, mmss, newSession, outcomeWord, readSession, remaining, touchesLine, withPowerNode, withTicked, wrap } from "../lib/powerHour.ts";
import { readDay } from "../lib/schedule.ts";
import { touchBlocks } from "../lib/touchBlock.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// ONE MOVE's answer (GET /api/brain/day): the Power Hour, and once the hour has ended the follow-up, each with `items`
const row = (n: number, what: string, kind: string, extra: Record<string, unknown> = {}) => ({ task_id: id(100 + n), ref: `go:task:${id(100 + n)}`, contact_id: id(n), name: `Person ${n}`, kind, what, done: false, ...extra });
const answer = (ph: unknown[], fu?: unknown[]) =>
  readDay({
    date: "2026-10-22",
    hours: { start: "08:00", end: "17:30" },
    busy: [],
    approved_at: null,
    blocks: [
      { id: "ph", start: "09:00", end: "10:00", kind: "power_hour", title: "Power Hour", refs: [], why: "", done: false, follow_up: false, items: ph },
      ...(fu ? [{ id: "fu", start: "15:00", end: "15:30", kind: "custom", title: "Finish your VIP touches", refs: [], why: "", done: false, follow_up: true, items: fu }] : []),
    ],
  })!;

// Rewritten 22 Oct (Parry: one Power Hour everywhere, holding the day's auto VIP touches). The ONE YOU Power Hour used to
// build its own list from Today's touches plus VIP-50s behind pace (lineUp, 19 Oct); it now lists exactly the items of
// ONE MOVE's Power Hour (and its follow-up), the ones the Day Clock draws.
test("callsFromTouch: a live-shaped day's ONE YOU Power Hour lists exactly the route's items, in its order", () => {
  const day = answer(
    [row(1, "Call", "call"), row(2, "Video text", "text"), row(3, "Social media touch", "text"), row(4, "Handwritten note", "note"), row(5, "Text", "text", { done: true })],
    [row(6, "Call", "call")],
  );
  const calls = callsFromTouch(touchBlocks(day.blocks));
  const want = day.blocks.flatMap((b) => b.items ?? []);
  assert.equal(want.length, 6);
  assert.deepEqual(calls.map((c) => c.ref), want.map((i) => i.ref));
  assert.deepEqual(calls.map((c) => `${c.kind} ${c.name}`), ["call Person 1", "video_text Person 2", "social Person 3", "note Person 4", "text Person 5", "call Person 6"]);
  assert.deepEqual(calls.map((c) => c.done), [false, false, false, false, true, false]);
  assert.equal(calls[0].taskId, id(101));
  assert.equal(calls[0].contactId, id(1));
  assert.match(calls[5].why, /^Left from your Power Hour$/);
});

test("callsFromTouch: no Power Hour from ONE MOVE, no list; an unlinked name has no contact; each ref once", () => {
  assert.deepEqual(callsFromTouch(touchBlocks(answer([]).blocks)), []);
  const day = answer([row(7, "Call", "call", { contact_id: null }), row(7, "Call", "call")]);
  const calls = callsFromTouch(touchBlocks(day.blocks));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].contactId, null, "plain text, as the side panel shows it");
});

test("withTicked: what ONE MOVE shows ticked counts as done in the session", () => {
  const calls = callsFromTouch(touchBlocks(answer([row(1, "Call", "call", { done: true }), row(2, "Call", "call")]).blocks));
  const s = withTicked(newSession("2026-10-22", calls), calls);
  assert.deepEqual(s.results, { [calls[0].id]: "sent" });
  assert.deepEqual(withTicked({ ...s, results: { [calls[0].id]: "talked" } }, calls).results, { [calls[0].id]: "talked" });
});

test("the buttons for each kind and the touches line", () => {
  const c = callsFromTouch(touchBlocks(answer([row(8, "Video text", "text"), row(7, "Social media touch", "text"), row(9, "Handwritten note", "note")]).blocks));
  assert.deepEqual(OUTCOMES.call, ["talked", "message", "no_answer", "skipped"]);
  assert.deepEqual(OUTCOMES.note, ["sent", "skipped"]);
  assert.equal(outcomeWord("video_text", "sent"), "Sent");
  assert.equal(outcomeWord("social", "sent"), "Done");
  assert.equal(outcomeWord("note", "sent"), "Done");
  assert.equal(touchesLine(c), "1 video text, 1 social touch, 1 handwritten note");
});

test("the session: countdown, the call now, bring someone up, and what got done", () => {
  const calls = callsFromTouch(touchBlocks(answer([row(2, "Call", "call"), row(1, "Call", "call")]).blocks));
  let s = newSession("2026-10-07", calls, 30);
  assert.equal(remaining(s, 1000), null);
  s = { ...s, startedAt: 0 };
  assert.equal(mmss(remaining(s, 61_000)!), "28:59");
  assert.equal(remaining(s, 31 * 60_000), 0);
  assert.equal(current(calls, s)!.name, "Person 2");
  s = bringUp(s, calls[1].id);
  assert.equal(current(calls, s)!.name, "Person 1");
  s = { ...s, results: { [calls[1].id]: "talked" } };
  assert.equal(current(calls, s)!.name, "Person 2");
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

test("withPowerNode: one orb under ONE YOU, with the touches left", () => {
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const calls = callsFromTouch(touchBlocks(answer([row(2, "Call", "call")]).blocks));
  const g = withPowerNode(base, calls, null);
  const n = g.nodes.find((x) => x.id === POWER_NODE)!;
  assert.equal(n.status, "attention");
  assert.equal(n.secondaryLabel, "1 touch lined up");
  const done = withPowerNode(g, calls, { ...newSession("d", calls), results: Object.fromEntries(calls.map((c) => [c.id, "talked"])) });
  assert.equal(done.nodes.filter((x) => x.id === POWER_NODE).length, 1);
  assert.match(done.nodes.find((x) => x.id === POWER_NODE)!.secondaryLabel!, new RegExp(`^Done: ${calls.length} conversation$`));
  assert.equal(withPowerNode({ ...base, nodes: [{ ...base.nodes[0], locked: true }] }, calls, null).nodes.length, 1);
});
