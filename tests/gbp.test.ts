import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FAILED, FOOTER, canSendText, connectBody, dateWords, demoGbp, demoStateFrom, fieldWords, fixBody, isLowStar, monthWords,
  publishBody, readGbp, readGbpAnswer, replyBody, sortReviews, sourceWords, stateWords, waitingGoogle,
} from "../lib/gbp.ts";

test("stateWords: the four states in plain words", () => {
  assert.equal(stateWords("not_complete"), "Google Business Profile is part of ONE Complete.");
  assert.equal(stateWords("waiting_google"), "Waiting on Google to approve ONE's access. Nothing to do yet; this turns on by itself.");
  assert.equal(stateWords("not_connected"), "ONE asks Google for permission only when you turn this on.");
  assert.equal(stateWords("connected", "Sarah Bennett"), "Connected: Sarah Bennett");
  assert.equal(stateWords("connected"), "Connected.");
});

test("readGbp: a missing route, a failed read or nonsense is waiting_google", () => {
  assert.equal(readGbp(null, false).state, "waiting_google");
  assert.equal(readGbp({ error: "x" }, false).state, "waiting_google");
  assert.equal(readGbp("nope").state, "waiting_google");
  assert.equal(readGbp({ ok: true, state: "something_new" }).state, "waiting_google");
  assert.equal(readGbp({ ok: false }).state, "waiting_google");
  assert.deepEqual(readGbp(null, false), waitingGoogle());
});

test("readGbp: states other than connected carry nothing else", () => {
  const d = readGbp({ ok: true, state: "not_connected", reviews: [{ id: "a", stars: 5 }], location: "X" });
  assert.equal(d.state, "not_connected");
  assert.equal(d.reviews.length, 0);
  assert.equal(d.location, null);
  assert.equal(readGbp({ ok: true, state: "not_complete" }).state, "not_complete");
});

test("readGbp: connected shape, newest review first, bad rows dropped", () => {
  const d = readGbp({
    ok: true,
    state: "connected",
    location: { name: "Sarah Bennett" },
    reviews: [
      { id: "old", first_name: "Ann", stars: 5, text: "Good", at: "2026-01-01T00:00:00Z" },
      { id: "new", first_name: "Bo", stars: 1, text: "Bad", at: "2026-10-01T00:00:00Z", draft: "Sorry, Bo." },
      { id: "", stars: 5 },
      { id: "zero", stars: 0 },
    ],
    posts: [
      { id: "p1", source: "marquee", title: "T", text: "Hi", photo_url: "http://insecure/x.jpg", link: "https://a.example/x", status: "draft" },
      { id: "p2", source: "weird", text: "Hello", status: "published", published_at: "2026-09-28T16:00:00Z" },
    ],
    mismatches: [{ field: "phone", google: "1", one: "2" }, { google: "x" }],
    metrics: { month: "2026-09", calls: 3, directions: -4, clicks: 5.4, views: "x", source: "Google" },
  });
  assert.equal(d.location, "Sarah Bennett");
  assert.deepEqual(d.reviews.map((r) => r.id), ["new", "old"]);
  assert.equal(d.reviews[0].draft, "Sorry, Bo.");
  assert.equal(d.posts[0].photoUrl, null, "only https photos");
  assert.equal(d.posts[0].link, "https://a.example/x");
  assert.equal(d.posts[1].source, null);
  assert.equal(d.posts[1].status, "published");
  assert.equal(d.mismatches.length, 1);
  assert.deepEqual(d.metrics, { month: "2026-09", calls: 3, directions: 0, clicks: 5, views: 0, source: "Google" });
});

test("request bodies carry exactly the shown text", () => {
  assert.deepEqual(replyBody("r1", "  Thank you, Ann.  "), { review_id: "r1", text: "  Thank you, Ann.  " });
  assert.deepEqual(publishBody("p1", "Just listed"), { post_id: "p1", text: "Just listed" });
  assert.deepEqual(fixBody("phone"), { field: "phone" });
  assert.deepEqual(connectBody(), {});
  assert.equal(canSendText("   "), false);
  assert.equal(canSendText("Thanks"), true);
});

