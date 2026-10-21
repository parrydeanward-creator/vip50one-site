import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanNext, enterUrl, fallbackUrl, goHref, goUrl, hopOutcome, isSignInProduct, productLink, productOfHost } from "../lib/productSignIn.ts";

const T = "ab".repeat(32);

test("products: the three, nothing else", () => {
  for (const p of ["vip-open", "marquee", "showly"]) assert.ok(isSignInProduct(p), p);
  for (const p of ["move", "open", "toString", "__proto__", "", null]) assert.equal(isSignInProduct(p), false, String(p));
  assert.equal(productOfHost("open.vip-50.com"), "vip-open");
  assert.equal(productOfHost("Marquee.VIP-50.com"), "marquee");
  assert.equal(productOfHost("www.showly.net"), null);
});

test("cleanNext: a same-product path only, else home", () => {
  assert.equal(cleanNext("/app/settings"), "/app/settings");
  assert.equal(cleanNext("/go?open=voice"), "/go?open=voice");
  assert.equal(cleanNext("/app#new&name=Ann%20Lee"), "/app#new&name=Ann%20Lee");
  for (const bad of ["", "app", "//evil.example", "/a//b", "/\\evil", "\\evil", "https://evil.example", "/a b", "/a\nb", "/" + "x".repeat(500), null, 7]) {
    assert.equal(cleanNext(bad), "/", String(bad));
  }
});

test("goHref and goUrl: the Brain's hop", () => {
  assert.equal(goHref("vip-open", "/app/settings"), "/go/vip-open?next=%2Fapp%2Fsettings");
  assert.equal(goHref("showly"), "/go/showly?next=%2F");
  assert.equal(goHref("marquee", "//evil.example"), "/go/marquee?next=%2F");
  assert.equal(goUrl("vip-open", "/app/events/new"), "https://www.vip50one.com/go/vip-open?next=%2Fapp%2Fevents%2Fnew");
});

test("productLink: product links through the hop, path, query and fragment kept; others unchanged", () => {
  assert.equal(productLink("https://open.vip-50.com/app/events/e1"), "/go/vip-open?next=%2Fapp%2Fevents%2Fe1");
  assert.equal(productLink("https://marquee.vip-50.com/go?launch=1"), `/go/marquee?next=${encodeURIComponent("/go?launch=1")}`);
  assert.equal(productLink("https://showly.net/app#new&name=Ann%20Lee"), `/go/showly?next=${encodeURIComponent("/app#new&name=Ann%20Lee")}`);
  assert.equal(productLink("https://showly.net"), "/go/showly?next=%2F");
  for (const keep of ["https://move.vip50one.com/contacts", "http://showly.net/app", "https://showly.net.evil.example/x", "https://u:p@showly.net/", "https://showly.net:444/", "/weekly", "not a url"]) {
    assert.equal(productLink(keep), keep, keep);
  }
  assert.equal(productLink(undefined), undefined);
  assert.equal(productLink(null), null);
});

test("enterUrl: https on that product's own host and a hex ticket only; ticket in the fragment", () => {
  assert.equal(enterUrl("vip-open", "https://open.vip-50.com/auth/one", T, "/app/settings"), `https://open.vip-50.com/auth/one?next=%2Fapp%2Fsettings#t=${T}`);
  assert.equal(enterUrl("showly", "https://showly.net/auth/one?x=1#y", T, "//evil"), `https://showly.net/auth/one?next=%2F#t=${T}`);
  assert.equal(enterUrl("marquee", "https://open.vip-50.com/auth/one", T, "/"), null, "another product's host");
  assert.equal(enterUrl("marquee", "http://marquee.vip-50.com/auth/one", T, "/"), null);
  assert.equal(enterUrl("marquee", "https://evil.example/auth/one", T, "/"), null);
  assert.equal(enterUrl("marquee", "javascript:alert(1)", T, "/"), null);
  assert.equal(enterUrl("marquee", "https://marquee.vip-50.com/auth/one", "nothex", "/"), null);
  assert.equal(enterUrl("marquee", "https://marquee.vip-50.com/auth/one", T + "a", "/"), null);
  assert.equal(enterUrl("marquee", null, T, "/"), null);
});

test("hopOutcome: enter, locked, or the plain product address for anything else", () => {
  assert.deepEqual(hopOutcome("vip-open", { ok: true, ticket: T, url: "https://open.vip-50.com/auth/one" }, null, "/app"), {
    kind: "enter",
    url: `https://open.vip-50.com/auth/one?next=%2Fapp#t=${T}`,
  });
  assert.deepEqual(hopOutcome("showly", { ok: false, reason: "not_included" }, null, "/app"), { kind: "locked" });
  // MASTER's RPC not there yet (PostgREST PGRST202), too many tries, a bad answer: today's plain link.
  assert.deepEqual(hopOutcome("showly", null, { code: "PGRST202", message: "Could not find the function" }, "/app"), { kind: "fallback", url: "https://showly.net/app" });
  assert.deepEqual(hopOutcome("marquee", { ok: false, reason: "too_many" }, null, "/go?open=voice"), { kind: "fallback", url: "https://marquee.vip-50.com/go?open=voice" });
  assert.deepEqual(hopOutcome("marquee", { ok: true, ticket: T, url: "https://evil.example/auth/one" }, null, "/"), { kind: "fallback", url: "https://marquee.vip-50.com/" });
  assert.deepEqual(hopOutcome("vip-open", { ok: false, reason: "not_included" }, { message: "boom" }, "/"), { kind: "fallback", url: "https://open.vip-50.com/" }, "an error is never read as locked");
  assert.equal(fallbackUrl("vip-open", "//evil.example"), "https://open.vip-50.com/");
});

