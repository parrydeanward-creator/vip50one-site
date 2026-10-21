import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { BROKER_NODE, MAX_BROKER_AGENTS, brokerSummaryLine, brokerUrl, cleanWarRoom, demoBroker, helpAgents, inactiveAgents, officeAgents, readBroker, withBrokerNode } from "../lib/broker.ts";
import { buildMorningPulse } from "../lib/morningPulse.ts";

const base = () => ({
  brokerage: { id: "b1", name: "Real Broker Utah", seats_used: 37, seats_included: 50 },
  week_start: "2026-10-19",
  offices: [
    { id: "o1", name: "Draper", agents: 22, active_7d: 17, avg_score: 64, teams: [{ id: "t1", name: "Luxury Agency", agents: 6, avg_score: 71, war_room_url: "https://move.vip50one.com/team/war-room?team=t1" }] },
  ],
  agents: [
    { user_id: "u1", first_name: "Julie", last_name: "S", photo_url: null, office_id: "o1", team_id: "t1", score: 82, last4: [70, 75, 80, 82], last_active: "2026-10-21T13:02:00Z", needs_help: false },
  ],
  summary: { active_7d: 30, inactive_14d: 4, needs_help: 3, top_office_id: "o1" },
});

test("brokerUrl is ONE MOVE's route", () => {
  assert.equal(brokerUrl(), "https://move.vip50one.com/api/brain/broker");
});

test("readBroker rejects junk", () => {
  for (const j of [null, undefined, 5, "x", [], {}, { brokerage: { id: "b", name: "N" } }, { ...base(), offices: "no" }, { ...base(), agents: {} }, { ...base(), brokerage: { id: "", name: "N" } }, { ...base(), brokerage: [] }]) {
    assert.equal(readBroker(j), null);
  }
});

test("readBroker keeps the §3ao shape and nothing else: no contact or goal field passes", () => {
  const j = base();
  Object.assign(j.agents[0], { phone: "801", email: "a@b.c", contacts: [{ name: "Bob" }], goal_amount: 500000, commitments: ["call"], notes: "x" });
  Object.assign(j.offices[0], { contacts: [1], goal: 9 });
  Object.assign(j, { contacts: [1], goals: [2] });
  const b = readBroker(j)!;
  const flat = JSON.stringify(b);
  for (const bad of ["phone", "801", "a@b.c", "Bob", "500000", "commitments", "notes", "goal", "contacts"]) assert.ok(!flat.includes(bad), bad);
  assert.deepEqual(Object.keys(b.agents[0]).sort(), ["first", "id", "last", "last4", "lastActive", "needsHelp", "officeId", "photo", "score", "teamId"]);
  assert.deepEqual(Object.keys(b.offices[0]).sort(), ["active7d", "agents", "avgScore", "id", "name", "teams"]);
  assert.equal(b.brokerage.seatsUsed, 37);
  assert.equal(b.brokerage.seatsIncluded, 50);
  assert.deepEqual(b.summary, { active7d: 30, inactive14d: 4, needsHelp: 3, topOfficeId: "o1" });
});

test("readBroker: agents sorted by score, no repeats, at most 500", () => {
  const j = base();
  j.agents = [
    { ...j.agents[0], user_id: "a", first_name: "Amy", score: 40 },
    { ...j.agents[0], user_id: "b", first_name: "Ben", score: 90 },
    { ...j.agents[0], user_id: "b", first_name: "Ben again", score: 1 },
    { ...j.agents[0], user_id: "", first_name: "No id" },
    { ...j.agents[0], user_id: "c", first_name: "" },
  ];
  assert.deepEqual(readBroker(j)!.agents.map((a) => a.id), ["b", "a"]);
  const many = { ...base(), agents: Array.from({ length: 700 }, (_, i) => ({ user_id: `u${i}`, first_name: `A${i}`, score: i, office_id: "o1" })) };
  const out = readBroker(many)!.agents;
  assert.equal(out.length, MAX_BROKER_AGENTS);
  assert.equal(out[0].score, 699);
});

test("office scoping is kept: an office manager's answer carries one office and agents outside it are not placed", () => {
  const j = base();
  j.agents.push({ ...j.agents[0], user_id: "u2", first_name: "Ghost", office_id: "o-other" });
  const b = readBroker(j)!;
  assert.deepEqual(b.offices.map((o) => o.id), ["o1"]);
  assert.deepEqual(officeAgents(b, "o1").map((a) => a.id), ["u1"]);
  assert.equal(b.agents.find((a) => a.id === "u2")!.officeId, null);
  assert.equal(readBroker({ ...j, summary: { ...j.summary, top_office_id: "o-other" } })!.summary.topOfficeId, null);
});

