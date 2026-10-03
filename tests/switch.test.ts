import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CLASSIC_DASHBOARD_URL } from "../lib/host.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("ONE Brain's top bar carries the ONE Brain | Classic switch (renamed from New dashboard, Parry 3 Oct) for signed-in agents", () => {
  assert.equal(CLASSIC_DASHBOARD_URL, "https://move.vip50one.com/dashboard");
  const b = read("components/brain/Brain.tsx");
  assert.match(b, /\{live && \(\s*<nav className="dash-switch" aria-label="Dashboard version">/);
  assert.match(b, /<span aria-current="page">ONE Brain<\/span>/);
  assert.match(b, /<a href=\{CLASSIC_DASHBOARD_URL\}>Classic<\/a>/);
});

test("the sign-in password has a show/hide eye that never submits the form", () => {
  assert.match(read("app/login/page.tsx"), /<PasswordField \/>/);
  const f = read("components/auth/PasswordField.tsx");
  assert.match(f, /type=\{shown \? "text" : "password"\}/);
  assert.match(f, /type="button"/);
  assert.match(f, /aria-label=\{shown \? "Hide password" : "Show password"\}/);
  assert.match(f, /autoComplete=\{autoComplete\}/);
});
