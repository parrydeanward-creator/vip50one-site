import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DAY,
  bulkBody,
  bulkButton,
  changeBody,
  contactReportsUrl,
  demoBulk,
  demoContactReports,
  demoMonthCard,
  lastSentLine,
  monthGroups,
  ordinal,
  parseDay,
  readBulk,
  readContactReports,
  readMonthCard,
  rprBody,
  rprLink,
  rprMailto,
  rprMonth,
  runningLine,
  runningReport,
  startBody,
  startedByWords,
  stopReportUrl,
  stoppedReports,
  withBulkStarted,
  withChanged,
  withRprSent,
  withStarted,
  withStopped,
} from "../lib/homeReport.ts";

// HOME-REPORT.md (v0.2, agreed 16 Oct): the Brain side of the monthly Home Report, on ONE MOVE's routes.

const RAW = {
  reports: [
    { id: "r1", address: "12 Oak Lane, Draper", send_day: 5, is_on: true, started_by: "agent", note: null, last_sent_month: "2026-08", stopped_at: null, stopped_by: null,
      sends: [{ month: "2026-07", channel: "rpr", via: "agent", sent_at: "2026-08-05T15:00:00Z" }, { month: "2026-08", channel: "rpr", via: "agent", sent_at: "2026-09-05T15:00:00Z" }, { month: "soon" }] },
    { id: "r0", address: "4 Old Rd, Sandy", send_day: 3, is_on: false, started_by: "bulk", stopped_at: "2026-06-01T00:00:00Z", stopped_by: "contact", sends: [] },
    { id: "bad", address: "x", send_day: 40 },
  ],
  suggested_address: "12 Oak Lane, Draper",
  can_email: true,
  email: "jane@example.com",
  autostart: false,
};

test("the card's answer: good reports kept, newest month first, a bad one dropped, a wrong shape refused", () => {
  assert.equal(readContactReports(null), null);
  assert.equal(readContactReports({ reports: "no" }), null);
  const c = readContactReports(RAW)!;
  assert.equal(c.reports.length, 2);
  assert.equal(c.canEmail, true);
  assert.equal(c.email, "jane@example.com");
  const live = runningReport(c)!;
  assert.equal(live.id, "r1");
  assert.deepEqual(live.sends.map((s) => s.month), ["2026-08", "2026-07"]);
  assert.deepEqual(stoppedReports(c).map((r) => r.id), ["r0"]);
  assert.equal(stoppedReports(c)[0].startedBy, "bulk");
});

test("the card's words: day as an ordinal, the address, the last month sent, who started it", () => {
  const live = runningReport(readContactReports(RAW)!)!;
  assert.equal(runningLine(live), "Every month on the 5th: 12 Oak Lane, Draper.");
  assert.equal(lastSentLine(live), "Last sent: August 2026");
  assert.equal(lastSentLine({ ...live, lastSentMonth: null }), "Not sent yet");
  assert.equal(startedByWords("site_request"), "Started by their request on your site");
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 28].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "28th"]);
});

test("the day: empty is the 5th, 1 to 28 whole numbers only", () => {
  assert.equal(DEFAULT_DAY, 5);
  assert.equal(parseDay(""), 5);
  assert.equal(parseDay(" 12 "), 12);
  assert.equal(parseDay("28"), 28);
  for (const bad of ["0", "29", "31", "5.5", "-1", "fifth"]) assert.equal(parseDay(bad), null, bad);
});

test("RPR month (§6): last month, until it is recorded; none on a stopped report", () => {
  const live = runningReport(readContactReports(RAW)!)!;
  assert.equal(rprMonth(live, "2026-10-16"), "2026-09");
  assert.equal(rprMonth({ ...live, lastSentMonth: "2026-09" }, "2026-10-16"), null);
  assert.equal(rprMonth({ ...live, isOn: false }, "2026-10-16"), null);
  assert.equal(rprMonth(live, "2027-01-05"), "2026-12");
});

