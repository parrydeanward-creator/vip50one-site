import { test } from "node:test";
import assert from "node:assert/strict";
import { firstOpen, hiddenToday, progress, readWelcome } from "../lib/teamWelcome.ts";
import { menuRows } from "../lib/phoneMenu.ts";

const steps = [
  { key: "profile", label: "Profile and photo", done: true, skipped: false },
  { key: "consent", label: "Team ads OK", done: false, skipped: false },
  { key: "app", label: "ONE GO on their phone", done: true, skipped: true },
];

test("an agent not on a team sees nothing; a member sees their steps", () => {
  assert.equal(readWelcome({ team: null, steps: [] }), null);
  const w = readWelcome({ team: "The Luxury Agency", steps, all_done: false })!;
  assert.equal(progress(w), "2 of 3 done");
  assert.equal(firstOpen(w), "consent");
  assert.equal(w.allDone, false);
  assert.equal(readWelcome({ team: "T", steps: steps.map((s) => ({ ...s, done: true })) })!.allDone, true);
});

test("Later hides it for today only", () => {
  assert.equal(hiddenToday("2026-10-15", "2026-10-15"), true);
  assert.equal(hiddenToday("2026-10-14", "2026-10-15"), false);
  assert.equal(hiddenToday(null, "2026-10-15"), false);
});

test("the menu keeps a Team setup row until it is done", () => {
  const base = { live: true, growth: false, siteHost: null, teamHosts: [], agentTeamHrefs: [], classicUrl: "x" };
  assert.equal(menuRows({ ...base, welcome: "2 of 6 done" })[1].label, "Team setup");
  assert.ok(!menuRows({ ...base, welcome: null }).some((r) => r.key === "welcome"));
});

test("the welcome opens only for a team member who is not finished, and not twice in a day", async () => {
  const { shouldOpen, readWelcome: rw } = await import("../lib/teamWelcome.ts");
  const w = rw({ team: "T", steps: [{ key: "consent", label: "Team ads OK", done: false, skipped: false }] })!;
  assert.equal(shouldOpen(w, null, "2026-10-15"), true);
  assert.equal(shouldOpen(w, "2026-10-15", "2026-10-15"), false, "Later hides it for today");
  assert.equal(shouldOpen(w, "2026-10-14", "2026-10-15"), true, "back the next day");
  assert.equal(shouldOpen(null, null, "2026-10-15"), false, "team null: never");
  assert.equal(shouldOpen({ ...w, allDone: true }, null, "2026-10-15"), false, "all done: never");
});

test("one voice: ONE GO on your phone; the new consent words", async () => {
  const { readWelcome: rw, CONSENT_LINE } = await import("../lib/teamWelcome.ts");
  assert.equal(rw({ team: "T", steps: [{ key: "app", label: "ONE GO on their phone", done: false }] })!.steps[0].label, "ONE GO on your phone");
  assert.match(CONSENT_LINE, /^Team ads: the team lead may run ads that show your name and listings\. The team pays\./);
});

test("team ads switch: hidden off a team and for the lead", async () => {
  const { readAdsConsent } = await import("../lib/teamWelcome.ts");
  assert.equal(readAdsConsent({ team: null }), null);
  assert.deepEqual(readAdsConsent({ team: "The Luxury Agency", consented_at: "2026-10-14T00:00:00Z", role: "agent" }), { team: "The Luxury Agency", on: true, lead: false });
  assert.equal(readAdsConsent({ team: "T", consented_at: null, role: "owner" })!.lead, true);
});

test("the team lead's own consent step counts as done", async () => {
  const { leadView, readWelcome: rw } = await import("../lib/teamWelcome.ts");
  const w = rw({ team: "T", steps: [{ key: "profile", label: "Profile", done: true }, { key: "consent", label: "Team ads OK", done: false }] })!;
  assert.equal(w.allDone, false);
  assert.equal(leadView(w).allDone, true);
});
