import { test } from "node:test";
import assert from "node:assert/strict";
import {
  APPROVE_SEARCH,
  NO_CHANGE_LINE,
  REDRAW_BUTTON,
  REDRAW_HEAD,
  REDRAW_KEPT,
  SEARCH_FAILED,
  SEARCH_SAVED,
  canRedraw,
  changeLines,
  cmaNextHomeSearchUrl,
  cmaRefreshUrl,
  demoLoaded,
  demoRedraw,
  demoShared,
  readChanges,
  readCmaLoaded,
  readRefreshAnswer,
  readSearchAnswer,
} from "../lib/cma.ts";
import { DEMO_PHOTOS, MAX_IMPROVEMENT_PHOTOS, demoPersonExtras, readImprovements, readPhotos } from "../lib/siteFeeds.ts";

const changes = { carried: ["a"], no_longer_shown: ["b", "c"], new: ["d"], listing_changes: [{ listing_id: "a", kind: "price_changed", at: "2026-10-10", from: 1, to: 2 }, { listing_id: "x", kind: "under_contract" }, { listing_id: "y", kind: "back_on_market" }, { listing_id: "z", kind: "closed" }, { listing_id: "w", kind: "no_longer_for_sale" }, { listing_id: "v", kind: "odd_kind" }] };

test("redraw: Classic's words and routes", () => {
  assert.equal(REDRAW_BUTTON, "Redraw with this month's sales");
  assert.equal(REDRAW_HEAD, "Redrawn with this month's sales. What changed since you sent it:");
  assert.ok(REDRAW_KEPT.startsWith("Your range, notes, net sheet and the rest are kept."));
  assert.ok(cmaRefreshUrl.endsWith("/api/brain/cma/refresh"));
  assert.ok(cmaNextHomeSearchUrl.endsWith("/api/brain/cma/next-home-search"));
});

test("changes read and read as plain lines, counts and kinds only", () => {
  const c = readChanges(changes)!;
  const lines = changeLines(c, (id) => (id === "a" ? "1 A St" : `MLS ${id}`));
  assert.deepEqual(lines, [
    "1 new comparable suggested",
    "2 comparables are no longer shown",
    "1 A St price changed",
    "MLS x went under contract",
    "MLS y came back on the market",
    "MLS z sold",
    "MLS w is no longer for sale",
    "MLS v odd kind",
  ]);
  assert.deepEqual(changeLines(readChanges({ carried: ["a"] })), [NO_CHANGE_LINE]);
  assert.deepEqual(changeLines(null), []);
  assert.equal(readChanges("x"), null);
});

test("GET carries refreshed_from and changes; absent reads as a plain CMA", () => {
  const base = { contact_id: "c", cma: { comparables: [], status: "draft" } };
  const r = readCmaLoaded({ ...base, refreshed_from: "old1", changes })!;
  assert.equal(r.refreshedFrom, "old1");
  assert.equal(r.changes?.new.length, 1);
  const p = readCmaLoaded(base)!;
  assert.equal(p.refreshedFrom, null);
  assert.equal(p.changes, null);
});

test("the redraw button shows only while the sent link is live", () => {
  const d = demoLoaded("c");
  assert.equal(canRedraw(d.cma), false);
  const sent = demoShared(d, "send", new Date());
  assert.equal(canRedraw(sent.cma), true);
  assert.equal(canRedraw(demoShared(sent, "stop", new Date()).cma), false);
});

test("refresh answer: the new id, or ONE MOVE's words", () => {
  assert.deepEqual(readRefreshAnswer({ ok: true, cma_id: "n1", refreshed_from: "o", changes: {} }, true), { ok: true, cmaId: "n1" });
  assert.deepEqual(readRefreshAnswer({ ok: false, words: "Not yet." }, true), { ok: false, words: "Not yet." });
  assert.deepEqual(readRefreshAnswer({ error: "Nope" }, false), { ok: false, words: "Nope" });
  assert.equal((readRefreshAnswer(null, false) as { words: string }).words, "Could not redraw just now.");
  assert.equal(readRefreshAnswer({ ok: true }, true).ok, false);
});

test("the example redraw is a draft that keeps the range and carries changes", () => {
  const sent = demoShared({ ...demoLoaded("c"), cma: { ...demoLoaded("c").cma, range: { low: 1, high: 2 } } }, "send", new Date());
  const n = demoRedraw(sent, "old");
  assert.equal(n.refreshedFrom, "old");
  assert.equal(n.cma.sent, null);
  assert.equal(n.link, null);
  assert.deepEqual(n.cma.range, { low: 1, high: 2 });
  assert.ok(changeLines(n.changes).length >= 3);
});

test("approve the search: ok shows the saved line, failure shows ONE MOVE's words", () => {
  assert.equal(APPROVE_SEARCH, "Approve the search for them");
  assert.deepEqual(readSearchAnswer({ ok: true, search_id: "s" }), { ok: true, text: SEARCH_SAVED });
  assert.equal(SEARCH_SAVED, "Saved in their account on your site. They get alerts only if they turn them on.");
  assert.deepEqual(readSearchAnswer({ ok: false, words: "They have no account yet." }), { ok: false, text: "They have no account yet." });
  assert.equal(readSearchAnswer(null, false).text, SEARCH_FAILED);
  assert.equal(readSearchAnswer({ ok: true }, false).ok, false);
});

test("improvement photos: https only, at most 3, no repeats, junk dropped", () => {
  assert.equal(MAX_IMPROVEMENT_PHOTOS, 3);
  assert.deepEqual(readPhotos(["https://a/1.jpg", "http://a/2.jpg", "javascript:x", "data:image/png;base64,AA", "https://a/1.jpg", 5, "https://a/3.jpg", "https://a/4.jpg", "https://a/5.jpg"]), ["https://a/1.jpg", "https://a/3.jpg", "https://a/4.jpg"]);
  assert.deepEqual(readPhotos(undefined), []);
  const imps = readImprovements([{ id: "1", what: "Roof", photos: ["https://p/1", "http://p/2"] }, { id: "2", what: "Deck" }]);
  assert.deepEqual(imps[0].photos, ["https://p/1"]);
  assert.equal(imps[1].photos, undefined);
  const demo = demoPersonExtras("demo-hr-sara").myHome!.improvements![0];
  assert.equal(demo.photos, DEMO_PHOTOS);
  assert.equal(DEMO_PHOTOS.length, 3);
});
