import { test } from "node:test";
import assert from "node:assert/strict";
import { liveGraph, listingLine, openHouseItems, type SummaryEnvelope } from "../lib/live.ts";

const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [] };
const opts = { pkg: "complete" as const, firstName: "P", reachable: true, today: "2026-10-03" };

test("a listing reads as live, under contract or closed", () => {
  assert.equal(listingLine({ ref: "a", address: "x", status: "live", live_on: "2026-09-28", list_price: 333333 }, "2026-10-03"), "Live · 5 days on market · $333,333");
  assert.equal(listingLine({ ref: "a", address: "x", status: "live", live_on: "2026-10-02" }, "2026-10-03"), "Live · 1 day on market");
  assert.equal(listingLine({ ref: "a", address: "x", status: "under_contract", list_price: 599000 }, "2026-10-03"), "Under contract · $599,000");
  assert.equal(listingLine({ ref: "a", address: "x", status: "closed", sold_price: 612000 }, "2026-10-03"), "Closed · $612,000");
});

test("Marquee listings show as homes under Your listings, with photo and link", () => {
  const marquee: SummaryEnvelope = { v: 1, product: "marquee", found: true, stats: [], items: [], listings: [
    { ref: "p1", address: "450 E 100 S #20, Salt Lake City, UT 84111", status: "live", live_on: "2026-09-28", list_price: 333333, image: "https://marquee.vip-50.com/api/listing-photo?l=p1", link: "https://marquee.vip-50.com/go?c=1" },
    { ref: "p2", address: "970 E 2050 S, Bountiful, UT 84010", status: "live", live_on: "2026-09-30", list_price: 599000, image: "javascript:x", link: "https://marquee.vip-50.com/go?c=2" },
  ] };
  const g = liveGraph(MASTER, opts, { marquee: { reachable: true, env: marquee } });
  const homes = g.nodes.filter((n) => n.parentId === "marquee-listings");
  assert.equal(homes.length, 2);
  assert.equal(homes[0].type, "property");
  assert.equal(homes[0].label, "450 E 100 S #20");
  assert.equal(homes[0].secondaryLabel, "Live · 5 days on market · $333,333");
  assert.equal(homes[0].image, "https://marquee.vip-50.com/api/listing-photo?l=p1");
  assert.equal(homes[1].image, undefined, "only https pictures");
});

test("ONE Open's open_houses list shows every upcoming one; the single stat is the fallback", () => {
  const env: SummaryEnvelope = { v: 1, product: "open", found: true, stats: [], items: [], open_houses: [
    { id: "e1", address: "450 E 100 S #20", starts_at: "2026-10-03T17:00:00Z", link: "https://open.vip-50.com/app/events/e1" },
    { id: "e2", address: "970 E 2050 S", starts_at: "2026-10-10T17:00:00Z", link: "https://open.vip-50.com/app/events/e2", hosting: "other" },
  ] };
  const xs = openHouseItems(env, "2026-10-03");
  assert.deepEqual(xs.map((x) => [x.title, x.urgency, x.detail]), [["450 E 100 S #20", "today", "Today, 11:00 AM"], ["970 E 2050 S", "soon", "Sat 10 Oct, 11:00 AM"]]);
  assert.match(xs[1].why[1], /another agent's listing/);
  const fallback: SummaryEnvelope = { v: 1, product: "open", found: true, stats: [{ key: "next_open_house", label: "x", value: 1, address: "1 A St", starts_at: "2026-10-04T17:00:00Z", link: "https://open.vip-50.com/app/events/z" }], items: [] };
  assert.equal(openHouseItems(fallback, "2026-10-03").length, 1);
});
