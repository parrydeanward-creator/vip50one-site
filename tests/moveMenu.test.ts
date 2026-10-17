import { test } from "node:test";
import assert from "node:assert/strict";
import { MENU_ORB, MOVE_BOTTOM, MOVE_GROUPS, MOVE_MENU, MOVE_TOP, menuNodeId, moveGroupId, moveMenuHref } from "../lib/moveMenu.ts";
import { OPP_NODE } from "../lib/opportunities.ts";
import { LIFE_NODE } from "../lib/lifeEvents.ts";
import { DEALS_NODE } from "../lib/deals.ts";
import { liveGraph, type SummaryEnvelope, type SummaryItem } from "../lib/live.ts";

// Rewritten 3 Oct: the menu was one flat list in Classic order; Parry asked for
// the same 23 pages in five groups (People, Trackers, Events, Outreach, Learn),
// Dashboard on top and The Lounge and My Profile at the bottom.
// Rewritten 13 Oct: 25 pages. Referral Network and Buyer Needs join People (Parry: "you keep adding shit to the classic
// or old version and not the new one brain..you need to add to both. make that a hard rule.").
// Rewritten 14 Oct: 26 pages. Your listings joins People (LAUNCH.md, vip50-web-crm#228), under the same hard rule.
// Rewritten 16 Oct: 27 pages. Home Reports joins Outreach (HOME-REPORT.md §5.4; ONE MOVE's /home-reports), under the
// same hard rule.
// 28 since 16 Oct: Drop-By Map added (Parry: everything in ONE GO on ONE MOVE; vip50-web-crm#276).
// Rewritten 16 Oct: 29 pages. Scoreboard (ONE MOVE's /achievements, renamed by GO/MOVE in vip50-web-crm#278) joins
// Trackers, under the same hard rule.
// Rewritten 17 Oct: 32 pages. New to Sort becomes Opportunities at /opportunities (vip50-web-crm#293; Parry, 17 Oct:
// "calling it Opportunities"); Life Events (vip50-web-crm#294) and Deals join People; Overview (/outreach) is the first
// row of Outreach. Same hard rule (every feature in Classic and the Brain).
test("ONE MOVE menu: all 32 Classic pages, in Parry's groups, no admin items", () => {
  assert.equal(MOVE_MENU.length, 32);
  assert.deepEqual(MOVE_TOP.map((m) => m.label), ["Dashboard"]);
  assert.deepEqual(MOVE_GROUPS.map((g) => g.label), ["People", "Trackers", "Events", "Outreach", "Learn"]);
  assert.deepEqual(MOVE_BOTTOM.map((m) => m.label), ["The Lounge", "My Profile"]);
  // Rewritten 17 Oct: Home Reports is called Market Reports (HOME-REPORT v0.4; Parry, 16 Oct: "1 yes"); same path.
  assert.deepEqual(MOVE_GROUPS[0].pages.map((m) => m.label), ["Contacts", "VIP Management", "Touch Audit", "Drop-By Map", "Opportunities", "Hot/Warm/Cold", "Business Rolodex", "Referral Network", "Buyer Needs", "Your listings", "Life Events", "Deals"]);
  assert.deepEqual(MOVE_GROUPS[0].pages.filter((m) => ["Opportunities", "Life Events", "Deals"].includes(m.label)).map((m) => m.path), ["/opportunities", "/life-events", "/deals"]);
  assert.deepEqual(MOVE_GROUPS[3].pages.map((m) => [m.label, m.path]), [["Overview", "/outreach"], ["Newsletter", "/newsletter"], ["Landing Pages", "/landing-pages"], ["Action Plans", "/action-plans"], ["Market Reports", "/home-reports"]]);
  assert.deepEqual(MOVE_GROUPS[1].pages.map((m) => [m.label, m.path]), [["Daily Tracker", "/daily"], ["Weekly Tracker", "/weekly"], ["90-Day Challenge", "/challenge"], ["Scoreboard", "/achievements"], ["Analytics", "/analytics"]]);
  assert.ok(MOVE_MENU.every((m) => m.path.startsWith("/") && !m.path.startsWith("/admin") && m.path !== "/users"));
  assert.equal(new Set(MOVE_MENU.map((m) => m.path)).size, MOVE_MENU.length);
});

