import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { liveGraph, type SummaryEnvelope, type SummaryItem } from "../lib/live.ts";
import { withMoveCoach, inBrainPage, movePageId } from "../lib/moveMenu.ts";
import { LEADS_NODE, demoNewLeads, withNewLeadsNode } from "../lib/newLeads.ts";
import { NTS_NODE, demoNewToSort, withNewToSort } from "../lib/newToSort.ts";
import { LOOKS_NODE, demoLooksHot, withLooksHot } from "../lib/looksHot.ts";
import { LIKELY_NODE, demoMoveLikely, withMoveLikelyNode } from "../lib/moveLikely.ts";
import { DEALS_NODE, demoDeals, withDealsNode } from "../lib/deals.ts";
import { demoRadar, withLifeEventsNode } from "../lib/lifeEvents.ts";
import { demoMarketPulse, withMarketPulseNode } from "../lib/marketPulse.ts";
import { FOLLOW_NODE } from "../lib/followUps.ts";
import { needsOf } from "../lib/needs.ts";
import { ALL_CLEAR_LINE, OPP_NODE, PEOPLE_MENU_PARTS, oppLine, withOpportunities } from "../lib/opportunities.ts";
import { demoGraph } from "../lib/graph/demo.ts";

// Opportunities (Parry, 17 Oct: "yes on regrouping them. and calling it Opportunities"), checked on a live-shaped graph
// (liveGraph, as the Brain builds it for a signed-in agent), not only the demo: the demo has no ONE MOVE menu.

const today = "2026-10-17";
const follow: SummaryItem = { id: "go:task:ff01", kind: "follow_up", title: "Call Brian Irby", urgency: "alert", due: "2026-10-15", why: ["Due Oct 15."], link: "https://move.vip50one.com/contacts/x" };
const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [follow] };
const opts = { pkg: "complete" as const, firstName: "Parry", reachable: true, today };
type G = { nodes: GraphNode[]; edges: GraphEdge[] };

/** The Brain's ONE MOVE ring for an admin on a busy day, every orb that can sit on it present. */
function brainRing(opp: boolean, leads = demoNewLeads()) {
  let g: G = liveGraph(MASTER, opts, {});
  g = withMoveCoach(g, true);
  g = withMoveLikelyNode(g, demoMoveLikely());
  g = withMarketPulseNode(g, demoMarketPulse(today));
  g = withDealsNode(g, demoDeals(today), today);
  g = withLifeEventsNode(g, demoRadar(today));
  g = withNewLeadsNode(g, leads);
  g = withNewToSort(g, demoNewToSort());
  g = withLooksHot(g, demoLooksHot());
  return opp ? withOpportunities(g) : g;
}
const ring = (g: G) => g.nodes.filter((n) => n.parentId === "move");

test("the ring: 16 orbs before, 13 after; the four parts leave it, Follow-ups stays", () => {
  // before: the same graph with the four parts put back on ONE MOVE (as they were until today)
  const parts = new Set([LEADS_NODE, NTS_NODE, LOOKS_NODE, LIKELY_NODE]);
  const after = brainRing(true);
  const before = after.nodes.filter((n) => n.id !== OPP_NODE).map((n) => (parts.has(n.id) ? { ...n, parentId: "move" } : n));
  assert.equal(ring({ nodes: before, edges: [] }).length, 16);
  assert.equal(ring(after).length, 13);
  const labels = ring(after).map((n) => n.label);
  assert.ok(labels.includes("Opportunities"));
  assert.ok(labels.includes("Follow-ups"));
  for (const gone of ["New leads today", "New to Sort", "Looks Hot", "Likely to move"]) assert.ok(!labels.includes(gone), gone);
  assert.ok(after.nodes.some((n) => n.id === DEALS_NODE && n.parentId === "move"));
  assert.equal(after.nodes.find((n) => n.id === FOLLOW_NODE)!.parentId, "move");
});

test("opened, the four parts sit round it in Parry's order, each with its own people", () => {
  const g = brainRing(true);
  const kids = g.nodes.filter((n) => n.parentId === OPP_NODE).sort((a, b) => b.importance - a.importance);
  assert.deepEqual(kids.map((n) => n.label), ["New leads today", "New to Sort", "Looks Hot", "Likely to move"]);
  assert.ok(g.edges.some((e) => e.source === OPP_NODE && e.target === LOOKS_NODE));
  assert.ok(!g.edges.some((e) => e.source === "move" && e.target === LOOKS_NODE));
  // the people stay inside their part
  assert.ok(g.nodes.some((n) => n.parentId === LEADS_NODE && n.type === "person"));
  assert.ok(g.nodes.some((n) => n.parentId === LOOKS_NODE && n.type === "person"));
  // New to Sort still opens its own view from its orb and its menu row
  assert.equal(inBrainPage(NTS_NODE)?.label, "New to Sort");
  assert.equal(NTS_NODE, movePageId("/contacts/visitors"));
});

