import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKind, firstNameOf, isMember, itemProduct, liveData, liveGraph, packageOf, type SummaryEnvelope } from "../lib/live.ts";
import { describeDay } from "../lib/note.ts";
import { rankToday } from "../lib/rank.ts";
import { indexGraph, childrenOf } from "../lib/graph/model.ts";

// Shaped like MASTER's public.vip_summary answer (read live 1 Oct).
const ENV: SummaryEnvelope = {
  v: 1,
  product: "go",
  found: true,
  as_of: "2026-10-01T15:00:00Z",
  stats: [
    { key: "daily_points", label: "Daily score", value: 11, max: 26 },
    { key: "weekly_score", label: "Weekly score", value: 64, max: 100 },
    { key: "vip50_fully_touched", label: "VIP-50 fully touched this month", value: 3, max: 41 },
    { key: "closings_goal", label: "Closings this goal year", value: 4, max: 12, pace: 6, from: "2026-03-01", to: "2027-02-28" },
    { key: "referrals_goal", label: "Referrals this goal year", value: 2, max: null, pace: null, from: "2026-03-01", to: "2027-02-28" },
    { key: "gci_goal", label: "GCI this goal year", value: 38250, max: 120000, pace: 70000, from: "2026-03-01", to: "2027-02-28" },
  ],
  streak: 5,
  weekly_rank: 3,
  items: [
    { id: "go:task:91", kind: "follow_up", title: "Call back Ray Ortiz", detail: "Overdue since Sep 27", urgency: "alert", due: "2026-09-27", person_email: "ray@example.com", why: ["This task was due Sep 27 and is not done."], link: "https://move.vip50one.com/contacts/77", seen: null },
    { id: "go:task:92", kind: "vip_touch", title: "Video text Kim Patel", detail: "Today's VIP-50 touch", urgency: "today", due: "2026-10-01", why: ["ONE GO scheduled this VIP touch for today from the touch cadence."], link: "https://move.vip50one.com/dashboard", seen: null },
    { id: "go:birthday:15:2026-10-02", kind: "birthday", title: "Birthday: Lena Brooks", detail: "Fri Oct 02", urgency: "today", due: "2026-10-02", why: ["On your VIP-50.", "Birthday on Oct 02."], link: "https://move.vip50one.com/contacts/15", seen: null },
    { id: "go:untouched:2026-10", kind: "vip_touch", title: "38 VIP-50s not fully touched this month", detail: "3 of 41 have all five monthly touches", urgency: "soon", due: "2026-10-31", why: ["Monthly touches: call, video text, social, newsletter, mixer invite.", "3 of your 41 VIP-50s have all five this month."], link: "https://move.vip50one.com/contacts/audit", seen: null },
  ],
};
const OPTS = { pkg: "complete" as const, firstName: "Kim", reachable: true, today: "2026-10-01" };

test("MASTER's numbers become ONE's and ONE GO's headline stats, as stored", () => {
  const ix = indexGraph(liveGraph(ENV, OPTS));
  const one = ix.byId.get("one")!;
  assert.deepEqual(one.stats, [
    { label: "Daily score", value: "11 / 26" },
    { label: "Weekly score", value: "64 / 100" },
    { label: "VIP-50 fully touched", value: "3 / 41" },
    { label: "Streak", value: "5 days" },
    { label: "Leaderboard", value: "#3" },
  ]);
  // Lena's birthday is tomorrow: on the map, but not one of today's things.
  assert.match(one.summary!, /^2 things need you today, starting with: Call back Ray Ortiz\.$/);
  assert.match(ix.byId.get("go-goals")!.summary!, /from Mar 1, 2026 to Feb 28, 2027/);
  assert.equal(ix.byId.get("go-gci_goal")!.secondaryLabel, "$38,250 of $120,000");
  assert.equal(ix.byId.get("go-referrals_goal")!.secondaryLabel, "2 so far");
});

test("each item lands in its product, links to the exact screen, and keeps its facts", () => {
  const g = liveGraph(ENV, OPTS);
  const ix = indexGraph(g);
  assert.equal(ix.byId.get("live:go:task:92")!.parentId, "go-today");
  assert.equal(ix.byId.get("live:go:task:91")!.parentId, "move-followups");
  assert.equal(ix.byId.get("live:go:birthday:15:2026-10-02")!.parentId, "move-dates");
  assert.equal(ix.byId.get("move-audit")!.recommendations![0].title, "38 VIP-50s not fully touched this month");
  for (const it of ENV.items!) {
    const n = ix.byId.get(`live:${it.id}`) ?? ix.byId.get("move-audit")!;
    assert.ok(n.href?.startsWith("https://move.vip50one.com/"), it.id);
    assert.ok(n.recommendations?.some((r) => r.why.join() === it.why.join()), it.id);
  }
  assert.equal(itemProduct(ENV.items![3]), "move");
});

