import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { moveGroupId, movePageId } from "../lib/moveMenu.ts";
import { needsOf } from "../lib/needs.ts";
import { demoGraph } from "../lib/graph/demo.ts";
import {
  EVENTS_PARTS,
  OUTREACH_PARTS,
  PANEL_FIRST,
  attractionUrl,
  byDay,
  demoEvents,
  demoOutreach,
  eventsUrl,
  leadsLine,
  marketLine,
  mixerLine,
  newsletterLine,
  outreachUrl,
  partOf,
  plansLine,
  readAttraction,
  readEvents,
  readOutreach,
  rsvpLine,
  timeWords,
  visitsLine,
  withEventsNodes,
  withOutreachNodes,
} from "../lib/outreach.ts";
import { CARD_TITLE, CREDIT_LINE, FEED_LINE, VIPS_BULK, bulkGroupUrl } from "../lib/homeReport.ts";

// Outreach and Events show what each tool is doing (Parry, 16 Oct: "2 yes", "3 yes"; walker 2026-10-17-0230), checked on
// a live-shaped graph (liveGraph) as well as the example agent's.

const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [] };
const opts = { pkg: "complete" as const, firstName: "Parry", reachable: true, today: "2026-10-17" };
type G = { nodes: GraphNode[]; edges: GraphEdge[] };
const kids = (g: G, parent: string) => g.nodes.filter((n) => n.parentId === parent).sort((a, b) => b.importance - a.importance);

const OUT = { newsletter: { sent_this_month: 0 }, market_reports: { set_up: 4, ready_for_1st: 3 }, action_plans: { running: 6, waiting_to_send: 2 }, landing_pages: { visitors_month: null, leads_month: 5 } };
const EV = {
  calendar_next7: [
    { id: "c2", title: "Showing", date: "2026-10-18", start_time: "14:00:00", end_time: null, category: "client" },
    { id: "c1", title: "Coffee", date: "2026-10-17", start_time: "09:30", end_time: "10:00", category: "meeting" },
    { id: "bad", title: "", date: "2026-10-17" },
  ],
  vip_event: { next: { id: "v1", title: "Mastermind", on: "2026-10-29", location: null }, invited: null, yes: null },
  mixer: { next_on: null, title: null, invites_sent_this_month: 0, yes: 0 },
};

test("the routes, on ONE MOVE", () => {
  assert.equal(outreachUrl, "https://move.vip50one.com/api/brain/outreach");
  assert.equal(eventsUrl, "https://move.vip50one.com/api/brain/events");
  assert.equal(attractionUrl, "https://move.vip50one.com/api/brain/team/attraction");
  assert.equal(bulkGroupUrl("vips"), "https://move.vip50one.com/api/brain/home-report/bulk?group=vips");
  assert.equal(bulkGroupUrl("past_clients"), "https://move.vip50one.com/api/brain/home-report/bulk?group=past_clients");
});

test("readers keep good parts and refuse a wrong shape", () => {
  assert.equal(readOutreach(null), null);
  assert.equal(readOutreach({ newsletter: {} }), null);
  const o = readOutreach(OUT)!;
  assert.deepEqual(o, { newsletterSent: 0, reportsSetUp: 4, reportsReady: 3, plansRunning: 6, plansWaiting: 2, landingVisitors: null, landingLeads: 5 });
  assert.equal(readEvents({ calendar_next7: [] }), null);
  const e = readEvents(EV)!;
  assert.deepEqual(e.calendar.map((c) => [c.id, c.start]), [["c1", "09:30"], ["c2", "14:00"]]);
  assert.equal(e.vipNext?.title, "Mastermind");
  assert.equal(e.vipInvited, null);
  assert.equal(readAttraction({ tasks: [] }), null);
  const a = readAttraction({ team_lead: true, tasks: [{ id: "t2", title: "Agent Attraction 2", due_date: "2026-10-16", completed: true }, { id: "t1", title: "Agent Attraction 1", due_date: "2026-10-18", completed: false }, { id: "x" }] })!;
  assert.deepEqual(a.tasks.map((t) => t.id), ["t1", "t2"]); // not done first
  // not a team lead: nothing to show, whatever came with it
  assert.deepEqual(readAttraction({ team_lead: false, tasks: [{ id: "t1", title: "Agent Attraction 1" }] }), { teamLead: false, tasks: [] });
});

