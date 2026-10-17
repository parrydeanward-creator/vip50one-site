import { test } from "node:test";
import assert from "node:assert/strict";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { movePageId } from "../lib/moveMenu.ts";
import { demoGraph } from "../lib/graph/demo.ts";
import { OUTREACH_PARTS, readOutreach, withOutreachNodes } from "../lib/outreach.ts";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import {
  TEXTS_LINE,
  emailsLine,
  enroll,
  examplePlan,
  isPlanNode,
  nextForLine,
  personStepLine,
  planNodeId,
  planOf,
  planOrbLine,
  planPersonNodeId,
  readPlans,
  readSuggestPlan,
  readyLine,
  stepLine,
  withPlan,
  withPlanNodes,
} from "../lib/actionPlans.ts";

// Action Plans drawn natively (walker 2026-10-17-0245; Parry: "yes"), checked on a live-shaped graph and the example's.

const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [] };
const opts = { pkg: "complete" as const, firstName: "Parry", reachable: true, today: "2026-10-17" };
const OUT = { newsletter: { sent_this_month: 0 }, market_reports: { set_up: 0, ready_for_1st: 0 }, action_plans: { running: 2, waiting_to_send: 3 }, landing_pages: { visitors_month: null, leads_month: 0 } };

const ROUTE = {
  plans: [
    {
      id: "p2", name: "Seller nurture", active: false, trigger: null, ready_to_send: 0, emails_auto: true, texts_auto: true,
      steps: [{ n: 1, kind: "email", label: "Hello", day: 0 }], people: [],
    },
    {
      id: "p1", name: "New buyer", active: true, trigger: "Lead reached", ready_to_send: 3, emails_auto: false, texts_auto: false,
      steps: [{ n: 2, kind: "call", label: "Check in", day: 2 }, { n: 1, kind: "email", label: "Welcome", day: 0 }, { n: 3, kind: "fax", label: "Nope", day: 4 }],
      people: [{ contact_id: "c1", first_name: "Ann", step: 2 }, { contact_id: "c2", first_name: "Raj", step: 2 }, { contact_id: "c1", first_name: "Ann", step: 1 }, { contact_id: "c3", first_name: "Lee", step: 1 }],
    },
    { id: "", name: "broken" },
  ],
};

test("the route is read: running plans first, steps in order, a person once, texts never automatic", () => {
  const plans = readPlans(ROUTE)!;
  assert.deepEqual(plans.map((p) => p.id), ["p1", "p2"]);
  const p1 = plans[0];
  assert.deepEqual(p1.steps.map((s) => s.n), [1, 2]);
  assert.deepEqual(p1.people.map((p) => p.firstName), ["Ann", "Raj", "Lee"]);
  assert.equal(plans[1].textsAuto, false);
  assert.equal(plans[1].emailsAuto, true);
  assert.equal(readPlans({}), null);
  assert.deepEqual(readPlans({ plans: [] }), []);
});

test("a plan in words: the timeline, who is next, what waits, how it sends", () => {
  const p1 = readPlans(ROUTE)![0];
  assert.equal(stepLine(p1.steps[0]), "Day 0 · Email · Welcome");
  assert.equal(nextForLine(p1, 2), "Next for: Ann, Raj");
  assert.equal(nextForLine(p1, 1), "Next for: Lee");
  assert.equal(nextForLine(p1, 9), null);
  assert.equal(readyLine(3), "3 ready for you to send");
  assert.equal(readyLine(0), "Nothing waiting for you to send");
  assert.equal(emailsLine(true), "Emails: sent automatically");
  assert.equal(emailsLine(false), "Emails: wait for you to send");
  assert.equal(TEXTS_LINE, "Texts: open on your phone for you to send");
  assert.equal(planOrbLine(p1), "3 people on it · 3 ready");
  assert.equal(planOrbLine(readPlans(ROUTE)![1]), "Off");
  assert.equal(personStepLine(p1, "c3"), "On step 1: Day 0 · Email · Welcome");
  assert.equal(personStepLine(p1, "nobody"), null);
});

