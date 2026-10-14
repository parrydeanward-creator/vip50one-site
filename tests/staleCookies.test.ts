import { test } from "node:test";
import assert from "node:assert/strict";
import { authCookieCounts, cleanupHeaders } from "../lib/staleCookies.ts";

const N = "sb-olclvqawcgugszogryoi-auth-token";

test("a sign-in cookie sent twice: only the host-only copy is expired; the shared one stays", () => {
  const h = `${N}.0=old; ${N}.0=new; ${N}.1=x; other=1`;
  assert.equal(authCookieCounts(h).get(`${N}.0`), 2);
  assert.deepEqual(cleanupHeaders(h, ".vip50one.com", false), [`${N}.0=; Path=/; Max-Age=0; SameSite=Lax`]);
});

test("a session that cannot refresh: every copy goes, on both host and shared domain", () => {
  const out = cleanupHeaders(`${N}=x`, ".vip50one.com", true);
  assert.deepEqual(out, [`${N}=; Path=/; Max-Age=0; SameSite=Lax`, `${N}=; Path=/; Max-Age=0; SameSite=Lax; Domain=.vip50one.com`]);
  assert.deepEqual(cleanupHeaders("other=1", ".vip50one.com", true), []);
});

test("the middleware never clears a session while a sign-in is being written", async () => {
  const { readFileSync } = await import("node:fs");
  assert.match(readFileSync("middleware.ts", "utf8"), /req\.method === "GET" && path !== "\/login"/);
});
