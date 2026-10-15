import { test } from "node:test";
import assert from "node:assert/strict";
import { demoGraph } from "../lib/graph/demo.ts";
import { indexGraph } from "../lib/graph/model.ts";
import { MAX_SHOWN, dayOffset, inWindow, offsetLabel, windowTitle } from "../lib/timeline.ts";

const g = demoGraph("complete");
const ix = indexGraph(g);
const now = new Date();

test("day offsets are local (Mountain) days", () => {
  const n = new Date("2026-09-30T15:00:00Z"); // 9:00 MT Wed
  assert.equal(dayOffset("2026-09-30T05:30:00Z", n), -1, "11:30 pm MT Tuesday is yesterday");
  assert.equal(dayOffset("2026-09-30T23:00:00Z", n), 0);
  assert.equal(dayOffset("2026-10-01T06:30:00Z", n), 1, "00:30 MT Thursday is tomorrow");
  assert.equal(dayOffset("2026-10-14T18:00:00Z", n), 14);
});

test("today shows nothing extra; the past and the future each show their own side", () => {
  assert.deepEqual(inWindow(g.dated, 0, now, ix), []);
  const past = inWindow(g.dated, -30, now, ix);
  const future = inWindow(g.dated, 30, now, ix);
  assert.ok(past.length > 0 && past.every((d) => d.day <= 0 && d.day >= -30));
  assert.ok(future.length > 0 && future.every((d) => d.day >= 0 && d.day <= 30));
  assert.ok(future.some((d) => d.id === "p-jen" && d.day === 1), "Jen's birthday tomorrow");
});

test("dragging further shows more, nearest to today first", () => {
  const w7 = inWindow(g.dated, 7, now, ix), w30 = inWindow(g.dated, 30, now, ix);
  assert.ok(w30.length > w7.length);
  for (let i = 1; i < w30.length; i++) assert.ok(w30[i - 1].day <= w30[i].day);
  const b3 = inWindow(g.dated, -3, now, ix);
  assert.deepEqual(b3.map((d) => d.id), ["p-millers"]);
});

test("only what the agent has, and never more than the map can hold", () => {
  const rel = demoGraph("relationship");
  const rix = indexGraph(rel);
  for (const off of [-30, 30]) {
    const w = inWindow(rel.dated, off, now, rix);
    assert.ok(w.every((d) => d.product === "go" || d.product === "move"), w.map((d) => d.product).join());
  }
  const many = Array.from({ length: 30 }, (_, i) => ({ ...g.dated![0], id: ["p-jen", "p-amy", "p-dave", "p-marcus", "p-millers", "p-parkers", "open-2", "open-3", "showly-3", "go-dates", "go-event", "task-report"][i % 12], at: new Date(Date.now() + (i % 12) * 86400_000).toISOString() }));
  assert.ok(new Set(inWindow(many, 30, now, ix).map((d) => d.id)).size <= MAX_SHOWN);
});

test("labels", () => {
  assert.equal(offsetLabel(0), "Today");
  assert.equal(offsetLabel(-1), "Yesterday");
  assert.equal(offsetLabel(-14), "14 days ago");
  assert.equal(offsetLabel(7), "In 7 days");
  assert.equal(windowTitle(-14), "The last 14 days");
  assert.equal(windowTitle(30), "The next 30 days");
});

// Walker audit 02 (Parry, 14 Oct: "yes 1-3 betters list"): the timeline shows real dated history and what is really
// coming, never today's to-dos; the map keeps the product orbs; rows say where they live in the Brain.
import { buildFeed, type FeedRows } from "../lib/timelineFeed.ts";
import { byWeek, productOrbs, whereLabel } from "../lib/timeline.ts";
import { liveGraph } from "../lib/live.ts";

const base = (o: Partial<FeedRows> = {}): FeedRows => ({
  today: "2026-10-15", touches: [], closings: [], referrals: [], leads: [], tasks: [], vips: [], names: new Map(), ...o,
});

test("feed: touches are one line a day, counted by kind, with the people", () => {
  const names = new Map([["a", "Amy Chen"], ["b", "Bo Diaz"]]);
  const f = buildFeed(base({
    names,
    touches: [
      { contact_id: "a", touch_type: "call", touched_at: "2026-10-10T17:00:00Z" },
      { contact_id: "b", touch_type: "call", touched_at: "2026-10-10T19:00:00Z" },
      { contact_id: "a", touch_type: "video_text", touched_at: "2026-10-10T20:00:00Z" },
      { contact_id: "a", touch_type: "call", touched_at: "2026-08-01T20:00:00Z" }, // outside 30 days
    ],
  }));
  assert.equal(f.length, 1);
  assert.equal(f[0].what, "3 touches logged: 2 calls, 1 video text with Amy Chen, Bo Diaz.");
  assert.equal(f[0].id, "move");
  assert.equal(f[0].at.slice(0, 10), "2026-10-10");
});