test("plans are orbs inside the Action Plans part, with their people as faces round them (live-shaped graph)", () => {
  const base = withOutreachNodes(liveGraph(MASTER, opts, {}), readOutreach(OUT));
  const part = movePageId("/action-plans");
  const g = withPlanNodes(base, readPlans(ROUTE));
  const plan = g.nodes.find((n) => n.id === planNodeId("p1"))!;
  assert.equal(plan.parentId, part);
  assert.equal(plan.status, "attention");
  assert.equal(plan.needCount, 3);
  assert.ok(g.edges.some((e) => e.source === part && e.target === plan.id));
  const ann = g.nodes.find((n) => n.id === planPersonNodeId("p1", "c1"))!;
  assert.equal(ann.type, "person");
  assert.equal(ann.parentId, plan.id);
  assert.equal(ann.contactId, "c1");
  const off = g.nodes.find((n) => n.id === planNodeId("p2"))!;
  assert.equal(off.secondaryLabel, "Off");
  assert.equal(off.status, undefined);
  // redrawn, not doubled; null takes them away
  const again = withPlanNodes(g, readPlans(ROUTE));
  assert.equal(again.nodes.filter((n) => n.id === plan.id).length, 1);
  assert.equal(withPlanNodes(g, null).nodes.some((n) => n.id.startsWith("plan:")), false);
});

test("no plans: one labelled example plan with two example people, no contact behind them (example agent too)", () => {
  const g = withPlanNodes(withOutreachNodes(demoGraph(), readOutreach(OUT)), []);
  const ex = g.nodes.find((n) => n.id === planNodeId("example"))!;
  assert.ok(ex, "the example plan is drawn");
  assert.match(ex.label, /^Example plan/);
  assert.equal(ex.secondaryLabel, "Example");
  const faces = g.nodes.filter((n) => n.parentId === ex.id);
  assert.deepEqual(faces.map((f) => f.label), ["Ann", "Raj"]);
  assert.ok(faces.every((f) => f.contactId === undefined));
  assert.equal(examplePlan().example, true);
});

test("orb ids name their plan and person", () => {
  assert.deepEqual(planOf(planNodeId("p1")), { planId: "p1", contactId: null });
  assert.deepEqual(planOf(planPersonNodeId("example", "example-ann")), { planId: "example", contactId: "example-ann" });
  assert.equal(planOf("move-7"), null);
  assert.ok(isPlanNode(planNodeId("p1")));
  assert.ok(!isPlanNode(planPersonNodeId("p1", "c1")));
});

test("suggest_plan is read; New VIP Onboarding is never suggested", () => {
  assert.deepEqual(readSuggestPlan({ plan_id: "p1", name: "New buyer" }), { planId: "p1", name: "New buyer" });
  assert.equal(readSuggestPlan({ plan_id: "p9", name: "New VIP Onboarding" }), null);
  assert.equal(readSuggestPlan(null), null);
  assert.equal(readSuggestPlan({ name: "x" }), null);
});

test("enroll: the plan comes back; ONE MOVE's words on a refusal", async () => {
  const sent: unknown[] = [];
  const ok = (body: unknown, status = 200) => (async (_u: unknown, init?: RequestInit) => (sent.push(JSON.parse(String(init?.body))), new Response(JSON.stringify(body), { status }))) as unknown as typeof fetch;
  const r = await enroll("p1", "c9", ok({ ok: true, plan: ROUTE.plans[1] }));
  assert.equal(r.ok, true);
  assert.equal(r.plan?.id, "p1");
  assert.deepEqual(sent[0], { plan_id: "p1", contact_id: "c9" });
  assert.equal((await enroll("p1", "c9", ok({ ok: false, error: "Already on this plan." }, 409))).error, "Already on this plan.");
  const down = (async () => { throw new Error("x"); }) as unknown as typeof fetch;
  assert.equal((await enroll("p1", "c9", down)).ok, false);
  const plans = readPlans(ROUTE)!;
  const changed = { ...plans[0], readyToSend: 9 };
  assert.equal(withPlan(plans, changed)[0].readyToSend, 9);
  assert.equal(withPlan(plans, changed).length, 2);
});

test("plan orbs replace the part's quiet placeholder orbs; a lit one stays (screen check 17 Oct)", () => {
  const partId = OUTREACH_PARTS.find((p) => p.key === "action_plans")!.ids[0];
  const g = {
    nodes: [
      { id: "move", type: "product", label: "ONE MOVE", product: "move", importance: 1 },
      { id: partId, type: "feature", label: "Action Plans", parentId: "move", product: "move", importance: 0.8 },
      { id: "old-plan", type: "feature", label: "Just Closed", parentId: partId, product: "move", importance: 0.5, status: "healthy" },
      { id: "lit", type: "feature", label: "Send step 2", parentId: partId, product: "move", importance: 0.5, status: "attention" },
    ] as GraphNode[],
    edges: [] as GraphEdge[],
  };
  const out = withPlanNodes(g, []);
  assert.ok(!out.nodes.some((n) => n.id === "old-plan"));
  assert.ok(out.nodes.some((n) => n.id === "lit"));
  assert.ok(out.nodes.some((n) => n.label.startsWith("Example plan")));
});
