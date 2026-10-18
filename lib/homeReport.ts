import { MOVE_URL } from "./host.ts";
import { lastMonth, monthWords } from "./marketPulse.ts";

// HOME-REPORT.md (v0.2, agreed 16 Oct; Parry 16 Oct: "each agent needs the ability to easily set one up that will
// continue to be populated and sent monthly for as long as the agent chooses"). The monthly report on one home's own
// neighbourhood. ONE MOVE keeps the record, checks consent and sends (§5.2); the Brain only calls its routes: the card
// on a person, the bulk start for past clients, the monthly card and the My Profile switch (§5.4). Nothing is sent to a
// client from here: starting a report is the agent's own choice for that contact (§4.1), and before the MLS feed the
// agent sends each month from their own email with an RPR link (§6).

export const homeReportUrl = `${MOVE_URL}/api/brain/home-report`;
export const contactReportsUrl = (contactId: string) => `${homeReportUrl}?contact_id=${encodeURIComponent(contactId)}`;
export const stopReportUrl = (id: string) => `${homeReportUrl}?id=${encodeURIComponent(id)}`;
export const bulkUrl = `${homeReportUrl}/bulk`;
/** The bulk start's two lists (HOME-REPORT v0.4 box 3): VIP-50 and VIP-100 (ONE MOVE's default), or past clients. */
export type BulkGroup = "vips" | "past_clients";
export const bulkGroupUrl = (group: BulkGroup) => `${bulkUrl}?group=${group}`;
export const monthUrl = `${homeReportUrl}/month`;

/** The 5th: last month's MLS figures have settled (§4.1). ONE MOVE takes 1 to 28. */
export const DEFAULT_DAY = 5;
export const HOME_REPORTS_PATH = "/home-reports";

// The one name agents see (HOME-REPORT v0.4, Parry 16 Oct: "1 yes"): the Home Report, Market Pulse and Classic's
// per-contact market report are one thing, "Market Report". The report itself keeps its title "Your home's
// neighbourhood"; routes and code keep the old names.
export const CARD_TITLE = "Monthly Market Report";
export const AREA_WORDS = "Their neighbourhood";
/** No report goes out with figures until the MLS feed is live (§6). */
export const FEED_LIVE = false;
export const FEED_LINE = "Reports start when the UtahRealEstate.com feed is live.";
/** HOME-REPORT v0.4 box 2: ONE MOVE gives the credit; the card only says so. */
export const CREDIT_LINE = "Each report sent counts as this month's market report touch.";
export const VIPS_BULK = "Set up Market Reports for all your VIPs";

export type StartedBy = "agent" | "bulk" | "site_request";
export interface ReportSend { month: string; channel: string; via: string; sentAt: string | null }
export interface HomeReport {
  id: string;
  address: string;
  sendDay: number;
  isOn: boolean;
  startedBy: StartedBy;
  note: string | null;
  lastSentMonth: string | null;
  stoppedAt: string | null;
  stoppedBy: string | null;
  sends: ReportSend[];
  /** The agent's own view of the home's value (§3.7, vip50-web-crm#271): whole dollars, and the day it was set or confirmed. */
  agentValue: number | null;
  agentValueOn: string | null;
}
/** GET /api/brain/home-report?contact_id= */
export interface ContactReports { reports: HomeReport[]; suggestedAddress: string | null; canEmail: boolean; email: string | null; autostart: boolean }
/** GET /api/brain/home-report/bulk: past clients with an address and an email, no report running. */
export interface BulkPerson { id: string; name: string; address: string; /** Why ONE MOVE listed them, when it says ("VIP-50", "Past client"). */ why?: string }
export interface MonthRow { id: string; contactId: string; name: string; address: string; sendDay: number; sent: boolean; startedBy: StartedBy }
/** GET /api/brain/home-report/month. `month` is the finished month the reports cover (September, sent in October). */
export interface MonthCard { month: string; today: string; autostart: boolean; reports: MonthRow[]; /** True only when ONE MOVE says the MLS feed is live (`feed_live`); else this site's FEED_LIVE. */ feedLive: boolean }

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const ym = (v: unknown): string | null => {
  const s = str(v, 10);
  return s && /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : null;
};
const dayOf = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 28 ? v : null);
const by = (v: unknown): StartedBy => (v === "bulk" || v === "site_request" ? v : "agent");

