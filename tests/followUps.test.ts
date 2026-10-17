import { test } from "node:test";
import assert from "node:assert/strict";
import { FOLLOW_NODE, EMPTY_LINE, OVERDUE_STAT, countOf, mergeFollowUps, summaryFollowOf, firstNameIn, readFollowUps, rowsFromKids, shownRows, whenWords, withFollowUps, followUpsUrl, followUpsLogUrl } from "../lib/followUps.ts";
import { liveGraph, type SummaryEnvelope, type SummaryItem } from "../lib/live.ts";
import { childrenOf, indexGraph } from "../lib/graph/model.ts";
import { needsOf } from "../lib/needs.ts";

// Follow-ups (Parry, 16 Oct 18:30 MT: "yes on follow ups"): a permanent orb directly on ONE MOVE.
const opts = { pkg: "relationship" as const, firstName: "P", reachable: true, today: "2026-10-17" };
const env = (items: SummaryItem[]): SummaryEnvelope => ({ v: 1, product: "go", found: true, stats: [], items });
const T1 = "3f1c2a4e-9b7d-4c1e-8a2f-5d6e7f8a9b0c";
const T2 = "4f1c2a4e-9b7d-4c1e-8a2f-5d6e7f8a9b0c";
const T3 = "5f1c2a4e-9b7d-4c1e-8a2f-5d6e7f8a9b0c";
const C1 = "6f1c2a4e-9b7d-4c1e-8a2f-5d6e7f8a9b0c";
const item = (id: string, title: string, urgency: SummaryItem["urgency"], due: string): SummaryItem => ({ id: `go:task:${id}`, kind: "follow_up", title, urgency, due, why: ["x"], link: "https://move.vip50one.com/contacts/x" });

test("the orb is always there, directly on ONE MOVE, with a still green ring when nothing is due", () => {
  const g = liveGraph(env([]), opts, {});
  const fu = g.nodes.find((n) => n.id === FOLLOW_NODE)!;
  assert.equal(fu.parentId, "move");
  assert.equal(fu.label, "Follow-ups");
  assert.equal(fu.status, "healthy");
  assert.equal(fu.secondaryLabel, "All clear");
  assert.equal(needsOf(g.nodes).get(FOLLOW_NODE), undefined);
});

test("yellow when something is due today, red when anything is overdue; the count is on the orb", () => {
  const today = liveGraph(env([item(T1, "Text Priya Shah", "today", "2026-10-17")]), opts, {});
  const t = today.nodes.find((n) => n.id === FOLLOW_NODE)!;
  assert.equal(t.status, "attention");
  assert.equal(t.secondaryLabel, "1 due today");
  assert.deepEqual(needsOf(today.nodes).get(FOLLOW_NODE), { count: 1, level: "today" });

  const both = liveGraph(env([item(T1, "Text Priya Shah", "today", "2026-10-17"), item(T2, "Call back Rosa Diaz", "alert", "2026-10-14")]), opts, {});
  const b = both.nodes.find((n) => n.id === FOLLOW_NODE)!;
  assert.equal(b.status, "action");
  assert.equal(b.secondaryLabel, "1 overdue, 1 today");
  assert.deepEqual(needsOf(both.nodes).get(FOLLOW_NODE), { count: 2, level: "now" });
  // overdue drawn first
  const kids = childrenOf(indexGraph(both), FOLLOW_NODE);
  assert.equal(kids[0].label, "Call back Rosa Diaz");
});

test("never hidden: with no ONE MOVE account the orb stays, unlit", () => {
  const g = liveGraph({ v: 1, product: "go", found: false, stats: [], items: [] }, opts, {});
  const fu = g.nodes.find((n) => n.id === FOLLOW_NODE)!;
  assert.equal(fu.status, undefined);
  assert.equal(fu.secondaryLabel, "Waiting on ONE MOVE");
});

