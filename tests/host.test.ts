import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { HANDOVER, MOVE_URL, PROXIED, cookieDomainFor, moveUrlFor } from "../lib/host.ts";

// The vip50one.com split agreed with the GO/MOVE bot (MOVE-HOST-SWITCH step 7).

test("ONE MOVE lives at move.vip50one.com", () => {
  assert.equal(MOVE_URL, "https://move.vip50one.com");
});

test("join, reactivate and app hand over to ONE MOVE with their query", () => {
  assert.deepEqual([...HANDOVER], ["/join", "/reactivate", "/app"]);
  const cfg = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(cfg, /permanent: false/);
});

test("ONE MOVE's api and newsletter icons are proxied, not redirected", () => {
  assert.deepEqual([...PROXIED], ["/api/:path*", "/newsletter-icons/:path*"]);
  const cfg = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(cfg, /afterFiles: PROXIED/);
  // this site's own api routes exist as files, so they are matched first
  for (const r of ["note", "ask"]) assert.ok(existsSync(new URL(`../app/api/${r}/route.ts`, import.meta.url)));
});

test("any other path goes to the same place on ONE MOVE, keeping method and query", () => {
  assert.equal(moveUrlFor("/contacts/42", "?tab=notes"), "https://move.vip50one.com/contacts/42?tab=notes");
  const route = readFileSync(new URL("../app/[...rest]/route.ts", import.meta.url), "utf8");
  assert.match(route, /status: 308/);
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) assert.match(route, new RegExp(`export const ${m} = forward`));
});

test("the sign-in cookie is shared only on vip50one.com", () => {
  assert.equal(cookieDomainFor("vip50one.com"), ".vip50one.com");
  assert.equal(cookieDomainFor("www.vip50one.com"), ".vip50one.com");
  assert.equal(cookieDomainFor("move.vip50one.com:443"), ".vip50one.com");
  assert.equal(cookieDomainFor("vip50one-site.vercel.app"), undefined);
  assert.equal(cookieDomainFor("localhost:3000"), undefined);
  assert.equal(cookieDomainFor("evilvip50one.com"), undefined);
  assert.equal(cookieDomainFor(null), undefined);
});

test("checkout's return page /welcome is ONE MOVE's, never this site's", () => {
  // Stripe success_url is https://vip50one.com/welcome (CHECKOUT.md §4.3); the catch-all forwards it.
  assert.equal(existsSync(new URL("../app/welcome", import.meta.url)), false);
  assert.equal(moveUrlFor("/welcome", "?session_id=cs_1"), "https://move.vip50one.com/welcome?session_id=cs_1");
});
