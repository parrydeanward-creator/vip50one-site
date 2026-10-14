import { test } from "node:test";
import assert from "node:assert/strict";
import { afterSignIn, appTarget, lastPlace } from "../lib/landing.ts";
import { readPulseModes } from "../lib/pulseModes.ts";

test("/app opens inside the Brain, never Classic; unknown or outside paths go to the Brain", () => {
  assert.equal(appTarget(null), "/dashboard");
  assert.equal(appTarget("/weekly"), "/dashboard/weekly");
  assert.equal(appTarget("/dashboard/weekly"), "/dashboard/weekly");
  assert.equal(appTarget("/profile?x=1"), "/dashboard/profile");
  for (const bad of ["//evil.example", "https://evil.example", "/not-a-page", "/admin/secret"]) assert.equal(appTarget(bad), "/dashboard", bad);
});

test("land where the agent last was: only Brain addresses come back", () => {
  assert.equal(lastPlace(encodeURIComponent("/dashboard/weekly")), "/dashboard/weekly");
  assert.equal(lastPlace("/dashboard"), "/dashboard");
  for (const bad of ["https://evil.example", "/dashboard/../x", "%E0%A4%A", "/login", null]) assert.equal(lastPlace(bad), null, String(bad));
});

test("after sign-in: asked-for place, else last place, else the Brain", () => {
  assert.equal(afterSignIn("/reactivate?package=complete", null), "/reactivate?package=complete");
  assert.equal(afterSignIn("/dashboard/weekly", "/dashboard/profile"), "/dashboard/weekly");
  assert.equal(afterSignIn("", encodeURIComponent("/dashboard/profile")), "/dashboard/profile");
  assert.equal(afterSignIn("https://evil.example", null), "/dashboard");
  assert.equal(afterSignIn(null, null), "/dashboard");
});

test("Pulse helpers: Ask me refused without Growth reads through", () => {
  const m = readPulseModes({ workers: [{ worker: "concierge", question: "q", ask_me_blocked: "Comes with ONE Growth" }] })!;
  assert.equal(m.workers[0].askBlocked, "Comes with ONE Growth");
});

test("phone menu: one list; Growth rows only with Growth; team rows only for team members", async () => {
  const { menuRows, HINT } = await import("../lib/phoneMenu.ts");
  const base = { live: true, growth: false, siteHost: "pat.vip50homes.com", teamHosts: [] as string[], agentTeamHrefs: [] as string[], classicUrl: "https://move.vip50one.com/dashboard" };
  assert.deepEqual(menuRows(base).map((r) => r.label), ["My Profile", "My website", "Classic view", "Sign out"]);
  assert.deepEqual(menuRows({ ...base, growth: true, teamHosts: ["team.vip50homes.com"] }).map((r) => r.label), ["My Profile", "My website", "Growth results", "Team website", "Ad requests", "Classic view", "Sign out"]);
  assert.deepEqual(menuRows({ ...base, teamHosts: ["team.vip50homes.com"] }).map((r) => r.label), ["My Profile", "My website", "Team website", "Classic view", "Sign out"]);
  assert.ok(menuRows(base).every((r) => r.line.length > 10), "every row has a plain line");
  assert.deepEqual(menuRows({ ...base, live: false }), []);
  assert.equal(HINT, "Tap any orb to see what needs you. Red means right now.");
});

test("Sign in with Google is on (MASTER provider switched on by Parry, 14 Oct) and lands on the Brain", async () => {
  const { GOOGLE_SIGNIN } = await import("../lib/landing.ts");
  const { readFileSync } = await import("node:fs");
  assert.equal(GOOGLE_SIGNIN, true);
  const a = readFileSync("app/login/actions.ts", "utf8");
  assert.match(a, /provider: "google"/);
  assert.match(a, /\/auth\/confirm\?next=%2Fdashboard/);
});

test("a sign-in code that lands on / , /login or /dashboard goes on to /auth/confirm (Google, 14 Oct)", async () => {
  const { readFileSync } = await import("node:fs");
  const m = readFileSync("middleware.ts", "utf8");
  assert.match(m, /searchParams\.get\("code"\)/);
  assert.match(m, /to\.pathname = "\/auth\/confirm"/);
  assert.match(m, /matcher: \["\/", "\/dashboard\/:path\*", "\/login"/);
});