test("RPR link: https only, checked before sending", () => {
  assert.equal(rprLink("  https://www.narrpr.com/reports/abc  "), "https://www.narrpr.com/reports/abc");
  for (const bad of ["", "http://www.narrpr.com/x", "narrpr.com/x", "https://", "javascript:alert(1)", "https://a b.com", "https://localhost/x"]) assert.equal(rprLink(bad), null, bad);
});

test("Open in my email: to the contact, naming the month and the link; nothing sent by ONE", () => {
  const href = rprMailto("jane@example.com", "Jane", "2026-09", "https://www.narrpr.com/r/1");
  assert.ok(href.startsWith("mailto:jane%40example.com?subject="));
  const q = new URLSearchParams(href.split("?")[1]);
  assert.equal(q.get("subject"), "Your home's neighbourhood in September 2026");
  assert.equal(q.get("body"), "Hi Jane,\n\nHere is September 2026 for your neighbourhood:\nhttps://www.narrpr.com/r/1\n");
  assert.ok(new URLSearchParams(rprMailto(null, "", "2026-09", "https://x.com/a").split("?")[1]).get("body")!.startsWith("Hi there,"));
});

test("the bodies ONE MOVE's routes take", () => {
  assert.equal(contactReportsUrl("a b"), "https://move.vip50one.com/api/brain/home-report?contact_id=a%20b");
  assert.equal(stopReportUrl("r1"), "https://move.vip50one.com/api/brain/home-report?id=r1");
  assert.deepEqual(startBody("c1", " 12 Oak Lane ", 5, ""), { contact_id: "c1", address: "12 Oak Lane", send_day: 5 });
  assert.deepEqual(startBody("c1", "", 9, " Hi! "), { contact_id: "c1", send_day: 9, note: "Hi!" });
  assert.deepEqual(changeBody("r1", 7, " "), { id: "r1", send_day: 7, note: "" });
  assert.deepEqual(rprBody("r1", "https://x.com/a"), { id: "r1", rpr_url: "https://x.com/a" });
  assert.deepEqual(bulkBody(["a", "b", "a"]), { contact_ids: ["a", "b"] });
  // Rewritten 17 Oct: the name agents see is Market Report (HOME-REPORT v0.4; Parry, 16 Oct: "1 yes").
  assert.equal(bulkButton(3), "Start 3 Market Reports");
  assert.equal(bulkButton(1), "Start 1 Market Report");
});

test("bulk list and the monthly card: checked, earliest day first", () => {
  assert.equal(readBulk({}), null);
  assert.deepEqual(readBulk({ people: [{ id: "a", name: "Dave Kim", address: "5 Elm St" }, { id: "b", name: "No address" }] }), [{ id: "a", name: "Dave Kim", address: "5 Elm St" }]);
  assert.equal(readMonthCard({ month: "2026-09", reports: [] }), null, "no today");
  const m = readMonthCard({
    month: "2026-09",
    today: "2026-10-16",
    autostart: true,
    reports: [
      { id: "1", contact_id: "a", name: "Late", address: "1 A St", send_day: 28, sent: false, started_by: "site_request" },
      { id: "2", contact_id: "b", name: "Due", address: "2 B St", send_day: 5, sent: false, started_by: "agent" },
      { id: "3", contact_id: "c", name: "Done", address: "3 C St", send_day: 1, sent: true, started_by: "bulk" },
      { id: "4", contact_id: "d", name: "Today", address: "4 D St", send_day: 16, sent: false },
      { id: "5", contact_id: "e", address: "5 E St", send_day: 0 },
    ],
  })!;
  assert.equal(m.autostart, true);
  assert.deepEqual(m.reports.map((r) => r.name), ["Done", "Due", "Today", "Late"]);
  const g = monthGroups(m);
  assert.deepEqual(g.due.map((r) => r.name), ["Due", "Today"], "its day has come, not sent");
  assert.deepEqual(g.coming.map((r) => r.name), ["Late"]);
  assert.deepEqual(g.sent.map((r) => r.name), ["Done"]);
});

