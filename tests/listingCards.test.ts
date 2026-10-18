import { test } from "node:test";
import assert from "node:assert/strict";
import { domWords, factsLine, launchProgress, listingFacts, listingOrb } from "../lib/listingCards.ts";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { readLaunches } from "../lib/launch.ts";

const TODAY = "2026-10-18";
// Shaped like Parry's two live Marquee listings on 18 Oct (no hero photo marked yet, so no image).
const LISTINGS = [
  { ref: "55bc9888-ea1d-46c4-a3d6-0bce6fd479c6", address: "970 E 2050 S, Bountiful, UT 84010", property_key: "970-e-2050-s-bountiful-ut-84010", status: "live", list_price: 599000, live_on: "2026-10-01", link: "https://marquee.vip-50.com/go?c=c1" },
  { ref: "6f2c5d5d-3791-4c70-ae80-6bd6a924ba0f", address: "450 E 100 S #20, Salt Lake City, UT 84111", property_key: "450-e-100-s-20-salt-lake-city-ut-84111", status: "live", list_price: 333333, live_on: "2026-09-28", link: "https://marquee.vip-50.com/go?c=c2", image: "https://marquee.vip-50.com/api/listing-photo?l=p2&e=1&s=x" },
];
const MARQUEE = {
  v: 1, product: "marquee", found: true, stats: [], listings: LISTINGS,
  items: [{ id: "marquee:approval:c1", kind: "approval", title: "Approve 3 pieces for 970 E 2050 S", property_key: "970-e-2050-s-bountiful-ut-84010", urgency: "today", why: [], link: "https://marquee.vip-50.com/go?c=c1" }],
  posts: [
    { id: "a", listing_ref: LISTINGS[0].ref, address: "970 E 2050 S", channel: "instagram", at: "2026-10-20T15:00:00Z", state: "scheduled" },
    { id: "b", listing_ref: LISTINGS[0].ref, address: "970 E 2050 S", channel: "facebook", at: "2026-10-10T15:00:00Z", state: "sent" },
    { id: "c", listing_ref: LISTINGS[1].ref, address: "450 E 100 S #20", channel: "facebook", at: "2026-08-01T15:00:00Z", state: "sent" },
  ],
  reports: [{ listing_ref: LISTINGS[0].ref, street: "970 E 2050 S", week: 2, state: "answered", url: "/go?c=c1" }],
};
const OPEN = { v: 1, product: "open", found: true, stats: [], items: [], open_houses: [
  { id: "e1", address: "970 E 2050 S", property_key: "970-e-2050-s-bountiful-ut-84010", starts_at: "2026-10-24T17:00:00Z", link: "https://open.vip-50.com/app/events/e1", signed_up_ahead: 4 },
  { id: "e0", address: "970 E 2050 S", starts_at: "2026-10-03T17:00:00Z", link: "https://open.vip-50.com/app/events/e0" },
] };

test("a listing's card facts come only from what the products sent", () => {
  const f = listingFacts(LISTINGS[0], MARQUEE, OPEN, TODAY)!;
  assert.equal(f.street, "970 E 2050 S");
  assert.equal(f.place, "Bountiful, UT 84010");
  assert.equal(f.stage, "live");
  assert.equal(f.price, 599000);
  assert.equal(f.daysOnMarket, 17);
  assert.equal(f.image, null, "no hero photo: the card draws a home, never a face");
  assert.deepEqual([f.beds, f.baths, f.sqft], [null, null, null], "Marquee does not send beds, baths or square feet yet");
  assert.equal(f.approvals, 3);
  assert.equal(f.scheduled, 1);
  assert.equal(f.posted, 1);
  assert.equal(f.marquee, `/go/marquee?next=${encodeURIComponent("/go?c=c1")}`, "one sign-in hop");
  assert.deepEqual(f.report, { href: `/go/marquee?next=${encodeURIComponent("/go?c=c1")}`, words: "Week 2, ready to send" });
  assert.equal(f.openHouse?.ahead, 4);
  assert.match(f.openHouse!.when, /^Sat 24 Oct, 11:00 AM$/, "the next one, not a past one");
  assert.equal(f.openHouse?.href, `/go/vip-open?next=${encodeURIComponent("/app/events/e1")}`);

  const g = listingFacts(LISTINGS[1], MARQUEE, null, TODAY)!;
  assert.equal(g.image, LISTINGS[1].image);
  assert.equal(g.approvals, 0);
  assert.equal(g.posted, 0, "older than 30 days");
  assert.equal(g.report, null);
  assert.equal(g.openHouse, null);
  assert.equal(listingFacts({ ref: "x" }, null, null, TODAY), null);
  assert.equal(listingFacts({ ...LISTINGS[1], image: "javascript:alert(1)" }, null, null, TODAY)!.image, null, "only https pictures");
});

test("beds, baths and square feet show only when sent", () => {
  assert.equal(factsLine({ beds: null, baths: null, sqft: null }), null);
  assert.equal(factsLine({ beds: 4, baths: 3, sqft: 3120 }), "4 bd · 3 ba · 3,120 sq ft");
  assert.equal(factsLine(listingFacts({ ...LISTINGS[0], beds: 4, sqft: "2860" }, null, null, TODAY)!), "4 bd · 2,860 sq ft");
  assert.equal(domWords({ stage: "live", daysOnMarket: 1 }), "1 day on market");
  assert.equal(domWords({ stage: "under_contract", daysOnMarket: 21 }), "21 days to contract");
  assert.equal(domWords({ stage: "live", daysOnMarket: null }), null);
});

test("the launch's five pieces: done counted, the next one named", () => {
  const none = launchProgress(null);
  assert.equal(none.launched, false);
  assert.equal(none.pieces.length, 5);
  const l = readLaunches({ launch: { id: "l1", listing_ref: "r", pieces: [
    { piece: "marquee_page", state: "done" }, { piece: "site_page", state: "ready" }, { piece: "open_house", state: "drafting" }, { piece: "ad_draft", state: "skipped" }, { piece: "buyer_notes", state: "done" },
  ] } })![0];
  const p = launchProgress(l);
  assert.deepEqual([p.done, p.total], [2, 4], "a skipped piece is not counted");
  assert.equal(p.next, "On your website is ready for you to approve.");
});

test("the live graph carries each listing's facts on its orb", () => {
  const master: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [] };
  const g = liveGraph(master, { pkg: "complete", firstName: "Parry", reachable: true, today: TODAY }, {
    marquee: { reachable: true, env: MARQUEE as unknown as SummaryEnvelope },
    open: { reachable: true, env: OPEN as unknown as SummaryEnvelope },
  });
  const orb = g.nodes.find((n) => n.id === listingOrb(LISTINGS[0].ref));
  assert.ok(orb?.listing);
  assert.equal(orb!.listing!.openHouse?.ahead, 4);
  assert.equal(orb!.listing!.approvals, 3);
});
