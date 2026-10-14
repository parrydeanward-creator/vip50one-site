import { test } from "node:test";
import assert from "node:assert/strict";
import { homesMailto, readOffers } from "../lib/contact.ts";

test("offers: known kinds, https, Showly on showly.net, site search on /homes", () => {
  assert.deepEqual(readOffers(null), []);
  const o = readOffers([
    { kind: "showly_tour", label: "Invite to a Showly tour", url: "https://showly.net/app#new&name=Ann%20Lee&zip=84010", suggested: true },
    { kind: "site_search", url: "https://annette-judd.vip50homes.com/homes?city=Syracuse&min=560000&max=760000", suggested: false },
    { kind: "showly_tour", url: "https://evil.example/app" },
    { kind: "site_search", url: "https://x.vip50homes.com/admin" },
    { kind: "other", url: "https://showly.net/app" },
    { kind: "showly_tour", url: "javascript:alert(1)" },
  ]);
  assert.deepEqual(o.map((x) => x.kind), ["showly_tour", "site_search"]);
  assert.equal(o[0].suggested, true);
  assert.equal(o[1].label, "Send homes like this");
});

test("Send homes like this opens the agent's own email with the link; a bad address is left blank", () => {
  const m = homesMailto("ann@example.com", "Ann", "https://a.vip50homes.com/homes?city=Sandy");
  assert.match(m, /^mailto:ann@example\.com\?subject=/);
  assert.ok(decodeURIComponent(m).includes("https://a.vip50homes.com/homes?city=Sandy"));
  assert.match(homesMailto("not an email", "Ann", "https://a.vip50homes.com/homes"), /^mailto:\?subject=/);
});
