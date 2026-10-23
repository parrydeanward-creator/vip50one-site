import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BDAY_GROUP, LEAD_CHIPS, NEED, RING_KEYS, applyDone, isSoiSource, sourceColor, sourceLabel, tilesOf, boardOf, circleOf, filterQuery, filterTitle, keysOf, lastTouchWords, narrow, sameFilter, seatFaces, toggleFilter, type Filter,
} from "../lib/contactsBoard.ts";
import { listUrl, peopleUrl, readGroups, readPage, type Groups, type PersonItem } from "../lib/people.ts";
import { exampleMoveAnswer, makeExampleStore } from "../lib/examples/move2.ts";
import { touchUrl } from "../lib/contact.ts";
import { askUrl, readGroups as readAskGroups, readPeople as readAskPeople } from "../lib/permissionAsk.ts";

// My Contacts, option C (Parry, 22 Oct: "yes on C"). The rings, the key and "came from" filter the list (tap again: back
// to who needs you today); a done touch lowers every count at once (rule 12); a live agent sees only ONE MOVE's people.

// A signed-in agent's answer, in ONE MOVE's shape (vip50-web-crm lib/people-load.ts groupsBody).
const LIVE = {
  total: 5382,
  needs_you: 31,
  needs_now: 6,
  groups: [
    { key: "vip50", label: "VIP-50", kind: "tier", count: 29, needs_you: 1, needs_now: 0 },
    { key: "vip100", label: "VIP-100", kind: "tier", count: 3, needs_you: 3, needs_now: 1 },
    { key: "mayors_circle", label: "Mayor's Circle", kind: "tier", count: 0, needs_you: 0, needs_now: 0 },
    { key: "biz_vip", label: "Biz VIP", kind: "tier", count: 0, needs_you: 0, needs_now: 0 },
    { key: "rising_vip", label: "Rising VIP", kind: "tier", count: 0, needs_you: 0, needs_now: 0 },
    { key: "hwc", label: "Hot / Warm / Cold", kind: "tier", count: 5, needs_you: 5, needs_now: 2 },
    { key: "past_clients", label: "Past clients", kind: "tier", count: 4, needs_you: 0, needs_now: 0 },
    { key: "sphere", label: "Sphere", kind: "tier", count: 4144, needs_you: 30, needs_now: 3 },
    { key: "to_sort", label: "New to sort", kind: "tier", count: 2, needs_you: 0, needs_now: 0 },
    { key: "open_house", label: "Open houses", kind: "source", count: 26, needs_you: 2, needs_now: 0 },
    { key: "lofty", label: "Lofty", kind: "source", count: 4998, needs_you: 20, needs_now: 3 },
    { key: "website", label: "Website", kind: "source", count: 342, needs_you: 8, needs_now: 2 },
    { key: "marquee", label: "Marquee", kind: "source", count: 0, needs_you: 0, needs_now: 0 },
    { key: "showly", label: "Showly", kind: "source", count: 0, needs_you: 0, needs_now: 0 },
    { key: "imported", label: "Imported", kind: "source", count: 0, needs_you: 0, needs_now: 0 },
    { key: "other", label: "Other", kind: "source", count: 16, needs_you: 1, needs_now: 0 },
  ],
  gaps: { vip_no_birthday: 30, to_sort: 2, possible_duplicates: 131 },
};
const live = () => readGroups(LIVE)!;
const item = (id: string, name: string, extra: Partial<PersonItem> = {}): PersonItem => ({
  id, name, firstName: name.split(" ")[0], photo: null, tier: null, cls: null, source: null, lastTouchOn: null, pulse: null, urgency: null, ...extra,
});

test("the rings go inside out by closeness, with counts and who needs you", () => {
  const b = boardOf(live());
  assert.deepEqual(b.rings.map((r) => r.key), ["vip50", "vip100", "past_clients", "sphere", "other"]);
  assert.deepEqual(b.rings.map((r) => [r.label, r.count, r.needsYou]), [["VIP-50", 29, 1], ["VIP-100", 3, 3], ["Past clients", 4, 0], ["Sphere", 4144, 30], ["Other", 16, 1]]);
  assert.equal(b.needsYou, 31);
  assert.equal(b.total, 5382);
});