test("feed: closings, referrals and new contacts behind; birthdays, follow-ups and quarterly touches ahead", () => {
  const f = buildFeed(base({
    names: new Map([["a", "Amy Chen"]]),
    closings: [{ closed_on: "2026-10-01", contact_id: "a", side: "buy", price: 450000 }, { closed_on: "2026-10-30", contact_id: null, side: null, price: null }],
    referrals: [{ created_at: "2026-10-12T15:00:00Z", referred_name: "Sam Lee", referrer_contact_id: "a" }],
    leads: [{ id: "n1", first_name: "Kim", last_name: "Park", created_at: "2026-10-14T15:00:00Z", source_label: "Open house 12 Main" }],
    tasks: [{ title: "Call about the offer", due_date: "2026-10-20", contact_id: "a" }, { title: "Today's", due_date: "2026-10-15", contact_id: null }],
    vips: [{ id: "v1", first_name: "Jen", last_name: "Alvarez", birthday: "1980-10-16", value_touch_face_to_face_at: "2026-07-25T16:00:00Z" }],
  }));
  const whats = f.map((d) => d.what);
  assert.ok(whats.includes("Closed: Amy Chen, buyer side, $450,000."));
  assert.ok(whats.includes("Closing set."));
  assert.ok(whats.includes("Referral from Amy Chen: Sam Lee."));
  assert.ok(whats.includes("New contact: Kim Park (Open house 12 Main)."));
  assert.ok(whats.includes("Due: Call about the offer (Amy Chen)."));
  assert.ok(!whats.some((w) => w.includes("Today's")), "today's to-dos are the normal map, not the timeline");
  assert.ok(whats.includes("Jen Alvarez's birthday."));
  assert.ok(whats.includes("Face to face due again for Jen Alvarez."), "90 days after 25 Jul is 23 Oct");
  assert.equal(f.find((d) => d.what.startsWith("Closed"))!.id, "go", "closings live under ONE YOU (Goals)");
  assert.equal(f.find((d) => d.what.startsWith("Due"))!.contactId, "a", "a person's row opens their card");
});

test("feed: an import day is one line, not hundreds", () => {
  const leads = Array.from({ length: 40 }, (_, i) => ({ id: `l${i}`, first_name: `P${i}`, created_at: "2026-10-13T15:00:00Z", source_label: i < 30 ? "Phone import" : "Google" }));
  const f = buildFeed(base({ leads }));
  assert.deepEqual(f.map((d) => d.what), ["40 new contacts: 30 Phone import, 10 Google."]);
});

test("today's to-dos never reach the timeline, past or future (the bug: both showed today's touches)", () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
  const raw = {
    found: true, stats: [], today_boxes: [],
    items: [{ id: "t1", kind: "vip_touch", title: "Call Amy", urgency: "today", due: today, contact_id: null }],
  } as unknown as Parameters<typeof liveGraph>[0];
  const lg = liveGraph(raw, { today, pkg: "complete" } as Parameters<typeof liveGraph>[1]);
  assert.ok(!(lg.dated ?? []).some((d) => d.what.includes("Call Amy")));
  const lix = indexGraph(lg);
  assert.equal(inWindow(lg.dated, -27, now, lix).length, 0);
  assert.equal(inWindow(lg.dated, 27, now, lix).length, 0);
});

test("the map keeps the product orbs and lights the ones with something; rows say where they live", () => {
  const rows = inWindow(g.dated, -30, now, ix);
  const lit = productOrbs(rows, ix);
  assert.ok(lit.length > 0 && lit.every((id) => ix.byId.get(id)?.type === "product"));
  const prodRow = { id: "move", product: "move" as const, at: new Date(Date.now() - 2 * 86400_000).toISOString(), what: "2 touches logged." };
  assert.ok(inWindow([prodRow], -7, now, ix).length === 1, "an item on a product orb counts");
  assert.equal(whereLabel("go"), "ONE YOU");
  assert.equal(whereLabel("move"), "ONE MOVE");
  assert.equal(whereLabel("marquee"), "Marquee");
});

test("weeks: this week, last week, then 'Week of'", () => {
  const n = new Date("2026-10-15T18:00:00Z"); // Thursday
  const mk = (day: number) => ({ day, at: "x" });
  const w = byWeek([mk(0), mk(-3), mk(-4), mk(-11), mk(-20)], n);
  assert.deepEqual(w.map((x) => x.label), ["This week", "Last week", "Week of Sep 28", "Week of Sep 21"]);
  assert.deepEqual(w.map((x) => x.rows.length), [2, 1, 1, 1]);
  assert.deepEqual(byWeek([mk(1), mk(4), mk(12)], n).map((x) => x.label), ["This week", "Next week", "Week of Oct 26"]);
});

test("Marquee posts and ONE Open's held open houses reach the timeline (marquee-app#63, vip-open migration 073)", () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
  const ago = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
  const raw = { found: true, stats: [], today_boxes: [], items: [] } as unknown as Parameters<typeof liveGraph>[0];
  const env = (x: object) => ({ reachable: true, env: { found: true, stats: [], items: [], ...x } }) as never;
  const lg = liveGraph(raw, { today, pkg: "complete" } as Parameters<typeof liveGraph>[1], {
    marquee: env({ posts: [
      { id: "a:facebook", address: "822 N Grandridge Ct, Draper", channel: "facebook", at: ago(5), state: "sent" },
      { id: "b:instagram", address: "822 N Grandridge Ct", channel: "instagram", at: ago(-3), state: "scheduled" },
      { id: "c:x", address: "1 X St", channel: "instagram", at: ago(2), state: "draft" },
    ] }),
    open: env({ held_open_houses: [{ id: "h1", address: "12 Main St", starts_at: ago(4), visitors: 14 }] }),
  });
  const whats = (lg.dated ?? []).map((d) => d.what);
  assert.ok(whats.includes("Posted on Facebook: 822 N Grandridge Ct."), whats.join(" | "));
  assert.ok(whats.includes("Scheduled for Instagram: 822 N Grandridge Ct."));
  assert.ok(whats.includes("Open house held: 12 Main St, 14 visitors."));
  assert.ok(!whats.some((w) => w.includes("1 X St")), "only sent or really scheduled posts");
  const lix = indexGraph(lg);
  assert.equal(inWindow(lg.dated, -10, now, lix).length, 2);
  assert.equal(inWindow(lg.dated, 10, now, lix).length, 1);
});
