import { test } from "node:test";
import assert from "node:assert/strict";
import { demoGraph } from "../lib/graph/demo.ts";
import { indexGraph, pathTo } from "../lib/graph/model.ts";
import { DEMO_SIGNALS, applySignal, bumpValue, diffSummaries, lightFrom, usable, type Summary } from "../lib/signals.ts";

const g = demoGraph("complete");
const ix = indexGraph(g);

test("bumpValue ticks the first number and keeps the words", () => {
  assert.equal(bumpValue("4", 1), "5");
  assert.equal(bumpValue("14 / 26", 1), "15 / 26");
  assert.equal(bumpValue("5 to approve", 2), "7 to approve");
  assert.equal(bumpValue("1,284 contacts", 1), "1,285 contacts");
  assert.equal(bumpValue("Sun 1-3pm", 0), "Sun 1-3pm");
  assert.equal(bumpValue("Done", 1), "Done");
});

test("every demo signal is usable on Complete and names real nodes", () => {
  assert.equal(usable(DEMO_SIGNALS, ix).length, DEMO_SIGNALS.length);
});

test("Relationship package: only ONE GO and ONE MOVE signals", () => {
  const rix = indexGraph(demoGraph("relationship"));
  const u = usable(DEMO_SIGNALS, rix);
  assert.ok(u.length > 0);
  assert.ok(u.every((s) => s.product === "go" || s.product === "move"), u.map((s) => s.product).join());
});

test("applySignal ticks the numbers, adds the change first, leaves the old graph alone", () => {
  const s = DEMO_SIGNALS.find((x) => x.id === "sig-go")!;
  const at = "2026-09-30T16:00:00Z";
  const next = applySignal(g, s, at);
  const stat = (gr: typeof g, id: string, label: string) => gr.nodes.find((n) => n.id === id)!.stats!.find((x) => x.label === label)!.value;
  assert.equal(stat(g, "one", "Daily score"), "14 / 26");
  assert.equal(stat(next, "one", "Daily score"), "15 / 26");
  assert.equal(stat(next, "go", "Weekly score"), "96 / 100");
  assert.equal(next.nodes.find((n) => n.id === "go-daily")!.secondaryLabel, "15 / 26 points");
  assert.deepEqual(next.changes![0], { id: "go-daily", product: "go", what: s.what, at });
  assert.equal(next.changes!.length, g.changes!.length + 1);
});

test("the light starts at the product orb, else the nearest visible step toward ONE", () => {
  const s = DEMO_SIGNALS.find((x) => x.id === "sig-showly")!;
  const path = pathTo(ix, s.nodeId).map((n) => n.id);
  assert.equal(lightFrom(s, path, () => true), "showly");
  assert.equal(lightFrom(s, path, (id) => id === "showly-2"), "showly-2");
  assert.equal(lightFrom(s, path, (id) => id === "one"), null);
});

test("diffSummaries: new items and changed numbers only; the first answer is not news", () => {
  const a: Summary = { product: "marquee", found: true, items: [{ id: "m:1", kind: "approval", title: "Approve 5" }], stats: [{ key: "approvals_waiting", label: "Pieces to approve", value: 5 }] };
  const b: Summary = { ...a, items: [...a.items, { id: "m:2", kind: "report", title: "Seller report" }], stats: [{ key: "approvals_waiting", label: "Pieces to approve", value: 7 }] };
  assert.deepEqual(diffSummaries(null, a), { arrived: [], changed: [] });
  const d = diffSummaries(a, b);
  assert.deepEqual(d.arrived.map((i) => i.id), ["m:2"]);
  assert.deepEqual(d.changed, [{ key: "approvals_waiting", label: "Pieces to approve", from: 5, to: 7 }]);
  assert.deepEqual(diffSummaries(a, a), { arrived: [], changed: [] });
});
