import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blankPrep, demoLoaded, demoPart, emptyNetDraft, netBody, netFigures, netLine, nextCountLine, demandLine, nextHomeBody,
  parseNet, pitchBody, prepBody, readCma, readDraft, nextDraftOf, PREP_ERROR,
} from "../lib/cma.ts";
import { DEFAULT_HOURS, demoTours, hoursProblem, readTours, toggleDay, toursBody } from "../lib/tours.ts";

const net = { ...emptyNetDraft(), payoff: "300,000", commission_pct: "5", title: "3000", tax: "1000", other: "1000" };

test("net figures: price less commission less costs at the agent's own low and high", () => {
  const f = netFigures({ low: 600000, high: 650000 }, net)!;
  assert.deepEqual(f, { low: 600000 - 30000 - 305000, high: 650000 - 32500 - 305000 });
  assert.equal(netLine(f), "At your range, the seller nets about $265,000 to $312,500.");
});

test("net figures: nothing until range and fields exist", () => {
  assert.equal(netFigures(null, net), null);
  assert.equal(netFigures({ low: 1, high: 2 }, emptyNetDraft()), null);
  assert.equal(netFigures({ low: 1, high: 2 }, { ...net, commission_pct: "" }), null);
  assert.equal(netFigures({ low: 1, high: 2 }, { ...net, payoff: "abc" }), null);
});

test("net body: commission 0 to 10, numbers only, all blank clears", () => {
  assert.deepEqual(netBody("c1", net), { cma_id: "c1", net: { payoff: 300000, payoff2: 0, commission_pct: 5, title: 3000, tax: 1000, other: 1000 } });
  assert.ok("error" in netBody("c1", { ...net, commission_pct: "10.5" }));
  assert.ok("error" in netBody("c1", { ...net, commission_pct: "-1" }));
  assert.ok("error" in netBody("c1", { ...net, tax: "1k" }));
  assert.deepEqual(netBody("c1", emptyNetDraft()), { cma_id: "c1", net: null });
  assert.deepEqual(parseNet({ ...net, commission_pct: "10" }), { net: { payoff: 300000, payoff2: 0, commission_pct: 10, title: 3000, tax: 1000, other: 1000 } });
});

test("next home body: exactly one of zip or city, carries unseen filters", () => {
  const d = { where: "84092", beds: "4", price: "$800,000" };
  assert.deepEqual(nextHomeBody("c1", d, null), { cma_id: "c1", next_home: { zip: "84092", beds_min: 4, price_max: 800000 } });
  assert.deepEqual(nextHomeBody("c1", { where: "Sandy", beds: "", price: "" }, null), { cma_id: "c1", next_home: { city: "Sandy" } });
  const prior = readCma({ comparables: [], next_home: { filters: { city: "Sandy", baths_min: 2, sub_types: ["Single Family"] }, count: 4 } })!.nextHome;
  assert.deepEqual(nextHomeBody("c1", { where: "Draper", beds: "3", price: "" }, prior), { cma_id: "c1", next_home: { city: "Draper", beds_min: 3, baths_min: 2, sub_types: ["Single Family"] } });
  assert.ok("error" in nextHomeBody("c1", { where: "", beds: "3", price: "" }, null));
  assert.ok("error" in nextHomeBody("c1", { where: "84092 Sandy", beds: "", price: "" }, null));
  assert.ok("error" in nextHomeBody("c1", { where: "Sandy", beds: "x", price: "" }, null));
  assert.deepEqual(nextHomeBody("c1", { where: "", beds: "", price: "" }, null), { cma_id: "c1", next_home: null });
});

test("next home lines carry their as_of when present", () => {
  const cma = readCma({ comparables: [], next_home: { area: "Sandy", filters: { city: "Sandy" }, count: 14, as_of: "2026-10-18T12:00:00Z" }, buyer_demand: { count: 3, as_of: "2026-10-18T12:00:00Z" } })!;
  assert.equal(nextCountLine(cma.nextHome), "14 homes for sale there match (as of Oct 18, 2026).");
  assert.equal(demandLine(cma.buyerDemand), "Buyers looking now: 3 saved searches on your site cover this home in your range (as of Oct 18, 2026).");
  assert.equal(nextCountLine(readCma({ comparables: [], next_home: { filters: {}, count: 1 } })!.nextHome), "1 home for sale there matches.");
  assert.equal(nextCountLine(null), null);
  assert.equal(demandLine(null), null);
  assert.equal(nextDraftOf(cma.nextHome).where, "Sandy");
});

