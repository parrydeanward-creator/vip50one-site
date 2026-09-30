import { test } from "node:test";
import assert from "node:assert/strict";
import { demoGraph } from "../lib/graph/demo.ts";
import { childrenOf, indexGraph } from "../lib/graph/model.ts";

const ix = indexGraph(demoGraph("complete"));

test("each of the four products is modelled in depth, not one level", () => {
  for (const p of ["move", "marquee", "open", "showly"]) {
    const areas = childrenOf(ix, p);
    assert.ok(areas.length >= 5, `${p}: ${areas.length} areas`);
    assert.ok(areas.filter((a) => childrenOf(ix, a.id).length > 0).length >= 3, `${p}: too few areas with detail`);
  }
});

test("ONE Open follows the four-phase Open House Protocol, in order", () => {
  const phases = childrenOf(ix, "open").map((n) => n.label).filter((l) => ["Plan", "Prepare", "Host", "Follow Up"].includes(l));
  assert.deepEqual(phases, ["Plan", "Prepare", "Host", "Follow Up"]);
});

test("Marquee's listing path has the app's nine steps, and posting is not automatic", () => {
  assert.equal(childrenOf(ix, "marquee-3").length, 9);
  const posting = ix.byId.get("mq-s-posting")!;
  assert.match(posting.secondaryLabel!, /off/i);
});

test("Showly speaks the app's words: Yes / Maybe / No, never love", () => {
  for (const n of ix.graph.nodes.filter((n) => n.product === "showly" || /showly/i.test(n.summary ?? ""))) {
    for (const t of [n.label, n.secondaryLabel ?? "", n.summary ?? ""]) assert.doesNotMatch(t, /\blove[sd]?\b/i, n.id);
  }
});

test("open house visitors land in ONE MOVE tagged, not in the VIP-50", () => {
  const sort = ix.byId.get("move-4")!;
  assert.match(sort.summary!, /not in your VIP-50/);
  for (const k of childrenOf(ix, "move-4")) assert.match(k.secondaryLabel!, /open-house/);
});

test("Relationship package: the three locked products carry no detail", () => {
  const rix = indexGraph(demoGraph("relationship"));
  for (const p of ["marquee", "open", "showly"]) assert.equal(childrenOf(rix, p).length, 0, p);
  assert.ok(childrenOf(rix, "move").length >= 5);
});
