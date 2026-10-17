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

// Rewritten 17 Oct: follow-ups left People for their own orb directly on ONE MOVE (Parry, 16 Oct: "yes on follow
// ups"), so People now leads with what is coming up and the overdue follow-up leads the Follow-ups orb instead.
test("People: what is coming up; the month's numbers ride on the group; follow-ups have their own orb", () => {
  const items = liveItemsUnder(ix, "move-g-people");
  assert.ok(!items.some((n) => n.label === "Call Sarah Bennett"));
  assert.ok(items.some((n) => n.label.includes("Jen")));
  assert.deepEqual(ix.byId.get("move-g-people")!.stats, [{ label: "VIP-50 fully touched this month", value: "3 / 16" }]);
  const fu = liveItemsUnder(ix, "move-followups");
  assert.equal(fu[0].label, "Call Sarah Bennett");
  assert.equal(tipFor(fu), "Start with Sarah Bennett: This task was due Oct 02 and is not done.");
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

// Walker, 17 Oct 07:40 MT: on Parry's live account Outreach and Events said "Nothing here needs you right now" above
// plain links, while the demo showed each part's line. A live-shaped graph with the routes' real answers
// (vip50-web-crm lib/outreach-events.ts) must give every part its line and pulse in the group panel.
test("live Outreach and Events: each part's line and pulse in the group panel; no Overview tile", async () => {
  const { readOutreach, readEvents, withOutreachNodes, withEventsNodes, OUTREACH_PARTS, EVENTS_PARTS } = await import("../lib/outreach.ts");
  const { partRows, openTiles } = await import("../lib/groupPanel.ts");
  const { moveGroupsFor } = await import("../lib/moveMenu.ts");
  const o = readOutreach({ newsletter: { sent_this_month: 0 }, market_reports: { set_up: 3, ready_for_1st: 2 }, action_plans: { running: 4, waiting_to_send: 1 }, landing_pages: { visitors_month: null, leads_month: 5 } });
  const e = readEvents({
    calendar_next7: [{ id: "c1", title: "Coffee", date: "2026-10-18", start_time: "09:30:00", end_time: null, category: "meeting" }],
    vip_event: { next: { id: "v1", title: "Mastermind", on: "2026-10-29", location: null }, invited: null, yes: null },
    mixer: { next_on: "2026-11-06", title: "Fall Mixer", invites_sent_this_month: 0, yes: 0 },
  });
  assert.ok(o && e);
  const live = withEventsNodes(withOutreachNodes(g, o), e);
  const lix = indexGraph(live);
  const out = partRows(lix, "move-g-outreach", OUTREACH_PARTS);
  assert.deepEqual(out.map((p) => [p.label, p.line]), [
    ["Newsletter", "Not sent yet"],
    ["Market Reports", "3 set up · 2 ready for the 1st"],
    ["Action Plans", "4 running · 1 waiting for you to send"],
    ["Landing Pages", "Leads this month: 5"],
  ]);
  assert.equal(out[0].lit, true);
  assert.ok(!lix.byId.has("move-p-/outreach") && !out.some((p) => p.label === "Overview"));
  const ev = partRows(lix, "move-g-events", EVENTS_PARTS);
  assert.deepEqual(ev.map((p) => p.label), ["Calendar", "VIP Events", "Mixer"]);
  assert.equal(ev[0].line, "1 thing in the next 7 days");
  assert.match(ev[1].line, /^Next: Mastermind · /);
  assert.match(ev[2].line, /^Next: .* · No invites sent this month$/);
  assert.equal(ev[2].lit, true);
  // the Open tiles never repeat a part, and Outreach's "Overview" is never a tile
  const outreachGroup = moveGroupsFor(true).find((x) => x.key === "outreach")!;
  assert.deepEqual(openTiles(outreachGroup.pages, new Set(OUTREACH_PARTS.map((p) => p.path))), []);
  // before ONE MOVE answers, the parts are still listed, never "Nothing here needs you"
  const before = partRows(ix, "move-g-outreach", OUTREACH_PARTS);
  assert.equal(before.length, 4);
  assert.ok(before.every((p) => p.line.length > 0));
});
