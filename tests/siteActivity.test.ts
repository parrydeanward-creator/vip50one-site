import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_HOMES, MAX_PEOPLE, accountLines, agoWords, interest, mailLink, minutesWords, personSiteUrl, reachWords, readPersonSite, readSiteActivity, readTeamSite, roomInviteUrl, siteActivityUrl,
  siteIsEmpty, slowReach, smsLink, sparkPath, streetName, teamSiteUrl, trendWords,
} from "../lib/siteActivity.ts";
import { exampleActivityBody, exampleSiteBody, exampleTeamSiteBody } from "../lib/examples/siteActivity.ts";
import { exampleMoveAnswer, makeExampleStore, EXAMPLE_NATIVE } from "../lib/examples/move2.ts";
import { IN_BRAIN, MOVE_GROUPS, pageFromAddress } from "../lib/moveMenu.ts";
import { MOVE_URL } from "../lib/host.ts";

// VIP-SUMMARY §3ar (Parry, 23 Oct: "yes build it. looks great"): the Brain reads ONE MOVE's site-activity routes. Bad
// answers draw nothing (no invented numbers); lists are capped; only signed-in people with a real contact id are named.

const ID = "11111111-2222-4333-8444-555555555555";
const NOW = Date.parse("2026-10-23T20:00:00Z");

test("URLs: ONE MOVE's four §3ar routes, ranges kept to the three the contract names", () => {
  assert.equal(personSiteUrl(ID), `${MOVE_URL}/api/brain/people/${ID}/site?days=30`);
  assert.equal(personSiteUrl(ID, 7), `${MOVE_URL}/api/brain/people/${ID}/site?days=7`);
  assert.equal(personSiteUrl(ID, 9999), `${MOVE_URL}/api/brain/people/${ID}/site?days=90`);
  assert.equal(roomInviteUrl(ID), `${MOVE_URL}/api/brain/people/${ID}/room-invite`);
  assert.equal(siteActivityUrl("today"), `${MOVE_URL}/api/brain/site/activity?range=today`);
  assert.equal(siteActivityUrl("bogus" as never), `${MOVE_URL}/api/brain/site/activity?range=7d`);
  assert.equal(teamSiteUrl(), `${MOVE_URL}/api/brain/team/site?range=7d`);
});

test("one contact: the contract's shape is read, junk dropped, homes capped at 10 and deduped", () => {
  const homes = Array.from({ length: 14 }, (_, i) => ({ property_key: `k${i % 12}`, address: `${i} Main St`, price: 500000 + i, times: 3, seconds: 90, saved: i === 0, note: null }));
  const s = readPersonSite({
    visits_7: 9, visits_30: 4, homes_viewed_7: 2, homes_viewed_30: 5, seconds_30: 6120, seconds_prev_30: 2280,
    last_visit_at: "2026-10-23T18:00:00Z", last_device: "tablet",
    per_day: [{ date: "2026-10-22", visits: 2 }, { date: "nope", visits: 9 }, { date: "2026-10-21", visits: -3 }],
    homes: [{ address: "" }, null, ...homes],
    today: [{ at: "2026-10-23T14:00:00Z", kind: "home", text: "Viewed a home" }, { at: "bad", kind: "home", text: "x" }, { at: "2026-10-23T15:00:00Z", kind: "weird", text: "Later" }],
    account: { website: { signed_in_at: "2026-10-23T18:00:00Z" }, app: null, room: { invited_at: "2026-10-20T12:00:00Z", opened_at: null }, emails: { cadence: "daily", open_rate: 3 } },
    pulse: { line: "Call her today.", action: "dance" },
  })!;
  assert.ok(s);
  assert.equal(s.visits7, 4, "7 days can never be more than 30");
  assert.equal(s.homes7, 2);
  assert.equal(s.lastDevice, null);
  assert.deepEqual(s.perDay, [{ date: "2026-10-21", visits: 0 }, { date: "2026-10-22", visits: 2 }]);
  assert.equal(s.homes.length, MAX_HOMES);
  assert.equal(new Set(s.homes.map((h) => h.key)).size, s.homes.length);
  assert.deepEqual(s.today.map((t) => [t.text, t.kind]), [["Later", "page"], ["Viewed a home", "home"]], "newest first, unknown kind is a page");
  assert.equal(s.account.emails?.openRate, null, "a rate above 1 is junk");
  assert.equal(s.account.room?.openedAt, null);
  assert.deepEqual(s.pulse, { line: "Call her today.", action: null });
});

