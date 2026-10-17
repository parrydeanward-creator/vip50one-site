import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_PREFIX, agentIdOf, agentNodeId, cameIn, demoPeople, exampleLabel, exampleWar30, isEmptyWar, keptWords, nudgeText, peopleLine, peopleRollup,
  plainName, reachWords, readPeople, readWar30, reassignError, smsHref, standingStatus, STANDING_COLOUR, telHref, war30Line, withAgentFaces,
} from "../lib/teamPeople.ts";
import { TEAM_HUB, partLines, withTeamHub } from "../lib/teamHub.ts";
import { TEAM_NODE, demoTeam } from "../lib/team.ts";
import { WAR_NODE, demoWarRoom } from "../lib/warroom.ts";
import { ONB_NODE, demoOnboarding } from "../lib/onboarding.ts";
import { needsOf } from "../lib/needs.ts";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";

const now = Date.parse("2026-10-17T18:00:00Z");

test("standing colour: red stalled, yellow behind, green on track; the pulse follows", () => {
  assert.equal(standingStatus("stalled"), "action");
  assert.equal(standingStatus("behind"), "attention");
  assert.equal(standingStatus("on_track"), "healthy");
  assert.equal(STANDING_COLOUR.stalled, "#ff5a6a");
  assert.equal(STANDING_COLOUR.behind, "#f5c542");
  assert.equal(STANDING_COLOUR.on_track, "#7ee2a8");
});

test("rollup: stalled and behind count, red wins; none when all on track", () => {
  const ps = demoPeople().people;
  assert.deepEqual(peopleRollup(ps), { count: 2, level: "now" });
  assert.deepEqual(peopleRollup(ps.filter((p) => p.standing !== "stalled")), { count: 1, level: "today" });
  assert.equal(peopleRollup(ps.filter((p) => p.standing === "on_track")), null);
  assert.equal(peopleLine(ps), "5 agents: 1 stalled, 1 behind");
  assert.equal(peopleLine([]), "No agents on the team yet");
});

test("reach in plain words", () => {
  assert.equal(reachWords(12), "12 min");
  assert.equal(reachWords(12.4), "12 min");
  assert.equal(reachWords(60), "1 h");
  assert.equal(reachWords(65), "1 h 5 min");
  assert.equal(reachWords(1440), "1 day");
  assert.equal(reachWords(4000), "3 days");
  assert.equal(reachWords(null), "none reached yet");
  assert.equal(cameIn(new Date(now - 6 * 60000).toISOString(), now), "Came in 6 min ago");
  assert.equal(cameIn(new Date(now - 190 * 60000).toISOString(), now), "Came in 3 h ago");
  assert.equal(cameIn(new Date(now - 1500 * 60000).toISOString(), now), "Came in 1 day ago");
  assert.equal(keptWords(0.8), "80%");
  assert.equal(keptWords(null), null, "no commitments: say nothing");
});

test("examples are labelled everywhere they show", () => {
  const d = demoPeople();
  assert.equal(d.example, true);
  assert.equal(d.people.length, 5);
  assert.ok(d.people.every((p) => p.first.endsWith("(example)")));
  assert.equal(d.people.filter((p) => p.standing === "stalled").length, 1);
  assert.equal(d.people.filter((p) => p.standing === "behind").length, 1);
  assert.equal(d.people.filter((p) => p.isNew).length, 1);
  const w = exampleWar30(now);
  assert.equal(w.example, true);
  assert.ok(w.live.every((l) => l.first.endsWith("(example)") && (l.holderFirst ?? "").endsWith("(example)")));
  assert.ok(w.byAgent.every((a) => a.first.endsWith("(example)")));
  assert.equal(w.live.filter((l) => l.late).length, 1, "one late lead");
  assert.equal(w.live[0].late, true, "late first");
  assert.equal(exampleLabel(exampleLabel("Kara")), "Kara (example)");
  assert.equal(plainName("Kara (example)"), "Kara");
});

test("readPeople checks the route's answer; a 403 body is no answer", () => {
  assert.equal(readPeople({ error: "forbidden" }), null);
  assert.equal(readPeople(null), null);
  const r = readPeople({
    team: { name: "The Luxury Agency" },
    people: [
      { agent_id: "a", first_name: "Rachel", photo_url: "http://x/p.jpg", week_score: 104, standing: "on_track", new_30d: false, vip_touches: 22, commitments_kept: 0.75, leads_held: 3, avg_reach_minutes: 9.6, getting_started: null },
      { agent_id: "b", first_name: "Kyle", photo_url: "https://x/k.jpg", week_score: 20, standing: "stalled", new_30d: true, vip_touches: 0, commitments_kept: null, leads_held: 1, avg_reach_minutes: null, getting_started: { done: 3, total: 12 } },
      { agent_id: "b", first_name: "Dup" },
      { first_name: "No id" },
    ],
  })!;
  assert.equal(r.team, "The Luxury Agency");
  assert.deepEqual(r.people.map((p) => p.id), ["b", "a"], "stalled first");
  assert.equal(r.people[1].photo, null, "https only");
  assert.equal(r.people[1].avgReach, 10);
  assert.equal(r.people[0].kept, null);
  assert.deepEqual(r.people[0].start, { done: 3, total: 12 });
  assert.equal(r.people[0].phone, null, "the route sends no phone today");
});

