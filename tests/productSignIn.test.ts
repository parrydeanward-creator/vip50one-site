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
