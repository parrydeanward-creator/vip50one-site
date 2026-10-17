import { test } from "node:test";
import assert from "node:assert/strict";
import { upcomingOpenHouses, openHouseWhen, liveGraph, type SummaryEnvelope } from "../lib/live.ts";

const env = (stat: Record<string, unknown>): SummaryEnvelope => ({
  v: 1, product: "open", found: true,
  stats: [{ key: "next_open_house", label: "Days to your next open house", value: null, ...stat }],
  items: [],
});

test("the next open house becomes a home with its day, time and link", () => {
  const xs = upcomingOpenHouses(env({ value: 1, address: "450 E 100 S #20", starts_at: "2026-10-10T17:00:00Z", link: "https://open.vip-50.com/app/events/abc" }), "2026-10-09");
  assert.equal(xs.length, 1);
  assert.equal(xs[0].kind, "open_house");
  assert.equal(xs[0].title, "450 E 100 S #20");
  assert.equal(xs[0].detail, "Sat 10 Oct, 11:00 AM");
  assert.equal(xs[0].urgency, "soon");
  assert.equal(xs[0].due, "2026-10-10");
  assert.equal(xs[0].link, "https://open.vip-50.com/app/events/abc");
});

test("an open house today is due today and goes in Your day", () => {
  const xs = upcomingOpenHouses(env({ value: 0, address: "970 E 2050 S", starts_at: "2026-10-03T17:00:00Z", link: "https://open.vip-50.com/app/events/x" }), "2026-10-03");
  assert.equal(xs[0].urgency, "today");
  assert.equal(xs[0].detail, "Today, 11:00 AM");
});

test("no open house, no address, or a non-https link shows nothing", () => {
  assert.deepEqual(upcomingOpenHouses(env({ value: null, link: "https://open.vip-50.com/app/events/new" }), "2026-10-03"), []);
  assert.deepEqual(upcomingOpenHouses(env({ value: 2, starts_at: "2026-10-05T17:00:00Z", link: "https://open.vip-50.com/x" }), "2026-10-03"), []);
  assert.deepEqual(upcomingOpenHouses(env({ value: 2, address: "1 A St", starts_at: "2026-10-05T17:00:00Z", link: "javascript:alert(1)" }), "2026-10-03"), []);
  assert.deepEqual(upcomingOpenHouses(undefined, "2026-10-03"), []);
});

test("Mountain time across daylight saving", () => {
  assert.equal(openHouseWhen("2026-12-05T18:00:00Z"), "Sat 5 Dec, 11:00 AM");
});

// Rewritten 17 Oct (VIP-SUMMARY §3ai): upcoming open houses now sit inside ONE Open's "Open houses" tool orb, not a
// group of their own.
test("ONE OPEN's Open houses tool holds the upcoming house as a property", () => {
  const starts = new Date(Date.now() + 2 * 86400000).toISOString();
  const open = env({ value: 2, address: "450 E 100 S #20", starts_at: starts, link: "https://open.vip-50.com/app/events/abc" });
  const master: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [] };
  const g = liveGraph(master, { pkg: "complete", firstName: "A", reachable: true, today: "2026-10-03" }, { open: { reachable: true, env: open } });
  const group = g.nodes.find((n) => n.parentId === "open" && n.label === "Open houses");
  assert.ok(group, "Open houses tool under ONE OPEN");
  const house = g.nodes.find((n) => n.parentId === group!.id);
  assert.equal(house?.type, "property");
  assert.equal(house?.label, "450 E 100 S #20");
  assert.equal(house?.href, "https://open.vip-50.com/app/events/abc");
});

test("sign-ups ahead show on the open house orb as a count, never names", async () => {
  const { openHouseItems } = await import("../lib/live.ts");
  const env = { v: 1, product: "open", found: true, stats: [], items: [], open_houses: [{ id: "e1", address: "123 Test St", starts_at: "2026-10-18T18:00:00Z", link: "https://open.vip-50.com/oh/e1", signed_up_ahead: 2 }] };
  const [it] = openHouseItems(env as never, "2026-10-14");
  assert.ok(it.detail?.includes("2 signed up ahead"));
  assert.ok(it.why.some((w) => w.startsWith("2 signed up ahead")));
  const none = openHouseItems({ ...env, open_houses: [{ ...env.open_houses[0], signed_up_ahead: 0 }] } as never, "2026-10-14");
  assert.ok(!none[0].detail?.includes("signed up"));
});
