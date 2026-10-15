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
