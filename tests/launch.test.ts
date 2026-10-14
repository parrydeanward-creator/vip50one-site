import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { demoLaunches, launchBody, launchNode, launchStatus, pieceWords, readLaunches, safeOpen, waiting, withLaunchNodes } from "../lib/launch.ts";

test("launches: checked, pieces in contract order, unknown keys and states dropped", () => {
  assert.equal(readLaunches(null), null);
  assert.equal(readLaunches({ nothing: true }), null);
  const ls = readLaunches({ launches: [
    { id: "a", listing_ref: "p1", pieces: [
      { piece: "buyer_notes", state: "ready" },
      { piece: "marquee_page", state: "drafting" },
      { piece: "marquee_page", state: "done" },
      { piece: "billboard", state: "ready" },
      { piece: "open_house", state: "approved" },
    ] },
    { id: "b", listing_ref: "p1", pieces: [{ piece: "site_page", state: "done" }] },
    { id: "c", listing_ref: "p2", pieces: [] },
  ] })!;
  assert.equal(ls.length, 1);
  assert.deepEqual(ls[0].pieces.map((p) => `${p.piece}:${p.state}`), ["marquee_page:drafting", "buyer_notes:ready"]);
  assert.equal(readLaunches({ launch: { id: "x", listing_ref: "p9", pieces: [{ piece: "ad_draft", state: "requested" }] } })!.length, 1);
});

test("only https or own-page links open", () => {
  assert.equal(safeOpen("javascript:alert(1)"), null);
  assert.equal(safeOpen("http://marquee.vip-50.com/go"), null);
  assert.equal(safeOpen("//evil.example"), null);
  assert.equal(safeOpen("/tasks?launch=1"), "/tasks?launch=1");
  assert.equal(safeOpen("https://marquee.vip-50.com/go?launch=1"), "https://marquee.vip-50.com/go?launch=1");
});

test("ready pulses yellow, failed red, the rest quiet (follow the pulse)", () => {
  const [l] = demoLaunches("p1");
  assert.equal(launchStatus(l), "attention");
  assert.equal(waiting(l), 2);
  assert.equal(launchStatus({ ...l, pieces: l.pieces.map((p, i) => ({ ...p, state: i ? "done" : "failed" })) }), "action");
  assert.equal(launchStatus({ ...l, pieces: l.pieces.map((p) => ({ ...p, state: "drafting" })) }), "healthy");
});

test("plain words; a piece left requested says who has not picked it up", () => {
  const p = { piece: "marquee_page" as const, state: "requested" as const, openUrl: null, note: null, updatedAt: null };
  assert.equal(pieceWords(p, true), "Marquee has not picked this up yet. Open it to start.");
  assert.equal(pieceWords({ ...p, state: "ready" }), "Ready for you to approve");
  assert.equal(pieceWords({ ...p, piece: "buyer_notes", state: "ready" }), "Ready for you to send");
  assert.equal(pieceWords({ ...p, state: "drafting", note: "Add your photos to draft the page" }), "Add your photos to draft the page");
});

test("a Launch orb hangs under its listing, and only when the listing is drawn", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = {
    nodes: [{ id: "marquee:listing:p1", type: "property", label: "742 Demo Ridge", parentId: "marquee-listings", product: "marquee", importance: 1 }],
    edges: [],
  };
  const out = withLaunchNodes(g, [...demoLaunches("p1"), ...demoLaunches("not-drawn")]);
  const orb = out.nodes.find((n) => n.id === launchNode("p1"))!;
  assert.equal(orb.parentId, "marquee:listing:p1");
  assert.equal(orb.status, "attention");
  assert.equal(orb.needCount, 2);
  assert.equal(out.nodes.some((n) => n.id === launchNode("not-drawn")), false);
  assert.equal(withLaunchNodes(out, null).nodes.some((n) => n.id === launchNode("p1")), false);
});

test("Launch sends only the pieces switched off", () => {
  assert.deepEqual(launchBody("p1", {}), { listing_ref: "p1", off: [] });
  assert.deepEqual(launchBody("p1", { ad_draft: false, open_house: true }), { listing_ref: "p1", off: ["ad_draft"] });
});
