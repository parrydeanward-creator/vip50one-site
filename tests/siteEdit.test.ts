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

test("team sites: owner and admin only, clean hosts, one per host", async () => {
  const { readTeamSites } = await import("../lib/siteEdit.ts");
  const rows = [
    { role: "owner", teams: { slug: "luxury-agency", site_host: "luxury-agency.vip50homes.com" } },
    { role: "agent", teams: { slug: "x", site_host: "x.vip50homes.com" } },
    { role: "admin", teams: { slug: "y", site_host: "not a host" } },
    { role: "admin", teams: { slug: "luxury-agency", site_host: "LUXURY-AGENCY.vip50homes.com" } },
    { slug: "z", host: "z.vip50homes.com", role: "admin" },
  ];
  assert.deepEqual(readTeamSites(rows), [
    { slug: "luxury-agency", host: "luxury-agency.vip50homes.com", role: "owner" },
    { slug: "z", host: "z.vip50homes.com", role: "admin" },
  ]);
  assert.deepEqual(readTeamSites(null), []);
});