test("after a change: start, change, stop and an RPR month, before ONE MOVE answers again", () => {
  let c = readContactReports({ reports: [], suggested_address: "9 Pine Way", can_email: true, email: "m@example.com" })!;
  assert.equal(runningReport(c), null);
  c = withStarted(c, { id: "n1", address: "9 Pine Way", sendDay: 5, note: null });
  assert.equal(runningReport(c)!.startedBy, "agent");
  c = withChanged(c, "n1", 12, "Hello");
  assert.equal(runningReport(c)!.sendDay, 12);
  assert.equal(runningReport(c)!.note, "Hello");
  c = withRprSent(c, "n1", "2026-09", "2026-10-16T15:00:00Z");
  assert.equal(runningReport(c)!.lastSentMonth, "2026-09");
  assert.equal(runningReport(c)!.sends[0].channel, "rpr");
  c = withStopped(c, "n1", "2026-10-16T16:00:00Z");
  assert.equal(runningReport(c), null);
  assert.equal(stoppedReports(c)[0].stoppedBy, "agent");
});

test("demo (?demo=1): one running report on a demo contact, a bulk list of 3, a believable month", () => {
  const today = "2026-10-16";
  const jane = demoContactReports("demo-hr-jane", today);
  assert.equal(runningReport(jane)!.sendDay, 5);
  assert.equal(rprMonth(runningReport(jane)!, today), "2026-09", "September waits to be sent by hand");
  assert.equal(runningReport(demoContactReports("demo-hr-mike", today)), null);
  assert.equal(demoContactReports("demo-hr-noemail", today).canEmail, false);
  const bulk = demoBulk();
  assert.equal(bulk.length, 3);
  const m = demoMonthCard(today);
  const g = monthGroups(m);
  assert.equal(g.due.length, 1);
  assert.equal(g.sent.length, 1);
  assert.equal(g.coming.length, 1);
  assert.ok(m.reports.some((r) => r.contactId === "demo-hr-jane"));
  const after = withBulkStarted(m, bulk.slice(0, 2), (p) => `x-${p.id}`);
  assert.equal(after.reports.length, 5);
  assert.ok(after.reports.filter((r) => r.startedBy === "bulk").every((r) => r.sendDay === 5 || r.sent));
  assert.equal(withBulkStarted(after, bulk.slice(0, 2), (p) => `y-${p.id}`).reports.length, 5, "never twice for one person");
});

import { parseValue, valueLine, valueShown, valueBody, withValue, readContactReports as readCR } from "../lib/homeReport.ts";

test("the agent's value: typed forms, limits and the 92-day rule (HOME-REPORT §3.7)", () => {
  assert.equal(parseValue("$650,000"), 650000);
  assert.equal(parseValue("650k"), 650000);
  assert.equal(parseValue("1.2m"), 1200000);
  assert.equal(parseValue("abc"), null);
  assert.equal(parseValue("500"), null);
  const c = readCR({ reports: [{ id: "r1", address: "1 Main St, Draper, UT", send_day: 5, is_on: true, agent_value: 650000, agent_value_on: "2026-07-01" }], suggested_address: null, can_email: true, email: "a@b.co", autostart: false })!;
  const r = c.reports[0];
  assert.equal(r.agentValue, 650000);
  assert.equal(valueShown(r, "2026-10-01"), true);
  assert.equal(valueShown(r, "2026-10-02"), false);
  assert.match(valueLine(r, "2026-08-01"), /\$650,000, as of Jul 1, 2026\. On the report until/);
  assert.match(valueLine(r, "2026-11-01"), /leaves it out until you confirm it/);
  assert.deepEqual(valueBody("r1", ""), { id: "r1", agent_value: "" });
  const cleared = withValue(c, "r1", null, "2026-10-16").reports[0];
  assert.equal(cleared.agentValue, null);
  assert.match(valueLine(cleared, "2026-10-16"), /not set/);
  assert.equal(withValue(c, "r1", 700000, "2026-10-16").reports[0].agentValueOn, "2026-10-16");
});

