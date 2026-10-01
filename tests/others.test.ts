import { test } from "node:test";
import assert from "node:assert/strict";
import { liveData, liveGraph, type OtherAnswers, type SummaryEnvelope } from "../lib/live.ts";
import { indexGraph, childrenOf } from "../lib/graph/model.ts";

// Shaped like each product's vip_summary as its bot reported it built (1 Oct).
const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [] };
const MARQUEE: SummaryEnvelope = {
  v: 1, product: "marquee", found: true,
  stats: [
    { key: "approvals_waiting", label: "Pieces to approve", value: 3 },
    { key: "active_listings", label: "Active listings", value: 1 },
  ],
  items: [
    { id: "approval:7b88", kind: "approval", title: "3 pieces to approve for 450 E 100 S #20", urgency: "today", due: "2026-10-01", why: ["They post from Fri Oct 2."], link: "https://marquee.vip50one.com/review?c=7b88", seen: null },
    { id: "report:7b88", kind: "report", title: "Answer this week's six questions", urgency: "today", due: "2026-10-02", why: ["Your seller gets no report until you do."], link: "https://marquee.vip50one.com/report", seen: null },
    { id: "failed:ig", kind: "failed", title: "Instagram needs reconnecting", urgency: "alert", why: ["The token expired."], link: "https://marquee.vip50one.com/go", seen: null },
  ],
};
const OPEN: SummaryEnvelope = {
  v: 1, product: "open", found: true,
  stats: [
    { key: "next_open_house", label: "Next open house", value: 2 },
    { key: "prep_tasks_left", label: "Prep tasks left", value: 7, max: 20 },
    { key: "followups_due", label: "Follow-ups due", value: 4 },
  ],
  items: [
    { id: "visitor_rating:oh1", kind: "visitor_rating", title: "Rate 5 visitors from Sunday", urgency: "today", why: ["Unrated visitors from the open house that ended Sep 28."], link: "https://open.vip-50.com/oh/1", seen: null },
  ],
};
const SHOWLY: SummaryEnvelope = {
  v: 1, product: "showly", found: true,
  stats: [{ key: "new_answers", label: "New buyer answers", value: 2 }],
  items: [
    { id: "reaction:r1", kind: "reaction", title: "The Lees answered 4 homes", urgency: "soon", why: ["Yes on 123 Elm."], link: "https://showly.net/app", seen: null },
  ],
};
const OPTS = { pkg: "complete" as const, firstName: "Kim", reachable: true, today: "2026-10-01" };
const ALL: OtherAnswers = { marquee: { env: MARQUEE, reachable: true }, open: { env: OPEN, reachable: true }, showly: { env: SHOWLY, reachable: true } };

test("a connected product shows its own numbers, as sent", () => {
  const ix = indexGraph(liveGraph(MASTER, OPTS, ALL));
  assert.deepEqual(ix.byId.get("marquee")!.stats, [
    { label: "Pieces to approve", value: "3" },
    { label: "Active listings", value: "1" },
  ]);
  assert.deepEqual(ix.byId.get("open")!.stats!.map((s) => s.value), ["2", "7 / 20", "4"]);
  assert.equal(ix.byId.get("marquee")!.status, "action"); // an alert is waiting
});

test("its items hang under named groups, each with its why and link", () => {
  const g = liveGraph(MASTER, OPTS, ALL);
  const ix = indexGraph(g);
  const groups = childrenOf(ix, "marquee").map((n) => n.label);
  assert.deepEqual(groups.sort(), ["Approvals", "Needs fixing", "Seller reports"]);
  for (const it of MARQUEE.items!) {
    const n = ix.byId.get(`live:marquee:${it.id}`)!;
    assert.ok(n, it.id);
    assert.equal(n.product, "marquee");
    assert.equal(n.href, it.link);
    assert.equal(n.summary, it.why.join(" "));
  }
  assert.ok(ix.byId.get("live:open:visitor_rating:oh1"));
});

test("today's items from every product go into Your day, pointing at real nodes", () => {
  const g = liveGraph(MASTER, OPTS, ALL);
  const ids = new Set(g.nodes.map((n) => n.id));
  const what = g.today!.map((d) => `${d.product}:${d.kind}`);
  assert.ok(what.includes("marquee:approval"));
  assert.ok(what.includes("marquee:other")); // the Instagram alert
  assert.ok(what.includes("open:rating"));
  assert.ok(!what.some((w) => w.startsWith("showly"))); // "soon", not today
  assert.ok(!g.today!.some((d) => d.what.startsWith("Answer this week"))); // due tomorrow
  for (const d of g.today!) assert.ok(ids.has(d.nodeId), d.nodeId);
});

test("no answer, a refusal and no account each say so plainly, with no numbers", () => {
  const ix = indexGraph(liveGraph(MASTER, OPTS, { marquee: { env: null, reachable: false }, showly: { env: { v: 1, product: "showly", found: false }, reachable: true } }));
  assert.match(ix.byId.get("marquee")!.summary!, /couldn't reach Marquee/);
  assert.equal(ix.byId.get("marquee")!.stats, undefined);
  assert.match(ix.byId.get("showly")!.summary!, /didn't find a Showly account/);
  assert.equal(ix.byId.get("showly")!.stats, undefined);
  assert.match(ix.byId.get("open")!.summary!, /isn't connected to ONE yet/); // not asked
});

test("a product outside the package stays locked and its answer is never shown", () => {
  const ix = indexGraph(liveGraph(MASTER, { ...OPTS, pkg: "relationship" }, ALL));
  for (const p of ["marquee", "open", "showly"]) {
    assert.equal(ix.byId.get(p)!.locked, true, p);
    assert.equal(childrenOf(ix, p).length, 0, p);
  }
  const data = liveData(MASTER, { email: "k@example.com", firstName: "Kim", pkg: "relationship", founding: false }, "2026-10-01", true, ALL);
  for (const p of data.products.filter((x) => !["go", "move"].includes(x.product))) assert.equal(p.items.length, 0, p.product);
});

test("the morning note sees the other products' items and numbers", () => {
  const data = liveData(MASTER, { email: "k@example.com", firstName: "Kim", pkg: "complete", founding: false }, "2026-10-01", true, ALL);
  const m = data.products.find((p) => p.product === "marquee")!;
  assert.equal(m.reachable, true);
  assert.equal(m.items.length, 3);
  assert.deepEqual(m.items.map((i) => i.kind).sort(), ["approval", "failed", "report"]);
  assert.equal(data.products.find((p) => p.product === "open")!.items[0].kind, "other"); // visitor_rating has no note kind
});

test("only https pictures from a product are drawn", () => {
  const env: SummaryEnvelope = { ...SHOWLY, items: [{ ...SHOWLY.items![0], image: "http://x/y.jpg" }, { ...SHOWLY.items![0], id: "reaction:r2", image: "https://x/y.jpg" }] };
  const ix = indexGraph(liveGraph(MASTER, OPTS, { showly: { env, reachable: true } }));
  assert.equal(ix.byId.get("live:showly:reaction:r1")!.image, undefined);
  assert.equal(ix.byId.get("live:showly:reaction:r2")!.image, "https://x/y.jpg");
});