test("the key lists every group, rings first, then Biz VIP, Hot/Warm/Cold and New to sort", () => {
  const b = boardOf(live());
  assert.deepEqual(b.key.map((k) => k.key), ["vip50", "vip100", "past_clients", "sphere", "other", "biz_vip", "leads", "agents", "hwc", "to_sort"]); // rewritten 23 Oct: Leads and Agents join the key
  assert.equal(b.key.find((k) => k.key === "hwc")!.needsYou, 5);
  // Mayor's Circle and Rising VIP sit inside Biz VIP, never as their own key line
  assert.ok(!b.key.some((k) => k.key === "mayors_circle" || k.key === "rising_vip"));
  assert.deepEqual(b.bizSubs.map((g) => g.key), ["mayors_circle", "rising_vip"]);
  // a circle ONE MOVE adds later shows with no Brain change
  const more = readGroups({ ...LIVE, groups: [...LIVE.groups, { key: "farm", label: "Farm", kind: "tier", count: 7, needs_you: 2 }] })!;
  assert.equal(boardOf(more).key.at(-1)!.label, "Farm");
});

test("came from: sources by size, the empty ones named in one grey line, Other stays a ring", () => {
  const b = boardOf(live());
  assert.deepEqual(b.sources.map((s) => [s.label, s.count]), [["Lofty", 4998], ["Website", 342], ["Open houses", 26]]);
  assert.deepEqual(b.emptySources, ["Marquee", "Showly", "Imported"]);
  assert.ok(!b.sources.some((s) => s.key === "other"));
});

test("a ring, a key line or a source fills the list; tapping it again goes back to who needs you today", () => {
  const ring: Filter = { kind: "group", key: "vip100" };
  let f = toggleFilter(NEED, ring);
  assert.deepEqual(f, ring);
  assert.deepEqual(filterQuery(f), { group: "vip100", sort: "name" });
  f = toggleFilter(f, ring);
  assert.ok(sameFilter(f, NEED), "the same ring again returns to need you today");
  const src: Filter = { kind: "source", key: "lofty" };
  f = toggleFilter(NEED, src);
  assert.deepEqual(filterQuery(f), { group: "lofty", sort: "name" });
  assert.equal(filterTitle(f, boardOf(live()), live().gaps, 31), "CAME FROM LOFTY · 4,998");
  // a different ring switches straight to it
  assert.deepEqual(toggleFilter({ kind: "group", key: "vip50" }, ring), ring);
  assert.deepEqual(toggleFilter(f, src), NEED);
  // who needs you is Pulse's list, everyone is A-Z
  assert.deepEqual(filterQuery(NEED), { group: null, sort: "pulse" });
  assert.deepEqual(filterQuery({ kind: "all" }), { group: null, sort: "name" });
});

test("the four clean-up buttons: each fills the list or opens its own flow", () => {
  const b = boardOf(live());
  const g = live().gaps;
  assert.deepEqual(filterQuery({ kind: "chip", key: "sort" }), { group: "to_sort", sort: "name" });
  assert.deepEqual(filterQuery({ kind: "chip", key: "bday" }), { group: BDAY_GROUP, sort: "name" });
  assert.equal(filterQuery({ kind: "chip", key: "perm" }), null, "Ask a group opens its own flow, not a list");
  assert.equal(filterQuery({ kind: "chip", key: "dup" }), null, "Possible duplicates open Clean Up Contacts");
  assert.equal(filterTitle({ kind: "chip", key: "bday" }, b, g, 31), "VIPS WITH NO BIRTHDAY · 30");
  assert.equal(filterTitle({ kind: "chip", key: "dup" }, b, g, 31), "POSSIBLE DUPLICATES · 131");
  assert.equal(filterTitle(NEED, b, g, 31), "NEED YOU TODAY · 31");
  assert.equal(filterTitle({ kind: "group", key: "vip100" }, b, g, 31), "VIP-100 · 3");
});