test("ONE MOVE's route answer is read defensively", () => {
  assert.equal(followUpsUrl, "https://move.vip50one.com/api/brain/follow-ups");
  assert.equal(followUpsLogUrl, "https://move.vip50one.com/api/brain/follow-ups/log");
  assert.equal(readFollowUps(null), null);
  assert.equal(readFollowUps({ error: "nope" }), null);
  const f = readFollowUps({
    overdue: [
      { task_id: T1, contact_id: C1, first_name: "Rosa", what: "Call back", due_at: "2026-10-14", late_days: 3 },
      { task_id: "not-a-uuid", first_name: "X", what: "Bad" },
      { task_id: T3, first_name: "Old", what: "Older", due_at: "2026-10-10", late_days: 7 },
    ],
    today: [{ task_id: T1, first_name: "Dup", what: "Duplicate" }, { task_id: T2, contact_id: "nope", first_name: "Priya", what: "Text", due_at: "2026-10-17", late_days: 0 }],
    next7: "junk",
  })!;
  assert.deepEqual(f.overdue.map((r) => r.firstName), ["Old", "Rosa"]); // latest first
  assert.equal(f.overdue[1].contactId, C1);
  assert.deepEqual(f.today.map((r) => r.firstName), ["Priya"]);
  assert.equal(f.today[0].contactId, undefined);
  assert.deepEqual(f.next7, []);
  assert.equal(countOf(f), 3);
});

// Rewritten 17 Oct (walker, Parry's live account: "All clear" beside "Follow-ups overdue 13"): vip_summary's rows are no
// longer dropped when ONE MOVE's route answers; they are merged in, one row per task. This test now asserts the route's
// rows come first and the cap of 15; the merge has its own tests below.
test("the route's rows lead the orb's, at most 15 drawn, each opening the person's record", () => {
  const base = liveGraph(env([]), opts, {});
  const id = (n: number) => `${n.toString(16).padStart(8, "0")}-9b7d-4c1e-8a2f-5d6e7f8a9b0c`;
  const rows = (from: number, k: number, extra: object) => Array.from({ length: k }, (_, i) => ({ task_id: id(from + i), first_name: `P${from + i}`, what: "Call back", ...extra }));
  const f = readFollowUps({ overdue: rows(1, 6, { late_days: 2 }), today: rows(20, 6, {}), next7: rows(40, 6, { due_at: "2026-10-18" }) })!;
  const g = withFollowUps(base, f, "2026-10-17");
  const ix = indexGraph(g);
  const kids = childrenOf(ix, FOLLOW_NODE);
  assert.equal(kids.length, 15);
  assert.equal(ix.byId.get(FOLLOW_NODE)!.secondaryLabel, "6 overdue, 6 today");
  assert.equal(kids[0].taskId, id(1));
  assert.equal(kids[0].secondaryLabel, "2 days late");
  assert.equal(kids.find((k) => k.id === `live:go:task:${id(40)}`)!.secondaryLabel, "Tomorrow");
  assert.equal(shownRows(f).length, 15);
  // nothing due: back to a green ring
  const quiet = withFollowUps(base, { overdue: [], today: [], next7: [] }, "2026-10-17");
  assert.equal(quiet.nodes.find((n) => n.id === FOLLOW_NODE)!.status, "healthy");
  assert.equal(childrenOf(indexGraph(quiet), FOLLOW_NODE).length, 0);
});

test("first names and when, in plain words", () => {
  assert.equal(firstNameIn("Call back Rosa Diaz"), "Rosa");
  assert.equal(firstNameIn("Send CMA to the Hendersons"), "Hendersons");
  assert.equal(firstNameIn("Check in with Luis Ortega"), "Luis");
  assert.equal(firstNameIn("Text Priya Shah"), "Priya");
  assert.equal(firstNameIn("call back"), "");
  const row = { firstName: "R", what: "x", dueAt: "2026-10-14", lateDays: 0, orbId: "o" };
  assert.equal(whenWords(row, "overdue", "2026-10-17"), "3 days late");
  assert.equal(whenWords({ ...row, lateDays: 1 }, "overdue", "2026-10-17"), "1 day late");
  assert.equal(whenWords(row, "today", "2026-10-14"), "Due today");
  assert.equal(whenWords({ ...row, dueAt: "2026-10-22" }, "next7", "2026-10-17"), "Thu, Oct 22");
  assert.ok(EMPTY_LINE.startsWith("Nothing to follow up."));
});

test("the demo's Follow-ups orb fills all three groups", async () => {
  const { demoGraph } = await import("../lib/graph/demo.ts");
  const g = demoGraph("complete");
  const ix = indexGraph(g);
  const orb = ix.byId.get("move-3")!;
  assert.equal(orb.parentId, "move");
  const f = rowsFromKids(childrenOf(ix, "move-3"), "2026-10-17");
  assert.deepEqual([f.overdue.length, f.today.length, f.next7.length], [2, 2, 2]);
  assert.equal(f.overdue[0].firstName, "Rosa");
  assert.equal(whenWords(f.overdue[0], "overdue", "2026-10-17"), "3 days late");
});

