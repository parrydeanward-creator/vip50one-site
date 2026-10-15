import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { ADS_NODE, readSiteAlerts, withAdsAlertNode } from "../lib/siteAlerts.ts";

// ONE Websites' site_alerts (one-websites#128) in the Brain: red while an ad did not reach Meta, yellow while a team ad
// is paused, gone when there is nothing; each alert opens the agent's own ads page.
const g = (): { nodes: GraphNode[]; edges: GraphEdge[] } => ({ nodes: [{ id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 }, { id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }] as GraphNode[], edges: [] });

test("reads the answer, failed first, and refuses odd links", () => {
  const a = readSiteAlerts({ ok: true, alerts: [
    { kind: "ads_held", line: "1 team ad paused because the agent it shows left the team or turned off Team ads.", url: "https://luxury-agency.vip50homes.com/ads" },
    { kind: "ads_failed", line: "1 ad did not reach Meta. Open it and press Publish again.", url: "https://parry-ward.vip50homes.com/ads" },
    { kind: "ads_failed", line: "x", url: "https://evil.example.com/ads" },
    { kind: "other", line: "x", url: "https://a.vip50homes.com/ads" },
  ] });
  assert.deepEqual(a!.map((x) => x.kind), ["ads_failed", "ads_held"]);
  assert.equal(readSiteAlerts({ nope: 1 }), null);
});

test("red orb under ONE YOU while an ad failed; yellow when only held; none when clear", () => {
  const failed = readSiteAlerts({ alerts: [{ kind: "ads_failed", line: "1 ad did not reach Meta. Open it and press Publish again.", url: "https://parry-ward.vip50homes.com/ads" }] });
  const out = withAdsAlertNode(g(), failed);
  const orb = out.nodes.find((n) => n.id === ADS_NODE)!;
  assert.equal(orb.parentId, "go");
  assert.equal(orb.status, "action");
  assert.equal(orb.needCount, 1);
  const child = out.nodes.find((n) => n.parentId === ADS_NODE)!;
  assert.equal(child.href, "https://parry-ward.vip50homes.com/ads");
  const held = withAdsAlertNode(g(), readSiteAlerts({ alerts: [{ kind: "ads_held", line: "1 team ad paused.", url: "https://luxury-agency.vip50homes.com/ads" }] }));
  assert.equal(held.nodes.find((n) => n.id === ADS_NODE)!.status, "attention");
  const clear = withAdsAlertNode(out, []);
  assert.ok(!clear.nodes.some((n) => n.id.startsWith(ADS_NODE)) && !clear.edges.some((e) => e.target.startsWith(ADS_NODE)));
});

import { SIGNALS_KEY } from "../lib/signalsKey.ts";
test("What everything means: the written key says the settled rules", () => {
  const by = Object.fromEntries(SIGNALS_KEY.map((k) => [k.mark, k.means]));
  assert.match(by.red, /right now/i);
  assert.match(by.yellow, /today/i);
  assert.match(by.green, /all good/i);
  assert.match(by["gold-dot"], /opportunity/i);
  assert.match(by["gold-glow"], /special day/i);
  assert.match(by.ring, /since you were last here/i);
  assert.match(by.click, /middle/);
  assert.ok(SIGNALS_KEY.every((k) => k.means.length < 70), "short enough to read in 20 seconds");
});