test("colour is its most urgent part: an unreached lead is red, and the pulse leads down to that lead", () => {
  const g = brainRing(true);
  const opp = g.nodes.find((n) => n.id === OPP_NODE)!;
  assert.equal(opp.status, "action");
  assert.equal(opp.secondaryLabel, "1 new lead · 3 to sort · 2 look hot · 3 likely to move");
  const needs = needsOf(g.nodes);
  assert.equal(needs.get("move")!.level, "now");
  assert.equal(needs.get(OPP_NODE)!.level, "now");
  assert.equal(needs.get(LEADS_NODE)!.level, "now");
  const ann = g.nodes.find((n) => n.parentId === LEADS_NODE && n.status === "action")!;
  assert.equal(ann.label, "Ann Lee");
  assert.equal(needs.get(ann.id)!.level, "now");
  // every lead reached: yellow from New to Sort and Looks Hot
  const all = demoNewLeads();
  const reached = brainRing(true, { ...all, untouched: 0, people: all.people.map((p) => ({ ...p, touched: true })) });
  assert.equal(reached.nodes.find((n) => n.id === OPP_NODE)!.status, "attention");
  assert.equal(needsOf(reached.nodes).get(OPP_NODE)!.level, "today");
});

test("all clear: a still green ring and a line saying what lands here", () => {
  let g: G = liveGraph(MASTER, opts, {});
  g = withNewLeadsNode(g, { today, count: 0, untouched: 0, people: [] });
  g = withNewToSort(g, { sources: [], fromMove: true });
  g = withLooksHot(g, []);
  g = withMoveLikelyNode(g, null, { mlsMissing: true });
  g = withOpportunities(g);
  const opp = g.nodes.find((n) => n.id === OPP_NODE)!;
  assert.equal(opp.status, "healthy");
  assert.equal(opp.secondaryLabel, "All clear");
  assert.equal(opp.summary, ALL_CLEAR_LINE);
  assert.equal(needsOf(g.nodes).get(OPP_NODE), undefined);
  assert.equal(g.nodes.filter((n) => n.parentId === OPP_NODE).length, 4);
  assert.equal(oppLine({ leads: 2, sort: 1, hot: 1, likely: 0 }), "2 new leads · 1 to sort · 1 looks hot");
});

test("always shown, runs again safely, gone when ONE MOVE is locked", () => {
  const g = brainRing(true);
  const twice = withOpportunities(withOpportunities(g));
  assert.equal(twice.nodes.filter((n) => n.id === OPP_NODE).length, 1);
  assert.equal(twice.edges.filter((e) => e.target === LOOKS_NODE).length, 1);
  assert.equal(ring(twice).length, 13);
  // a part rebuilt later (a fresh answer) goes back on ONE MOVE until Opportunities runs again, then inside it
  const fresh = withOpportunities(withLooksHot(twice, []));
  assert.equal(fresh.nodes.find((n) => n.id === LOOKS_NODE)!.parentId, OPP_NODE);
  assert.equal(fresh.edges.filter((e) => e.target === LOOKS_NODE).length, 1);
  const locked = withOpportunities({ nodes: g.nodes.map((n) => (n.id === "move" ? { ...n, locked: true } : n)), edges: g.edges });
  assert.ok(!locked.nodes.some((n) => n.id === OPP_NODE));
  // before any part has answered: there, with just its name
  const bare = liveGraph(MASTER, opts, {});
  assert.equal(bare.nodes.find((n) => n.id === OPP_NODE)!.secondaryLabel, undefined);
});

test("the example agent: New to Sort's demo orb goes inside Opportunities too", () => {
  const g = withOpportunities(withNewToSort(demoGraph("complete"), demoNewToSort()));
  assert.equal(g.nodes.find((n) => n.id === "move-4")!.parentId, OPP_NODE);
});

test("the People menu keeps a link to each part", () => {
  assert.deepEqual(PEOPLE_MENU_PARTS.map((p) => p.label), ["New leads today", "Looks Hot", "Likely to move"]);
  const g = brainRing(true);
  for (const p of PEOPLE_MENU_PARTS) assert.ok(g.nodes.some((n) => n.id === p.id), p.label);
});