test("a done touch lowers the need count, its rings and Hot/Warm/Cold at once, and never twice", () => {
  const g: Groups = live();
  const amy = item("a", "Amy Hughes", { tier: "vip100", cls: "hot", pulse: "Hot, no reply 6 days" });
  const ringOf = new Map([["a", ["vip100"]]]);
  const done = [{ id: "a", keys: keysOf(amy, ringOf, NEED) }];
  assert.deepEqual(done[0].keys.sort(), ["hwc", "vip100"]);
  // ONE MOVE still flags her (its answer has not come back yet): every count drops by one at once
  const now = applyDone(g, done, new Set(["a"]));
  assert.equal(now.needsYou, 30);
  assert.equal(now.groups.find((x) => x.key === "vip100")!.needsYou, 2);
  assert.equal(now.groups.find((x) => x.key === "hwc")!.needsYou, 4);
  assert.equal(now.groups.find((x) => x.key === "sphere")!.needsYou, 30, "a ring she is not on is left alone");
  assert.equal(boardOf(now).rings[1].needsYou, 2);
  assert.equal(filterTitle(NEED, boardOf(now), now.gaps, now.needsYou), "NEED YOU TODAY · 30");
  // ONE MOVE's next answer no longer flags her and already counts 30: it stands, not 29
  const after = applyDone({ ...g, needsYou: 30 }, done, new Set());
  assert.equal(after.needsYou, 30);
  // the list she was opened from counts too
  assert.ok(keysOf(item("b", "Rosa Vega"), new Map(), { kind: "source", key: "lofty" }).includes("lofty"));
});

test("the people who need you sit on their own ring as faces; the rest are a +N that opens the list", () => {
  const need = Array.from({ length: 14 }, (_, i) => ({ id: `p${i}` }));
  const ringOf = new Map<string, string[]>(need.map((p, i) => [p.id, [i < 10 ? "vip50" : i < 12 ? "sphere" : "nowhere"]]));
  ringOf.set("p0", ["sphere", "vip50"]); // in two rings: the inner one
  const { seats, more } = seatFaces(need, ringOf);
  assert.ok(seats.every((s) => RING_KEYS.includes(s.ring as (typeof RING_KEYS)[number])));
  assert.equal(seats.filter((s) => s.ring === "vip50").length, 8, "as many as fit round the inner ring");
  assert.equal(seats.find((s) => s.id === "p0")!.ring, "vip50");
  assert.equal(seats.filter((s) => s.ring === "sphere").length, 2);
  assert.equal(more, 4, "two over the inner ring and two on no ring");
  assert.equal(seats.length + more, need.length);
  // no two faces on a ring touch (radius 14)
  for (const a of seats) for (const b of seats) if (a !== b && a.ring === b.ring) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 28, `${a.id} ${b.id}`);
});

test("search narrows the list by name, circle, source or Pulse's line", () => {
  const l = [item("1", "Tom Lund", { cls: "hot", pulse: "Hot, no reply 6 days" }), item("2", "Kim Walsh", { source: "Website" }), item("3", "Amy Chen", { tier: "vip50" })];
  assert.deepEqual(narrow(l, "kim").map((p) => p.id), ["2"]);
  assert.deepEqual(narrow(l, "website").map((p) => p.id), ["2"]);
  assert.deepEqual(narrow(l, "vip-50").map((p) => p.id), ["3"]);
  assert.deepEqual(narrow(l, "no reply").map((p) => p.id), ["1"]);
  assert.equal(narrow(l, "  ").length, 3);
});

test("rows say when the last touch was and which circle", () => {
  assert.equal(lastTouchWords(null, "2026-10-22"), "—");
  assert.equal(lastTouchWords("2026-10-22", "2026-10-22"), "Today");
  assert.equal(lastTouchWords("2026-10-16", "2026-10-22"), "6 days");
  assert.equal(lastTouchWords("2026-05-22", "2026-10-22"), "5 months");
  assert.deepEqual(circleOf({ tier: null, cls: null, source: "Lofty" }, new Map([["x", ["sphere"]]]), "x"), { key: "sphere", label: "Sphere" });
  assert.deepEqual(circleOf({ tier: "vip100", cls: null, source: null }, new Map(), "x"), { key: "vip100", label: "VIP-100" });
});

test("live never shows example people: the view reads only ONE MOVE, and the board from a live answer has no examples", () => {
  for (const f of ["components/brain/Contacts.tsx", "lib/contactsBoard.ts"]) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.ok(!/examples\//.test(src), `${f} must not import the example data`);
    for (const name of ["Dave Kim", "Jen Alvarez", "Alisha Fenwick", "Amy Hughes", "Tom Lund"]) assert.ok(!src.includes(name), `${f} must not carry ${name}`);
  }
  const b = boardOf(live());
  const words = JSON.stringify(b);
  assert.ok(!/Example|example/.test(words));
  assert.equal(b.total, 5382, "the live total, not the example's");
});

