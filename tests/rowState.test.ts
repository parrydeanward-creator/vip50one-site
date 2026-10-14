import { test } from "node:test";
import assert from "node:assert/strict";
import { liveGraph, type SummaryEnvelope, type SummaryItem } from "../lib/live.ts";
import { demoGraph, oneYouView } from "../lib/graph/demo.ts";
import { needsOf } from "../lib/needs.ts";
import { rowState } from "../lib/rowState.ts";

// Audit stage 2 (14 Oct): a list row and its orb are one status. The orb's ring and count come from needsOf (scene.ts
// draws need.level and need.count); the row must say the same colour and number.
function check(nodes: ReturnType<typeof demoGraph>["nodes"]) {
  const needs = needsOf(nodes);
  for (const n of nodes) {
    const need = needs.get(n.id);
    const r = rowState(n, need);
    if (n.locked) continue;
    if (need) {
      assert.equal(r.kind, need.level, `${n.id}: row colour equals the orb's`);
      assert.equal(r.count, need.count, `${n.id}: row count equals the orb's`);
    } else {
      assert.notEqual(r.kind === "now" && n.status !== "action", true, `${n.id}: never red without a red inside`);
    }
  }
}

test("row = orb on the demo graph (ONE YOU view)", () => check(oneYouView(demoGraph("complete")).nodes));

test("row = orb on a live-shaped graph; red inside makes the parent red with the full count", () => {
  const item = (id: string, due: string): SummaryItem => ({ id, kind: "vip_touch", title: `Call ${id}`, due_at: due } as unknown as SummaryItem);
  const env: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [item("a", "2026-10-01T09:00:00Z"), item("b", "2026-10-14T20:00:00Z")] };
  const g = liveGraph(env, { pkg: "complete", firstName: "P", reachable: true, today: "2026-10-14" });
  check(g.nodes);
  const needs = needsOf(g.nodes);
  const red = g.nodes.filter((n) => needs.get(n.id)?.level === "now");
  for (const n of red) assert.equal(rowState(n, needs.get(n.id)).kind, "now");
});

test("a leaf with no needs entry keeps its own colour; a quiet product wears the green ring", () => {
  assert.equal(rowState({ id: "x", type: "product", label: "X", product: "go" } as never, undefined).kind, "ok");
  assert.equal(rowState({ id: "x", type: "task", label: "X", product: "go", status: "action" } as never, undefined).kind, "now");
  assert.equal(rowState({ id: "x", type: "task", label: "X", product: "go", locked: true, status: "action" } as never, { count: 3, level: "now" }).kind, "none");
});
