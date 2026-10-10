import { test } from "node:test";
import assert from "node:assert/strict";
import { MARKET_NODE, lastMonth, demoMarketPulse, fullNote, monthWords, numbersLine, readMarketPulse, toSend, withMarketPulseNode, withSent } from "../lib/marketPulse.ts";

test("readMarketPulse keeps good parts and refuses a wrong shape", () => {
  assert.equal(readMarketPulse(null), null);
  assert.equal(readMarketPulse({ month: "soon", areas: [] }), null);
  const m = readMarketPulse({
    month: "2026-10",
    ready: true,
    areas: [{ area: "84020", numbers: { new: 61, dom: "x" }, vips: [{ id: "a", name: "Jane", note: "Hi Jane" }, { id: "b", name: "No note" }] }, { label: "no area" }],
    missing_address: [{ id: "c", name: "Amy" }, { id: "d" }],
  })!;
  assert.equal(m.areas.length, 1);
  assert.equal(m.areas[0].label, "84020");
  assert.equal(m.areas[0].numbers.dom, null);
  assert.equal(m.areas[0].vips.length, 1);
  assert.deepEqual(m.missing, [{ id: "c", name: "Amy" }]);
});

test("plain words", () => {
  assert.equal(monthWords("2026-10"), "October 2026");
  assert.equal(numbersLine({ new: 61, pending: 48, sold: null, dom: 21, monthsSupply: null, medianList: 1 }), "61 new · 48 under contract · 21 days on market");
});

test("the note as sent carries the period and source lines exactly", () => {
  const m = demoMarketPulse("2026-10-10");
  const a = m.areas[0];
  const t = fullNote(a.vips[0], a);
  assert.ok(t.startsWith("Hi Jane,"));
  assert.ok(t.endsWith(a.credit));
  assert.ok(t.includes(a.periodLine));
});

test("sending one ticks it and the orb stays yellow until all are sent", () => {
  let m = demoMarketPulse("2026-10-10");
  assert.equal(toSend(m).length, 3);
  const g = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: null, product: "move", importance: 1 }], edges: [] } as never;
  const n = (x: typeof m) => (withMarketPulseNode(g, x) as { nodes: { id: string; status?: string; secondaryLabel?: string }[] }).nodes.find((v) => v.id === MARKET_NODE)!;
  assert.equal(n(m).status, "attention");
  assert.match(n(m).secondaryLabel!, /^3 of 5 to send · September 2026$/);
  for (const v of toSend(m)) m = withSent(m, v.id, "2026-10-03T00:00:00Z");
  assert.equal(n(m).status, "healthy");
  assert.match(n(m).secondaryLabel!, /^All 5 sent/);
});

test("not ready: no pulse, says why", () => {
  const m = { ...demoMarketPulse("2026-10-10"), ready: false };
  const g = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: null, product: "move", importance: 1 }], edges: [] } as never;
  const x = (withMarketPulseNode(g, m) as { nodes: { id: string; status?: string; secondaryLabel?: string }[] }).nodes.find((v) => v.id === MARKET_NODE)!;
  assert.equal(x.status, undefined);
  assert.equal(x.secondaryLabel, "Starts when the MLS feed is live");
});

test("lastMonth is the finished month before today", () => {
  assert.equal(lastMonth("2026-10-10"), "2026-09");
  assert.equal(lastMonth("2027-01-01"), "2026-12");
});