function readReport(x: unknown): HomeReport | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = str(r.id, 80);
  const address = str(r.address, 300);
  const sendDay = dayOf(r.send_day);
  if (!id || !address || sendDay == null) return null;
  const sends: ReportSend[] = Array.isArray(r.sends)
    ? (r.sends as unknown[]).flatMap((s) => {
        if (!s || typeof s !== "object") return [];
        const o = s as Record<string, unknown>;
        const month = ym(o.month);
        return month ? [{ month, channel: str(o.channel, 20) ?? "email", via: str(o.via, 20) ?? "agent", sentAt: str(o.sent_at, 40) }] : [];
      })
    : [];
  sends.sort((a, b) => b.month.localeCompare(a.month));
  return {
    id,
    address,
    sendDay,
    isOn: r.is_on === true,
    startedBy: by(r.started_by),
    note: str(r.note, 1500),
    lastSentMonth: ym(r.last_sent_month),
    stoppedAt: str(r.stopped_at, 40),
    stoppedBy: str(r.stopped_by, 20),
    sends,
    agentValue: typeof r.agent_value === "number" && Number.isFinite(r.agent_value) && r.agent_value > 0 ? Math.round(r.agent_value) : null,
    agentValueOn: str(r.agent_value_on, 10)?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0] ?? null,
  };
}

/** Route 1's answer, checked; null when it is not one. */
export function readContactReports(j: unknown): ContactReports | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.reports)) return null;
  return {
    reports: (r.reports as unknown[]).map(readReport).filter((x): x is HomeReport => !!x),
    suggestedAddress: str(r.suggested_address, 300),
    canEmail: r.can_email === true,
    email: str(r.email, 200),
    autostart: r.autostart === true,
  };
}

/** Route 2's list (`{people: [...]}`), checked; null when it is not one. */
export function readBulk(j: unknown): BulkPerson[] | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as { people?: unknown }).people)) return null;
  return ((j as { people: unknown[] }).people).flatMap((p) => {
    if (!p || typeof p !== "object") return [];
    const o = p as Record<string, unknown>;
    const id = str(o.id, 80), name = str(o.name, 120), address = str(o.address, 300);
    const tier = o.tier === "vip50" ? "VIP-50" : o.tier === "vip100" ? "VIP-100" : null;
    const why = str(o.why, 80) ?? tier;
    return id && name && address ? [{ id, name, address, ...(why ? { why } : {}) }] : [];
  });
}

/** Route 3's answer, checked; null when it is not one. Earliest day first. */
export function readMonthCard(j: unknown): MonthCard | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const month = ym(r.month);
  const today = str(r.today, 10);
  if (!month || !today || !/^\d{4}-\d{2}-\d{2}$/.test(today) || !Array.isArray(r.reports)) return null;
  const reports = (r.reports as unknown[]).flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    const id = str(o.id, 80), contactId = str(o.contact_id, 80), address = str(o.address, 300), sendDay = dayOf(o.send_day);
    if (!id || !contactId || !address || sendDay == null) return [];
    return [{ id, contactId, name: str(o.name, 120) ?? "No name", address, sendDay, sent: o.sent === true, startedBy: by(o.started_by) }];
  });
  reports.sort((a, b) => a.sendDay - b.sendDay || a.name.localeCompare(b.name));
  return { month, today, autostart: r.autostart === true, reports, feedLive: typeof r.feed_live === "boolean" ? r.feed_live : FEED_LIVE };
}

