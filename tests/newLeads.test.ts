import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { LEADS_NODE, demoNewLeads, readNewLeads, withNewLeadsNode } from "../lib/newLeads.ts";

test("new leads: checked, untouched first", () => {
  assert.equal(readNewLeads(null), null);
  assert.equal(readNewLeads({ new_leads: {} }), null);
  const l = readNewLeads({ today: "2026-10-14", new_leads: { people: [
    { id: "a", name: "Reached", touched: true, at: "2026-10-14T16:00:00Z" },
    { id: "b", name: "Waiting", touched: false, at: "2026-10-14T10:00:00Z" },
    { id: "b", name: "Dup" }, { name: "No id" },
  ] } })!;
  assert.deepEqual(l.people.map((p) => p.id), ["b", "a"]);
  assert.equal(l.count, 2);
  assert.equal(l.untouched, 1);
});

// Rewritten 17 Oct: New leads today is one of Opportunities' four parts and always there (Parry, 17 Oct), so a day
// with no new leads shows a still green ring and "None yet today" instead of no orb.
test("the orb is red while anyone is unreached, green when all are, green and plain with none", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 1 }], edges: [] };
  const red = withNewLeadsNode(g, demoNewLeads());
  const orb = red.nodes.find((n) => n.id === LEADS_NODE)!;
  assert.equal(orb.status, "action");
  assert.equal(orb.needCount, 1);
  assert.equal(red.nodes.filter((n) => n.parentId === LEADS_NODE).length, 2);
  const all = demoNewLeads();
  const green = withNewLeadsNode(g, { ...all, untouched: 0, people: all.people.map((p) => ({ ...p, touched: true })) });
  assert.equal(green.nodes.find((n) => n.id === LEADS_NODE)!.status, "healthy");
  const none = withNewLeadsNode(g, { today: null, count: 0, untouched: 0, people: [] }).nodes.find((n) => n.id === LEADS_NODE)!;
  assert.equal(none.status, "healthy");
  assert.equal(none.secondaryLabel, "None yet today");
  assert.equal(none.needCount, undefined);
  assert.equal(withNewLeadsNode(g, null).nodes.find((n) => n.id === LEADS_NODE)!.status, undefined);
});

import { firstText, lastTryLine, leadCardMode, leadOf, postOutcome, retryLine, whereFrom, withOutcome } from "../lib/newLeads.ts";

const NOW = Date.parse("2026-10-18T01:25:00Z"); // 7:25 pm Sat 17 Oct, Denver
const live = () =>
  readNewLeads({ today: "2026-10-17", new_leads: { count: 1, untouched: 2, people: [
    { id: "a", name: "No name", first_name: null, name_missing: true, source: "Zillow", at: "2026-10-17T12:25:00Z", created_at: "2026-10-17T12:25:00Z", today: true, touched: false, reached: false, attempts: 0, last_attempt: null, follow_up_on: null },
    { id: "b", name: "Bo Diaz", first_name: "Bo", name_missing: false, source: "Website", created_at: "2026-10-15T15:00:00Z", today: false, touched: false, attempts: 2, last_attempt: { outcome: "no_answer", at: "2026-10-17T20:10:00Z" }, follow_up_on: "2026-10-18" },
  ] } })!;

test("new leads: the live shape is read, today's count kept, earlier unreached carried", () => {
  const l = live();
  assert.equal(l.count, 1);
  assert.equal(l.untouched, 2);
  const a = leadOf(l, "a")!;
  assert.equal(a.nameMissing, true);
  assert.equal(a.name, "No name");
  assert.equal(a.firstName, null);
  const b = leadOf(l, "b")!;
  assert.equal(b.today, false);
  assert.equal(b.attempts, 2);
  assert.deepEqual(b.lastAttempt, { outcome: "no_answer", at: "2026-10-17T20:10:00Z" });
  assert.equal(leadOf(l, "zz"), null);
  assert.equal(leadOf(null, "a"), null);
});

test("new leads: the orb stays while an earlier lead is unreached, and each line carries the clock", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 1 }], edges: [] };
  const only = { ...live(), count: 0, people: live().people.filter((p) => p.id === "b") };
  const out = withNewLeadsNode(g, only, NOW);
  assert.equal(out.nodes.find((n) => n.id === LEADS_NODE)!.status, "action");
  const bo = out.nodes.find((n) => n.id === `${LEADS_NODE}:b`)!;
  assert.equal(bo.secondaryLabel, "Came in Thu 9:00 am · Website · not reached yet");
  assert.match(bo.summary!, /Try again tomorrow morning/);
  const all = withNewLeadsNode(g, live(), NOW);
  assert.equal(all.nodes.find((n) => n.id === `${LEADS_NODE}:a`)!.label, "No name");
});

test("lead card: reach until reached, then sort, then the VIP boxes again", () => {
  const l = live();
  assert.equal(leadCardMode(null), "none");
  assert.equal(leadCardMode(leadOf(l, "a")), "reach");
  const r = withOutcome(l, "a", "reached", null, "2026-10-18T01:26:00Z");
  assert.equal(leadCardMode(leadOf(r, "a")), "sort");
  assert.equal(leadCardMode(leadOf(r, "a"), true), "none");
  assert.equal(r.untouched, 1);
});

