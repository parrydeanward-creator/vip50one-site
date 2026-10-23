import { test } from "node:test";
import assert from "node:assert/strict";
import { IN_BRAIN, MENU_ORB, MOVE_BOTTOM, MOVE_GROUPS, MOVE_MENU, MOVE_TOP, menuNodeId, moveGroupId, moveMenuHref } from "../lib/moveMenu.ts";
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
// Rewritten 17 Oct (walker 0245): 33 pages. Learn home (/learn) is the first row of Learn, under the same hard rule.
// Rewritten 21 Oct: 39 pages. The Classic-only pages join (Parry: "everything on classic needs to be on the Brain as
// well"): Import, Clean Up, Archived and Lead Sources in People, Tasks in Trackers, Agent Hub in People beside the Referral Network.
// Rewritten 23 Oct (second): 35 pages. Agent Hub (retired) and Import Contacts (a button on My Contacts) leave the menu;
// Import still opens inside the Brain from that button (MOVE_BUTTON_PAGES). Coaching joins the Coach group.
// Rewritten 23 Oct: 37 pages. Buyer Needs and Your listings leave the menu (Parry, 23 Oct: "retire buyers needs";
// "retire your listings already on the website"). Rewritten again 23 Oct: 34, Archived Contacts leaves the menu
// (Parry: "I dont want the archived contacts orb on one move"); it stays a link on My Contacts.
// Rewritten 23 Oct (third): 35. "Who is on my site" joins People (VIP-SUMMARY §3ar; Parry: "yes build it. looks great"),
// a native Brain view at ONE MOVE's /on-my-site, under the same hard rule (Classic and the Brain).
// Rewritten 23 Oct (fourth): 36. Contacts holds Import and Clean Up (Parry, 23 Oct: "move import contacts and clean up
// contacts under contacts orb ... three orbs now under contacts, contacts, import and clean"): Clean Up Contacts leaves the
// People rows and comes back as a part of Contacts, and Import becomes a part of Contacts again (+1).
test("ONE MOVE menu: all 36 Classic pages, in Parry's groups, no admin items", () => {
  assert.equal(MOVE_MENU.length, 36);
  assert.deepEqual(MOVE_TOP.map((m) => m.label), ["Dashboard"]);
  assert.deepEqual(MOVE_GROUPS.map((g) => g.label), ["People", "Trackers", "Events", "Outreach", "Learn"]);
  assert.deepEqual(MOVE_BOTTOM.map((m) => m.label), ["The Lounge", "My Profile"]);
  // Rewritten 17 Oct: Home Reports is called Market Reports (HOME-REPORT v0.4; Parry, 16 Oct: "1 yes"); same path.
  assert.deepEqual(MOVE_GROUPS[0].pages.map((m) => m.label), ["Contacts", "VIP Management", "Touch Audit", "Drop-By Map", "Opportunities", "Hot/Warm/Cold", "Who is on my site", "Business Rolodex", "Referral Network", "Life Events", "Deals", "Lead Sources"]);
  // the parts of Contacts, right after it in menu order
  assert.deepEqual(MOVE_GROUPS[0].pages[0].kids?.map((m) => [m.label, m.path]), [["Import", "/contacts/import"], ["Clean Up", "/contacts/cleanup"]]);
  assert.deepEqual(MOVE_MENU.slice(1, 4).map((m) => m.label), ["Contacts", "Import", "Clean Up"]);
  assert.deepEqual(MOVE_GROUPS[0].pages.filter((m) => ["Opportunities", "Life Events", "Deals"].includes(m.label)).map((m) => m.path), ["/opportunities", "/life-events", "/deals"]);
  assert.deepEqual(MOVE_GROUPS[3].pages.map((m) => [m.label, m.path]), [["Overview", "/outreach"], ["Newsletter", "/newsletter"], ["Landing Pages", "/landing-pages"], ["Action Plans", "/action-plans"], ["Market Reports", "/home-reports"]]);
  assert.deepEqual(MOVE_GROUPS[4].pages.map((m) => [m.label, m.path]), [["Learn home", "/learn"], ["Video Library", "/content"], ["VIP Docs", "/vip-docs"], ["The Vault", "/vault"], ["What's New", "/whats-new"]]);
  assert.deepEqual(MOVE_GROUPS[1].pages.map((m) => [m.label, m.path]), [["Tasks", "/tasks"], ["Daily Tracker", "/daily"], ["Weekly Tracker", "/weekly"], ["90-Day Challenge", "/challenge"], ["Scoreboard", "/achievements"], ["Analytics", "/analytics"]]);
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
  // Rewritten 17 Oct (walker 0245): 38. Learn home (/learn) joins and opens inside the Brain.
  // Rewritten 21 Oct: 47. The Classic-only pages join (Parry: "everything on classic needs to be on the Brain"): Import,
  // Clean Up, Archived, Lead Sources, Agent Hub, Tasks, and for admins Pulse Tests, Coach Table and Communications.
  // Rewritten 23 Oct: 45. Buyer Needs and Your listings retired (Parry, 23 Oct); neither opens in the Brain now.
  // Rewritten 23 Oct (second): still 45. Agent Hub leaves (-1), Coaching joins the Coach group (+1); Import Contacts left the
  // menu but stays a page the My Contacts Import button opens.
  // Rewritten 23 Oct (third): 46. "Who is on my site" (/on-my-site, VIP-SUMMARY §3ar) joins People and opens inside the Brain.
  // Still 46 on 23 Oct (fourth): Import and Clean Up are parts of the Contacts orb now; both still open inside the Brain.
  assert.equal(IN_BRAIN.size, 46);
  assert.ok(!IN_BRAIN.has("/profile/agent-hub"));
  assert.equal(inBrainPage(movePageId("/coaching"))?.label, "Coaching");
  // Rewritten 23 Oct (fourth): Import is a part of the Contacts orb, named as Parry named it ("contacts, import and clean").
  assert.equal(inBrainPage(movePageId("/contacts/import"))?.label, "Import");
  assert.equal(inBrainPage(movePageId("/contacts/cleanup"))?.label, "Clean Up");
  assert.equal(inBrainPage(movePageId("/communications"))?.label, "Communications");
  assert.equal(inBrainPage(movePageId("/learn"))?.label, "Learn home");
  assert.equal(inBrainPage(movePageId("/achievements"))?.label, "Scoreboard");
  assert.equal(inBrainPage(movePageId("/drop-by"))?.label, "Drop-By Map");
  assert.equal(inBrainPage(movePageId("/home-reports"))?.label, "Market Reports"); // renamed 17 Oct (HOME-REPORT v0.4)
  assert.equal(inBrainPage(movePageId("/listings")), null);
  assert.equal(inBrainPage(movePageId("/referral-network"))?.label, "Referral Network");
  assert.equal(inBrainPage(movePageId("/buyer-needs")), null);
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

test("Archived Contacts has no orb or menu row, but still opens inside the Brain from My Contacts (Parry, 23 Oct)", () => {
  assert.ok(!MOVE_MENU.some((m) => m.path === "/contacts/archived"));
  assert.ok(IN_BRAIN.has("/contacts/archived"));
});

// Parry, 23 Oct: "move import contacts and clean up contacts under contacts orb please. so there will be three orbs now
// under contacts, contacts, import and clean". Checked on a live-shaped graph (the example agent has no ONE MOVE menu).
test("the Contacts orb under People holds Contacts, Import and Clean Up, in that order", async () => {
  const { CONTACTS_NODE, movePageId, inBrainPage } = await import("../lib/moveMenu.ts");
  const { needsOf } = await import("../lib/needs.ts");
  const g = liveGraph(MASTER, opts, {});
  const parent = g.nodes.find((n) => n.id === CONTACTS_NODE)!;
  assert.equal(parent.parentId, moveGroupId("people"));
  assert.equal(parent.label, "Contacts");
  assert.equal(parent.type, "category");
  assert.ok(g.edges.some((e) => e.source === moveGroupId("people") && e.target === CONTACTS_NODE));
  // a parent orb: focused, it shows its parts (no page frame of its own)
  assert.equal(inBrainPage(CONTACTS_NODE), null);
  const kids = g.nodes.filter((n) => n.parentId === CONTACTS_NODE).sort((a, b) => b.importance - a.importance);
  assert.deepEqual(kids.map((n) => [n.id, n.label]), [[movePageId("/contacts"), "Contacts"], [movePageId("/contacts/import"), "Import"], [movePageId("/contacts/cleanup"), "Clean Up"]]);
  for (const k of kids) assert.ok(g.edges.some((e) => e.source === CONTACTS_NODE && e.target === k.id), k.label);
  // each opens its own view inside the Brain: My Contacts (native), Import and Clean Up (ONE MOVE's pages)
  assert.deepEqual(kids.map((n) => inBrainPage(n.id)?.path), ["/contacts", "/contacts/import", "/contacts/cleanup"]);
  // Clean Up (and Import) are not orbs directly under People any more; nothing is drawn twice
  const people = g.nodes.filter((n) => n.parentId === moveGroupId("people")).map((n) => n.label);
  assert.ok(!people.includes("Clean Up Contacts") && !people.includes("Clean Up") && !people.includes("Import"));
  assert.equal(people.filter((l) => l === "Contacts").length, 1);
  assert.equal(new Set(g.nodes.map((n) => n.id)).size, g.nodes.length);
  // follow the pulse: what My Contacts needs lights the Contacts orb and People above it
  const lit = g.nodes.map((n) => (n.id === movePageId("/contacts") ? { ...n, status: "attention" as const, needCount: 4 } : n));
  const need = needsOf(lit);
  assert.deepEqual(need.get(CONTACTS_NODE), { count: 4, level: "today" });
  assert.equal(need.get(moveGroupId("people"))?.count, (needsOf(g.nodes).get(moveGroupId("people"))?.count ?? 0) + 4);
});

test("every Contacts address still lands: My Contacts, Import, Clean Up, one contact, ?open=contacts", async () => {
  const { arrivalFor } = await import("../lib/deepLink.ts");
  const { landing } = await import("../lib/deepLinkNode.ts");
  const { CONTACTS_NODE, movePageId } = await import("../lib/moveMenu.ts");
  const g = liveGraph(MASTER, opts, {});
  const has = (id: string) => g.nodes.some((n) => n.id === id);
  const at = (path: string | null, open: string | null = null) => landing(arrivalFor(path, open)!, has, () => false, true);
  assert.deepEqual(at("/contacts"), { id: movePageId("/contacts"), exact: true });
  assert.deepEqual(at("/contacts/import"), { id: movePageId("/contacts/import"), exact: true });
  assert.deepEqual(at("/contacts/cleanup"), { id: movePageId("/contacts/cleanup"), exact: true });
  assert.deepEqual(at(null, "contacts"), { id: movePageId("/contacts"), exact: true });
  const one = arrivalFor("/contacts/0b5f1c9e-1d2a-4b3c-8d4e-5f6a7b8c9d0e", null)!;
  assert.equal(one.kind !== "gbp" && one.contact, "0b5f1c9e-1d2a-4b3c-8d4e-5f6a7b8c9d0e");
  assert.deepEqual(landing(one, has, () => false, true), { id: movePageId("/contacts"), exact: true });
  // a part that is not on the map yet falls back to the Contacts orb first
  const imp = arrivalFor("/contacts/import", null)!;
  assert.ok(imp.kind === "page" && imp.fallback[0] === CONTACTS_NODE);
});
