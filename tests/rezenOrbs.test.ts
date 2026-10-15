import { test } from "node:test";
import assert from "node:assert/strict";
import { needsOf } from "../lib/needs.ts";
import { NETWORK_NODE, REVSHARE_NODE, REZEN_NODE, demoRezenRead, netLine, readNetwork, readRevshare, revLine, withRezenNodes } from "../lib/rezenOrbs.ts";
import type { GraphNode } from "../lib/graph/types.ts";

const g = { nodes: [{ id: "go", type: "product", label: "ONE YOU" }] as GraphNode[], edges: [] };

test("nothing ticked, nothing shown", () => {
  assert.equal(readRevshare({}), null);
  assert.equal(readNetwork({ network: { data: null } }), null);
  assert.equal(withRezenNodes(g, null, null).nodes.length, 1);
});

test("revenue share: paid, pending, the last 12 months in order", () => {
  const months = Array.from({ length: 14 }, (_, i) => ({ year: 2025 + Math.floor(i / 12), month: (i % 12) + 1, earnings: i * 10 }));
  const r = readRevshare({ revshare: { read_at: "2026-10-14T20:00:00Z", data: { paid: 4820.4, pending: 610, months: months.reverse() } } })!;
  assert.equal(r.months.length, 12);
  assert.equal(r.months[11].label, "Feb 26");
  assert.equal(revLine(r), "$4,820 paid · $610 pending");
});

test("network: tiers in order, front line names and status only", () => {
  const n = readNetwork(demoRezenRead())!;
  assert.deepEqual(n.tiers.map((t) => t.tier), [1, 2]);
  assert.equal(netLine(n), "14 agents · 1 of 2 front line active");
  assert.deepEqual(Object.keys(n.front[0]).sort(), ["name", "network", "since", "status"]);
});

test("one reZEN orb under ONE YOU holds both, and nothing pulses", () => {
  const read = demoRezenRead();
  const out = withRezenNodes(g, readRevshare(read), readNetwork(read));
  assert.equal(out.nodes.find((x) => x.id === REZEN_NODE)?.parentId, "go");
  for (const id of [REVSHARE_NODE, NETWORK_NODE]) assert.equal(out.nodes.find((x) => x.id === id)?.parentId, REZEN_NODE);
  assert.equal(withRezenNodes(g, null, readNetwork(read)).nodes.filter((x) => x.parentId === REZEN_NODE).length, 1);
  assert.equal(needsOf(out.nodes).size, 0);
});
