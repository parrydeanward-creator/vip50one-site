import { test } from "node:test";
import assert from "node:assert/strict";
import { menuRows } from "../lib/phoneMenu.ts";

// Rewritten 16 Oct (deliberate change, GETTING-STARTED §1): the team welcome's six steps, its "Later" and its
// "Team setup" menu row are gone; Getting started is the one first-days list. The team ads consent stays (My Profile).

test("the menu's Getting started row shows only while the list is folded out of ONE YOU, and reopens it", () => {
  const base = { live: true, growth: false, siteHost: null, teamHosts: [], agentTeamHrefs: [], classicUrl: "x" };
  const row = menuRows({ ...base, start: "4 of 11 done. Reopen your first-days list." })[1];
  assert.equal(row.label, "Getting started");
  assert.deepEqual(row.action, { kind: "start" });
  assert.ok(!menuRows({ ...base, start: null }).some((r) => r.key === "start"));
  assert.ok(!menuRows({ ...base }).some((r) => r.key === "welcome" || r.label === "Team setup"), "no Team setup row");
});

test("the consent words are unchanged", async () => {
  const { CONSENT_LINE } = await import("../lib/teamWelcome.ts");
  assert.match(CONSENT_LINE, /^Team ads: the team lead may run ads that show your name and listings\. The team pays\./);
});

test("team ads switch: hidden off a team and for the lead", async () => {
  const { readAdsConsent } = await import("../lib/teamWelcome.ts");
  assert.equal(readAdsConsent({ team: null }), null);
  assert.deepEqual(readAdsConsent({ team: "The Luxury Agency", consented_at: "2026-10-14T00:00:00Z", role: "agent" }), { team: "The Luxury Agency", on: true, lead: false });
  assert.equal(readAdsConsent({ team: "T", consented_at: null, role: "owner" })!.lead, true);
});