test("prep body: at most 8, each with What and Fix or Skip, blank rows ignored", () => {
  const row = (i: number) => ({ ...blankPrep(), item: `Item ${i}`, do: "fix" as const });
  const ok = prepBody("c1", [{ ...row(1), why: "Cheap", proName: "Sam", proPhone: "801" }, blankPrep(), { ...row(2), do: "skip" }]);
  assert.deepEqual(ok, { cma_id: "c1", prep: [{ item: "Item 1", do: "fix", why: "Cheap", pro: { name: "Sam", phone: "801" } }, { item: "Item 2", do: "skip" }] });
  assert.ok(!("error" in prepBody("c1", [row(1), row(2), row(3), row(4), row(5), row(6), row(7), row(8)])));
  assert.deepEqual(prepBody("c1", Array.from({ length: 9 }, (_, i) => row(i))), { error: PREP_ERROR });
  assert.deepEqual(prepBody("c1", [{ ...blankPrep(), item: "No choice" }]), { error: PREP_ERROR });
  assert.deepEqual(prepBody("c1", [{ ...blankPrep(), do: "fix" }]), { error: PREP_ERROR });
  assert.deepEqual(prepBody("c1", []), { cma_id: "c1", prep: null });
});

test("pitch body: headline 120 characters, five lines", () => {
  assert.deepEqual(pitchBody("c1", { headline: " Sell it well ", lines: "a\n\n b \nc" }), { cma_id: "c1", pitch: { headline: "Sell it well", lines: ["a", "b", "c"] } });
  assert.ok("error" in pitchBody("c1", { headline: "x".repeat(121), lines: "" }));
  assert.ok(!("error" in pitchBody("c1", { headline: "x".repeat(120), lines: "1\n2\n3\n4\n5" })));
  assert.ok("error" in pitchBody("c1", { headline: "h", lines: "1\n2\n3\n4\n5\n6" }));
  assert.ok("error" in pitchBody("c1", { headline: "", lines: "a" }));
  assert.deepEqual(pitchBody("c1", { headline: "", lines: "" }), { cma_id: "c1", pitch: null });
});

test("the draft answer only fills fields", () => {
  const r = readDraft({ ok: true, prep: [{ item: "Paint", why: "Fresh", do: "fix" }, { item: "Carpet", do: "skip" }], pitch: { headline: "H", lines: ["a", "b"] } });
  assert.ok(!("error" in r));
  if (!("error" in r)) {
    assert.equal(r.prep.length, 2);
    assert.equal(r.prep[1].do, "skip");
    assert.deepEqual(r.pitch, { headline: "H", lines: "a\nb" });
  }
  assert.deepEqual(readDraft({ ok: false, words: "Ask your seller first." }), { error: "Ask your seller first." });
  assert.ok("error" in readDraft(null));
});

test("a part left out of the save body stays out; the example keeps the saved part", () => {
  const body = netBody("c1", net);
  assert.ok(!("error" in body) && !("prep" in body) && !("pitch" in body) && !("next_home" in body));
  const d = demoLoaded("x");
  const after = demoPart(d, nextHomeBody("demo", { where: "Sandy", beds: "", price: "" }, null) as Record<string, unknown>);
  assert.equal(after.cma.nextHome?.count, 14);
  assert.equal(after.cma.buyerDemand?.count, 3);
  assert.equal(after.cma.net, null);
});

test("tours: read, validate and body", () => {
  assert.deepEqual(readTours({ on: true, hours: { days: [5, 1, 1, 9], start: "9:00", end: "17:30:00" } }), { on: true, hours: { days: [1, 5], start: "09:00", end: "17:30" } });
  assert.deepEqual(readTours({ on: false }), { on: false, hours: DEFAULT_HOURS });
  assert.equal(readTours({}), null);
  assert.deepEqual(toursBody(true, { days: [3, 1], start: "09:00", end: "17:00" }), { on: true, hours: { days: [1, 3], start: "09:00", end: "17:00" } });
  assert.ok("error" in toursBody(true, { days: [], start: "09:00", end: "17:00" }));
  assert.ok("error" in toursBody(true, { days: [1], start: "17:00", end: "09:00" }));
  assert.equal(hoursProblem(DEFAULT_HOURS), null);
  assert.deepEqual(toggleDay([1, 3], 2), [1, 2, 3]);
  assert.deepEqual(toggleDay([1, 3], 3), [1]);
  assert.deepEqual(demoTours(), { on: true, hours: { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" } });
});
