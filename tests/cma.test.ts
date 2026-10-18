import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIDPOINT_LABEL,
  STATUS_WORD,
  adjustedNow,
  cleanAdjustments,
  cmaListUrl,
  cmaStatus,
  creditLine,
  demoLoaded,
  demoSaved,
  demoShared,
  midpointFromAdjustments,
  money,
  parseAmount,
  parseRange,
  readCmaList,
  readCmaLoaded,
  rowFrom,
  rowLine,
  saveBody,
  subjectLine,
  toDrafts,
  videoLine,
  DEMO_ROW,
} from "../lib/cma.ts";

const render = {
  contact_id: "c1",
  link: null,
  has_site: false,
  welcome_video: null,
  cma: {
    ok: true, cma_id: "x", status: "draft",
    subject: { facts: { beds: 4, living_sqft: 2350 } },
    comparables: [
      { listing_id: "b", ord: 2, added_by: "draft", price: 600000, price_is: "list", adjustments: [], adjusted_price: 600000, values: { address_line: "2 B St", standard_status: "Active", list_office_name: "Acme", list_agent_name: "Jo", list_office_phone: "801" }, credit: null },
      { listing_id: "a", ord: 1, added_by: "agent", price: 500000, price_is: "sold", adjustments: [{ label: "Pool", amount: -5000 }], adjusted_price: 495000, values: { address_line: "1 A St", close_date: "2026-09-01" }, credit: { listing: "Listing courtesy of X." } },
    ],
    not_shown: 1, range: null,
    midpoint_from_adjustments: { value: 547500, label: "Suggested midpoint from your adjustments", count: 2 },
    notes: "mine", source: "Based on information from UtahRealEstate.com as of 2026-10-17.",
  },
};

test("the list reads ONE MOVE's rows and drops junk", () => {
  const rows = readCmaList({ cmas: [{ cma_id: "1", address: "9 Elm", status: "sent", link: "https://a.vip50homes.com/cma/t", link_ends: "2026-11-17T00:00:00Z", sent_at: "2026-10-18T18:00:00Z", created_at: "2026-10-18T17:00:00Z" }, { status: "draft" }, { cma_id: "2", status: "odd", link: "javascript:x" }] });
  assert.equal(rows?.length, 2);
  assert.equal(rows![0].status, "sent");
  assert.equal(rows![1].status, "draft");
  assert.equal(rows![1].link, null);
  assert.equal(readCmaList({}), null);
  assert.equal(cmaListUrl("a b"), "https://move.vip50one.com/api/brain/cma?contact_id=a%20b");
});

test("status words", () => {
  assert.deepEqual(STATUS_WORD, { draft: "Draft", ready: "Ready to send", sent: "Sent", stopped: "Link stopped" });
  const r = { cmaId: "1", address: null, status: "sent" as const, link: null, linkEnds: "2026-11-17T18:00:00Z", sentAt: "2026-10-18T18:00:00Z", createdAt: null };
  assert.equal(rowLine(r), "Sent Oct 18, 2026 · link ends Nov 17, 2026");
  assert.equal(rowLine({ ...r, status: "stopped" }), "Link stopped · sent Oct 18, 2026");
  assert.equal(rowLine({ ...r, status: "draft", createdAt: "2026-10-17T18:00:00Z" }), "Draft · Oct 17, 2026");
  const d = readCmaLoaded(render)!;
  assert.equal(cmaStatus(d.cma), "draft");
  assert.equal(cmaStatus({ ...d.cma, sent: { sentAt: "x", linkEnds: null, linkLive: true } }), "sent");
  assert.equal(cmaStatus({ ...d.cma, sent: { sentAt: "x", linkEnds: null, linkLive: false } }), "stopped");
});

test("the render is read as Property sends it: ordered, Suggested marked, credit lines, no site", () => {
  const d = readCmaLoaded(render)!;
  assert.deepEqual(d.cma.comparables.map((c) => c.listingId), ["a", "b"]);
  assert.equal(d.cma.comparables[1].suggested, true);
  assert.equal(d.cma.comparables[0].suggested, false);
  assert.equal(d.hasSite, false);
  assert.equal(d.cma.notShown, 1);
  assert.equal(d.cma.midpoint?.label, MIDPOINT_LABEL);
  assert.equal(creditLine(d.cma.comparables[0]), "Listing courtesy of X.");
  assert.equal(creditLine(d.cma.comparables[1]), "Listing courtesy of Acme, Jo, 801.");
  assert.equal(subjectLine(d.cma.facts), "4 beds · 2,350 sq ft");
  assert.equal(subjectLine({}), "Their facts: none given yet. Check the county parcel record.");
  assert.equal(readCmaLoaded({ cma: {} }), null);
});

test("amounts and the range as typed", () => {
  assert.equal(parseAmount("-5,000"), -5000);
  assert.equal(parseAmount("+$12,500"), 12500);
  assert.equal(parseAmount("-"), null);
  assert.equal(parseAmount("3k"), null);
  assert.equal(money(-5000), "-$5,000");
  assert.equal(money(5000, true), "+$5,000");
  assert.deepEqual(parseRange("", ""), { range: null });
  assert.deepEqual(parseRange("640,000", "$670000"), { range: { low: 640000, high: 670000 } });
  assert.ok("error" in parseRange("700000", "600000"));
  assert.ok("error" in parseRange("600000", ""));
});