test("the example agent: every ring, key line and clean-up list has people, and actions change what is drawn", () => {
  const s = makeExampleStore("2026-10-22");
  const get = (url: string) => exampleMoveAnswer(s, "GET", url, null)!;
  const g = readGroups(get(`${peopleUrl}/groups`).body)!;
  const b = boardOf(g);
  for (const k of ["vip50", "vip100", "past_clients", "sphere", "other", "hwc", "to_sort", "biz_vip"]) assert.ok(b.key.find((x) => x.key === k)!.count > 0, k);
  assert.ok(b.emptySources.includes("Lofty"));
  const noBday = readPage(get(listUrl({ group: BDAY_GROUP, sort: "name" })).body)!;
  assert.equal(noBday.total, g.gaps.vipNoBirthday);
  assert.ok(noBday.total > 0);
  assert.equal(readPage(get(listUrl({ group: "to_sort", sort: "name" })).body)!.total, g.gaps.toSort);
  // a touch on someone Pulse flagged for no touch takes them off the list and the count
  const due = readPage(get(listUrl({ sort: "pulse", limit: 100 })).body)!.items;
  const dave = due.find((p) => /No touch/.test(p.pulse ?? ""))!;
  exampleMoveAnswer(s, "POST", touchUrl, { contact_id: dave.id, kind: "call" });
  const g2 = readGroups(get(`${peopleUrl}/groups`).body)!;
  assert.equal(g2.needsYou, g.needsYou - 1);
  // Ask a group for permission has groups and people, each with their own link
  const ask = readAskGroups(get(askUrl()).body)!;
  assert.ok(ask.length >= 2);
  assert.ok(readAskPeople(get(askUrl(ask[0].key)).body)!.length > 0);
});

test("My Contacts carries Import beside Add a person (Parry, 23 Oct), opening the import page in the Brain", () => {
  const src = readFileSync(new URL("../components/brain/Contacts.tsx", import.meta.url), "utf8");
  assert.match(src, /data-act="contacts-import"/);
  assert.match(src, /onOpenPage\("\/contacts\/import"\)/);
});

test("My Contacts carries Archived (under the list) and Lead sources (under Came from), opening their pages in the Brain (Parry, 23 Oct)", () => {
  const src = readFileSync(new URL("../components/brain/Contacts.tsx", import.meta.url), "utf8");
  assert.match(src, /data-act="contacts-archived"[^\n]*onOpenPage\("\/contacts\/archived"\)/);
  assert.match(src, /data-act="contacts-sources"[^\n]*onOpenPage\("\/contacts\/sources"\)/);
});