test("war room addresses are ONE MOVE's own https address or dropped", () => {
  assert.equal(cleanWarRoom("https://move.vip50one.com/team/war-room?team=t1"), "https://move.vip50one.com/team/war-room?team=t1");
  for (const bad of ["http://move.vip50one.com/x", "https://evil.example/x", "https://move.vip50one.com.evil.example/x", "https://u:p@move.vip50one.com/x", "https://move.vip50one.com:8443/x", "javascript:alert(1)", "", null, 7]) {
    assert.equal(cleanWarRoom(bad), null, String(bad));
  }
  const j = base();
  j.offices[0].teams[0].war_room_url = "https://evil.example/x";
  assert.equal(readBroker(j)!.offices[0].teams[0].warRoomUrl, null);
});

test("the lists behind the counts: needs help, and quiet for 14 days", () => {
  const b = demoBroker("2026-10-19", Date.parse("2026-10-21T12:00:00Z"));
  assert.equal(helpAgents(b).length, b.summary.needsHelp);
  assert.equal(inactiveAgents(b, Date.parse("2026-10-21T12:00:00Z")).length, b.summary.inactive14d);
  assert.ok(b.offices.every((o) => officeAgents(b, o.id).length === o.agents));
});

test("brokerSummaryLine: one line from the summary", () => {
  const b = readBroker(base())!;
  assert.equal(brokerSummaryLine(b), "Real Broker Utah: 30 agents were active in the last 7 days, 4 have been quiet for 14 days, 3 need a word from you. Draper leads the week.");
  const calm = readBroker({ ...base(), summary: { active_7d: 1, inactive_14d: 0, needs_help: 0 } })!;
  assert.equal(brokerSummaryLine(calm), "Real Broker Utah: 1 agent was active in the last 7 days.");
  assert.equal(brokerSummaryLine(null), null);
});

test("the Morning Pulse says the broker line before the plan, and nothing without one", () => {
  const input = { firstName: "Parry", greeting: "Good morning", evening: false, morning: null, eveningAnswer: null, known: { planCount: 0, needs: [] } };
  const withLine = buildMorningPulse({ ...input, broker: "Line." });
  assert.equal(withLine[withLine.length - 2].words, "Line.");
  assert.ok(!buildMorningPulse(input).some((b) => b.id === "broker"));
});

test("withBrokerNode: an orb under ONE MOVE only when the route answered", () => {
  const node = (id: string, locked = false): GraphNode => ({ id, type: "product", label: id, product: "move", importance: 1, locked } as GraphNode);
  const g = { nodes: [node("move")], edges: [] as GraphEdge[] };
  const b = readBroker(base())!;
  const on = withBrokerNode(g, b);
  assert.ok(on.nodes.some((n) => n.id === BROKER_NODE && n.parentId === "move"));
  assert.equal(on.edges.length, 1);
  assert.ok(!withBrokerNode(on, null).nodes.some((n) => n.id === BROKER_NODE));
  assert.ok(!withBrokerNode({ nodes: [node("move", true)], edges: [] }, b).nodes.some((n) => n.id === BROKER_NODE));
  assert.equal(withBrokerNode(on, b).nodes.filter((n) => n.id === BROKER_NODE).length, 1);
});

test("rule 12: the Broker screen gives every count, name and team an action", () => {
  const v = readFileSync(new URL("../components/brain/BrokerView.tsx", import.meta.url), "utf8");
  assert.match(v, /list: "inactive"/); // quiet count opens its people
  assert.match(v, /list: "help"/); // needs-help count opens its people
  assert.match(v, /<NudgeButton a=\{a\} \/>/); // each agent row
  assert.match(v, /warRoomUrl/); // each team opens its war room
  assert.match(v, /productLink\(t\.warRoomUrl\)/);
  assert.match(v, /rel="noopener noreferrer"/);
  const b = readFileSync(new URL("../components/brain/Brain.tsx", import.meta.url), "utf8");
  assert.match(b, /id === BROKER_NODE\) return setBrokerOpen\(true\)/);
});