// Walker, 17 Oct 07:40 MT: ONE MOVE's panel said "Follow-ups overdue 13" (VIP-50 rotation tasks gone overdue on 16 Oct)
// while the Follow-ups orb said "All clear": ONE MOVE's route leaves the rotation tasks out, vip_summary counts them.
// One number in both places, on a live-shaped graph with the route's real answer shape.
test("live: overdue VIP touch tasks from vip_summary stay on the orb when ONE MOVE's route answers without them", () => {
  const id = (n: number) => `${n.toString(16).padStart(8, "0")}-1111-4c1e-8a2f-5d6e7f8a9b0c`;
  const vip = Array.from({ length: 13 }, (_, i) => item(id(i + 1), `Call Contact${i + 1} Smith`, "alert", "2026-10-16"));
  // Parry's live MASTER on 17 Oct: 15 open overdue tasks, 13 VIP-50 rotation tasks and 2 Agent Attraction
  const attraction = [98, 99].map((n): SummaryItem => ({ id: `go:task:${id(n)}`, kind: "agent_attraction", title: "Agent attraction", urgency: "alert", due: "2026-10-15", why: ["x"], link: "https://move.vip50one.com/tasks" }));
  const e = env([...vip, ...attraction]);
  e.stats = [{ key: "followups_overdue", label: "Follow-ups overdue", value: 15 }];
  const base = liveGraph(e, opts, {});
  const move = base.nodes.find((n) => n.id === "move")!;
  assert.equal(move.stats!.find((s) => s.label === OVERDUE_STAT)!.value, "13");
  assert.equal(base.nodes.find((n) => n.id === FOLLOW_NODE)!.secondaryLabel, "13 overdue");
  // ONE MOVE's route: one follow-up of its own today, none of the rotation tasks
  const route = readFollowUps({ as_of: "2026-10-17", overdue: [], today: [{ task_id: T1, contact_id: C1, first_name: "Rosa", what: "Call back", due_at: "2026-10-17", late_days: 0 }], next7: [] })!;
  const g = withFollowUps(base, route, "2026-10-17");
  const fu = g.nodes.find((n) => n.id === FOLLOW_NODE)!;
  assert.equal(fu.status, "action");
  assert.equal(fu.secondaryLabel, "13 overdue, 1 today");
  assert.notEqual(fu.secondaryLabel, "All clear");
  const kids = childrenOf(indexGraph(g), FOLLOW_NODE);
  assert.equal(kids.length, 14);
  assert.equal(kids.filter((k) => k.status === "action").length, 13);
  // applied again to the merged graph with the summary kept from the build: the same, no doubles
  const again = withFollowUps(g, route, "2026-10-17", summaryFollowOf(base, "2026-10-17"));
  assert.equal(childrenOf(indexGraph(again), FOLLOW_NODE).length, 14);
  assert.equal(again.nodes.find((n) => n.id === FOLLOW_NODE)!.secondaryLabel, "13 overdue, 1 today");
});

test("merge: one row per task, the route's row wins, overdue oldest first", () => {
  const r = (taskId: string, firstName: string, lateDays: number) => ({ taskId, firstName, what: "Call", dueAt: null, lateDays, orbId: `live:go:task:${taskId}` });
  const m = mergeFollowUps({ overdue: [r(T1, "Route", 2)], today: [], next7: [] }, { overdue: [r(T1, "Summary", 2), r(T2, "Old", 9)], today: [r(T3, "T", 0)], next7: [] });
  assert.deepEqual(m.overdue.map((x) => x.firstName), ["Old", "Route"]);
  assert.deepEqual(m.today.map((x) => x.firstName), ["T"]);
  assert.equal(mergeFollowUps({ overdue: [], today: [], next7: [] }, null).overdue.length, 0);
});

test("ONE MOVE's whole overdue count stands in when vip_summary sends fewer (it sends at most 40)", () => {
  const id = (n: number) => `${n.toString(16).padStart(8, "0")}-2222-4c1e-8a2f-5d6e7f8a9b0c`;
  const e = env(Array.from({ length: 40 }, (_, i) => item(id(i + 1), "Call back", "alert", "2026-10-01")));
  e.stats = [{ key: "followups_overdue", label: "Follow-ups overdue", value: 57 }];
  const g = liveGraph(e, opts, {});
  assert.equal(g.nodes.find((n) => n.id === "move")!.stats!.find((s) => s.label === OVERDUE_STAT)!.value, "57");
  assert.equal(g.nodes.find((n) => n.id === FOLLOW_NODE)!.secondaryLabel, "57 overdue");
  assert.equal(summaryFollowOf(g, "2026-10-17").overdue, 57);
});
