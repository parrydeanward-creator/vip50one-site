import { test } from "node:test";
import assert from "node:assert/strict";
import { firstAndInitial, firstOnly, marqueeToolOrbs, openToolOrbs, showlyToolOrbs, toolHref } from "../lib/productTools.ts";
import { liveGraph, type OtherAnswers, type SummaryEnvelope } from "../lib/live.ts";
import { childrenOf, indexGraph } from "../lib/graph/model.ts";
import { needsOf } from "../lib/needs.ts";

// VIP-SUMMARY §3ai: Marquee, ONE Open and Showly open to their tools.

const NOW = new Date("2026-10-17T18:00:00Z");
const TODAY = "2026-10-17";

// Shaped like ONE Open's vip_open_tools as built (migration 076), read live 17 Oct.
const OPEN_TOOLS = {
  v: 1, product: "open", found: true,
  tools: [
    { key: "open_houses", label: "Open houses", link: "https://open.vip-50.com/app", count: 2, by_phase: { plan: 1, prepare: 0, host: 0, follow_up: 1 },
      items: [
        { address: "450 E 100 S #20, Salt Lake City, UT", starts_at: "2026-10-19T19:00:00Z", ends_at: "2026-10-19T21:00:00Z", phase: "plan", visitors: 0, tasks_left: 5, cohosting: true, link: "https://open.vip-50.com/h/tok123" },
        { address: "970 E 2050 S", starts_at: "2026-10-12T19:00:00Z", phase: "follow_up", visitors: 9, tasks_left: 0, cohosting: false, link: "https://open.vip-50.com/app/events/e2" },
      ] },
    { key: "visitors", label: "Visitors", link: "https://open.vip-50.com/app/visitors", count: 9, contactable: 6, hot: 2,
      items: [{ name: "Jordan Smithson", address: "970 E 2050 S", rating: 5, hot: true, has_agent: false }, { name: "kim@example.com", address: "970 E 2050 S" }] },
    { key: "questions", label: "Questions", link: "https://open.vip-50.com/app/questions", count: 2, unanswered: 1,
      items: [
        { question: "Are the curtains included?", room: "Living room", asked_at: "2026-10-12T20:00:00Z", answered: true },
        { question: "How old is the furnace?", room: "Basement", asked_at: "2026-10-16T20:00:00Z", answered: false },
      ] },
    { key: "reports", label: "Reports", link: "https://open.vip-50.com/app/events", count: 1,
      items: [{ address: "970 E 2050 S", ended_at: "2026-10-12T21:00:00Z", seller_report_sent: false, seller_recap_ready: true, buyer_reports_sent: 3, link: "https://open.vip-50.com/app/events/e2/report" }] },
    { key: "scorecard", label: "Scorecard", link: "https://open.vip-50.com/app/scorecard", range: "last_30_days", open_houses: 1, sign_ins: 9, contacts: 8, appointments: 1, clients: 0 },
    { key: "safety", label: "Safety", link: "https://open.vip-50.com/app/safety", active: true, started_at: "2026-10-17T17:00:00Z", expected_end_at: "2026-10-17T19:00:00Z", checked_out_at: null, panic: true },
  ],
};

test("ONE Open: six tools in order, real data, every link through the one sign-in hop", () => {
  const t = openToolOrbs(OPEN_TOOLS, NOW);
  assert.deepEqual(t.map((x) => x.label), ["Open houses", "Visitors", "Questions", "Reports", "Scorecard", "Safety"]);
  assert.ok(t.every((x) => !x.example));
  for (const x of t) {
    assert.match(x.href, /^\/go\/vip-open\?next=/, x.key);
    for (const r of x.rows) if (r.href) assert.match(r.href, /^\/go\/vip-open\?next=/, r.id);
  }
  const oh = t[0];
  assert.deepEqual(oh.stats!.map((s) => `${s.label} ${s.value}`), ["Plan 1", "Prepare 0", "Host 0", "Follow Up 1"]);
  assert.equal(oh.rows[0].label, "450 E 100 S #20");
  assert.match(oh.rows[0].sub!, /Plan · .* · 0 visitors · 5 tasks left · Co-hosting/);
  assert.equal(oh.rows[0].href, "/go/vip-open?next=%2Fh%2Ftok123");
});

test("ONE Open visitors: first name and last initial only, never an email", () => {
  const v = openToolOrbs(OPEN_TOOLS, NOW)[1];
  assert.deepEqual(v.rows.map((r) => r.label), ["Jordan S"]);
  assert.deepEqual(v.stats!.map((s) => s.value), ["9", "6", "2"]);
  for (const r of v.rows) assert.doesNotMatch(`${r.label} ${r.sub}`, /Smithson|@/);
});

test("ONE Open questions: unanswered first, a fresh one pulses yellow", () => {
  const q = openToolOrbs(OPEN_TOOLS, NOW)[2];
  assert.equal(q.rows[0].label, "How old is the furnace?");
  assert.equal(q.rows[0].status, "attention");
  assert.equal(q.rows[1].status, undefined);
  assert.equal(q.sub, "1 not answered");
});

