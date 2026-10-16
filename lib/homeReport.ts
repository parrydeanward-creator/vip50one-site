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
export const monthUrl = `${homeReportUrl}/month`;

/** The 5th: last month's MLS figures have settled (§4.1). ONE MOVE takes 1 to 28. */
export const DEFAULT_DAY = 5;
export const HOME_REPORTS_PATH = "/home-reports";

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
export interface BulkPerson { id: string; name: string; address: string }
export interface MonthRow { id: string; contactId: string; name: string; address: string; sendDay: number; sent: boolean; startedBy: StartedBy }
/** GET /api/brain/home-report/month. `month` is the finished month the reports cover (September, sent in October). */
export interface MonthCard { month: string; today: string; autostart: boolean; reports: MonthRow[] }

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
    return id && name && address ? [{ id, name, address }] : [];
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
  return { month, today, autostart: r.autostart === true, reports };
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

/** "Start the Home Report for 3" (§4.2). */
export const bulkButton = (n: number) => `Start the Home Report for ${n}`;

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
  return readMonthCard({ month: card.month, today: card.today, autostart: card.autostart, reports: [...card.reports, ...add].map((r) => ({ id: r.id, contact_id: r.contactId, name: r.name, address: r.address, send_day: r.sendDay, sent: r.sent, started_by: r.startedBy })) })!;
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