test("Opportunities, Life Events and Deals open their native orbs; the ids match the orbs'", async () => {
  const { IN_BRAIN, inBrainPage, movePageId } = await import("../lib/moveMenu.ts");
  assert.deepEqual(MENU_ORB, { "/opportunities": OPP_NODE, "/life-events": LIFE_NODE, "/deals": DEALS_NODE });
  assert.equal(menuNodeId("/opportunities"), OPP_NODE);
  assert.equal(menuNodeId("/life-events"), LIFE_NODE);
  assert.equal(menuNodeId("/deals"), DEALS_NODE);
  assert.equal(menuNodeId("/outreach"), movePageId("/outreach"));
  for (const p of Object.keys(MENU_ORB)) assert.ok(!IN_BRAIN.has(p), `${p} has no page frame`);
  // New to Sort left the menu but still opens inside the Brain (the New to Sort orb inside Opportunities)
  assert.ok(IN_BRAIN.has("/contacts/visitors"));
  assert.equal(inBrainPage(movePageId("/contacts/visitors"))?.label, "New to Sort");
  assert.equal(inBrainPage(movePageId("/outreach"))?.label, "Overview");
});

test("menu links open on move.vip50one.com", () => {
  assert.equal(moveMenuHref("/contacts/vip"), "https://move.vip50one.com/contacts/vip");
});

const follow: SummaryItem = { id: "go:task:ff01", kind: "follow_up", title: "Call Brian Irby", urgency: "alert", due: "2026-10-02", why: ["Due Oct 2."], link: "https://move.vip50one.com/contacts/x" };
const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [follow] };
const opts = { pkg: "relationship" as const, firstName: "P", reachable: true, today: "2026-10-03" };

test("the groups are orbs around ONE MOVE; each group holds its pages as orbs", () => {
  const g = liveGraph(MASTER, opts, {});
  const around = g.nodes.filter((n) => n.parentId === "move").map((n) => n.label);
  // Follow-ups added 17 Oct: a permanent orb directly on ONE MOVE (Parry, 16 Oct: "yes on follow ups")
  // Rewritten 17 Oct: New to Sort is a permanent orb directly on ONE MOVE too (walker, Parry 16 Oct: "yes"), not an orb
  // inside People; the menu keeps it under People.
  // Rewritten 17 Oct again: New to Sort moves inside Opportunities (Parry, 17 Oct: "yes on regrouping them. and calling
  // it Opportunities"), the one orb on ONE MOVE for New leads today, New to Sort, Looks Hot and Likely to move.
  assert.deepEqual(around, ["People", "Trackers", "Events", "Outreach", "Learn", "The Lounge", "My Profile", "Follow-ups", "Opportunities"]);
  // Rewritten 17 Oct: Opportunities, Life Events and Deals are native orbs (MENU_ORB), so they have no page orb in
  // their group; Opportunities sits on ONE MOVE and the Brain adds the other two.
  assert.ok(g.nodes.some((n) => n.id === OPP_NODE && n.parentId === "move"));
  for (const grp of MOVE_GROUPS) {
    for (const pg of grp.pages.filter((p) => !MENU_ORB[p.path])) assert.ok(g.nodes.some((n) => n.label === pg.label && n.parentId === (pg.label === "New to Sort" ? "move-opportunities" : moveGroupId(grp.key))), `${pg.label} under ${grp.label}`);
  }
  const mixer = g.nodes.find((n) => n.label === "Mixer")!;
  assert.equal(mixer.href, "https://move.vip50one.com/mixer");
});

// Rewritten 17 Oct: follow-ups moved out of People to their own orb directly on ONE MOVE (Parry, 16 Oct), so the
// overdue follow-up lights the Follow-ups orb red and People stays quiet when nothing else in it is due.
test("what needs the agent sits in its orb and lights it up", () => {
  const g = liveGraph(MASTER, opts, {});
  const fu = g.nodes.find((n) => n.id === "move-followups")!;
  assert.equal(fu.parentId, "move");
  assert.equal(fu.status, "action");
  assert.equal(fu.secondaryLabel, "1 overdue");
  assert.ok(g.nodes.some((n) => n.parentId === "move-followups" && n.label === "Call Brian Irby"));
  const people = g.nodes.find((n) => n.id === moveGroupId("people"))!;
  assert.notEqual(people.status, "action");
  const learn = g.nodes.find((n) => n.id === moveGroupId("learn"))!;
  assert.equal(learn.status, undefined);
});

