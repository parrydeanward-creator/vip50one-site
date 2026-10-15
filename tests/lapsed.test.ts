import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { firstNameOf, isLapsed } from "../lib/live.ts";
import { PACKAGES_SIGNED_IN, homeSendsToBrain } from "../lib/landing.ts";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

test("a plan that ended is lapsed; a new account and a member are not (walker, 14 Oct)", () => {
  assert.equal(isLapsed({ one_plan: "complete", subscription_status: "canceled", vip_access: false }), true);
  assert.equal(isLapsed({ one_plan: null, subscription_status: "expired", vip_access: false }), true);
  assert.equal(isLapsed({ one_plan: null, subscription_status: null, vip_access: false }), false);
  assert.equal(isLapsed({ one_plan: "complete", subscription_status: "active", vip_access: false }), false);
  assert.equal(isLapsed({ one_plan: "relationship", subscription_status: null, vip_access: true }), false);
});

test("the dashboard sends a lapsed agent to Welcome back, and greets by name only from the profile", () => {
  const d = read("app/dashboard/page.tsx");
  assert.match(d, /if \(me\.lapsed\) redirect\("\/reactivate"\)/);
  assert.match(d, /me\.named \? `Welcome, \$\{me\.firstName\}` : "Welcome"/);
  assert.match(read("app/reactivate/page.tsx"), /me\?\.named \? `Welcome back/);
  assert.equal(firstNameOf("", "parrydeanward+walker@gmail.com"), "Parrydeanward");
});

test("See the packages has a real destination that a signed-in visitor can reach", () => {
  assert.match(read("app/dashboard/page.tsx"), /href=\{PACKAGES_SIGNED_IN\}/);
  assert.equal(PACKAGES_SIGNED_IN, "/?packages=1#packages");
  const q = new URL(`https://www.vip50one.com${PACKAGES_SIGNED_IN}`).searchParams;
  assert.equal(homeSendsToBrain(true, q), false, "the sales page shows, not the Brain");
  assert.equal(homeSendsToBrain(true, new URLSearchParams()), true, "plain / still opens the Brain when signed in");
  assert.match(read("middleware.ts"), /homeSendsToBrain\(!!user, req\.nextUrl\.searchParams\)/);
  assert.match(read("app/page.tsx"), /id="packages"/, "the anchor it lands on exists");
});