// ---- Leads and Agents in the key (GO/MOVE, 23 Oct) ----
test("the key has Leads with its sources under it, and Agents; sphere is the tagged SOI; a gap group never joins the key", () => {
  const body = {
    ...LIVE,
    groups: [
      ...LIVE.groups,
      { key: "leads", label: "Leads", kind: "tier", count: 120, needs_you: 4, needs_now: 1 },
      { key: "agents", label: "Agents", kind: "tier", count: 9, needs_you: 0, needs_now: 0 },
      { key: "vip_no_birthday", label: "VIPs with no birthday", kind: "gap", count: 30, needs_you: 0, needs_now: 0 },
    ],
    leads_by_source: [{ source: "Zillow", count: 30 }, { source: "BT Paid Ad", count: 70 }, { source: "Zillow", count: 5 }, { source: "", count: 3 }, { source: "Op City", count: 0 }, { source: "Real Geeks", count: 20 }],
  };
  const g = readGroups(body)!;
  assert.equal(g.groups.find((x) => x.key === "vip_no_birthday")!.kind, "gap");
  const b = boardOf(g);
  assert.deepEqual(b.key.map((k) => k.key), ["vip50", "vip100", "past_clients", "sphere", "other", "biz_vip", "leads", "agents", "hwc", "to_sort"]);
  assert.deepEqual(b.key.find((k) => k.key === "leads")!.count, 120);
  assert.equal(b.key.find((k) => k.key === "agents")!.count, 9);
  assert.ok(!b.key.some((k) => k.key === "vip_no_birthday"));
  assert.ok(!b.sources.some((s) => s.key === "vip_no_birthday"));
  // largest first, junk and zero rows dropped, a repeated source kept once
  assert.deepEqual(b.leadsSources, [{ source: "BT Paid Ad", count: 70 }, { source: "Zillow", count: 30 }, { source: "Real Geeks", count: 20 }]);
  // Leads filters the list; each source now opens its own leads (Parry, 23 Oct: "yes on B"; this used to assert the
  // sources were counts only, which deliberately changed)
  assert.deepEqual(filterQuery({ kind: "group", key: "leads" }), { group: "leads", sort: "name" });
  assert.ok(!listUrl({ group: "leads" }).includes("source="));
  const z: Filter = { kind: "lsrc", key: "Zillow", n: 30 };
  assert.deepEqual(filterQuery(z), { group: "leads", sort: "name", source: "Zillow" });
  assert.ok(listUrl({ group: "leads", source: "BT Paid Ad", sort: "name" }).includes("group=leads&source=BT+Paid+Ad"));
  assert.ok(!listUrl({ source: "Zillow" }).includes("source="), "a source never goes without its group");
  assert.equal(filterTitle(z, b, g.gaps, 0), "ZILLOW LEADS · 30");
  assert.ok(keysOf({ id: "p", tier: null, cls: null }, new Map(), z).includes("leads"));
  // an older answer: the lines still show, at 0, with no sources
  assert.deepEqual(boardOf(live()).leadsSources, []);
  assert.equal(boardOf(live()).key.find((k) => k.key === "leads")!.count, 0);
});

// ---- the key as tiles (Parry, 23 Oct: "yes on B"; vip50-ecosystem research/mockups/contacts-key) ----
test("tiles: Leads is the one wide tile after the four rings; empty groups go last; Other after Agents", () => {
  const line = (key: string, count: number) => ({ key, label: key, count, needsYou: 0, color: "#fff", ring: false });
  const t = tilesOf(["vip50", "vip100", "past_clients", "sphere", "other", "biz_vip", "leads", "agents", "hwc", "to_sort"].map((k) => line(k, k === "biz_vip" ? 0 : 5)));
  assert.deepEqual(t.before.map((k) => k.key), ["vip50", "vip100", "past_clients", "sphere"]);
  assert.equal(t.leads?.key, "leads");
  assert.deepEqual(t.after.map((k) => k.key), ["hwc", "agents", "other", "to_sort"]);
  assert.deepEqual(t.empty.map((k) => k.key), ["biz_vip"]);
  // a group ONE MOVE adds later still shows, after the known ones
  assert.deepEqual(tilesOf([line("leads", 1), line("new_circle", 2)]).after.map((k) => k.key), ["new_circle"]);
  assert.equal(tilesOf([line("vip50", 1)]).leads, null);
});

test("lead sources read like people wrote them; Sphere is flagged gold; seven chips then +N more", () => {
  assert.equal(sourceLabel("DIRECT "), "Direct");
  assert.equal(sourceLabel("CALLIN "), "Called in");
  assert.equal(sourceLabel("PERSONALTRANSACTION "), "Personal transaction");
  assert.equal(sourceLabel("LISTING_EMAIL "), "Listing email");
  assert.equal(sourceLabel("open_house"), "Open house");
  assert.equal(sourceLabel("other"), "Other");
  assert.equal(sourceLabel("LENDER "), "Lender");
  assert.equal(sourceLabel("BT Paid Ad"), "BT Paid Ad");
  assert.equal(sourceLabel("Certileads"), "Certileads");
  assert.equal(sourceLabel(" "), "Unknown");
  assert.ok(isSoiSource("Sphere ") && !isSoiSource("Zillow"));
  assert.equal(sourceColor("Sphere", 2), "#c9a43e");
  assert.equal(LEAD_CHIPS, 7);
  const src = readFileSync(new URL("../components/brain/Contacts.tsx", import.meta.url), "utf8");
  assert.match(src, /kind: "lsrc", key: s.source, n: s.count/);
  assert.ok(!src.includes("ct-leadsrc"), "the old sub-line list is gone");
});
