import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { confirmUrl, isOtpType, passwordProblem, safeNext } from "../lib/reset.ts";

test("reset: the email link returns to vip50one.com, then Choose a new password", () => {
  assert.equal(confirmUrl(), "https://www.vip50one.com/auth/confirm?next=%2Freset%2Fnew");
});

test("reset: next is only ever a path on this site", () => {
  assert.equal(safeNext("/reset/new"), "/reset/new");
  for (const bad of ["https://evil.example/x", "//evil.example", "/\\evil.example", "", null, "javascript:alert(1)"]) assert.equal(safeNext(bad), "/dashboard", String(bad));
});

test("reset: password rules in plain words", () => {
  assert.match(passwordProblem("short", "short")!, /at least 8/);
  assert.match(passwordProblem("longenough1", "longenough2")!, /don't match/);
  assert.equal(passwordProblem("longenough1", "longenough1"), null);
  assert.ok(isOtpType("recovery") && !isOtpType("admin"));
});

test("sign-in links: Forgot goes to our reset page; New here goes to the packages, not the bare sign-up box", () => {
  const login = readFileSync("app/login/page.tsx", "utf8");
  assert.ok(!/move\.vip50one\.com/.test(readFileSync("lib/master.ts", "utf8").match(/RESET_URL = .*/)![0]));
  assert.match(login, /href=\{RESET_URL\}/);
  assert.match(login, /href="\/#packages"/);
  // The reset request never says whether an email has an account.
  const actions = readFileSync("app/reset/actions.ts", "utf8");
  assert.ok(!/not found|no account/i.test(actions));
});