test("ONE Open safety: a panic shows red", () => {
  const s = openToolOrbs(OPEN_TOOLS, NOW)[5];
  assert.equal(s.sub, "Panic alert");
  assert.equal(s.rows[0].status, "action");
});

test("ONE Open: its own example when a tool sends one, labelled, never pulsing; no answer at all shows the examples too", () => {
  const withEx = { ...OPEN_TOOLS, tools: [{ key: "questions", label: "Questions", link: "https://open.vip-50.com/app/questions", count: 0, unanswered: 0, items: [], example: { label: "Example", items: [{ question: "How old is the roof?", room: "Kitchen", answered: false }] } }] };
  const q = openToolOrbs(withEx, NOW)[2];
  assert.ok(q.example);
  assert.match(q.sub, /^Example/);
  assert.match(q.summary, /Example/);
  assert.equal(q.rows[0].label, "How old is the roof?");
  assert.match(q.rows[0].sub!, /^Example/);
  assert.equal(q.rows[0].status, undefined);
  const none = openToolOrbs(null, NOW);
  assert.equal(none.length, 6);
  assert.ok(none.every((x) => x.example && x.rows.every((r) => !r.status)));
});

test("Marquee: six tools; examples when the new arrays are absent, real rows when present", () => {
  const ex = marqueeToolOrbs(null, TODAY);
  assert.deepEqual(ex.map((x) => x.label), ["Listings", "Calendar", "Posts waiting", "Seller reports", "Presentations", "Room cards"]);
  assert.ok(ex.every((x) => x.example));
  // 18 Oct: the Seller reports example rows are the two reports its side panel shows (lib/examples/marquee.ts), so the
  // orbs and the panel tell one story (was "Week 2" and "Week 3" with no home).
  assert.deepEqual(ex[3].rows.map((r) => `${r.label}: ${r.sub}`), ["1482 Maple Ridge Dr: Example · Week 1 · ready to send to Laura", "310 Willow Bend Rd: Example · Week 3 · ready to send to Mark"]);
  assert.deepEqual(ex[4].rows.map((r) => `${r.label}: ${r.sub}`), ["Listing appointment: Example · 8 pages · ready", "Marketing packet: Example · 12 pages · approved"]);
  assert.equal(ex[5].rows[0].sub, "Example · 6 of 7 rooms written");
  const env = {
    stats: [{ key: "approvals_waiting", value: 3 }, { key: "active_listings", value: 1 }],
    listings: [], posts: [{ id: "x", address: "450 E 100 S #20, SLC", channel: "instagram", at: "2026-10-18T15:00:00Z", state: "scheduled" }],
    reports: [{ listing_ref: "l1", street: "450 E 100 S #20", week: 3, state: "asked", url: "https://marquee.vip-50.com/go?c=c1&s=stats" }],
    presentations: [{ listing_ref: "l1", street: "450 E 100 S #20", kind: "appointment", pages: 8, state: "review", url: "/go?c=c1&s=door" }],
    room_cards: [{ listing_ref: "l1", street: "450 E 100 S #20", rooms: 7, written: 6, url: "https://evil.example.com/x" }],
  };
  const t = marqueeToolOrbs(env, TODAY);
  assert.ok(t.every((x) => !x.example));
  assert.equal(t[1].rows[0].sub, "Instagram · 18 Oct · Scheduled");
  assert.equal(t[2].sub, "3 to approve");
  assert.equal(t[3].rows[0].sub, "Week 3 waiting on your six answers");
  assert.equal(t[3].rows[0].status, "attention");
  assert.equal(t[3].rows[0].href, "/go/marquee?next=%2Fgo%3Fc%3Dc1%26s%3Dstats");
  assert.equal(t[4].rows[0].href, "/go/marquee?next=%2Fgo%3Fc%3Dc1%26s%3Ddoor");
  assert.equal(t[4].rows[0].sub, "Listing appointment · 8 pages · ready for you to review");
  assert.equal(t[5].rows[0].href, "/go/marquee?next=%2F", "another host never goes through");
});

