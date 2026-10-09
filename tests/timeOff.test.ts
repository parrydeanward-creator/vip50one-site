import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import {
  TIME_OFF_NODE, addDays, backOn, coverNeeded, demoTimeOff, dueIn, firstDayBack, focusOff, planProblem, readTimeOff, saveBody, timeOffLine, timeOffUrl, withTimeOffNode,
} from "../lib/timeOff.ts";

const today = "2026-10-09";

test("timeOffUrl: the §3x route", () => {
  assert.equal(timeOffUrl, "https://move.vip50one.com/api/brain/time-off");
});

test("readTimeOff: checked; upcoming soonest first; bad rows and kinds dropped", () => {
  const s = readTimeOff({
    today,
    current: null,
    upcoming: [
      { id: "b", starts: "2026-11-20", ends: "2026-11-27" },
      { id: "a", starts: "2026-10-23", ends: "2026-10-26", note: "Moab" },
      { id: "x", starts: "2026-10-30", ends: "2026-10-29" },
    ],
    due: [
      { kind: "birthday", title: "Jane Smith", date: "2026-10-24", contact_id: "c1" },
      { kind: "closing", title: "Maple Ridge closes", date: "2026-10-23" },
      { kind: "party", title: "Not a kind", date: "2026-10-24" },
      { kind: "task", title: "", date: "2026-10-24" },
    ],
  }, "2000-01-01")!;
  assert.deepEqual(s.upcoming.map((o) => o.id), ["a", "b"]);
  assert.equal(s.upcoming[0].note, "Moab");
  assert.deepEqual(s.due.map((d) => d.kind), ["closing", "birthday"]);
  assert.equal(s.today, today);
  assert.equal(readTimeOff({ nothing: true }, today), null);
});

test("planProblem: the same rules as ONE MOVE's POST", () => {
  const s = demoTimeOff(today);
  assert.equal(planProblem(s, "2026-10-12", "2026-10-14"), null);
  assert.match(planProblem(s, "2026-10-01", "2026-10-03")!, /past/);
  assert.match(planProblem(s, "2026-10-14", "2026-10-12")!, /before the first/);
  assert.match(planProblem(s, "2026-10-12", "2026-11-20")!, /At most 30/);
  assert.match(planProblem(s, addDays(today, 16), addDays(today, 20))!, /overlaps/);
  assert.match(planProblem(s, "", "2026-10-14")!, /Pick/);
});

test("saveBody: note only when written", () => {
  assert.deepEqual(saveBody("2026-10-12", "2026-10-14", "  "), { starts: "2026-10-12", ends: "2026-10-14" });
  assert.deepEqual(saveBody("2026-10-12", "2026-10-14", " Moab "), { starts: "2026-10-12", ends: "2026-10-14", note: "Moab" });
});

test("demo: closings and appointments need cover; the rest wait for the first day back", () => {
  const s = demoTimeOff(today);
  const o = focusOff(s)!;
  assert.equal(backOn(o), addDays(o.ends, 1));
  assert.deepEqual(coverNeeded(s).map((d) => d.kind).sort(), ["appointment", "closing"]);
  assert.equal(dueIn(s, "birthday").length, 1);
  const back = firstDayBack(s);
  assert.ok(back.length >= 2 && back.length <= 3);
  assert.match(back[0], /^Belated wishes: Jane Smith, Mike Torres/);
  assert.match(back[1], /2 tasks/);
});

test("timeOffLine and the orb: quiet, gold only when something needs cover before going; gone when locked", () => {
  const base = { nodes: [{ id: "go", type: "product", label: "ONE YOU", importance: 1 } as GraphNode], edges: [] as GraphEdge[] };
  const s = demoTimeOff(today);
  const n = withTimeOffNode(base, s).nodes.find((x) => x.id === TIME_OFF_NODE)!;
  assert.equal(n.status, "attention");
  assert.match(n.secondaryLabel!, /2 to cover$/);
  const none = readTimeOff({ today, current: null, upcoming: [], due: [] }, today)!;
  const q = withTimeOffNode(base, none).nodes.find((x) => x.id === TIME_OFF_NODE)!;
  assert.equal(q.status, "healthy");
  assert.equal(q.secondaryLabel, "Plan time off");
  const awayNow = readTimeOff({ today, current: { id: "c", starts: "2026-10-08", ends: "2026-10-12" }, upcoming: [], due: [{ kind: "closing", title: "X", date: "2026-10-10" }] }, today)!;
  assert.equal(timeOffLine(awayNow), "Away until Mon, Oct 12");
  assert.equal(withTimeOffNode(base, awayNow).nodes.find((x) => x.id === TIME_OFF_NODE)!.status, "healthy", "never nags while away");
  const locked = { ...base, nodes: [{ ...base.nodes[0], locked: true }] };
  assert.equal(withTimeOffNode(locked, s).nodes.length, 1);
  assert.equal(withTimeOffNode(withTimeOffNode(base, s), s).nodes.filter((x) => x.id === TIME_OFF_NODE).length, 1);
});

test("while away, the centre ONE orb says when the agent is back", async () => {
  const { readTimeOff, withTimeOffNode } = await import("../lib/timeOff.ts");
  const base = { nodes: [{ id: "one", type: "core", label: "ONE", importance: 1 } as GraphNode, { id: "go", type: "product", label: "ONE YOU", importance: 1 } as GraphNode], edges: [] as GraphEdge[] };
  const away = readTimeOff({ today: "2026-10-09", current: { id: "c", starts: "2026-10-08", ends: "2026-10-12" }, upcoming: [], due: [] }, "2026-10-09")!;
  assert.equal(withTimeOffNode(base, away).nodes.find((n) => n.id === "one")!.secondaryLabel, "Away until Mon, Oct 12");
  const home = readTimeOff({ today: "2026-10-09", current: null, upcoming: [], due: [] }, "2026-10-09")!;
  assert.equal(withTimeOffNode(base, home).nodes.find((n) => n.id === "one")!.secondaryLabel, undefined);
});
