import { test } from "node:test";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import assert from "node:assert/strict";
import { SLOW_MINUTES, WAR_NODE, agentLines, demoWarRoom, leadLevel, minutesWords, readWarRoom, totals, warLine, withWarRoomNode } from "../lib/warroom.ts";

const now = Date.parse("2026-10-13T17:00:00Z"); // 11:00 in Denver

test("readWarRoom refuses a caller with no team and a wrong shape", () => {
  assert.equal(readWarRoom(null, null), null);
  assert.equal(readWarRoom({ team: null, leads: [], pond: [], members: [] }, { log: [] }), null);
  assert.equal(readWarRoom({ team: { slug: "x", name: "X", role: "boss" } }, null), null);
});

test("readWarRoom keeps good leads, drops bad ones, newest first", () => {
  const w = readWarRoom(
    {
      team: { slug: "luxury-agency", name: "The Luxury Agency", role: "owner" },
      leads: [
        { id: "a", status: "assigned", name: "Old", arrived_at: "2026-10-12T10:00:00Z", assigned_to: "u1", assigned_name: "Annette", contacted: true, minutes_to_contact: 7 },
        { id: "b", status: "assigned", name: "New", arrived_at: "2026-10-13T16:50:00Z", assigned_to: "u1", contacted: false, minutes_to_contact: null },
        { id: "c", status: "weird", arrived_at: "2026-10-13T16:50:00Z" },
        { id: "d", status: "assigned", arrived_at: "not a date" },
      ],
      pond: [{ id: "p", status: "pond", name: "Pool", arrived_at: "2026-10-13T16:00:00Z" }],
      members: [{ user_id: "u1", name: "Annette", role: "admin" }, { user_id: "u2" }],
    },
    { log: [{ id: 1, at: "2026-10-13T16:50:00Z", event: "assigned", words: "Assigned", to: "Annette" }, { at: "bad" }] },
  )!;
  assert.deepEqual(w.leads.map((l) => l.id), ["b", "a"]);
  assert.equal(w.pond.length, 1);
  assert.deepEqual(w.members.map((m) => m.id), ["u1"]);
  assert.equal(w.log.length, 1);
  assert.equal(w.leads[1].minutes, 7);
});

test("a lead turns red only after the window and green once reached", () => {
  const w = demoWarRoom(now);
  const byId = new Map(w.leads.map((l) => [l.id, l]));
  assert.equal(leadLevel(byId.get("w1")!, now), "now"); // 42 min, not reached
  assert.equal(leadLevel(byId.get("w2")!, now), "today"); // 6 min, inside the window
  assert.equal(leadLevel(byId.get("w3")!, now), null); // reached
  assert.equal(leadLevel(w.pond[0], now), "today");
  assert.ok(SLOW_MINUTES === 15);
});

test("totals and the plain line", () => {
  const w = demoWarRoom(now);
  const t = totals(w, now);
  assert.equal(t.waiting, 2);
  assert.equal(t.late, 1);
  assert.equal(t.pond, 1);
  assert.equal(t.reached, 3);
  assert.equal(t.median, 9); // 4, 9, 22
  assert.equal(t.today, 5); // all but the one from 25 hours ago (still 12 Oct in Denver)
  assert.equal(warLine(t), "1 not reached in 15 min");
  assert.equal(warLine({ ...t, late: 0 }), "2 waiting to be reached");
  assert.equal(warLine({ today: 0, waiting: 0, late: 0, pond: 0, reached: 0, median: null, deals: 0, dueToday: 0 }), "All team leads reached");
  assert.equal(warLine({ today: 0, waiting: 0, late: 0, pond: 0, reached: 0, median: null, deals: 1, dueToday: 1 }), "1 deal deadline today");
});

test("agent lines put the late first and keep quiet members", () => {
  const lines = agentLines(demoWarRoom(now), now);
  // Rewritten 15 Oct on purpose: the example war room uses invented names (Annette and Travis are real team members).
  assert.equal(lines[0].name, "Rachel");
  assert.equal(lines[0].late, 1);
  const travis = lines.find((l) => l.name === "Kyle")!;
  assert.equal(travis.waiting, 1);
  assert.equal(travis.median, 9);
  const jen = lines.find((l) => l.name === "Jen")!;
  assert.equal(jen.leads, 0);
  assert.equal(jen.median, null);
});

test("minutesWords", () => {
  assert.equal(minutesWords(null), "not yet");
  assert.equal(minutesWords(4), "4 min");
  assert.equal(minutesWords(90), "1.5 h");
  assert.equal(minutesWords(2880), "2 days");
});

test("the orb shows for owners and admins only, red, yellow or green", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const w = demoWarRoom(now);
  const red = withWarRoomNode(g, w, now).nodes.find((n) => n.id === WAR_NODE)!;
  assert.equal(red.status, "action");
  assert.equal(red.needCount, 3);
  const calm = { ...w, leads: w.leads.map((l) => ({ ...l, contacted: true })), pond: [] };
  assert.equal(withWarRoomNode(g, calm, now).nodes.find((n) => n.id === WAR_NODE)!.status, "healthy");
  const soon = { ...w, leads: w.leads.filter((l) => l.id !== "w1") };
  assert.equal(withWarRoomNode(g, soon, now).nodes.find((n) => n.id === WAR_NODE)!.status, "attention");
  const agent = { ...w, team: { ...w.team, role: "agent" as const } };
  assert.equal(withWarRoomNode(g, agent, now).nodes.some((n) => n.id === WAR_NODE), false);
  assert.equal(withWarRoomNode(g, null, now).nodes.some((n) => n.id === WAR_NODE), false);
  const locked = { nodes: [{ ...g.nodes[0], locked: true }], edges: [] };
  assert.equal(withWarRoomNode(locked, w, now).nodes.some((n) => n.id === WAR_NODE), false);
});

test("team deals: checked, nearest deadline first, closed last, a deadline today counts", async () => {
  const { readTeamDeals, dealLevel } = await import("../lib/warroom.ts");
  const d = readTeamDeals({
    deals: [
      { id: "c", agent: { user_id: "u1", name: "Annette" }, client: "Closed One", side: "sell", status: "closed", next: { label: "Settlement", on: "2026-10-01" } },
      { id: "b", agent: { user_id: "u2", name: "Travis" }, client: "Later", side: "buy", status: "under_contract", next: { label: "Settlement", on: "2026-10-30" } },
      { id: "a", agent: { user_id: "u1", name: "Annette" }, client: "Soon", side: "buy", status: "under_contract", next: { label: "Due diligence", on: "2026-10-13" } },
      { id: "x", agent: { user_id: "u1" }, status: "fell_through" },
      { id: "y", status: "under_contract" },
    ],
  });
  assert.deepEqual(d.map((x) => x.id), ["a", "b", "c"]);
  assert.equal(d[2].next, null);
  assert.equal(dealLevel(d[0], "2026-10-13"), "today");
  assert.equal(dealLevel(d[1], "2026-10-13"), null);
  assert.deepEqual(readTeamDeals(null), []);
  assert.deepEqual(readTeamDeals({ error: "Only the team lead or an admin can see the team deals." }), []);
  const w = demoWarRoom(now);
  assert.equal(totals(w, now).deals, 2);
  assert.equal(totals(w, now).dueToday, 0);
});
