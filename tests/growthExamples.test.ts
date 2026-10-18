import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXAMPLE_ADS, EXAMPLE_LEADS, EXAMPLE_REQUESTS, EXAMPLE_SIGNALS, EXAMPLE_SOURCES, EXAMPLE_FUNNEL, GROWTH_KEYS, adButtons, applyGrowth, barShares, convRate,
  costPerLead, durationWords, initialGrowthState, median, monthTotals, pieceKey, pieceLine,
} from "../lib/examples/growth.ts";

test("pieceKey: the Growth child keys, team ad requests by host included", () => {
  assert.equal(pieceKey("ads"), "ads");
  assert.equal(pieceKey("adreq:summit-home.vip50homes.com"), "adreq");
  assert.equal(pieceKey("nope"), null);
});

test("an ad is approved before it can be published; Approve never publishes", () => {
  const s0 = initialGrowthState();
  const draft = EXAMPLE_ADS.find((a) => a.status === "draft")!;
  assert.deepEqual(adButtons("draft").map((b) => b.label), ["Approve", "Pause"]);
  // a draft cannot jump straight to live
  assert.equal(applyGrowth(s0, { kind: "ad", id: draft.id, to: "live" }), s0);
  const s1 = applyGrowth(s0, { kind: "ad", id: draft.id, to: "approved" });
  assert.equal(s1.ads[draft.id], "approved");
  assert.match(s1.note!, /only once you tap Publish/);
  assert.match(s1.note!, /nothing was published and nothing was spent/);
  const s2 = applyGrowth(s1, { kind: "ad", id: draft.id, to: "live" });
  assert.equal(s2.ads[draft.id], "live");
  assert.match(s2.note!, /your own ad account/);
});

test("every example action says nothing left ONE", () => {
  let s = initialGrowthState();
  const acts = [
    { kind: "mode", mode: "auto" },
    { kind: "call", id: EXAMPLE_SIGNALS[0]!.id },
    { kind: "reply", id: EXAMPLE_LEADS[0]!.id },
    { kind: "request", id: EXAMPLE_REQUESTS[0]!.id, to: "approved" },
    { kind: "request", id: EXAMPLE_REQUESTS[1]!.id, to: "asked" },
    { kind: "postcard", id: "area-1" },
    { kind: "page", id: "lp-1", on: false },
  ] as const;
  for (const a of acts) {
    s = applyGrowth(s, a);
    assert.match(s.note!, /\(Example: nothing was (sent|published)/, a.kind);
  }
  assert.equal(s.mode, "auto");
  assert.equal(s.leads[EXAMPLE_LEADS[0]!.id], "Replied");
  assert.equal(s.requests[EXAMPLE_REQUESTS[0]!.id], "approved");
  assert.equal(applyGrowth(s, { kind: "clearNote" }).note, null);
});

test("seller signals never show a value", () => {
  for (const p of EXAMPLE_SIGNALS) assert.doesNotMatch(p.signal, /\$|\d{3},\d{3}|worth/i);
});

test("numbers: median, cost per lead, rate, durations, bars, totals", () => {
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 3); // rounded mean of the middle two
  assert.equal(costPerLead(312, 11), 28.36);
  assert.equal(costPerLead(100, 0), null);
  assert.equal(convRate(412, 9), 2.2);
  assert.equal(convRate(0, 0), 0);
  assert.equal(durationWords(48), "48 seconds");
  assert.equal(durationWords(130), "2 min 10 s");
  assert.equal(durationWords(3900), "1 h 5 min");
  assert.equal(durationWords(null), "No leads yet");
  const shares = barShares(EXAMPLE_SOURCES);
  assert.equal(Math.max(...shares), 1);
  const t = monthTotals(EXAMPLE_SOURCES, EXAMPLE_FUNNEL);
  assert.equal(t.spend, 1240);
  assert.equal(t.leads, 46);
  assert.equal(t.cpl, 26.96);
});

test("every piece has a line", () => {
  const s = initialGrowthState();
  for (const k of GROWTH_KEYS) assert.ok(pieceLine(k, s).length > 5, k);
  assert.match(pieceLine("speed", s), /median/);
});

test("a team ad request is approved before it can be published", () => {
  const s0 = initialGrowthState();
  const r = EXAMPLE_REQUESTS[0]!;
  assert.equal(applyGrowth(s0, { kind: "request", id: r.id, to: "published" }), s0);
  const s1 = applyGrowth(applyGrowth(s0, { kind: "request", id: r.id, to: "approved" }), { kind: "request", id: r.id, to: "published" });
  assert.equal(s1.requests[r.id], "published");
  assert.match(s1.note!, /team's ad account/);
  assert.match(s1.note!, /nothing was published and nothing was spent/);
});
