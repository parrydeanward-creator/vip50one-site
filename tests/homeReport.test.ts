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
  assert.equal(bulkButton(3), "Start the Home Report for 3");
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
