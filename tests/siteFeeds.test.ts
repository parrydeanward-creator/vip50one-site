import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLIENT_PAGE_WORDS,
  SAVE_FAILED,
  clientPageBody,
  demoPersonExtras,
  demoReferralLink,
  myHomeWords,
  readPersonExtras,
  readReferralLink,
  readSaveAnswer,
  referralLinkUrl,
  shareText,
  showsClientPage,
} from "../lib/siteFeeds.ts";
import { readDeals, withClientPage } from "../lib/deals.ts";
import { readPerson } from "../lib/people.ts";

test("K16: the switch's words are Classic's, the body is client_page, shown on open deals with a client", () => {
  assert.ok(CLIENT_PAGE_WORDS.startsWith("Client can see their deal dates on your site"));
  assert.deepEqual(clientPageBody(false), { client_page: false });
  assert.deepEqual(clientPageBody(true), { client_page: true });
  assert.equal(showsClientPage({ status: "under_contract", contact: { id: "a", name: "A" } }), true);
  assert.equal(showsClientPage({ status: "closed", contact: { id: "a", name: "A" } }), false);
  assert.equal(showsClientPage({ status: "under_contract", contact: null }), false);
});

test("K16: deals read client_page, on by default; withClientPage changes only that deal", () => {
  const base = { side: "buy", status: "under_contract", repc_form: "2027", accepted_on: "2026-10-01", deadline_time: "17:00", dates: [] };
  const list = readDeals({ deals: [{ ...base, id: "a", contact: { id: "c1", name: "Jane Smith" } }, { ...base, id: "b", contact: { id: "c2", name: "Mike T" }, client_page: false }] })!;
  assert.equal(list[0].clientPage, true);
  assert.equal(list[1].clientPage, false);
  const next = withClientPage(list, "a", false);
  assert.equal(next[0].clientPage, false);
  assert.equal(next[1], list[1]);
});

test("K16: a save answer is ok, or ONE MOVE's own words, or plain words", () => {
  assert.deepEqual(readSaveAnswer({ ok: true, deal: {} }, true), { ok: true });
  assert.deepEqual(readSaveAnswer({ error: "The client page switch must be on or off.", field: "client_page" }, false), { ok: false, error: "The client page switch must be on or off." });
  assert.deepEqual(readSaveAnswer(null, false), { ok: false, error: SAVE_FAILED });
  assert.deepEqual(readSaveAnswer({ ok: false }, true), { ok: false, error: SAVE_FAILED });
});

test("K17: the referral link answer is checked", () => {
  assert.equal(referralLinkUrl("abc"), `${referralLinkUrl("abc").split("/api/")[0]}/api/brain/people/abc/referral-link`);
  const ok = readReferralLink({ ok: true, code: "ab12cd34", url: "https://jo.vip50homes.com/r/ab12cd34", text: "Hi Jane, ... https://jo.vip50homes.com/r/ab12cd34", sms: "sms:?&body=Hi" });
  assert.deepEqual(ok, { ok: true, code: "ab12cd34", url: "https://jo.vip50homes.com/r/ab12cd34", text: "Hi Jane, ... https://jo.vip50homes.com/r/ab12cd34", sms: "sms:?&body=Hi" });
  assert.deepEqual(readReferralLink({ ok: false, reason: "no_site", words: "Your website is not set up yet." }), { ok: false, reason: "no_site", words: "Your website is not set up yet." });
  assert.deepEqual(readReferralLink({ ok: false, reason: "not_vip", words: "Referral links are for your VIP-50 and VIP-100." })?.ok, false);
  assert.equal(readReferralLink({ ok: true, url: "http://x.com/r/1", text: "t", sms: "sms:" }), null);
  assert.equal(readReferralLink({ ok: true, url: "https://x.com/r/1", text: "t", sms: "javascript:alert(1)" }), null);
  assert.equal(readReferralLink({ ok: false, reason: "other", words: "w" }), null);
  assert.equal(readReferralLink({ error: "Not found." }), null);
  assert.equal(readReferralLink(null), null);
});

test("K17: the example link holds ONE MOVE's words and the link, and opens Messages", () => {
  const d = demoReferralLink("Jane");
  assert.equal(d.url, "https://sarah-bennett.vip50homes.com/r/ab12cd34");
  assert.equal(d.text, shareText("Jane", d.url));
  assert.ok(d.text.startsWith("Hi Jane, thank you") && d.text.endsWith(d.url));
  assert.ok(d.sms.startsWith("sms:?&body=") && decodeURIComponent(d.sms.slice(11)) === d.text);
  assert.ok(shareText("", d.url).startsWith("thank you for always"));
});

test("My Home: the label is drawn once and dates read plainly", () => {
  assert.equal(myHomeWords("My Home: signed in today"), "signed in today");
  assert.equal(myHomeWords("My Home: not signed in yet"), "not signed in yet");
  assert.equal(myHomeWords("My Home: signed in, last on 2026-10-12"), "signed in, last on 12 Oct");
  assert.equal(myHomeWords("signed in today"), "signed in today");
});

test("people/<id>: can_share_link and my_home, missing or wrong reads as off", () => {
  assert.deepEqual(readPersonExtras({ can_share_link: true, my_home: { signed_in_at: null, words: "My Home: not signed in yet" } }), { canShareLink: true, myHome: { signedInAt: null, words: "not signed in yet" } });
  assert.deepEqual(readPersonExtras({ can_share_link: "yes", my_home: null }), { canShareLink: false, myHome: null });
  assert.deepEqual(readPersonExtras({ my_home: { words: "" } }), { canShareLink: false, myHome: null });
  assert.deepEqual(readPersonExtras(null), { canShareLink: false, myHome: null });
  const p = readPerson({ id: "11111111-2222-3333-4444-555555555555", name: "Sara Lee", sections: [], can_share_link: true, my_home: { signed_in_at: "2026-10-18T01:00:00Z", words: "My Home: signed in today" } })!;
  assert.equal(p.canShareLink, true);
  assert.deepEqual(p.myHome, { signedInAt: "2026-10-18T01:00:00Z", words: "signed in today" });
});

test("the example agent: Sara is a past client on My Home, Jane a VIP, Linda neither", () => {
  assert.deepEqual(demoPersonExtras("demo-hr-sara").myHome?.words, "signed in, last on 12 Oct");
  assert.equal(demoPersonExtras("demo-hr-jane").canShareLink, true);
  assert.deepEqual(demoPersonExtras("demo-hr-linda"), { canShareLink: false, myHome: null });
});