test("the midpoint is the median of the kept comps' prices after the agent's own adjustments", () => {
  assert.equal(midpointFromAdjustments([]), null);
  assert.equal(midpointFromAdjustments([{ price: 500000, keep: false, rows: [] }]), null);
  assert.deepEqual(midpointFromAdjustments([{ price: 500000, keep: true, rows: [{ label: "Pool", amount: "-5000" }] }]), { value: 495000, count: 1 });
  // two: the middle two averaged, as Property's percentile_cont(0.5)
  assert.deepEqual(midpointFromAdjustments([
    { price: 500000, keep: true, rows: [{ label: "Pool", amount: "-5000" }] },
    { price: 600000, keep: true, rows: [] },
    { price: 900000, keep: false, rows: [] },
    { price: null, keep: true, rows: [] },
  ]), { value: 547500, count: 2 });
  // three, odd: the middle one; a half-typed amount counts as nothing
  assert.deepEqual(midpointFromAdjustments([
    { price: 400000, keep: true, rows: [] },
    { price: 650000, keep: true, rows: [{ label: "Lot", amount: "-" }] },
    { price: 700000, keep: true, rows: [] },
  ]), { value: 650000, count: 3 });
  assert.equal(adjustedNow(null, []), null);
});

test("the save body keeps Property's order, leaves dropped comps out and cleans adjustments", () => {
  const d = readCmaLoaded(render)!;
  const adj = { a: [{ label: " Pool ", amount: "-5,000" }, { label: "", amount: "" }], b: [{ label: "View", amount: "+10000" }] };
  const body = saveBody("x", d.cma.comparables, { a: true, b: false }, adj, "640000", "670000", "mine");
  assert.deepEqual(body, { cma_id: "x", comps: [{ listing_id: "a", adjustments: [{ label: "Pool", amount: -5000 }] }], range: { low: 640000, high: 670000 }, notes: "mine" });
  const both = saveBody("x", d.cma.comparables, { a: true, b: true }, adj, "", "", "");
  assert.ok(!("error" in both));
  if (!("error" in both)) {
    assert.deepEqual(both.comps.map((c) => c.listing_id), ["a", "b"]);
    assert.equal(both.range, null);
  }
  assert.deepEqual(saveBody("x", d.cma.comparables, { a: true }, { a: [{ label: "", amount: "500" }] }, "", "", ""), { error: "Each adjustment needs a short label (60 characters) and an amount." });
  assert.ok("error" in saveBody("x", d.cma.comparables, { a: true }, {}, "5", "", ""));
  assert.ok("error" in cleanAdjustments([{ label: "x".repeat(61), amount: "1" }]));
  assert.deepEqual(toDrafts([{ label: "Pool", amount: -5000 }]), [{ label: "Pool", amount: "-5000" }]);
});

test("the welcome video line", () => {
  assert.equal(videoLine(null), null);
  assert.deepEqual(videoLine({ on: false, seconds: null, recordUrl: "https://www.vip50one.com/site/open?site=x&next=/manage/video" }), { text: "Your welcome video (top of every CMA page): not yet", action: "Record it", url: "https://www.vip50one.com/site/open?site=x&next=/manage/video" });
  assert.equal(videoLine({ on: true, seconds: 42, recordUrl: "https://a" })?.text, "Your welcome video (top of every CMA page): on, 42s");
  assert.equal(videoLine({ on: true, seconds: null, recordUrl: "https://a" })?.action, "Change it");
});

test("the example: one labelled CMA with 3 Suggested comps, no value of its own; save, send and stop on screen only", () => {
  assert.match(DEMO_ROW.address!, /^Example/);
  const d = demoLoaded("c");
  assert.equal(d.cma.comparables.length, 3);
  assert.ok(d.cma.comparables.every((c) => c.suggested));
  assert.equal(d.cma.range, null);
  assert.equal(d.cma.midpoint?.label, MIDPOINT_LABEL);
  const s = demoSaved(d, { cma_id: "x", comps: [{ listing_id: "demo-l1", adjustments: [] }], range: { low: 630000, high: 660000 }, notes: "n" });
  assert.equal(s.cma.comparables.length, 1);
  assert.equal(s.cma.status, "ready");
  assert.equal(s.cma.midpoint?.value, 642000);
  const sent = demoShared(s, "send", new Date("2026-10-18T12:00:00Z"));
  assert.equal(cmaStatus(sent.cma), "sent");
  assert.ok(sent.link?.startsWith("https://"));
  const row = rowFrom(DEMO_ROW, sent);
  assert.equal(row.status, "sent");
  assert.equal(row.link, sent.link);
  const stopped = demoShared(sent, "stop", new Date());
  assert.equal(cmaStatus(stopped.cma), "stopped");
  assert.equal(rowFrom(row, stopped).link, null);
});