// Marquee's vip_summary room cards (VIP-SUMMARY §3ai.2) link like `/go?c=<id>&s=door`: the whole path is one encoded
// `next`, so `&s=door` reaches Marquee instead of being read as a second parameter of /go/marquee (ecosystem, 17 Oct).
test("a Marquee link with & survives the hop whole: built, read once by /go, and handed on", async () => {
  const { goHref, goUrl, enterUrl, fallbackUrl, hopOutcome, cleanNext } = await import("../lib/productSignIn.ts");
  const { toolHref } = await import("../lib/productTools.ts");
  const path = "/go?c=abc&s=door";
  const href = goHref("marquee", path);
  assert.equal(href, "/go/marquee?next=%2Fgo%3Fc%3Dabc%26s%3Ddoor");
  assert.equal(toolHref("marquee", path), href);
  assert.equal(toolHref("marquee", `https://marquee.vip-50.com${path}`), href);
  assert.equal(goUrl("marquee", path), `https://www.vip50one.com${href}`);
  // what app/go/[product]/route.ts does: searchParams decodes once, cleanNext keeps it whole
  const u = new URL(href, "https://www.vip50one.com");
  assert.equal(u.searchParams.get("s"), null);
  const next = cleanNext(u.searchParams.get("next"));
  assert.equal(next, path);
  // signed out: the way back through /login keeps it whole too
  const back = `/go/marquee?next=${encodeURIComponent(next)}`;
  const login = new URL(`/login?next=${encodeURIComponent(back)}`, u);
  assert.equal(cleanNext(new URL(login.searchParams.get("next")!, u).searchParams.get("next")), path);
  // the enter page and the plain address both carry it whole
  const t = "a".repeat(64);
  const enter = enterUrl("marquee", "https://marquee.vip-50.com/auth/one", t, next)!;
  assert.equal(new URL(enter).searchParams.get("next"), path);
  assert.equal(hopOutcome("marquee", { ok: true, url: "https://marquee.vip-50.com/auth/one", ticket: t }, null, next).kind, "enter");
  assert.equal(fallbackUrl("marquee", next), "https://marquee.vip-50.com/go?c=abc&s=door");
});

test("the hop lands on each product's app, never its sales page at /", async () => {
  const { landingFor, APP_HOME } = await import("../lib/productSignIn.ts");
  assert.equal(landingFor("showly", "/"), "/app");
  assert.equal(landingFor("vip-open", "/"), "/app");
  assert.equal(landingFor("marquee", "/"), "/go");
  assert.equal(landingFor("marquee", null), "/go");
  assert.equal(landingFor("showly", "//evil.com"), "/app");
  assert.equal(landingFor("vip-open", "/app/settings"), "/app/settings");
  assert.deepEqual(Object.keys(APP_HOME).sort(), ["marquee", "showly", "vip-open"]);
});

test("locked hop: a small page that names the product and the signed-in email", async () => {
  const { lockedHref, lockedLine, PRODUCT_NAMES } = await import("../lib/productSignIn.ts");
  assert.equal(lockedHref("showly"), "/go/showly/locked");
  assert.equal(lockedLine("showly", "ann@example.com"), "Showly isn't in the plan for ann@example.com.");
  assert.equal(lockedLine("marquee", "a@b.co"), "Marquee isn't in the plan for a@b.co.");
  assert.equal(lockedLine("vip-open", "a@b.co"), "ONE Open isn't in the plan for a@b.co.");
  assert.deepEqual(Object.values(PRODUCT_NAMES).sort(), ["Marquee", "ONE Open", "Showly"]);
  const { readFileSync } = await import("node:fs");
  const route = readFileSync(new URL("../app/go/[product]/route.ts", import.meta.url), "utf8");
  assert.match(route, /lockedHref\(product\)/);
  const page = readFileSync(new URL("../app/go/[product]/locked/page.tsx", import.meta.url), "utf8");
  assert.match(page, /lockedLine\(product, who\.email\)/, "the email comes from the session");
  assert.match(page, /href="\/reactivate">See plans/);
  assert.match(page, /href="\/dashboard">Close/);
  assert.doesNotMatch(page, /searchParams/, "nothing in the address can change the words");
});