// ---- 18 Oct: how it works, the start list, the example report ----
import { FEED_WAIT, HOW_STEPS, barPct, coreLines, delta, exampleNote, exampleReport, feedStatus, initials, shortPrice, tickAll, whyListed } from "../lib/homeReport.ts";

test("three plain steps and the honest feed line", () => {
  assert.equal(HOW_STEPS.length, 3);
  assert.match(HOW_STEPS[1].text, /5th/);
  assert.match(HOW_STEPS[2].text, /monthly market report touch/);
  const card = demoMonthCard("2026-10-18");
  assert.equal(card.feedLive, false);
  assert.equal(feedStatus(card), FEED_WAIT);
  assert.match(FEED_WAIT, /UtahRealEstate\.com feed is connected/);
  assert.equal(feedStatus({ ...card, feedLive: true }), "3 running. 2 still to go this month.");
  assert.match(feedStatus({ ...card, feedLive: true, reports: [] }), /feed is connected/);
});

test("month card reads feed_live when ONE MOVE sends it", () => {
  const base = { month: "2026-09", today: "2026-10-18", reports: [] };
  assert.equal(readMonthCard({ ...base, feed_live: true })!.feedLive, true);
  assert.equal(readMonthCard(base)!.feedLive, false);
});

test("the centre orb explains 0 before the feed", () => {
  const card = { month: "2026-09", feedLive: false, reports: [] };
  assert.deepEqual(coreLines(card, 0), { big: "0", sub: "SET UP", end: "Waiting for the MLS feed" });
  const live = demoMonthCard("2026-10-18");
  assert.equal(coreLines(live, 0).big, "3");
  assert.equal(coreLines({ ...live, feedLive: true }, 2).sub, "DUE NOW");
  assert.equal(coreLines({ ...live, feedLive: true, reports: [] }, 0).big, "0");
});

test("start list helpers", () => {
  assert.equal(initials("Jane Smith"), "JS");
  assert.equal(initials("Mary Ann van Dyke"), "MD");
  assert.equal(initials("Cher"), "C");
  assert.equal(initials("  "), "?");
  const p = { id: "a", name: "A B", address: "1 Main St, Draper" };
  assert.match(whyListed("vips", p), /^On your VIP list · /);
  assert.match(whyListed("past", p), /^Past client · /);
  assert.match(whyListed("vips", { ...p, why: "VIP-50" }), /^VIP-50 · /);
  assert.equal(readBulk({ people: [{ ...p, tier: "vip100" }] })![0].why, "VIP-100");
  assert.equal(readBulk({ people: [p] })![0].why, undefined);
  const people = [p, { ...p, id: "b" }];
  assert.deepEqual([...tickAll(new Set(["z"]), people, true)].sort(), ["a", "b", "z"]);
  assert.deepEqual([...tickAll(new Set(["a", "b", "z"]), people, false)], ["z"]);
});

test("the example report follows §3, invented and with no value", () => {
  const r = exampleReport("2026-10-18");
  assert.equal(r.month, "2026-09");
  assert.equal(r.monthName, "September 2026");
  assert.equal(r.lastMonthName, "August");
  assert.equal(r.yearAgoName, "September 2025");
  assert.equal(r.area, "homes within half a mile of your home");
  assert.equal(r.forSale.cards.length, 3);
  for (const c of r.forSale.cards) {
    assert.match(c.credit, /^Listing courtesy of /);
    assert.ok(c.price >= r.forSale.min && c.price <= r.forSale.max);
  }
  assert.deepEqual(r.counts.map((c) => c.label), ["New listings", "Went pending", "Closed"]);
  assert.match(r.period, /^September 1 to 30, 2026/);
  assert.match(r.source, /UtahRealEstate\.com/);
  assert.ok(!JSON.stringify(r).match(/value|estimate|worth/i));
  assert.equal(exampleReport("2026-01-10").yearAgoName, "December 2024");
  assert.match(exampleReport("2026-03-02").period, /^February 1 to 28, 2026/);
});

