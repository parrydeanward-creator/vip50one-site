import { test } from "node:test";
import assert from "node:assert/strict";
import { MOVE_BOTTOM, MOVE_GROUPS, MOVE_MENU, MOVE_TOP, moveGroupId, moveMenuHref } from "../lib/moveMenu.ts";
import { liveGraph, type SummaryEnvelope, type SummaryItem } from "../lib/live.ts";

// Rewritten 3 Oct: the menu was one flat list in Classic order; Parry asked for
// the same 23 pages in five groups (People, Trackers, Events, Outreach, Learn),
// Dashboard on top and The Lounge and My Profile at the bottom.
test("ONE MOVE menu: all 23 Classic pages, in Parry's groups, no admin items", () => {
  assert.equal(MOVE_MENU.length, 23);
  assert.deepEqual(MOVE_TOP.map((m) => m.label), ["Dashboard"]);
  assert.deepEqual(MOVE_GROUPS.map((g) => g.label), ["People", "Trackers", "Events", "Outreach", "Learn"]);
  assert.deepEqual(MOVE_BOTTOM.map((m) => m.label), ["The Lounge", "My Profile"]);
  assert.deepEqual(MOVE_GROUPS[0].pages.map((m) => m.label), ["Contacts", "VIP Management", "Touch Audit", "New to Sort", "Hot/Warm/Cold", "Business Rolodex"]);
  assert.ok(MOVE_MENU.every((m) => m.path.startsWith("/") && !m.path.startsWith("/admin") && m.path !== "/users"));
  assert.equal(new Set(MOVE_MENU.map((m) => m.path)).size, MOVE_MENU.length);
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
  assert.deepEqual(around, ["People", "Trackers", "Events", "Outreach", "Learn", "The Lounge", "My Profile"]);
  for (const grp of MOVE_GROUPS) {
    for (const pg of grp.pages) assert.ok(g.nodes.some((n) => n.label === pg.label && n.parentId === moveGroupId(grp.key)), `${pg.label} under ${grp.label}`);
  }
  const mixer = g.nodes.find((n) => n.label === "Mixer")!;
  assert.equal(mixer.href, "https://move.vip50one.com/mixer");
});

test("what needs the agent sits in its group and lights it up", () => {
  const g = liveGraph(MASTER, opts, {});
  const fu = g.nodes.find((n) => n.id === "move-followups")!;
  assert.equal(fu.parentId, moveGroupId("people"));
  const people = g.nodes.find((n) => n.id === moveGroupId("people"))!;
  assert.equal(people.status, "action");
  assert.equal(people.secondaryLabel, "1 needs you");
  const learn = g.nodes.find((n) => n.id === moveGroupId("learn"))!;
  assert.equal(learn.status, undefined);
});

test("no ONE MOVE account: the pages still show, nothing lit", () => {
  const g = liveGraph({ v: 1, product: "go", found: false, stats: [], items: [] }, opts, {});
  assert.ok(g.nodes.some((n) => n.label === "Daily Tracker" && n.parentId === moveGroupId("trackers")));
  assert.ok(!g.nodes.some((n) => n.parentId === "move" && n.status));
});

test("VIP Management opens inside the Brain; other pages still open ONE MOVE", async () => {
  const { inBrainPage, movePageId } = await import("../lib/moveMenu.ts");
  assert.equal(inBrainPage(movePageId("/contacts/vip"))?.label, "VIP Management");
  assert.equal(inBrainPage(movePageId("/contacts")), null);
  assert.equal(inBrainPage("move"), null);
});
