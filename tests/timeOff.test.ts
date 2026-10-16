import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import {
  TIME_OFF_NODE, addDays, backOn, coverNeeded, demoTimeOff, dueIn, firstDayBack, focusOff, planProblem, readTimeOff, saveBody, timeOffLine, timeOffUrl, withAwayLabel, awayLine,
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

test("Time off has no ONE YOU orb (Parry, 16 Oct: it is a My Profile card); the line still reads right", () => {
  // Rewritten: this asserted the Time off orb under ONE YOU, which Parry removed on 16 Oct.
  const base = { nodes: [{ id: "go", type: "product", label: "ONE YOU", importance: 1 } as GraphNode, { id: TIME_OFF_NODE, type: "feature", label: "Time off", parentId: "go", importance: 1 } as GraphNode], edges: [{ id: `go>${TIME_OFF_NODE}`, source: "go", target: TIME_OFF_NODE, relationshipType: "belongs_to", strength: 1 }] as GraphEdge[] };
  const s = demoTimeOff(today);
  const g = withAwayLabel(base, s);
  assert.equal(g.nodes.some((x) => x.id === TIME_OFF_NODE), false, "an old graph's orb is dropped");
  assert.equal(g.edges.length, 0);
  assert.equal(awayLine(s), null, "not away: no line in ONE YOU");
  const none = readTimeOff({ today, current: null, upcoming: [], due: [] }, today)!;
  assert.equal(timeOffLine(none), "Plan time off");
  const awayNow = readTimeOff({ today, current: { id: "c", starts: "2026-10-08", ends: "2026-10-12" }, upcoming: [], due: [{ kind: "closing", title: "X", date: "2026-10-10" }] }, today)!;
  assert.equal(timeOffLine(awayNow), "Away until Mon, Oct 12");
  assert.equal(awayLine(awayNow), "Away until Mon, Oct 12");
});

test("while away, the centre ONE orb says when the agent is back", async () => {
  const { readTimeOff, withAwayLabel } = await import("../lib/timeOff.ts");
  const base = { nodes: [{ id: "one", type: "core", label: "ONE", importance: 1 } as GraphNode, { id: "go", type: "product", label: "ONE YOU", importance: 1 } as GraphNode], edges: [] as GraphEdge[] };
  const away = readTimeOff({ today: "2026-10-09", current: { id: "c", starts: "2026-10-08", ends: "2026-10-12" }, upcoming: [], due: [] }, "2026-10-09")!;
  assert.equal(withAwayLabel(base, away).nodes.find((n) => n.id === "one")!.secondaryLabel, "Away until Mon, Oct 12");
  const home = readTimeOff({ today: "2026-10-09", current: null, upcoming: [], due: [] }, "2026-10-09")!;
  assert.equal(withAwayLabel(base, home).nodes.find((n) => n.id === "one")!.secondaryLabel, undefined);
});
