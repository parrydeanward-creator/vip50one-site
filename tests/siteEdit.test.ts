import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanHost, enterUrl, ticketProblem } from "../lib/siteEdit.ts";

const T = "a".repeat(64);

test("cleanHost keeps a bare host only", () => {
  assert.equal(cleanHost("Jane.VIP50homes.com"), "jane.vip50homes.com");
  assert.equal(cleanHost("https://jane.vip50homes.com"), null);
  assert.equal(cleanHost("localhost"), null);
  assert.equal(cleanHost(null), null);
});

test("enterUrl: https site and hex ticket only; the ticket goes in the fragment", () => {
  assert.equal(enterUrl("https://jane.vip50homes.com", T), `https://jane.vip50homes.com/builder/enter#t=${T}`);
  assert.equal(enterUrl("https://jane.vip50homes.com/any/path?x=1", T), `https://jane.vip50homes.com/builder/enter#t=${T}`);
  assert.equal(enterUrl("http://jane.vip50homes.com", T), null);
  assert.equal(enterUrl("javascript:alert(1)", T), null);
  assert.equal(enterUrl("https://jane.vip50homes.com", "nothex"), null);
  assert.equal(enterUrl("https://jane.vip50homes.com", T + "a"), null);
});

test("refusals in plain words", () => {
  assert.equal(ticketProblem({ ok: false, reason: "not_complete" }), "The website builder comes with ONE Complete.");
  assert.equal(ticketProblem({ ok: false, reason: "no_site" }), "Your website is not set up yet.");
  assert.match(ticketProblem(null), /could not be opened/);
});
