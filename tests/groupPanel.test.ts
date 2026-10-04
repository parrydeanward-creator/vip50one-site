import { test } from "node:test";
import assert from "node:assert/strict";
import { daysLeftInMonth, liveItemsUnder, meter, tipFor } from "../lib/groupPanel.ts";
import { indexGraph } from "../lib/graph/model.ts";
import { liveGraph, type SummaryEnvelope, type SummaryItem } from "../lib/live.ts";

// Parry, 4 Oct: a group's panel shows what to do now and how the agent is doing.
const follow: SummaryItem = { id: "go:task:3f1c2a4e-9b7d-4c1e-8a2f-5d6e7f8a9b0c", kind: "follow_up", title: "Call Sarah Bennett", detail: "Overdue since Oct 02", urgency: "alert", due: "2026-10-02", why: ["This task was due Oct 02 and is not done."], link: "x" };
const bday: SummaryItem = { id: "go:birthday:1:2026-10-20", kind: "birthday", title: "Jen Alvarez", detail: "Birthday Oct 20", urgency: "soon", due: "2026-10-20", why: ["Birthday Oct 20."], link: "x" };
const env: SummaryEnvelope = { v: 1, product: "go", found: true, items: [bday, follow], stats: [
  { key: "vip50_fully_touched", label: "VIP-50 fully touched", value: 3, max: 16 },
  { key: "daily_points", label: "Daily", value: 8, max: 26 },
  { key: "weekly_score", label: "Weekly", value: 40, max: 100 },
] };
const g = liveGraph(env, { pkg: "relationship", firstName: "P", reachable: true, today: "2026-10-04" }, {});
const ix = indexGraph(g);

test("People: overdue first, then what is coming up; the month's numbers ride on the group", () => {
  const items = liveItemsUnder(ix, "move-g-people");
  assert.equal(items[0].label, "Call Sarah Bennett");
  assert.ok(items.some((n) => n.label.includes("Jen")));
  assert.deepEqual(ix.byId.get("move-g-people")!.stats, [{ label: "VIP-50 fully touched this month", value: "3 / 16" }]);
  assert.equal(tipFor(items), "Start with Sarah Bennett: This task was due Oct 02 and is not done.");
});

test("Trackers: daily and weekly scores on the group", () => {
  const labels = ix.byId.get("move-g-trackers")!.stats!.map((s) => s.label);
  assert.deepEqual(labels.slice(0, 2), ["Daily score", "Weekly score"]);
});

test("meters and the month", () => {
  assert.deepEqual(meter("3 / 16"), { value: 3, max: 16 });
  assert.equal(meter("#4"), null);
  assert.equal(daysLeftInMonth("2026-10-04"), 28);
  assert.equal(daysLeftInMonth("2026-02-28"), 1);
});