test("example note, bars and numbers", () => {
  assert.equal(exampleNote("Jane", "2026-09", 7, 21), "Hi Jane, here is what happened in your neighbourhood in September. Seven homes are for sale near you now, and homes are selling in about three weeks. If you ever want to talk about what this means for your home, just reply.");
  assert.equal(barPct(5, 10), 50);
  assert.equal(barPct(3, 0), 0);
  assert.equal(delta(9, 7), "+2");
  assert.equal(delta(5, 6), "−1");
  assert.equal(delta(4, 4), "same");
  assert.equal(shortPrice(589000), "$589K");
  assert.equal(shortPrice(1150000), "$1.15M");
  assert.equal(shortPrice(1200000), "$1.2M");
  assert.equal(shortPrice(2000000), "$2M");
});

// ---- The twelve additions (HOME-REPORT §3a) ----
import { readFileSync } from "node:fs";
import { MOVING_REPLY, OPTIONAL_SECTIONS, defaultSettings, exampleMore, readSettings } from "../lib/homeReport.ts";

test("the example report renders all twelve section headings", () => {
  const src = readFileSync(new URL("../components/brain/MarketReportExample.tsx", import.meta.url), "utf8");
  const headings = [
    "{m.video.title}", // "A word from <agent>"
    "What&apos;s happening near you",
    "This month&apos;s home care",
    "Your agent&apos;s trusted pros",
    "What you&apos;ve done to your home",
    "Mortgage rates this month",
    "What buyers near you are looking for",
    "Special editions",
    "Thinking of moving?",
    "Know someone thinking of moving?",
    "Ask Pulse about your neighbourhood",
    "En español",
    "Print / PDF",
  ];
  for (const h of headings) assert.ok(src.includes(h), `missing: ${h}`);
  const m = exampleMore(exampleReport("2026-10-18"));
  assert.equal(m.video.title, "A word from Alex");
  assert.ok(m.near.places.some((p) => p.isNew));
  assert.equal(m.care.length, 3);
  assert.equal(m.pros.length, 3);
  assert.equal(m.rates.rows.length, 2);
  assert.match(m.rates.credit, /^Source: Freddie Mac Primary Mortgage Market Survey, /);
});

test("Thinking of moving? shows no dollar value for the home", () => {
  const m = exampleMore(exampleReport("2026-10-18"));
  assert.equal(m.moving.reply, "Your agent will prepare a market analysis for you");
  assert.equal(MOVING_REPLY, m.moving.reply);
  assert.ok(!/\$/.test(`${m.moving.button} ${m.moving.reply}`));
  const src = readFileSync(new URL("../components/brain/MarketReportExample.tsx", import.meta.url), "utf8");
  const start = src.indexOf("<h2>Thinking of moving?</h2>");
  const block = src.slice(start, src.indexOf("</section>", start));
  assert.ok(!block.includes("$"));
  // The "what you've done" line is general: no figure for the home.
  assert.ok(!/\$|\d%/.test(m.done.general));
});

test("report settings: every section on and the postcard off by default", () => {
  const d = defaultSettings();
  assert.equal(d.postcard, false);
  assert.equal(OPTIONAL_SECTIONS.length, 12);
  for (const o of OPTIONAL_SECTIONS) assert.equal(d.sections[o.key], true);
  const got = readSettings({ sections: { rates: false, junk: false }, postcard: true });
  assert.equal(got?.sections.rates, false);
  assert.equal(got?.sections.pros, true);
  assert.equal(got?.postcard, true);
  assert.equal(readSettings(null), null);
  const src = readFileSync(new URL("../components/brain/ReportSettings.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("POSTCARD_LABEL") && src.includes("SETTINGS_FIXED_NOTE") && src.includes("VIDEO_HINT"));
});