test("plain words: visits never 0 when not counted, RSVPs say when they are not kept", () => {
  assert.equal(newsletterLine(0), "Not sent yet");
  assert.equal(newsletterLine(1), "Sent this month");
  assert.equal(marketLine(4, 3), "4 set up · 3 ready for the 1st");
  assert.equal(plansLine(6, 2), "6 running · 2 waiting for you to send");
  assert.equal(leadsLine(5), "Leads this month: 5");
  assert.equal(visitsLine(null), "Visits not counted yet");
  assert.equal(visitsLine(0), "Visits this month: 0");
  assert.equal(rsvpLine(null, null), "RSVPs not kept yet");
  assert.equal(rsvpLine(20, 8), "20 invited · 8 yes");
  assert.equal(timeWords("09:30"), "9:30 am");
  assert.equal(timeWords("14:00"), "2 pm");
  assert.equal(mixerLine(readEvents(EV)!), "No mixer planned · No invites sent this month");
  assert.deepEqual(byDay(readEvents(EV)!.calendar).map(([d, xs]) => [d, xs.length]), [["2026-10-17", 1], ["2026-10-18", 1]]);
});

test("one name: Market Report, with the feed and credit lines", () => {
  assert.equal(CARD_TITLE, "Monthly Market Report");
  assert.equal(VIPS_BULK, "Set up Market Reports for all your VIPs");
  assert.equal(FEED_LINE, "Reports start when the UtahRealEstate.com feed is live.");
  assert.equal(CREDIT_LINE, "Each report sent counts as this month's market report touch.");
});

test("live: Outreach opens on four orbs in Parry's order, Events on three; Agent Attraction is not in Outreach", () => {
  const g = withEventsNodes(withOutreachNodes(liveGraph(MASTER, opts, {}), readOutreach(OUT)), readEvents(EV));
  const out = kids(g, moveGroupId("outreach"));
  assert.deepEqual(out.map((n) => n.label), ["Newsletter", "Market Reports", "Action Plans", "Landing Pages"]);
  assert.deepEqual(out.map((n) => n.secondaryLabel), ["Not sent yet", "4 set up · 3 ready for the 1st", "6 running · 2 waiting for you to send", "Leads this month: 5"]);
  assert.ok(out.every((n) => n.summary)); // every orb has a panel to show, never a bare link
  assert.ok(!g.nodes.some((n) => /agent attraction/i.test(n.label)));
  const ev = kids(g, moveGroupId("events"));
  assert.deepEqual(ev.slice(0, 3).map((n) => n.label), ["Calendar", "VIP Events", "Mixer"]);
  // each child is the ONE MOVE page orb itself, opened on its panel first
  for (const p of [...OUTREACH_PARTS, ...EVENTS_PARTS]) {
    assert.ok(g.nodes.some((n) => n.id === movePageId(p.path)), p.label);
    assert.ok(PANEL_FIRST.has(p.path));
    assert.equal(partOf(movePageId(p.path))?.key, p.key);
  }
  assert.equal(partOf(movePageId("/contacts")), null);
});

test("Newsletter and Mixer pulse yellow until this month's is out, and lead the pulse up through their group", () => {
  const base = liveGraph(MASTER, opts, {});
  let g = withEventsNodes(withOutreachNodes(base, readOutreach(OUT)), readEvents(EV));
  const nl = g.nodes.find((n) => n.id === movePageId("/newsletter"))!;
  const mx = g.nodes.find((n) => n.id === movePageId("/mixer"))!;
  assert.equal(nl.status, "attention");
  assert.equal(mx.status, "attention");
  const needs = needsOf(g.nodes);
  assert.equal(needs.get(moveGroupId("outreach"))?.level, "today");
  assert.equal(needs.get(moveGroupId("events"))?.level, "today");
  // sent: a still green ring, no pulse
  g = withEventsNodes(withOutreachNodes(base, readOutreach({ ...OUT, newsletter: { sent_this_month: 1 } })), readEvents({ ...EV, mixer: { ...EV.mixer, invites_sent_this_month: 30 } }));
  assert.equal(g.nodes.find((n) => n.id === movePageId("/newsletter"))!.status, "healthy");
  assert.equal(g.nodes.find((n) => n.id === movePageId("/mixer"))!.status, "healthy");
  assert.equal(needsOf(g.nodes).get(moveGroupId("outreach")), undefined);
});