test("outcomes: left a message and no answer count a try and say when to try again", () => {
  const l = withOutcome(live(), "a", "left_message", "later_today", "2026-10-17T20:00:00Z");
  const a = leadOf(l, "a")!;
  assert.equal(a.touched, false);
  assert.equal(a.attempts, 1);
  assert.equal(l.untouched, 2);
  assert.equal(retryLine(a, NOW), "Try again later today");
  assert.equal(lastTryLine(a, NOW), "Last try: left a message, 2:00 pm · 1 try");
  const b = leadOf(live(), "b")!;
  assert.equal(retryLine(b, NOW), "Try again tomorrow morning");
  assert.equal(lastTryLine(b, NOW), "Last try: no answer, 2:10 pm · 2 tries");
  assert.equal(lastTryLine(leadOf(live(), "a")!, NOW), null);
  assert.equal(retryLine({ ...b, touched: true }, NOW), null);
});

test("outcomes: the route's answer is read; its words show on a refusal", async () => {
  const ok = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  assert.deepEqual(await postOutcome("a", "no_answer", ok({ ok: true, outcome: "no_answer", follow_up: { task_id: "t", due_date: "2026-10-18", when: "tomorrow_morning" } })), { ok: true, when: "tomorrow_morning", error: null });
  assert.deepEqual(await postOutcome("a", "reached", ok({ ok: true, outcome: "reached" })), { ok: true, when: null, error: null });
  assert.equal((await postOutcome("a", "reached", ok({ ok: false, error: "Not found." }, 404))).error, "Not found.");
  const down = (async () => { throw new Error("x"); }) as unknown as typeof fetch;
  assert.equal((await postOutcome("a", "reached", down)).ok, false);
});

test("lead card words: where from and Pulse's first text", () => {
  assert.equal(whereFrom("Zillow", ["Zillow", "Asked about 12 Oak St"]), "Came in from Zillow · Asked about 12 Oak St");
  assert.equal(whereFrom(null), "Came in on their own");
  assert.equal(firstText("Ann", "Website Property Valuation", "Parry"), "Hi Ann, this is Parry. Thanks for asking about your home's value. I'll put the numbers together for you. When is a good time for a quick call?");
  assert.equal(firstText(null, "Zillow"), "Hi. Thanks for reaching out on Zillow. When is a good time for a quick call?");
  assert.match(firstText("Cy", "Open house"), /stopping by the open house/);
});

test("the demo has one example lead with a clock and a try", () => {
  const d = demoNewLeads(NOW);
  const ann = leadOf(d, "n1")!;
  assert.equal(leadCardMode(ann), "reach");
  assert.equal(retryLine(ann, NOW), "Try again later today");
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 1 }], edges: [] };
  assert.match(withNewLeadsNode(g, d, NOW).nodes.find((n) => n.id === `${LEADS_NODE}:n1`)!.secondaryLabel!, /^Came in 7:05 pm · 20 minutes ago/);
});

// walker 0245 (17 Oct): Reached may come back with a plan to suggest; the lead's name is saved in place.
test("Reached with suggest_plan: the plan is offered; New VIP Onboarding never is", async () => {
  const ok = (body: unknown) => (async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
  assert.deepEqual(await postOutcome("a", "reached", ok({ ok: true, outcome: "reached", suggest_plan: { plan_id: "p1", name: "New buyer" } })), { ok: true, when: null, error: null, suggestPlan: { planId: "p1", name: "New buyer" } });
  assert.deepEqual(await postOutcome("a", "reached", ok({ ok: true, outcome: "reached", suggest_plan: { plan_id: "p2", name: "New VIP Onboarding" } })), { ok: true, when: null, error: null });
  assert.deepEqual(await postOutcome("a", "reached", ok({ ok: true, outcome: "reached", suggest_plan: null })), { ok: true, when: null, error: null });
});

test("the lead's name: trimmed, 60 at most, one of them typed; the route's words on a refusal", async () => {
  const { nameBody, saveName, personUrl } = await import("../lib/newLeads.ts");
  assert.deepEqual(nameBody("  Ann ", " Lee "), { ok: true, fields: { first_name: "Ann", last_name: "Lee" }, name: "Ann Lee" });
  assert.deepEqual(nameBody("Ann", ""), { ok: true, fields: { first_name: "Ann", last_name: "" }, name: "Ann" });
  assert.equal(nameBody(" ", "").ok, false);
  assert.equal(nameBody("x".repeat(61), "").ok, false);
  assert.equal(personUrl("a b"), "https://move.vip50one.com/api/brain/people/a%20b");
  let body: unknown = null;
  const ok = (j: unknown, status = 200) => (async (_u: unknown, init?: RequestInit) => ((body = JSON.parse(String(init?.body))), new Response(JSON.stringify(j), { status }))) as unknown as typeof fetch;
  assert.deepEqual(await saveName("c1", " Ann", "Lee ", ok({ ok: true })), { ok: true, name: "Ann Lee", error: null });
  assert.deepEqual(body, { fields: { first_name: "Ann", last_name: "Lee" } });
  assert.equal((await saveName("c1", "Ann", "", ok({ ok: false, error: "Contact not found." }, 404))).error, "Contact not found.");
  assert.equal((await saveName("c1", "", "", ok({ ok: true }))).error, "Type a first or last name.");
});
