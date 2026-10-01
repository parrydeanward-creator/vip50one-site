import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Parry, 1 Oct: the pages took a while. MASTER's auth server has spikes of
// several seconds (checked: /auth/v1/user up to 7.4 s), and every page waited
// on it. These keep the fixes in place.

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the sales page never waits on MASTER", () => {
  const page = read("app/page.tsx");
  assert.doesNotMatch(page, /masterClient|getUser|getClaims|force-dynamic|redirect\(/);
});

test("visitors without a session skip the MASTER check; clients are sent to the dashboard", () => {
  const mw = read("middleware.ts");
  assert.match(mw, /matcher: \["\/", "\/dashboard/);
  assert.match(mw, /if \(path === "\/" && !hasSession\(req\)\) return NextResponse\.next\(\);/);
  assert.match(mw, /if \(user && path === "\/"\)/);
});

test("the signed-in check verifies the token locally rather than asking MASTER every time", () => {
  assert.match(read("lib/server/auth.ts"), /auth\.getClaims\(\)/);
  assert.doesNotMatch(read("lib/server/auth.ts"), /auth\.getUser\(\)/);
  assert.match(read("middleware.ts"), /auth\.getClaims\(\)/);
});

test("profile and summary are asked for at the same time", () => {
  const live = read("lib/server/live.ts");
  const i = live.indexOf("export async function signedInBundle");
  const body = live.slice(i);
  assert.ok(body.indexOf("masterSummary(who.email)") < body.indexOf("await profileOf(who)"));
  for (const f of ["app/dashboard/page.tsx", "app/api/note/route.ts", "app/api/ask/route.ts"]) {
    assert.match(read(f), /signedInBundle\(\)/, f);
  }
});

test("the demo dashboard asks for the demo morning note", () => {
  assert.match(read("components/brain/Brain.tsx"), /\$\{live \? "" : "&demo=1"\}/);
  assert.doesNotMatch(read("components/brain/Brain.tsx"), /let live = true/);
});