test("one contact: not the contract (a 404 page, an error, a list) reads as nothing", () => {
  for (const bad of [null, "Not found", [], { error: "nope" }, { visits_30: 3 }]) assert.equal(readPersonSite(bad), null);
  const empty = readPersonSite({ visits_30: 0, per_day: [], homes: [], today: [], account: {} })!;
  assert.ok(siteIsEmpty(empty), "never on the site and no account: the block stays away");
});

test("who is on my site: signed-in people only with a real contact id, deduped, at most 25", () => {
  const people = Array.from({ length: 40 }, (_, i) => ({ contact_id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, name: `P ${i}`, kind: "Buyer", heat: i % 2 ? "hot" : "cold", line: "Viewed", action: i % 3 ? "call" : "text" }));
  const a = readSiteActivity({
    signed_in: 18, visits: 412, new_leads: -2, top_home: { address: "2876 W Oak Hollow Ln", views: 38, saves: 9 }, top_pages: ["Search", 4, "Sell"], top_area: "Bountiful", phone_share: 0.71, busiest: "Sun 7-9 pm",
    people: [{ contact_id: "not-an-id", name: "Anon" }, { contact_id: people[0].contact_id, name: "" }, ...people, people[1]],
  })!;
  assert.equal(a.people.length, MAX_PEOPLE);
  assert.equal(a.people.some((p) => p.name === "Anon"), false);
  assert.equal(a.newLeads, 0);
  assert.deepEqual(a.topPages, ["Search", "Sell"]);
  assert.equal(a.people[0].heat, null, "cold is not one of the contract's heats");
  assert.equal(a.people[1].heat, "hot");
  assert.equal(readSiteActivity({ signed_in: 3 }), null);
});

test("team sites: agents by visits, routing list needs real ids, slow reach earns a Nudge", () => {
  const t = readTeamSite({
    visits: 1154, signed_in: 44, new_leads: 16, avg_minutes_to_reach: 19,
    agents: [{ user_id: "a", name: "Ann", visits: 10, signed_in: 1, new_leads: 1, minutes_to_reach: 4 }, { user_id: "b", name: "Bo", visits: 90, signed_in: 3, new_leads: 2, minutes_to_reach: null }, { user_id: "a", name: "Dup" }, { name: "No id" }],
    to_route: [{ contact_id: "x", name: "Bad" }, { contact_id: ID, name: "Brooke", line: "Viewed 5 homes" }],
    top_homes: [{ address: "1 A St", views: 3, saves: 1, agent: "Ann" }, { address: "" }],
  })!;
  assert.deepEqual(t.agents.map((a) => a.name), ["Bo", "Ann"]);
  assert.deepEqual(t.toRoute.map((r) => r.name), ["Brooke"]);
  assert.equal(t.topHomes.length, 1);
  assert.equal(slowReach(t.agents[0]), true, "leads and none reached");
  assert.equal(slowReach(t.agents[1]), false);
  assert.equal(slowReach({ minutesToReach: 26, newLeads: 3 }), true);
  assert.equal(slowReach({ minutesToReach: null, newLeads: 0 }), false, "no leads, nothing to nudge");
  assert.equal(readTeamSite({ error: "forbidden" }), null);
});

test("words: time on site, time to reach, trend, ago, street name", () => {
  assert.equal(minutesWords(45), "45s");
  assert.equal(minutesWords(660), "11m");
  assert.equal(minutesWords(6120), "1h 42m");
  assert.equal(minutesWords(7200), "2h");
  assert.equal(reachWords(4), "4 min");
  assert.equal(reachWords(70), "1 h 10 m");
  assert.equal(reachWords(null), "none yet");
  assert.equal(trendWords(6120, 2280), "up from 38m");
  assert.equal(trendWords(600, 0), "new this month");
  assert.equal(trendWords(0, 0), null);
  assert.equal(agoWords("2026-10-23T18:00:00Z", NOW), "2h ago");
  assert.equal(agoWords("2026-10-23T19:59:30Z", NOW), "Just now");
  assert.equal(agoWords(null, NOW), "Not yet");
  assert.equal(streetName("2876 W Oak Hollow Ln, Bountiful"), "OAK HOLLOW");
  assert.equal(streetName("240 Orchard Row"), "ORCHARD");
});

