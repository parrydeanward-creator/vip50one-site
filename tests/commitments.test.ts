import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTick, checkBody, doneUrl, tickable, ticked, demoCommitments, dueLevel, keepShare, progressWords, reached, readCommitments, setBody, starters, withWeekNode, WEEK_NODE, type Item } from "../lib/commitments.ts";
import { needsOf } from "../lib/needs.ts";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";

const item = (x: Partial<Item>): Item => ({ id: "i", text: "Two coffees", kind: "face_to_face", target: 2, count: 1, result: null, note: null, ...x });

test("reading §3n.2: checked, unknown kinds become yes or no, nothing invented", () => {
  const c = readCommitments({
    today: "2026-10-06",
    due: "set_week",
    week: { id: "w", starts: "2026-10-05", set_at: null, checked_at: null, items: [{ id: "a", text: "Calls", kind: "call", target: 15, count: 9 }, { id: "b", text: "Finish deck", kind: "juggling", target: 3, count: 1, result: "kept" }, { text: "no id" }] },
    weekend: null,
    last_week: { kept: 3, partly: 1, missed: 1 },
    keep_rate_8w: 0.72,
    streak: 4,
  });
  assert.ok(c);
  assert.equal(c!.due, "set_week");
  assert.equal(c!.week!.items.length, 2);
  assert.deepEqual([c!.week!.items[1].kind, c!.week!.items[1].target, c!.week!.items[1].result], ["yes_no", null, "kept"]);
  assert.equal(readCommitments({ due: "set_week" }), null, "no day: not an answer");
  assert.equal(readCommitments({ today: "2026-10-06", due: "dance" })!.due, null);
});

test("the pulse: yellow while on time, red once late (Mountain)", () => {
  // 5 Oct 2026 is a Monday, 9 Oct a Friday, 10 Oct a Saturday
  assert.equal(dueLevel("set_week", "2026-10-05", 9), "today");
  assert.equal(dueLevel("set_week", "2026-10-05", 13), "now", "after Monday noon");
  assert.equal(dueLevel("set_week", "2026-10-06", 9), "now", "Tuesday");
  assert.equal(dueLevel("check_week", "2026-10-09", 15), "today");
  assert.equal(dueLevel("check_week", "2026-10-10", 9), "now", "Saturday");
  assert.equal(dueLevel(null, "2026-10-05", 9), null);
});

test("counted commitments fill; the agent still marks them", () => {
  assert.equal(reached(item({ count: 2 })), true);
  assert.equal(reached(item({ count: 1 })), false);
  assert.equal(reached(item({ kind: "yes_no", target: null, count: null })), false);
  assert.equal(progressWords(item({ kind: "call", target: 15, count: 9 })), "9 of 15 calls");
  assert.equal(keepShare([item({ result: "kept" }), item({ result: "partly" }), item({ result: "missed" }), item({})]), 0.5, "partly counts half; unmarked not counted");
});

test("setting: up to 5 for the week and 3 for the weekend, counted ones need a number", () => {
  const five = Array.from({ length: 6 }, (_, k) => ({ text: `c${k}`, kind: "yes_no" as const, target: null }));
  assert.deepEqual(setBody("week", five), { error: "Up to 5 for the week." });
  assert.deepEqual(setBody("weekend", five.slice(0, 4)), { error: "Up to 3 for the weekend." });
  assert.deepEqual(setBody("week", [{ text: "  ", kind: "yes_no", target: null }]), { error: "Write at least one commitment." });
  assert.deepEqual(setBody("week", [{ text: "Calls", kind: "call", target: 0 }]), { error: 'Give "Calls" a number from 1 to 100.' });
  assert.deepEqual(setBody("week", [{ text: " Calls ", kind: "call", target: 15 }, { text: "Deck", kind: "yes_no", target: 4 }]), { period: "week", items: [{ text: "Calls", kind: "call", target: 15 }, { text: "Deck", kind: "yes_no", target: null }] });
});

test("checking in: every commitment needs kept, partly or missed", () => {
  const items = [item({ id: "a" }), item({ id: "b", text: "Deck" })];
  assert.deepEqual(checkBody("week", items, { a: { result: "kept", note: " Great " } }), { error: 'Mark "Deck" as kept, partly or missed.' });
  assert.deepEqual(checkBody("week", items, { a: { result: "kept", note: " Great " }, b: { result: "missed", note: "" } }), {
    period: "week",
    results: [{ id: "a", result: "kept", note: "Great" }, { id: "b", result: "missed", note: null }],
  });
});

test("Pulse's starters are suggestions from the agent's own week, at most three", () => {
  const s = starters({ vipsUntouched: 30, faceToFaceLastWeek: 0, overdueFollowUps: 4 });
  assert.equal(s.length, 3);
  assert.deepEqual(s[1], { text: "Call 15 VIPs I haven't talked to this month", kind: "call", target: 15 });
});

test("ONE YOU's This week orb: pulses for the due step, else shows how the week is going", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = {
    nodes: [
      { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
      { id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 },
    ],
    edges: [],
  };
  const due = withWeekNode(g, { ...demoCommitments("2026-10-05"), due: "set_week", week: null }, 13);
  const n = due.nodes.find((x) => x.id === WEEK_NODE)!;
  assert.deepEqual([n.secondaryLabel, n.status], ["Set this week's commitments", "action"]);
  assert.deepEqual(needsOf(due.nodes).get("go"), { count: 1, level: "now" });
  // without daily commitments (they pulse and take the line while undone today: dailyCommitments.test.ts)
  const mid = withWeekNode(due, { ...demoCommitments("2026-10-06"), daily: null }, 10);
  assert.equal(mid.nodes.filter((x) => x.id === WEEK_NODE).length, 1);
  assert.equal(mid.nodes.find((x) => x.id === WEEK_NODE)!.secondaryLabel, "1 of 4 commitments on track");
  assert.equal(withWeekNode(g, null, 10), g, "no commitments (route not live): no orb");
});

test("ticks (§3n.5): only on a set, started, unchecked period; untick clears", () => {
  const base = {
    today: "2026-10-08",
    due: null,
    week: { id: "w", starts: "2026-10-05", setAt: "2026-10-05T15:00:00Z", checkedAt: null, items: [{ id: "a", text: "Call 15", kind: "call" as const, target: 15, count: 4, result: null, note: null }] },
    weekend: { id: "e", starts: "2026-10-10", setAt: "2026-10-08T15:00:00Z", checkedAt: null, items: [{ id: "b", text: "Open house", kind: "yes_no" as const, target: null, count: null, result: null, note: null }] },
    lastWeek: null,
    keepRate8w: null,
    streak: 0,
  };
  assert.equal(tickable(base.week, base.today), true);
  assert.equal(tickable(base.weekend, base.today), false); // not started
  const on = applyTick(base, "week", "a", true);
  assert.equal(ticked(on.week!.items[0]), true);
  assert.equal(applyTick(on, "week", "a", false).week!.items[0].result, null);
  assert.equal(applyTick(base, "weekend", "b", true), base); // refused: weekend not started
  const closed = { ...base, week: { ...base.week, checkedAt: "2026-10-09T20:00:00Z" } };
  assert.equal(applyTick(closed, "week", "a", true), closed);
  assert.equal(doneUrl, "https://move.vip50one.com/api/brain/commitments/done");
});