test("Showly: four tools; buyers by first name only, never a surname or email", () => {
  const ex = showlyToolOrbs(null, TODAY);
  assert.deepEqual(ex.map((x) => x.label), ["Tours", "Buyer answers", "Recaps", "Lender"]);
  // Rewritten 18 Oct (deliberate change): the example rows now match the example the side panel and full view show
  // (lib/examples/showly.ts: Dana's 5-home tour, 2 recaps ready to send, a connected loan officer).
  assert.equal(ex[0].rows[0].sub, "Example · 5 homes · Sat 10:00 · recap ready");
  assert.deepEqual(ex[2].rows.map((r) => r.sub), ["Example · Sat · 5 homes · ready to send", "Example · Thu · 3 homes · ready to send"]);
  assert.deepEqual([ex[3].rows[0].label, ex[3].rows[0].sub], ["Priya", "Example · Connected · 1 letter ready, 1 waiting"]);
  const env = {
    stats: [{ key: "new_answers", value: 2 }, { key: "tours_this_week", value: 1 }, { key: "letters_back", value: 1 }],
    tours: [{ tour_id: "t1", buyer_first: "Dana Whitfield", homes: 4, when: "2026-10-17T16:00:00Z", sent: false, link: "https://showly.net/app?tour=t1" }, { tour_id: "t2", buyer_first: "lee@example.com", homes: 2, when: "2026-10-20T16:00:00Z", sent: false }],
    recaps: [{ tour_id: "t0", buyer_first: "Dana", sent_at: "2026-10-11T20:00:00Z", views: 3, answered: 2, homes: 4, yes: 1, link: "https://showly.net/app?tour=t0" }],
    lender: { connected: true, lo_name: "Pat Lender", requests_waiting: 1, letters_back_14d: 1, link: "https://showly.net/app" },
  };
  const t = showlyToolOrbs(env, TODAY);
  assert.ok(t.every((x) => !x.example));
  assert.deepEqual(t[0].rows.map((r) => r.label), ["Dana", "Your buyer"]);
  assert.equal(t[0].rows[0].status, "attention", "shown today, recap not sent");
  assert.equal(t[0].rows[1].status, undefined);
  assert.equal(t[0].rows[0].href, "/go/showly?next=%2Fapp%3Ftour%3Dt1");
  assert.match(t[2].rows[0].sub!, /viewed 3 times · 2 of 4 homes answered · 1 Yes/);
  assert.equal(t[3].sub, "Pat Lender · connected");
  for (const x of t) for (const r of x.rows) assert.doesNotMatch(`${r.label} ${r.sub}`, /Whitfield|@/);
});

test("names are cut down whatever arrives", () => {
  assert.equal(firstOnly("Dana Whitfield"), "Dana");
  assert.equal(firstOnly("a@b.co"), null);
  assert.equal(firstAndInitial("Sam Rivera"), "Sam R");
  assert.equal(firstAndInitial("Sam"), "Sam");
  assert.equal(toolHref("showly", "https://showly.net/app#x"), "/go/showly?next=%2Fapp%23x");
  assert.equal(toolHref("open", "javascript:alert(1)", "/app"), "/go/vip-open?next=%2Fapp");
});

// ---- on a live-shaped graph ------------------------------------------------

const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [] };
const OPTS = { pkg: "complete" as const, firstName: "Kim", reachable: true, today: TODAY };
const OPEN: SummaryEnvelope = {
  v: 1, product: "open", found: true, stats: [], items: [
    { id: "safety:s1", kind: "safety", title: "Safety check-in running", urgency: "alert", why: ["Started 11:00."], link: "https://open.vip-50.com/app/safety", seen: null },
  ],
};
const MARQUEE: SummaryEnvelope = {
  v: 1, product: "marquee", found: true, stats: [{ key: "approvals_waiting", label: "Pieces to approve", value: 0 }], items: [],
  listings: [{ ref: "l1", address: "450 E 100 S #20, SLC", status: "live", live_on: "2026-10-10", link: "https://marquee.vip-50.com/go?c=1" }],
};
const SHOWLY: SummaryEnvelope = { v: 1, product: "showly", found: true, stats: [], items: [] };
const ALL: OtherAnswers = { open: { env: OPEN, reachable: true, tools: OPEN_TOOLS }, marquee: { env: MARQUEE, reachable: true }, showly: { env: SHOWLY, reachable: true } };

test("live graph: each product opens to its tools, with items inside and the pulse carried up once", () => {
  const g = liveGraph(MASTER, OPTS, ALL);
  const ix = indexGraph(g);
  assert.deepEqual(childrenOf(ix, "open").map((n) => n.label), ["Open houses", "Visitors", "Questions", "Reports", "Scorecard", "Safety"]);
  assert.deepEqual(childrenOf(ix, "showly").map((n) => n.label), ["Tours", "Buyer answers", "Recaps", "Lender"]);
  assert.equal(ix.byId.get("marquee:listing:l1")!.parentId, "marquee-tool-listings");
  // the safety item sits in the Safety tool; its own "panic" row does not pulse a second time
  assert.equal(ix.byId.get("live:open:safety:s1")!.parentId, "open-tool-safety");
  const needs = needsOf(g.nodes);
  assert.deepEqual(needs.get("open-tool-safety"), { count: 1, level: "now" });
  assert.deepEqual(needs.get("open-tool-questions"), { count: 1, level: "today" });
  assert.equal(needs.get("open")!.level, "now");
  assert.equal(ix.byId.get("open")!.status, "action");
  // every link on these orbs goes through the hop or is the item's own product link
  for (const p of ["open", "marquee", "showly"])
    for (const t of childrenOf(ix, p)) assert.match(t.href ?? "", /^\/go\/(vip-open|marquee|showly)\?next=/, t.id);
});

test("live graph: a product that did not answer shows no tools", () => {
  const g = liveGraph(MASTER, OPTS, { open: { env: null, reachable: false } });
  assert.equal(childrenOf(indexGraph(g), "open").length, 0);
});