test("readWar30 checks the route's answer and words the parts", () => {
  assert.equal(readWar30({ error: "forbidden" }), null);
  const w = readWar30({
    leads_in: 3,
    by_source: { team_site: 2, growth: 1 },
    by_agent: [{ agent_id: "a", first_name: "Rachel", leads: 2, avg_reach_minutes: 12, late: 1 }],
    live: [
      { contact_id: "c1", first_name: "Mia", source: "team_site", holder_id: "a", holder_first: "Rachel", at: new Date(now - 3600000).toISOString(), reached: true, late: false },
      { contact_id: "c2", first_name: "Ben", source: "team_ads", holder_id: "a", holder_first: "Rachel", at: new Date(now - 7200000).toISOString(), reached: false, late: true },
      { contact_id: "bad" },
    ],
    rotation_on: true,
    pond_count: 2,
  })!;
  assert.deepEqual(w.bySource, { team_site: 2, team_ads: 0, growth: 1, other: 0 });
  assert.deepEqual(w.live.map((l) => l.contactId), ["c2", "c1"], "late first");
  assert.equal(w.rotationOn, true);
  assert.equal(war30Line(w), "1 not reached in time");
  const empty = readWar30({ leads_in: 0, live: [], by_agent: [] })!;
  assert.equal(isEmptyWar(empty), true);
  assert.equal(war30Line(empty), "No team leads in the last 30 days");
  assert.equal(partLines({ lead: true, team: null, war: null, onb: null, now, war30: w }).war, "1 not reached in time");
});

test("Nudge, Call and Text open the lead's own phone; nothing without a number", () => {
  assert.equal(nudgeText("Kyle"), "Hi Kyle, checking in on your week. Anything I can help with?");
  assert.equal(smsHref(null, "x"), null);
  assert.equal(smsHref("(801) 555-0142", "Hi Kyle"), "sms:8015550142?&body=Hi%20Kyle");
  assert.equal(telHref("+1 801 555 0142"), "tel:+18015550142");
  assert.equal(reassignError(409, { error: "not_member" }), "That agent is not on the team any more. Pick someone else.");
  assert.equal(reassignError(404, { error: "not_found" }), "That lead was not found. It may have been removed in ONE MOVE.");
  assert.equal(reassignError(409, { error: "That agent left the team." }), "That agent left the team.");
});

const hubInput = (people = demoPeople()) => ({ lead: true, team: demoTeam("2026-10-12"), war: demoWarRoom(now), onb: demoOnboarding(), now, people, war30: exampleWar30(now) });

test("faces round the Team orb on the demo graph: coloured by standing, rolled up, three parts kept", () => {
  const base = {
    nodes: [
      { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
      { id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 0.95 },
    ],
    edges: [],
  } as Parameters<typeof withTeamHub>[0];
  const g = withTeamHub(base, hubInput());
  const kids = g.nodes.filter((n) => n.parentId === TEAM_HUB);
  for (const id of [TEAM_NODE, WAR_NODE, ONB_NODE]) assert.ok(kids.some((n) => n.id === id), `${id} stays`);
  const faces = kids.filter((n) => n.id.startsWith(AGENT_PREFIX));
  assert.equal(faces.length, 5);
  assert.ok(faces.every((n) => n.type === "person" && !n.label.includes("(example)") && n.secondaryLabel!.startsWith("Example")));
  const lisa = faces.find((n) => n.label === "Lisa")!;
  assert.equal(lisa.status, "action");
  assert.equal(agentIdOf(lisa.id), "x4");
  assert.ok(faces.find((n) => n.label === "Angelina")!.secondaryLabel!.includes("New"));
  const need = needsOf(g.nodes);
  assert.equal(need.get(lisa.id)?.level, "now");
  assert.equal(need.get(agentNodeId("x3"))?.level, "today");
  assert.equal(need.get(agentNodeId("x1")), undefined, "on track: still");
  assert.equal(need.get(TEAM_HUB)?.level, "now");
  assert.ok(need.get(TEAM_HUB)!.count >= 2);
  assert.equal(g.nodes.find((n) => n.id === WAR_NODE)!.secondaryLabel, "1 not reached in 15 min", "the 7-day read is late right now, so its line leads");
  assert.equal(withTeamHub(base, { ...hubInput(), war: null }).nodes.find((n) => n.id === WAR_NODE)!.secondaryLabel, "1 not reached in time");
  // rebuilt again: no duplicates; people gone (a 403): faces gone
  const again = withTeamHub(g, hubInput());
  assert.equal(again.nodes.filter((n) => n.id.startsWith(AGENT_PREFIX)).length, 5);
  assert.equal(withTeamHub(g, { ...hubInput(), people: null }).nodes.some((n) => n.id.startsWith(AGENT_PREFIX)), false);
});

test("faces on a live-shaped graph (liveGraph), and none for an agent who is not a lead", () => {
  const ENV: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [] };
  const g0 = liveGraph(ENV, { pkg: "complete", firstName: "Parry", reachable: true, today: "2026-10-17" });
  const live = readPeople({ people: [{ agent_id: "u1", first_name: "Rachel", photo_url: "https://cdn.example/r.jpg", week_score: 80, standing: "behind" }] });
  const g = withTeamHub(g0, { lead: true, team: null, war: null, onb: null, now, people: live, war30: null });
  const face = g.nodes.find((n) => n.id === agentNodeId("u1"))!;
  assert.equal(face.parentId, TEAM_HUB);
  assert.equal(face.image, "https://cdn.example/r.jpg");
  assert.equal(face.secondaryLabel, "80 this week · Behind");
  assert.equal(needsOf(g.nodes).get(TEAM_HUB)?.level, "today");
  const notLead = withTeamHub(g0, { lead: false, team: null, war: null, onb: null, now, people: null, war30: null });
  assert.equal(notLead.nodes.some((n) => n.id === TEAM_HUB || n.id.startsWith(AGENT_PREFIX)), false);
  assert.equal(withAgentFaces(g0, live, "no-such-parent").nodes.some((n) => n.id.startsWith(AGENT_PREFIX)), false);
});