test("sparkline: 14 points across the width, flat at the base for no visits, never NaN", () => {
  const s = sparkPath([0, 1, 0, 2, 1, 0, 3, 2, 4, 1, 3, 5, 4, 6], 600, 70);
  assert.equal(s.line.split(" ").length, 14);
  assert.ok(s.line.startsWith("M0.0,64.0"));
  assert.deepEqual(s.last.map((n) => Math.round(n)), [600, 8]);
  for (const pts of [[], [0, 0, 0], [5], [NaN, -1, 2]]) {
    const z = sparkPath(pts, 600, 70);
    assert.ok(!/NaN|Infinity/.test(z.line + z.area), JSON.stringify(pts));
  }
  assert.ok(interest([{ key: "a", address: "a", price: null, times: 4, seconds: 660, saved: true, note: null }, { key: "b", address: "b", price: null, times: 0, seconds: 0, saved: false, note: null }]).every((n) => n >= 8 && n <= 100));
});

test("account box and drafts: plain words; Text and email are drafts only, no number no link", () => {
  const l = accountLines({ website: { signedInAt: "2026-10-23T18:00:00Z" }, app: { platform: "iPhone", lastAt: null }, room: { invitedAt: "2026-10-20T12:00:00Z", openedAt: null }, emails: { cadence: "daily", openRate: 0.8 } }, NOW);
  assert.deepEqual(l.map((x) => [x.label, x.words, x.ok]), [
    ["Website account", "Signed in · 2h ago", true],
    ["ONE Home app", "Installed · iPhone", true],
    ["Client Room", "Invited Oct 20 · not opened", false],
    ["New match emails", "Daily · opens 80%", true],
  ]);
  assert.equal(accountLines({ website: null, app: null, room: null, emails: null }).every((x) => !x.ok), true);
  assert.equal(smsLink("(801) 555-1234", "Hi"), "sms:8015551234?&body=Hi");
  assert.equal(smsLink("12", "Hi"), null);
  assert.equal(smsLink(null), null);
  assert.equal(mailLink("not-mail", "s", "b"), null);
});

test("example: the example agent's answers read cleanly and name example-store people", () => {
  const s = readPersonSite(exampleSiteBody("Miles Avery", NOW))!;
  assert.ok(s && !siteIsEmpty(s));
  assert.equal(s.perDay.length, 14);
  assert.ok(s.homes.length >= 3 && s.today.length >= 3 && s.pulse);
  assert.ok(siteIsEmpty(readPersonSite(exampleSiteBody("Nobody Here", NOW))!), "someone with no story shows nothing");
  assert.ok(readTeamSite(exampleTeamSiteBody())!.agents.length >= 4);

  const store = makeExampleStore("2026-10-23");
  const act = exampleMoveAnswer(store, "GET", `${MOVE_URL}/api/brain/site/activity?range=today`, null)!;
  const a = readSiteActivity(act.body)!;
  assert.ok(a.people.length >= 4);
  for (const p of a.people) assert.ok(store.people.some((x) => x.id === p.contactId), `${p.name} opens a real example contact`);
  assert.deepEqual(readSiteActivity(exampleActivityBody("30d", []))!.people, []);

  const miles = store.people.find((p) => p.first === "Miles")!;
  const site = exampleMoveAnswer(store, "GET", personSiteUrl(miles.id), null)!;
  assert.equal(site.status, 200);
  assert.ok(readPersonSite(site.body));
  const inv = exampleMoveAnswer(store, "POST", roomInviteUrl(miles.id), {})!;
  assert.deepEqual(inv.body, { ok: true, example: true });
  assert.equal(exampleMoveAnswer(store, "GET", personSiteUrl("00000000-0000-4000-8000-0000000fffff"), null)!.status, 404);
  assert.ok(readTeamSite(exampleMoveAnswer(store, "GET", teamSiteUrl(), null)!.body));
  assert.ok(EXAMPLE_NATIVE.has("onsite"));
});

test("Who is on my site: a People row that opens inside the Brain at /dashboard/on-my-site", () => {
  assert.ok(MOVE_GROUPS[0].pages.some((p) => p.path === "/on-my-site" && p.label === "Who is on my site"));
  assert.ok(IN_BRAIN.has("/on-my-site"));
  assert.equal(pageFromAddress("/dashboard/on-my-site"), "/on-my-site");
});
