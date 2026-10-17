import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SIGN_IN_LINE, installMoveBearer, isMoveBrainUrl, isSignInRefusal, readSessionToken, sameOriginAsk, tokenStillGood } from "../lib/moveAuth.ts";

// 17 Oct: Parry's Brain saves to ONE MOVE never arrived (a stale sign-in cookie on move.vip50one.com). Every call to
// ONE MOVE's /api/brain/* now also carries the Brain's own access token, and only those calls.

test("the token goes only to ONE MOVE's /api/brain/", () => {
  assert.equal(isMoveBrainUrl("https://move.vip50one.com/api/brain/voice"), true);
  assert.equal(isMoveBrainUrl("https://move.vip50one.com/api/brain/pulse-modes?x=1"), true);
  assert.equal(isMoveBrainUrl("https://MOVE.vip50one.com/api/brain/people"), true);
  // ONE MOVE, other paths
  assert.equal(isMoveBrainUrl("https://move.vip50one.com/dashboard"), false);
  assert.equal(isMoveBrainUrl("https://move.vip50one.com/api/google/connect"), false);
  assert.equal(isMoveBrainUrl("https://move.vip50one.com/api/brainy/x"), false);
  assert.equal(isMoveBrainUrl("https://move.vip50one.com/api/brain"), false);
  // other hosts and look-alikes
  assert.equal(isMoveBrainUrl("https://evil.com/api/brain/voice"), false);
  assert.equal(isMoveBrainUrl("https://move.vip50one.com.evil.com/api/brain/voice"), false);
  assert.equal(isMoveBrainUrl("https://evilmove.vip50one.com/api/brain/voice"), false);
  assert.equal(isMoveBrainUrl("https://www.vip50one.com/api/brain/voice"), false);
  assert.equal(isMoveBrainUrl("https://move.vip50one.com@evil.com/api/brain/voice"), false);
  assert.equal(isMoveBrainUrl("https://x@move.vip50one.com/api/brain/voice"), false);
  assert.equal(isMoveBrainUrl("https://move.vip50one.com:8443/api/brain/voice"), false);
  // not https, relative, empty, junk
  assert.equal(isMoveBrainUrl("http://move.vip50one.com/api/brain/voice"), false);
  assert.equal(isMoveBrainUrl("/api/brain/voice"), false);
  assert.equal(isMoveBrainUrl(""), false);
  assert.equal(isMoveBrainUrl(null), false);
  assert.equal(isMoveBrainUrl("not a url"), false);
});

test("a cached token is used until 60 seconds before it runs out", () => {
  assert.equal(tokenStillGood({ token: "t", expiresAt: 1000 }, 900), true);
  assert.equal(tokenStillGood({ token: "t", expiresAt: 1000 }, 940), false);
  assert.equal(tokenStillGood({ token: "t", expiresAt: 1000 }, 1100), false);
  assert.equal(tokenStillGood({ token: "", expiresAt: 5000 }, 1), false);
  assert.equal(tokenStillGood(null, 1), false);
});

test("the session-token answer is read strictly", () => {
  assert.deepEqual(readSessionToken({ access_token: "abc", expires_at: 123 }), { token: "abc", expiresAt: 123 });
  assert.equal(readSessionToken({ access_token: "", expires_at: 123 }), null);
  assert.equal(readSessionToken({ access_token: "abc" }), null);
  assert.equal(readSessionToken({ error: "Sign in first." }), null);
  assert.equal(readSessionToken(null), null);
});

test("the session token is handed only to this site's own pages", () => {
  assert.equal(sameOriginAsk("same-origin", null, "www.vip50one.com"), true);
  assert.equal(sameOriginAsk("same-origin", "https://www.vip50one.com", "www.vip50one.com"), true);
  assert.equal(sameOriginAsk("same-site", null, "www.vip50one.com"), false);
  assert.equal(sameOriginAsk("cross-site", "https://evil.com", "www.vip50one.com"), false);
  assert.equal(sameOriginAsk(null, "https://evil.com", "www.vip50one.com"), false);
  assert.equal(sameOriginAsk(null, "https://www.vip50one.com", "www.vip50one.com"), true);
  assert.equal(sameOriginAsk("none", null, "www.vip50one.com"), false);
  assert.equal(sameOriginAsk(null, null, "www.vip50one.com"), false);
});

test("401 and 403 say plainly that ONE MOVE did not take the sign-in", () => {
  assert.equal(isSignInRefusal(401), true);
  assert.equal(isSignInRefusal(403), true);
  assert.equal(isSignInRefusal(200), false);
  assert.equal(isSignInRefusal(500), false);
  assert.equal(SIGN_IN_LINE, "ONE MOVE did not recognise your sign-in. Sign out and back in, then try again.");
  for (const f of ["../components/brain/VoiceSection.tsx", "../components/brain/ConnectSections.tsx"]) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.match(src, /isSignInRefusal\(/, f);
    assert.match(src, /SIGN_IN_LINE/, f);
  }
});

test("the fetch wrapper is installed once, from the root layout, and the token route never caches", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<MoveBearer \/>/);
  const route = readFileSync(new URL("../app/api/session-token/route.ts", import.meta.url), "utf8");
  assert.match(route, /no-store/);
  assert.match(route, /sameOriginAsk\(/);
  assert.doesNotMatch(route, /console\./);
});

test("the wrapper adds the token to ONE MOVE /api/brain/ calls only, and sends unchanged without one", async () => {
  const seen: { url: string; auth: string | null; credentials?: RequestCredentials }[] = [];
  const tokenAnswer: unknown = { access_token: "tok", expires_at: Date.now() / 1000 + 3600 };
  let tokenAsks = 0;
  const fake = {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === "/api/session-token") {
        tokenAsks++;
        return new Response(JSON.stringify(tokenAnswer), { status: 200 });
      }
      seen.push({ url, auth: new Headers(init?.headers).get("authorization"), credentials: init?.credentials });
      return new Response("{}", { status: 200 });
    },
  } as unknown as Window & typeof globalThis;
  installMoveBearer(fake);
  installMoveBearer(fake); // once only
  await fake.fetch("https://move.vip50one.com/api/brain/voice", { credentials: "include" });
  await fake.fetch("https://move.vip50one.com/api/brain/pulse-modes", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
  await fake.fetch("https://move.vip50one.com.evil.com/api/brain/voice");
  await fake.fetch("https://move.vip50one.com/dashboard");
  await fake.fetch("/api/membership");
  await fake.fetch("https://move.vip50one.com/api/brain/today", { headers: { Authorization: "Bearer own" } });
  assert.deepEqual(seen.map((s) => s.auth), ["Bearer tok", "Bearer tok", null, null, null, "Bearer own"]);
  assert.equal(seen[0].credentials, "include");
  assert.equal(tokenAsks, 1, "the token is cached");

  // No token to hand: the call goes as before (cookie only).
  const seen2: (string | null)[] = [];
  const fake2 = {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === "/api/session-token") return new Response(JSON.stringify({ error: "Sign in first." }), { status: 401 });
      seen2.push(new Headers(init?.headers).get("authorization"));
      return new Response("{}", { status: 200 });
    },
  } as unknown as Window & typeof globalThis;
  installMoveBearer(fake2);
  await fake2.fetch("https://move.vip50one.com/api/brain/voice", { credentials: "include" });
  assert.deepEqual(seen2, [null]);
});