test("readGbpAnswer: ok, or ONE MOVE's words, else plain ones", () => {
  assert.deepEqual(readGbpAnswer({ ok: true }, true), { ok: true, url: undefined });
  assert.deepEqual(readGbpAnswer({ ok: true, url: "https://accounts.google.com/x" }, true), { ok: true, url: "https://accounts.google.com/x" });
  assert.deepEqual(readGbpAnswer({ ok: false, words: "Google said no." }, true), { ok: false, words: "Google said no." });
  assert.deepEqual(readGbpAnswer({ words: "Too long a text." }, false), { ok: false, words: "Too long a text." });
  assert.deepEqual(readGbpAnswer(null, false), { ok: false, words: FAILED });
});

test("words: stars, sources, fields, months, dates", () => {
  assert.equal(isLowStar(2), true);
  assert.equal(isLowStar(3), false);
  assert.equal(sourceWords("marquee"), "From your listing in Marquee");
  assert.equal(sourceWords("open_house"), "From your open house in ONE Open");
  assert.equal(sourceWords(null), "Written by Pulse");
  assert.equal(fieldWords("service_areas"), "Service areas");
  assert.equal(fieldWords("hours"), "Hours");
  assert.equal(monthWords("2026-09"), "September 2026");
  assert.equal(monthWords("September 2026"), "September 2026");
  assert.equal(dateWords("2026-10-09T17:20:00Z"), "9 Oct 2026");
  assert.ok(FOOTER.startsWith("Nothing is posted, replied or changed on Google"));
  assert.deepEqual(sortReviews([{ id: "a", at: null } as never, { id: "b", at: "2026-01-01" } as never]).map((r) => r.id), ["b", "a"]);
});

test("demo: connected, Google's name rule, three reviews, two drafts and one published, two mismatches, September 2026", () => {
  const d = demoGbp();
  assert.equal(d.state, "connected");
  assert.equal(d.location, "Sarah Bennett");
  assert.ok(!/realtor/i.test(d.location ?? ""), "no REALTOR in the Google name");
  assert.equal(d.reviews.length, 3);
  const low = d.reviews.filter((r) => isLowStar(r.stars));
  assert.equal(low.length, 1);
  assert.equal(low[0].stars, 2);
  assert.match(low[0].draft ?? "", /call me/i);
  for (const r of d.reviews) if (r.draft) {
    assert.ok(r.draft.includes(r.firstName), "thanks by first name");
    assert.ok(!/\$|offer|closing|price|escrow/i.test(r.draft), "no deal details");
  }
  assert.equal(d.posts.filter((p) => p.status === "draft").length, 2);
  assert.equal(d.posts.filter((p) => p.status === "published").length, 1);
  assert.deepEqual(d.posts.filter((p) => p.status === "draft").map((p) => sourceWords(p.source)), ["From your listing in Marquee", "From your open house in ONE Open"]);
  assert.deepEqual(d.mismatches.map((m) => m.field), ["phone", "website"]);
  assert.equal(monthWords(d.metrics!.month), "September 2026");
  assert.equal(demoGbp("waiting_google").reviews.length, 0);
});

test("demoStateFrom: ?gbp= picks a state, default connected", () => {
  assert.equal(demoStateFrom("?demo=1"), "connected");
  assert.equal(demoStateFrom("?demo=1&gbp=waiting"), "waiting_google");
  assert.equal(demoStateFrom("?gbp=connect"), "not_connected");
  assert.equal(demoStateFrom("?gbp=complete"), "not_complete");
});

import { menuRows } from "../lib/phoneMenu.ts";
test("menu: a Google Business Profile row follows My website, only with a site", () => {
  const base = { live: true, growth: false, siteHost: "s.vip50homes.com", teamHosts: [], agentTeamHrefs: [], classicUrl: "https://move.vip50one.com/dashboard" };
  const keys = menuRows(base).map((r) => r.key);
  assert.equal(keys[keys.indexOf("site") + 1], "gbp");
  assert.deepEqual(menuRows(base).find((r) => r.key === "gbp")?.action, { kind: "gbp" });
  assert.ok(!menuRows({ ...base, siteHost: null }).some((r) => r.key === "gbp"));
});