/** "5th", "1st", "22nd". */
export const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** The day as typed: a whole number 1 to 28 (ONE MOVE's rule), empty is the 5th; anything else null. */
export function parseDay(text: string): number | null {
  const t = text.trim();
  if (!t) return DEFAULT_DAY;
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= 28 ? n : null;
}

/** The live report on the contact (one per contact and home; ONE MOVE answers newest first). */
export const runningReport = (c: ContactReports) => c.reports.find((r) => r.isOn) ?? null;
export const stoppedReports = (c: ContactReports) => c.reports.filter((r) => !r.isOn);

/** "Every month on the 5th: 12 Oak Lane, Draper." The area label comes with each month's send, not from here. */
export const runningLine = (r: HomeReport) => `Every month on the ${ordinal(r.sendDay)}: ${r.address}.`;
export const lastSentLine = (r: HomeReport) => (r.lastSentMonth ? `Last sent: ${monthWords(r.lastSentMonth)}` : "Not sent yet");

const BY: Record<StartedBy, string> = { agent: "you", bulk: "you, for your past clients", site_request: "their request on your site" };
export const startedByWords = (s: StartedBy) => `Started by ${BY[s]}`;
export const stoppedWords = (r: HomeReport) => `${r.address} (${r.stoppedBy === "contact" ? "they stopped it" : "you stopped it"})`;

/**
 * §6, before the MLS feed: the month the agent sends by hand is last month (Mountain), as ONE MOVE records it. Null
 * once that month is already recorded for this report.
 */
export function rprMonth(r: HomeReport, today: string): string | null {
  if (!r.isOn) return null;
  const m = lastMonth(today);
  return r.lastSentMonth === m ? null : m;
}

/** An RPR link as pasted: https only (ONE MOVE refuses anything else), trimmed; null when it is not one. */
export function rprLink(text: string): string | null {
  const t = text.trim();
  if (!t || /\s/.test(t)) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" && u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

/** "Open in my email": the agent's own mail app, to the contact, naming the month and the link. Nothing is sent from ONE. */
export function rprMailto(email: string | null, first: string, month: string, link: string): string {
  const m = monthWords(month);
  const subject = `Your home's neighbourhood in ${m}`;
  const body = `Hi ${first.trim() || "there"},\n\nHere is ${m} for your neighbourhood:\n${link}\n`;
  return `mailto:${encodeURIComponent(email ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// The bodies ONE MOVE's routes take (§5.2, as built 16 Oct).
export const startBody = (contactId: string, address: string, sendDay: number, note: string) => ({
  contact_id: contactId,
  ...(address.trim() ? { address: address.trim() } : {}),
  send_day: sendDay,
  ...(note.trim() ? { note: note.trim() } : {}),
});
export const changeBody = (id: string, sendDay: number, note: string) => ({ id, send_day: sendDay, note: note.trim() });
export const rprBody = (id: string, link: string) => ({ id, rpr_url: link });

// ---- the agent's view of the value (§3.7) ----------------------------------------------------------------------------

/** How long a set or confirmed value is printed on the report (GO/MOVE's rule, 16 Oct). */
export const VALUE_SHOWN_DAYS = 92;
export const VALUE_RULE = "Shown on the report as your opinion for three months after you set or confirm it. ONE never estimates a value itself.";

/** The value as typed: "$650,000", "650k", "1.2m" become whole dollars; anything else null. */
export function parseValue(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/[$,\s]/g, "");
  const m = t.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return null;
  const n = Math.round(Number(m[1]) * (m[2] === "m" ? 1_000_000 : m[2] === "k" ? 1_000 : 1));
  return n >= 10_000 && n <= 100_000_000 ? n : null;
}
export const dollars = (n: number) => `$${n.toLocaleString("en-US")}`;
const dayWords = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const plusDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** True while the value still prints on the report (within 92 days of being set or confirmed). */
export function valueShown(r: HomeReport, today: string): boolean {
  return r.agentValue != null && !!r.agentValueOn && today <= plusDays(r.agentValueOn, VALUE_SHOWN_DAYS);
}
/** "Your view: $650,000, as of 16 Oct 2026. On the report until 16 Jan 2027." */
export function valueLine(r: HomeReport, today: string): string {
  if (r.agentValue == null || !r.agentValueOn) return "Your view of the value: not set. The report shows no value.";
  const head = `Your view: ${dollars(r.agentValue)}, as of ${dayWords(r.agentValueOn)}.`;
  return valueShown(r, today)
    ? `${head} On the report until ${dayWords(plusDays(r.agentValueOn, VALUE_SHOWN_DAYS))}.`
    : `${head} Over three months old, so the report leaves it out until you confirm it.`;
}
/** Set, change or "Still right" (the same amount, dated today); "" removes it. */
export const valueBody = (id: string, amount: number | "") => ({ id, agent_value: amount });
export function withValue(c: ContactReports, id: string, amount: number | null, today: string): ContactReports {
  return { ...c, reports: c.reports.map((r) => (r.id === id ? { ...r, agentValue: amount, agentValueOn: amount == null ? null : today } : r)) };
}
export const autostartBody = (on: boolean) => ({ autostart: on });
export const bulkBody = (ids: Iterable<string>) => ({ contact_ids: [...new Set(ids)] });

/** "Start 3 Market Reports" (§4.2). */
export const bulkButton = (n: number) => `Start ${n} Market Report${n === 1 ? "" : "s"}`;

/** This month in three: sent, due (its day has come, not sent yet) and coming later in the month. */
export function monthGroups(card: MonthCard): { due: MonthRow[]; coming: MonthRow[]; sent: MonthRow[] } {
  const day = Number(card.today.slice(8, 10));
  const due: MonthRow[] = [], coming: MonthRow[] = [], sent: MonthRow[] = [];
  for (const r of card.reports) (r.sent ? sent : r.sendDay <= day ? due : coming).push(r);
  return { due, coming, sent };
}

// ---- after a change, before ONE MOVE answers again (and the whole of the demo) ---------------------------------------

export function withStarted(c: ContactReports, r: { id: string; address: string; sendDay: number; note: string | null; startedBy?: StartedBy }): ContactReports {
  const fresh: HomeReport = { id: r.id, address: r.address, sendDay: r.sendDay, isOn: true, startedBy: r.startedBy ?? "agent", note: r.note, lastSentMonth: null, stoppedAt: null, stoppedBy: null, sends: [], agentValue: null, agentValueOn: null };
  return { ...c, reports: [fresh, ...c.reports.filter((x) => x.id !== r.id)] };
}
export function withChanged(c: ContactReports, id: string, sendDay: number, note: string | null): ContactReports {
  return { ...c, reports: c.reports.map((r) => (r.id === id ? { ...r, sendDay, note } : r)) };
}
export function withStopped(c: ContactReports, id: string, at: string): ContactReports {
  return { ...c, reports: c.reports.map((r) => (r.id === id && r.isOn ? { ...r, isOn: false, stoppedAt: at, stoppedBy: "agent" } : r)) };
}
export function withRprSent(c: ContactReports, id: string, month: string, at: string): ContactReports {
  return {
    ...c,
    reports: c.reports.map((r) => (r.id === id ? { ...r, lastSentMonth: month, sends: [{ month, channel: "rpr", via: "agent", sentAt: at }, ...r.sends.filter((s) => s.month !== month)] } : r)),
  };
}
/** The monthly card after a bulk start, with the people started. */
export function withBulkStarted(card: MonthCard, people: BulkPerson[], idOf: (p: BulkPerson) => string): MonthCard {
  const have = new Set(card.reports.map((r) => r.contactId));
  const add = people.filter((p) => !have.has(p.id)).map((p) => ({ id: idOf(p), contactId: p.id, name: p.name, address: p.address, sendDay: DEFAULT_DAY, sent: false, startedBy: "bulk" as const }));
  return readMonthCard({ month: card.month, today: card.today, autostart: card.autostart, feed_live: card.feedLive, reports: [...card.reports, ...add].map((r) => ({ id: r.id, contact_id: r.contactId, name: r.name, address: r.address, send_day: r.sendDay, sent: r.sent, started_by: r.startedBy })) })!;
}

// ---- the example agent (?demo=1): no network --------------------------------------------------------------------------

/** One running report (Jane Smith, the 5th, sent last month by hand) and Mike Torres, who has none yet. */
export function demoContactReports(contactId: string, today: string): ContactReports {
  const month = lastMonth(today);
  const before = lastMonth(`${month}-15`);
  if (contactId === "demo-hr-jane")
    return readContactReports({
      reports: [{ id: "demo-report-1", address: "1482 E Willow Creek Dr, Draper, UT 84020", send_day: 5, is_on: true, started_by: "agent", note: null, last_sent_month: before, stopped_at: null, stopped_by: null,
        agent_value: 685000, agent_value_on: `${before}-20`,
        sends: [{ month: before, channel: "rpr", via: "agent", sent_at: `${before}-05T15:00:00Z` }] }],
      suggested_address: "1482 E Willow Creek Dr, Draper, UT 84020",
      can_email: true,
      email: "jane@example.com",
      autostart: false,
    })!;
  return readContactReports({ reports: [], suggested_address: "9310 S Granite Peak Way, Sandy, UT 84092", can_email: contactId !== "demo-hr-noemail", email: contactId === "demo-hr-noemail" ? null : "mike@example.com", autostart: false })!;
}

export function demoMonthCard(today: string): MonthCard {
  return readMonthCard({
    month: lastMonth(today),
    today,
    autostart: false,
    reports: [
      { id: "demo-report-1", contact_id: "demo-hr-jane", name: "Jane Smith", address: "1482 E Willow Creek Dr, Draper, UT 84020", send_day: 5, sent: false, started_by: "agent" },
      { id: "demo-report-2", contact_id: "demo-hr-sara", name: "Sara Lee", address: "220 W Fox Hollow Ln, Draper, UT 84020", send_day: 1, sent: true, started_by: "bulk" },
      { id: "demo-report-3", contact_id: "demo-hr-linda", name: "Linda Park", address: "77 E Alta View Ct, Sandy, UT 84092", send_day: 28, sent: false, started_by: "site_request" },
    ],
  })!;
}

/** Three past clients with an address and an email and no report yet. */
export function demoBulk(): BulkPerson[] {
  return readBulk({
    people: [
      { id: "demo-hr-dave", name: "Dave Kim", address: "5120 S Holladay Blvd, Holladay, UT 84117" },
      { id: "demo-hr-marcus", name: "Marcus Lee", address: "811 N Canyon Rim Rd, Alpine, UT 84004" },
      { id: "demo-hr-mike", name: "Mike Torres", address: "9310 S Granite Peak Way, Sandy, UT 84092" },
    ],
  })!;
}


// ---- how it works, said plainly (Parry 18 Oct: "how is the user supposed to set it up etc.") --------------------------

export const HOW_TITLE = "How Market Reports work";
export const HOW_STEPS: { title: string; text: string }[] = [
  { title: "Pick who gets one", text: "Tick people in the list, or switch it on from a person's card." },
  { title: "Start", text: "Each report fills itself from the MLS and goes on the 5th, from your name, until you or they stop it." },
  { title: "It counts", text: "Every report sent counts as that person's monthly market report touch." },
];
export const FEED_WAIT = "Your reports start the month the UtahRealEstate.com feed is connected. You can set people up now; nothing is sent before then.";

/** The one status line under the steps, from the month card. */
export function feedStatus(card: Pick<MonthCard, "feedLive" | "reports" | "today">): string {
  if (!card.feedLive) return FEED_WAIT;
  const n = card.reports.length;
  if (!n) return "The MLS feed is connected. Pick who gets one and start; the first reports go on their day.";
  const left = card.reports.filter((r) => !r.sent).length;
  return `${n} running. ${left ? `${left} still to go this month.` : "Every report for this month has gone."}`;
}

/** The centre orb's three lines: the count, what it counts, and the line under it. */
export function coreLines(card: Pick<MonthCard, "feedLive" | "reports" | "month">, due: number): { big: string; sub: string; end: string } {
  const n = card.reports.length;
  if (!card.feedLive) return { big: String(n), sub: "SET UP", end: "Waiting for the MLS feed" };
  if (due) return { big: String(due), sub: "DUE NOW", end: `${monthWords(card.month)} report` };
  return { big: n ? "✓" : "0", sub: "RUNNING", end: `${monthWords(card.month)} report` };
}

/** "JS" from "Jane Smith"; one letter for one name. */
export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return ((w[0][0] ?? "") + (w.length > 1 ? w[w.length - 1][0] ?? "" : "")).toUpperCase();
}

/** Why a person is on a start list: ONE MOVE's own reason, else the list they came from. */
export function whyListed(group: "vips" | "past", p: BulkPerson): string {
  const base = p.why ?? (group === "vips" ? "On your VIP list" : "Past client");
  return `${base} · has a home address and email, no report yet`;
}

/** "Select all" / "Clear" over one list, keeping ticks on anyone outside it. */
export function tickAll(ticked: Set<string>, people: BulkPerson[], on: boolean): Set<string> {
  const n = new Set(ticked);
  for (const p of people) (on ? n.add(p.id) : n.delete(p.id));
  return n;
}

// ---- the example report (§3, in order): invented figures, labelled as an example ------------------------------------

export interface ExampleCard { price: number; beds: number; baths: number; sqft: number; street: string; listed: string; credit: string }
export interface ExampleCount { label: string; now: number; lastMonth: number; yearAgo: number }
export interface ExampleReport {
  month: string;
  monthName: string;
  lastMonthName: string;
  yearAgoName: string;
  first: string;
  area: string;
  forSale: { count: number; min: number; max: number; cards: ExampleCard[] };
  counts: ExampleCount[];
  pace: { days: number; daysLast: number; supply: number };
  demand: number;
  note: string;
  agent: { name: string; first: string; brokerage: string; phone: string; email: string };
  period: string;
  source: string;
}

const shortMonth = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
const yearAgo = (ym: string) => `${Number(ym.slice(0, 4)) - 1}${ym.slice(4, 7)}`;
const lastDay = (ym: string) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
const NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const words = (n: number) => NUM[n] ?? String(n);

/** The fixed note (§3.6: plain code fills a template until URE answers question 2). */
export function exampleNote(first: string, month: string, forSale: number, days: number): string {
  const weeks = Math.max(1, Math.round(days / 7));
  return `Hi ${first}, here is what happened in your neighbourhood in ${shortMonth(month)}. ${words(forSale).replace(/^./, (c) => c.toUpperCase())} homes are for sale near you now, and homes are selling in about ${words(weeks)} week${weeks === 1 ? "" : "s"}. If you ever want to talk about what this means for your home, just reply.`;
}

/** The example "Your home's neighbourhood" for the finished month before `today`. Every figure is invented. */
export function exampleReport(today: string): ExampleReport {
  const month = lastMonth(today);
  const before = lastMonth(`${month}-15`);
  const ago = yearAgo(month);
  const credit = "Listing courtesy of Example Brokerage, LLC";
  const forSale = { count: 7, min: 589000, max: 1150000, cards: [
    { price: 649900, beds: 4, baths: 3, sqft: 2860, street: "E Willow Bend Ct, Draper", listed: "3 days ago", credit },
    { price: 725000, beds: 5, baths: 3.5, sqft: 3410, street: "S Fox Meadow Ln, Draper", listed: "6 days ago", credit },
    { price: 589000, beds: 3, baths: 2, sqft: 1980, street: "E Aspen Ridge Way, Draper", listed: "9 days ago", credit },
  ] };
  const pace = { days: 21, daysLast: 18, supply: 2.4 };
  return {
    month,
    monthName: monthWords(month),
    lastMonthName: shortMonth(before),
    yearAgoName: monthWords(ago),
    first: "Jane",
    area: "homes within half a mile of your home",
    forSale,
    counts: [
      { label: "New listings", now: 9, lastMonth: 7, yearAgo: 11 },
      { label: "Went pending", now: 6, lastMonth: 5, yearAgo: 8 },
      { label: "Closed", now: 5, lastMonth: 6, yearAgo: 7 },
    ],
    pace,
    demand: 4,
    note: exampleNote("Jane", month, forSale.count, pace.days),
    agent: { name: "Alex Morgan", first: "Alex", brokerage: "Example Realty, LLC", phone: "(801) 555-0142", email: "alex@example.com" },
    period: `${shortMonth(month)} 1 to ${lastDay(month)}, ${month.slice(0, 4)}, single-family homes within half a mile, compared with ${shortMonth(before)} and ${monthWords(ago)}.`,
    source: "Source: UtahRealEstate.com. Figures are aggregated and deemed reliable but not guaranteed.",
  };
}

/** A bar's width, 0 to 100, against the largest figure shown beside it. */
export const barPct = (n: number, max: number) => (max > 0 ? Math.round((Math.max(0, n) / max) * 100) : 0);
/** "+2", "−1", "same" for a count against another month. */
export const delta = (now: number, then: number) => (now === then ? "same" : now > then ? `+${now - then}` : `−${then - now}`);
export const shortPrice = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 2 : 0).replace(/0$/, "")}M` : `$${Math.round(n / 1000)}K`);
