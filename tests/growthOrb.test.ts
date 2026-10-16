import { test } from "node:test";
import assert from "node:assert/strict";
import { GROWTH_JOIN_BUTTON, GROWTH_LOCKED_LINE, GROWTH_NODE, growthChildren, growthDemoNote, withGrowthNodes, type GrowthState } from "../lib/growthOrb.ts";
import { GROWTH_JOIN } from "../lib/sales.ts";
import { cleanNext, enterUrl } from "../lib/siteEdit.ts";
import { demoGraph } from "../lib/graph/demo.ts";
import { childrenOf, indexGraph } from "../lib/graph/model.ts";

const S = (o: Partial<GrowthState> = {}): GrowthState => ({ growth: true, siteHost: "jane.vip50homes.com", teamHosts: [], likely: true, ...o });
const ORDER = ["ads", "areas", "landing", "speed", "signals", "inbox", "results"];

test("no ONE Growth: no pieces; the orb is locked with the offer and Add ONE Growth to the checkout", () => {
  assert.deepEqual(growthChildren(S({ growth: false })), []);
  const g = withGrowthNodes(demoGraph(), S({ growth: false }));
  const orb = g.nodes.find((n) => n.id === GROWTH_NODE)!;
  assert.equal(orb.type, "product");
  assert.equal(orb.parentId, "one");
  assert.equal(orb.locked, true);
  assert.equal(orb.summary, GROWTH_LOCKED_LINE);
  assert.ok(GROWTH_LOCKED_LINE.includes("$499 a month, or $199 added to ONE Complete or Elite. Month to month."));
  assert.equal(g.nodes.filter((n) => n.parentId === GROWTH_NODE).length, 0);
  assert.equal(GROWTH_JOIN_BUTTON.label, "Add ONE Growth");
  assert.deepEqual(GROWTH_JOIN_BUTTON.action, { kind: "join", href: GROWTH_JOIN });
});

test("Growth with a site: the seven pieces in order, each with a line and one button to a real place", () => {
  const kids = growthChildren(S());
  assert.deepEqual(kids.map((c) => c.key), ORDER);
  for (const c of kids) assert.ok(c.line && c.button, c.key);
  const by = Object.fromEntries(kids.map((c) => [c.key, c]));
  assert.deepEqual(by.ads.button!.action, { kind: "site", next: "/ads" });
  assert.deepEqual(by.areas.button!.action, { kind: "site", next: "/manage/areas" });
  assert.deepEqual(by.landing.button!.action, { kind: "movePage", path: "/landing-pages" });
  assert.deepEqual(by.speed.button!.action, { kind: "profile", tab: "pulse" });
  assert.deepEqual(by.signals.button!.action, { kind: "likely" });
  assert.deepEqual(by.inbox.button!.action, { kind: "profile", tab: "connections" });
  assert.deepEqual(by.results.button!.action, { kind: "site", next: "/manage/results" });
  assert.equal(by.ads.line, "Ads Pulse writes for you, on your own Meta and Google accounts. You approve and publish.");
  // on the map, round the orb, in the same order
  const ix = indexGraph(withGrowthNodes(demoGraph(), S()));
  assert.equal(ix.byId.get(GROWTH_NODE)!.locked, undefined);
  assert.deepEqual(childrenOf(ix, GROWTH_NODE).map((n) => n.id.split(":")[1]), ORDER);
});

test("seller signals without the Likely to move answer: a plain line, no button", () => {
  const c = growthChildren(S({ likely: false })).find((x) => x.key === "signals")!;
  assert.equal(c.line, "Coming with the MLS feed.");
  assert.equal(c.button, null);
});

test("Growth with no website on record: site pieces say the website comes first and open the builder", () => {
  const kids = growthChildren(S({ siteHost: null }));
  assert.deepEqual(kids.map((c) => c.key), ORDER);
  for (const k of ["ads", "areas", "results"]) {
    const c = kids.find((x) => x.key === k)!;
    assert.ok(c.line.startsWith("Your website comes first."), k);
    assert.equal(c.button!.label, "Edit my website");
    assert.deepEqual(c.button!.action, { kind: "site", next: "/builder" });
  }
  // the rest do not depend on the site
  assert.deepEqual(kids.find((x) => x.key === "landing")!.button!.action, { kind: "movePage", path: "/landing-pages" });
  // not read yet: the line, and no button until it is (never a button that does nothing)
  for (const c of growthChildren(S({ siteHost: undefined })).filter((x) => ["ads", "areas", "results"].includes(x.key))) assert.equal(c.button, null);
});

test("team owner or admin: Ad requests on each team site, after Results", () => {
  const one = growthChildren(S({ teamHosts: ["summit-home.vip50homes.com"] }));
  assert.deepEqual(one.map((c) => c.key), [...ORDER, "adreq:summit-home.vip50homes.com"]);
  const ar = one[one.length - 1];
  assert.equal(ar.label, "Ad requests");
  assert.deepEqual(ar.button!.action, { kind: "site", host: "summit-home.vip50homes.com", next: "/manage/ad-requests" });
  const two = growthChildren(S({ teamHosts: ["a.vip50homes.com", "b.vip50homes.com"] }));
  assert.deepEqual(two.slice(-2).map((c) => c.label), ["Ad requests · a", "Ad requests · b"]);
  // without Growth, no Ad requests either
  assert.deepEqual(growthChildren(S({ growth: false, teamHosts: ["a.vip50homes.com"] })), []);
});

test("rebuilt, never doubled; null takes the orb away", () => {
  const once = withGrowthNodes(demoGraph(), S());
  const twice = withGrowthNodes(withGrowthNodes(once, S({ growth: false })), S());
  assert.equal(twice.nodes.length, once.nodes.length);
  assert.equal(twice.edges.length, once.edges.length);
  const gone = withGrowthNodes(once, null);
  assert.equal(gone.nodes.some((n) => n.id === GROWTH_NODE || n.id.startsWith(`${GROWTH_NODE}:`)), false);
  assert.equal(gone.edges.some((e) => e.target === GROWTH_NODE || e.target.startsWith(`${GROWTH_NODE}:`)), false);
});

test("the site opener carries the new studio pages; the demo never reaches a real site", () => {
  const T = "a".repeat(64);
  assert.equal(cleanNext("/ads"), "/ads");
  assert.equal(cleanNext("/manage/areas"), "/manage/areas");
  assert.equal(enterUrl("https://jane.vip50homes.com", T, "/ads"), `https://jane.vip50homes.com/builder/enter?next=/ads#t=${T}`);
  assert.ok(growthDemoNote({ kind: "site", next: "/ads" })?.startsWith("Example agent"));
  assert.ok(growthDemoNote({ kind: "movePage", path: "/landing-pages" })?.includes("Landing Pages"));
  assert.equal(growthDemoNote({ kind: "profile", tab: "pulse" }), null);
});