test("no ONE MOVE account: the pages still show, nothing lit", () => {
  const g = liveGraph({ v: 1, product: "go", found: false, stats: [], items: [] }, opts, {});
  assert.ok(g.nodes.some((n) => n.label === "Daily Tracker" && n.parentId === moveGroupId("trackers")));
  assert.ok(!g.nodes.some((n) => n.parentId === "move" && n.status));
});

// Rewritten 3 Oct: VIP Management alone opened inside the Brain as a trial;
// Parry liked the full window, so every menu page now does
// except Dashboard (Classic's home, which has no orb).
test("every ONE MOVE menu page opens inside the Brain; other orbs do not", async () => {
  const { inBrainPage, movePageId, IN_BRAIN } = await import("../lib/moveMenu.ts");
  // 24 agent pages (Referral Network and Buyer Needs added 13 Oct), plus the 7 Coach pages for admins (Parry, 8 Oct:
  // the admin pages belong in the Brain too), plus Team Leads for team members (13 Oct); Your listings 14 Oct; Home
  // Reports 16 Oct (HOME-REPORT §5.4); Drop-By Map 16 Oct (vip50-web-crm#276); Scoreboard 16 Oct (vip50-web-crm#278)
  // Rewritten 17 Oct: 37. Overview (/outreach) joins; New to Sort keeps its page though it left the menu; Opportunities,
  // Life Events and Deals open native orbs, not page frames.
  assert.equal(IN_BRAIN.size, 37);
  assert.equal(inBrainPage(movePageId("/achievements"))?.label, "Scoreboard");
  assert.equal(inBrainPage(movePageId("/drop-by"))?.label, "Drop-By Map");
  assert.equal(inBrainPage(movePageId("/home-reports"))?.label, "Market Reports"); // renamed 17 Oct (HOME-REPORT v0.4)
  assert.equal(inBrainPage(movePageId("/listings"))?.label, "Your listings");
  assert.equal(inBrainPage(movePageId("/referral-network"))?.label, "Referral Network");
  assert.equal(inBrainPage(movePageId("/buyer-needs"))?.label, "Buyer Needs");
  assert.ok(IN_BRAIN.has("/team-leads"));
  assert.equal(inBrainPage(movePageId("/team-leads"))?.label, "Team Leads");
  assert.ok(!IN_BRAIN.has("/dashboard")); // Classic's home stays a link
  assert.equal(inBrainPage(movePageId("/contacts/vip"))?.label, "VIP Management");
  assert.equal(inBrainPage(movePageId("/contacts"))?.label, "Contacts");
  assert.equal(inBrainPage(movePageId("/lounge"))?.label, "The Lounge");
  assert.equal(inBrainPage("move"), null);
  assert.equal(inBrainPage("move-g-people"), null);
  assert.equal(inBrainPage("move-followups"), null);
});

test("group orbs and plain page orbs are told apart (no Open button, no hover card)", async () => {
  const { isMoveGroup, isMovePage, movePageId, moveGroupId } = await import("../lib/moveMenu.ts");
  assert.ok(isMoveGroup(moveGroupId("people")));
  assert.ok(!isMoveGroup("move"));
  assert.ok(isMovePage(movePageId("/contacts/vip")));
  assert.ok(!isMovePage(movePageId("/contacts/audit")));
  assert.ok(!isMovePage("move-followups"));
});

test("pages inside the Brain ask ONE MOVE for its embed look up front", async () => {
  const { moveEmbedHref } = await import("../lib/moveMenu.ts");
  assert.equal(moveEmbedHref("/contacts"), "https://move.vip50one.com/contacts?embed=1");
});

test("the Team Leads orb shows under People for a team member only", async () => {
  const { withTeamLeadsPage, movePageId } = await import("../lib/moveMenu.ts");
  const g = liveGraph(MASTER, opts, {});
  const id = movePageId("/team-leads");
  const on = withTeamLeadsPage(g, true).nodes.find((n) => n.id === id);
  assert.equal(on?.parentId, "move-g-people");
  assert.equal(withTeamLeadsPage(g, false).nodes.some((n) => n.id === id), false);
});
