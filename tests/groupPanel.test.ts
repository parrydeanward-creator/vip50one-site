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

test("v1.6: today's boxes, weekly boxes, the challenge day (hidden when not enrolled), the full overdue count", () => {
  const e2: SummaryEnvelope = {
    ...env,
    today_boxes: [
      { key: "made_bed", label: "Made bed", done: true, points: 1 },
      { key: "call_1", label: "Call", done: false, points: 1 },
      { key: "lunch_face_to_face", label: "Lunch face to face", done: false, points: 2 },
      { key: "custom_field_1_checked", label: "  ", done: false, points: 1 },
    ],
    stats: [
      ...env.stats!,
      { key: "week_boxes_done", label: "Weekly boxes", value: 3, max: 16 },
      { key: "challenge_day", label: "90-Day Challenge", value: 86, max: 90 },
      { key: "followups_overdue", label: "Follow-ups overdue", value: 57 },
    ],
  };
  const g2 = liveGraph(e2, { pkg: "relationship", firstName: "P", reachable: true, today: "2026-10-04" }, {});
  const tr = g2.nodes.find((n) => n.id === "move-g-trackers")!;
  assert.equal(tr.boxes!.length, 3); // the unlabelled custom box is left out
  assert.ok(tr.stats!.some((s) => s.label === "Weekly boxes" && s.value === "3 / 16"));
  assert.ok(tr.stats!.some((s) => s.label === "90-Day Challenge" && s.value === "86 / 90"));
  assert.equal(g2.nodes.find((n) => n.id === "move-followups")!.secondaryLabel, "57 overdue");

  const e3: SummaryEnvelope = { ...e2, stats: e2.stats!.map((s) => (s.key === "challenge_day" ? { ...s, value: null } : s)) };
  const g3 = liveGraph(e3, { pkg: "relationship", firstName: "P", reachable: true, today: "2026-10-04" }, {});
  assert.ok(!g3.nodes.find((n) => n.id === "move-g-trackers")!.stats!.some((s) => s.label === "90-Day Challenge"));
});
