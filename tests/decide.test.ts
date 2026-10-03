import { test } from "node:test";
import assert from "node:assert/strict";
import { decideOf, liveGraph, type SummaryEnvelope, type SummaryItem } from "../lib/live.ts";

// VIP-SUMMARY §3b (v1.3): listing suggestions can be decided in the Brain.
const ID = "3f1c2a4e-9b7d-4c1e-8a2f-5d6e7f8a9b0c";
const closing: SummaryItem = {
  id: `move:listing:${ID}`,
  kind: "other",
  title: "Log this closing: 450 E 100 S #20",
  urgency: "today",
  why: ["Closed Oct 2."],
  link: "https://move.vip50one.com/contacts/visitors#listing-x",
  decide: { via: "listing_suggestion_decide", id: ID, accept_label: "Log this closing", ask_gci: true },
};
const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [closing] };
const opts = { pkg: "relationship" as const, firstName: "P", reachable: true, today: "2026-10-03" };

test("a listing suggestion sits under People, From your listings, with Accept and Dismiss", () => {
  const g = liveGraph(MASTER, opts, {});
  const n = g.nodes.find((x) => x.id === `live:move:listing:${ID}`)!;
  assert.equal(n.parentId, "move-suggest");
  assert.equal(g.nodes.find((x) => x.id === "move-suggest")!.parentId, "move-g-people");
  assert.deepEqual(n.decide, { id: ID, acceptLabel: "Log this closing", askGci: true });
  assert.ok(!g.nodes.some((x) => x.parentId === "move-followups"));
});

test("only the one allowed function, only with a real id", () => {
  assert.equal(decideOf({ ...closing, decide: { ...closing.decide!, via: "drop_table" } }), undefined);
  assert.equal(decideOf({ ...closing, decide: { ...closing.decide!, id: "1; select" } }), undefined);
  assert.equal(decideOf({ ...closing, decide: undefined }), undefined);
  assert.equal(decideOf({ ...closing, decide: { ...closing.decide!, accept_label: "" } })?.acceptLabel, "Accept");
});
