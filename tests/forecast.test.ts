import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import type { Deal } from "../lib/deals.ts";
import { CHANCE, FORECAST_NODE, forecast, forecastLine, monthWords, settlesOn, withForecastNode } from "../lib/forecast.ts";

const today = "2026-10-13";
const deal = (id: string, settle: string | null, status: Deal["status"] = "under_contract", moved: string | null = null): Deal => ({
  id, contact: { id: `c${id}`, name: `Client${id} Smith` }, side: "buy", status, form: "2027", acceptedOn: "2026-09-01", deadlineTime: "17:00", next: null,
  dates: settle ? [{ key: "settlement", label: "Settlement", on: settle, effectiveOn: moved, movedReason: null, daysLeft: null }] : [],
});

test("nothing to forecast gives null", () => {
  assert.equal(forecast(null, null, 10000, today), null);
  assert.equal(forecast([deal("1", "2026-11-02", "closed")], [], 10000, today), null);
});

test("a deal counts in its settlement month, the moved day wins, past settles this month", () => {
  const f = forecast([deal("1", "2026-11-28", "under_contract", "2026-12-01"), deal("2", "2026-10-01"), deal("3", null)], [], 10000, today)!;
  assert.equal(settlesOn(deal("1", "2026-11-28", "under_contract", "2026-12-01")), "2026-12-01");
  assert.equal(f.months[0].month, "2026-10-01");
  assert.equal(f.months[0].contract, 2 * 10000 * CHANCE.contract); // past settlement and no date both land now
  assert.equal(f.months[2].contract, 10000 * CHANCE.contract);
  assert.deepEqual(f.months[2].settling, ["Client1"]);
  assert.equal(f.counts.contract, 3);
});

test("Hot spreads over months 1-3, Warm over 4-12, Cold is later", () => {
  const f = forecast([], ["hot", "hot", "hot", "warm", "warm", "warm", "warm", "warm", "warm", "warm", "warm", "warm", "cold"], 9000, today)!;
  // 3 Hot x 50% x 9000 = 13500 over 3 months
  assert.deepEqual(f.months.slice(0, 3).map((m) => m.hot), [4500, 4500, 4500]);
  assert.equal(f.months[0].total, 4500);
  assert.equal(f.months[3].hot, 0);
  // 9 Warm x 25% x 9000 = 20250 over 9 months
  assert.equal(f.months[3].warm, 2300); // 2250 to the nearest $100
  assert.equal(f.months[11].warm, 2300);
  assert.equal(f.months[0].warm, 0);
  assert.equal(f.later, 900);
  assert.equal(f.total12, 33800); // 13500 + 20250 = 33750, to the nearest $100
  assert.equal(f.months[11].month, "2027-09-01");
  assert.equal(forecastLine(f), "About $13,500 in the next 3 months");
});

test("month words", () => {
  assert.equal(monthWords("2026-10-01"), "Oct '26");
});

test("the orb sits under ONE YOU and stays quiet", () => {
  const g: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const f = forecast([], ["hot"], 10000, today);
  const n = withForecastNode(g, f).nodes.find((x) => x.id === FORECAST_NODE)!;
  assert.equal(n.status, "healthy");
  assert.equal(n.parentId, "go");
  assert.equal(withForecastNode(g, null).nodes.some((x) => x.id === FORECAST_NODE), false);
  assert.equal(withForecastNode({ nodes: [{ ...g.nodes[0], locked: true }], edges: [] }, f).nodes.some((x) => x.id === FORECAST_NODE), false);
});