test("Marquee, ONE Open and Showly never show numbers until they are connected", () => {
  for (const pkg of ["complete", "relationship"] as const) {
    const ix = indexGraph(liveGraph(ENV, { ...OPTS, pkg }));
    for (const p of ["marquee", "open", "showly"]) {
      const n = ix.byId.get(p)!;
      assert.equal(n.stats, undefined, p);
      assert.equal(childrenOf(ix, p).length, 0, p);
      if (pkg === "complete") assert.match(n.summary!, /isn't connected to ONE yet/);
      else assert.equal(n.locked, true);
    }
  }
});

test("no demo person, number or place ever appears for a real agent", () => {
  const text = JSON.stringify(liveGraph(ENV, OPTS));
  for (const demo of ["Sarah", "Jen Alvarez", "Maple Ridge", "Millers", "14 / 26", "Marcus Lee", "Amy Chen"]) assert.ok(!text.includes(demo), demo);
});

test("MASTER unreachable or no account: no numbers, and ONE says so plainly", () => {
  const down = indexGraph(liveGraph(ENV, { ...OPTS, reachable: false }));
  assert.equal(down.byId.get("one")!.stats, undefined);
  assert.match(down.byId.get("one")!.summary!, /couldn't reach/);
  assert.equal(down.byId.get("go")!.stats, undefined);
  const none = indexGraph(liveGraph({ v: 1, product: "go", found: false }, OPTS));
  assert.equal(none.byId.get("one")!.stats, undefined);
  assert.equal(liveGraph(null, { ...OPTS, reachable: false }).today!.length, 0);
});

test("Your day takes what is due today or overdue, each pointing at a real node", () => {
  const g = liveGraph(ENV, OPTS);
  const ids = new Set(g.nodes.map((n) => n.id));
  assert.deepEqual(g.today!.map((d) => d.what), ["Call back Ray Ortiz", "Video text Kim Patel"]);
  for (const d of g.today!) assert.ok(ids.has(d.nodeId), d.nodeId);
  assert.equal(dayKind(ENV.items![1]), "text");
  assert.equal(g.changes!.length, 0); // MASTER sends seen: null, so nothing is "new since you looked"
});

test("the morning note gets real items and no invented scoreboard", () => {
  const data = liveData(ENV, { email: "kim@example.com", firstName: "Kim", pkg: "complete", founding: false }, "2026-10-01", true);
  assert.equal(data.scoreboard, null);
  const text = describeDay(data, rankToday(data));
  assert.ok(!text.includes("Scoreboard"));
  assert.ok(text.includes("Call back Ray Ortiz"));
  assert.ok(!/Marquee \(marquee\)|Showly \(showly\)/.test(text));
});

test("name, package and membership follow MASTER's rules", () => {
  assert.equal(firstNameOf("Kim Patel", "kim@x.com"), "Kim");
  assert.equal(firstNameOf("", "jessica.sedei@gmail.com"), "Jessica");
  assert.equal(packageOf("complete"), "complete");
  assert.equal(packageOf(null), "relationship");
  assert.equal(isMember({ vip_access: true, subscription_status: "expired" }), true);
  assert.equal(isMember({ vip_access: false, subscription_status: "trialing" }), true);
  assert.equal(isMember({ vip_access: false, subscription_status: "canceled" }), false);
});

test("faces and homes: only an https photo is ever drawn", async () => {
  const { safeImage } = await import("../lib/live.ts");
  assert.equal(safeImage("https://cdn.example.com/a.jpg"), "https://cdn.example.com/a.jpg");
  for (const bad of ["http://x.com/a.jpg", "javascript:alert(1)", "data:image/png;base64,AAAA", "//x.com/a.jpg", "", null, undefined])
    assert.equal(safeImage(bad as string), undefined, String(bad));
  const env = { ...ENV, items: [{ ...ENV.items![2], image: "https://cdn.example.com/lena.jpg" }, { ...ENV.items![0], image: "http://insecure.example.com/ray.jpg" }] };
  const ix = indexGraph(liveGraph(env, OPTS));
  assert.equal(ix.byId.get("live:go:birthday:15:2026-10-02")!.image, "https://cdn.example.com/lena.jpg");
  assert.equal(ix.byId.get("live:go:task:91")!.image, undefined);
  // no image sent: nothing invented
  for (const n of liveGraph(ENV, OPTS).nodes) assert.equal(n.image, undefined, n.id);
});

test("a person's orb is named by the person, not by the occasion", async () => {
  const { personLabel } = await import("../lib/live.ts");
  assert.deepEqual(personLabel({ ...ENV.items![2] }), { label: "Lena Brooks", sub: "Birthday · Fri Oct 02" });
  const ix = indexGraph(liveGraph(ENV, OPTS));
  assert.equal(ix.byId.get("live:go:birthday:15:2026-10-02")!.label, "Lena Brooks");
  assert.equal(ix.byId.get("live:go:task:91")!.label, "Call back Ray Ortiz"); // tasks keep their wording
});