test("not answered yet: the page orbs stay as they are; runs again safely; nothing when ONE MOVE is locked", () => {
  const base = liveGraph(MASTER, opts, {});
  const g = withEventsNodes(withOutreachNodes(base, null), null);
  const nl = g.nodes.find((n) => n.id === movePageId("/newsletter"))!;
  assert.equal(nl.status, undefined);
  assert.equal(nl.secondaryLabel, undefined);
  const o = readOutreach(OUT);
  const twice = withOutreachNodes(withOutreachNodes(base, o), o);
  assert.equal(twice.nodes.length, withOutreachNodes(base, o).nodes.length);
  assert.equal(twice.edges.filter((e) => e.target === movePageId("/newsletter")).length, 1);
  const locked = { ...base, nodes: base.nodes.map((n) => (n.id === "move" ? { ...n, locked: true } : n)) };
  assert.deepEqual(withOutreachNodes(locked, o), locked);
});

test("the example agent gets both groups with example numbers, its own orbs moved inside", () => {
  let g: G = demoGraph();
  g = withEventsNodes(withOutreachNodes(g, demoOutreach()), demoEvents("2026-10-17"));
  const out = kids(g, moveGroupId("outreach"));
  assert.deepEqual(out.map((n) => n.label), ["Newsletter", "Market Reports", "Action Plans", "Landing Pages"]);
  assert.equal(out[0].id, "move-6"); // the example Newsletter orb, not a second one
  assert.equal(kids(g, moveGroupId("events")).find((n) => n.label === "Mixer")?.id, "move-5");
  assert.equal(g.nodes.filter((n) => n.label === "Newsletter" && n.product === "move" && n.parentId === "move").length, 0);
  assert.equal(g.edges.filter((e) => e.target === "move-6").length, 1);
  assert.equal(out[3].secondaryLabel, "Leads this month: 4");
});

test("follow the pulse: a lit part lights its group, even when the part holds child orbs", () => {
  const g = { nodes: [{ id: "move", type: "product", label: "ONE MOVE" }] as GraphNode[], edges: [] as GraphEdge[] };
  const out = withEventsNodes(g, demoEvents("2026-10-17"));
  const mixer = out.nodes.find((n) => n.label === "Mixer")!;
  out.nodes.push({ id: "mixer-child", type: "feature", label: "Guest list", parentId: mixer.id, status: "healthy", product: "move", importance: 0.5 } as GraphNode);
  const need = needsOf(out.nodes).get(moveGroupId("events"));
  assert.equal(need?.count, 1);
  assert.equal(need?.level, "today");
});

// Parry, 20 Oct: every calendar item said "All day"; ONE MOVE sends full timestamps, and only "09:30" was read.
test("readEvents: the clock time from ONE MOVE's timestamps, not All day", async () => {
  const { readEvents } = await import("../lib/outreach.ts");
  const e = readEvents({
    calendar_next7: [
      { id: "a", title: "Morning Brief", date: "2026-10-23", start_time: "2026-10-23T09:00:00+00:00", end_time: "2026-10-23T09:30:00+00:00" },
      { id: "b", title: "Q&A", date: "2026-10-23", start_time: "2026-10-23 10:00:00+00", end_time: null },
      { id: "c", title: "Old style", date: "2026-10-23", start_time: "09:30", end_time: "10:00" },
      { id: "d", title: "Birthday", date: "2026-10-24", start_time: null, end_time: null },
    ],
    vip_event: {}, mixer: {},
  })!;
  assert.deepEqual(e.calendar.map((x) => [x.title, x.start, x.end]), [["Morning Brief", "09:00", "09:30"], ["Old style", "09:30", "10:00"], ["Q&A", "10:00", null], ["Birthday", null, null]]);
});
