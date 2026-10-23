import type { GraphEdge, GraphNode } from "./graph/types.ts";

// The Referral Scoreboard (VIP-SUMMARY §3r; Parry, 7 Oct: "referral scoreboard sounds interesting"). Who sent the
// agent business, who is likely to send the next one, and how many of their VIPs refer at all. Rules only, from
// MASTER's records; nothing is sent to anyone: an ask is a task the agent does in their own words.

const MOVE_URL = "https://move.vip50one.com";
export const REFERRALS_NODE = "go-referrals";
export const referralsUrl = (agent?: string) => `${MOVE_URL}/api/brain/referrals${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`;
export const askUrl = `${MOVE_URL}/api/brain/referrals/ask`;
export const thankUrl = `${MOVE_URL}/api/brain/referrals/thank`;
/** Log a thank-you already given (GO/MOVE): {contact_id, kind}. Records it only; nothing is sent to anyone. */
export const thankedUrl = `${MOVE_URL}/api/brain/referrals/thanked`;

export type Why = "past_referrer_quiet" | "recent_closing" | "fully_touched";
export const WHY_ORDER: Why[] = ["past_referrer_quiet", "recent_closing", "fully_touched"];
export const WHY_TITLE: Record<Why, string> = {
  past_referrer_quiet: "Has referred before, gone quiet",
  recent_closing: "Closed with you recently",
  fully_touched: "Fully touched, never asked",
};

export interface Referrer {
  id: string;
  name: string;
  tier: string | null;
  total: number;
  thisYear: number;
  closed: number;
  value: number | null;
  lastAt: string | null;
  lastTouchAt: string | null;
}
export interface Recent {
  id: string;
  name: string;
  by: string | null;
  at: string;
  closed: boolean;
  value: number | null;
  /** §3r.3; null when ONE MOVE does not say (before v1.55). */
  referralId: string | null;
  thanked: boolean | null;
  thankOpen: boolean;
  /** §3aq: who the referral is and what they are doing; absent until ONE MOVE sends it. */
  client?: { id: string | null; name: string; kind: ClientKind | null } | null;
}
export type ClientKind = "buying" | "selling" | "both";
/** §3aq `warming`: a VIP-50 not yet ready to ask, closest first. */
export interface Warming {
  id: string;
  name: string;
  photo: string | null;
  done: number;
  due: number;
  next: string | null;
}
export interface Candidate {
  id: string;
  name: string;
  tier: string | null;
  why: Why;
  words: string;
}
/** A referrer still owed a thank-you (`thank_you_owed`), newest first. */
export interface ThankOwed {
  id: string;
  firstName: string;
  sent: number;
  lastSentAt: string | null;
}
/** Someone worth asking for a referral now (`ready_to_ask`), at most 5. */
export interface ReadyAsk {
  id: string;
  firstName: string;
  why: string;
}
export interface Referrals {
  from: string | null;
  to: string | null;
  goal: number | null;
  count: number;
  /** Referrals this goal year (`this_year`); null on an older answer (then `count` is used). */
  thisYear: number | null;
  /** Null when ONE MOVE did not send the list (an older answer); [] when nobody is owed one. */
  thankOwed: ThankOwed[] | null;
  readyToAsk: ReadyAsk[] | null;
  referrers: Referrer[];
  recent: Recent[];
  vips: { count: number; ever: number; thisYear: number };
  candidates: Candidate[];
  /** §3aq additions (v1.85): each null (or absent) until ONE MOVE sends it; the Brain then falls back or hides. */
  warming?: Warming[] | null;
  asksThisMonth?: number | null;
  thanksThisMonth?: number | null;
  gciYear?: number | null;
  /** The people behind this month's counts and the GCI, each null until ONE MOVE sends it (rule 12: every number opens its people). */
  askedThisMonth?: MonthPerson[] | null;
  thankedThisMonth?: MonthPerson[] | null;
  gciClosings?: GciClosing[] | null;
  /** Where the agent would be on an even pace, how many to go, the cadence in words. */
  pace?: Pace | null;
}
export interface MonthPerson { id: string; name: string; at: string | null; how: string | null }
export interface GciClosing { id: string | null; name: string; closedOn: string | null; gci: number }
export interface Pace { pace: number | null; toGo: number | null; cadence: string | null }

/** `asked_this_month` / `thanked_this_month`, checked: [{contact_id, name, at, how}], newest first. Null when not a list. */
export function readMonthPeople(v: unknown): MonthPerson[] | null {
  if (!Array.isArray(v)) return null;
  const out: MonthPerson[] = [];
  for (const x of v as Record<string, unknown>[]) {
    if (!x || typeof x !== "object") continue;
    const name = str(x.name);
    if (!name) continue;
    out.push({ id: str(x.contact_id) ?? str(x.id) ?? `${name}:${day(x.at) ?? ""}`, name, at: day(x.at), how: str(x.how) });
  }
  return out.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? "")).slice(0, 100);
}

/** `referral_gci_closings`, checked: [{contact_id, name, closed_on, gci}], newest first. Null when not a list. */
export function readGciClosings(v: unknown): GciClosing[] | null {
  if (!Array.isArray(v)) return null;
  const out: GciClosing[] = [];
  for (const x of v as Record<string, unknown>[]) {
    if (!x || typeof x !== "object") continue;
    const g = typeof x.gci === "string" ? Number(x.gci) : x.gci;
    out.push({ id: str(x.contact_id), name: str(x.name) ?? "A referral closing", closedOn: day(x.closed_on), gci: typeof g === "number" && Number.isFinite(g) ? g : 0 });
  }
  return out.sort((a, b) => (b.closedOn ?? "").localeCompare(a.closedOn ?? "")).slice(0, 100);
}

export function readPace(v: unknown): Pace | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return { pace: numOrNull(o.pace), toGo: numOrNull(o.to_go), cadence: str(o.cadence) };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : null);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const isWhy = (v: unknown): v is Why => typeof v === "string" && (WHY_ORDER as string[]).includes(v);

const isKind = (v: unknown): v is ClientKind => v === "buying" || v === "selling" || v === "both";

/** §3aq `warming`, checked: one row per contact, closest first (most of the touches done). Null when missing. */
export function readWarming(v: unknown): Warming[] | null {
  if (!Array.isArray(v)) return null;
  const seen = new Set<string>();
  const out: Warming[] = [];
  for (const x of v as Record<string, unknown>[]) {
    if (!x || typeof x !== "object") continue;
    const id = str(x.contact_id), name = str(x.name);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const due = Math.round(num(x.touches_due));
    out.push({ id, name, photo: str(x.photo_url), done: Math.min(Math.round(num(x.touches_done)), due || Infinity), due, next: typeof x.next === "string" && x.next.trim() ? x.next.trim().slice(0, 120) : null });
  }
  const share = (w: Warming) => (w.due ? w.done / w.due : 0);
  return out.sort((a, b) => share(b) - share(a)).slice(0, 10);
}

const first = (v: unknown) => {
  const s = str(v);
  return s ? s.split(/\s+/)[0]! : null;
};

/** `thank_you_owed`, checked: one row per contact, newest first. Null when the field is missing or not a list. */
export function readThankOwed(v: unknown): ThankOwed[] | null {
  if (!Array.isArray(v)) return null;
  const seen = new Set<string>();
  const out: ThankOwed[] = [];
  for (const x of v as Record<string, unknown>[]) {
    if (!x || typeof x !== "object") continue;
    const id = str(x.contact_id), firstName = first(x.first_name);
    if (!id || !firstName || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, firstName, sent: Math.round(num(x.sent)), lastSentAt: day(x.last_sent_at) });
  }
  return out.sort((a, b) => (b.lastSentAt ?? "").localeCompare(a.lastSentAt ?? "")).slice(0, 50);
}

/** `ready_to_ask`, checked: one row per contact, at most 5, in ONE MOVE's order. Null when missing. */
export function readReadyToAsk(v: unknown): ReadyAsk[] | null {
  if (!Array.isArray(v)) return null;
  const seen = new Set<string>();
  const out: ReadyAsk[] = [];
  for (const x of v as Record<string, unknown>[]) {
    if (!x || typeof x !== "object") continue;
    const id = str(x.contact_id), firstName = first(x.first_name);
    if (!id || !firstName || seen.has(id)) continue;
    seen.add(id);
    const why = typeof x.why === "string" && x.why.trim() ? x.why.trim().slice(0, 160) : "Worth asking now";
    out.push({ id, firstName, why });
  }
  return out.slice(0, 5);
}

/** The goal year's referral count: `this_year` when ONE MOVE sends it, else `count`. The Goals line reads this too. */
export const yearCount = (r: Referrals) => r.thisYear ?? r.count;

/** The goals list with the referrals goal counting the same number as the Referrals orb (unchanged without one). */
export function withReferralCount<T extends { key: string; value?: number | null }>(goals: T[], r: Referrals | null): T[] {
  if (!r) return goals;
  const n = yearCount(r);
  return goals.map((g) => (g.key === "referrals_goal" && g.value !== n ? { ...g, value: n } : g));
}

/** "4 referrals this goal year" for the Goals line that opens the Referrals orb. */
export const yearLine = (r: Referrals) => {
  const n = yearCount(r);
  return `${n} ${n === 1 ? "referral" : "referrals"} this goal year${r.goal ? ` of ${r.goal}` : ""}`;
};

export type ThankKind = "call" | "note" | "text" | "email" | "gift";
export const THANK_KINDS: { kind: ThankKind; label: string }[] = [
  { kind: "call", label: "Called" },
  { kind: "note", label: "Sent a note" },
  { kind: "text", label: "Texted" },
  { kind: "email", label: "Emailed" },
  { kind: "gift", label: "Sent a gift" },
];
/** Button titles. A gift is logged but is not a VIP touch (GO/MOVE, 23 Oct), so it never moves the touch counts. */
export const THANK_TITLE: Record<ThankKind, string> = {
  call: "Log that you called them (counts as a VIP touch)",
  note: "Log that you sent a note (counts as a VIP touch)",
  text: "Log that you texted them (counts as a VIP touch)",
  email: "Log that you emailed them (counts as a VIP touch)",
  gift: "Log that you sent a gift. A gift does not count as a VIP touch.",
};

/** ONE MOVE's answer to "Log a thank-you", in plain words; `ok` true when the row should leave the list. */
export function readThanked(status: number, body: unknown): { ok: boolean; words: string } {
  const b = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  if (status >= 200 && status < 300 && b.ok === true) return { ok: true, words: b.touch_credited === true ? "Thank-you logged; counted as a touch." : "Thank-you logged." };
  if (b.reason === "nothing_owed") return { ok: true, words: "Already thanked: nothing was owed." };
  if (status === 404 || status === 405) return { ok: false, words: "Logging a thank-you arrives with ONE MOVE's next update. Nothing was saved." };
  return { ok: false, words: "Could not log it just now. Nothing was saved; please try again." };
}

/** The example agent's tap, without ONE MOVE: the row leaves the list. */
export const applyThanked = (r: Referrals, contactId: string): Referrals => ({ ...r, thankOwed: r.thankOwed ? r.thankOwed.filter((x) => x.id !== contactId) : r.thankOwed });

/** Thank-yous owed: ONE MOVE's list when it sends one, else the older per-referral reading. */
export const thankCount = (r: Referrals, today: string) => (r.thankOwed ? r.thankOwed.length : unthanked(r, today).length);

/** A §3r.1 answer, checked; null when it is not one. */
export function readReferrals(j: unknown): Referrals | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.referrers) || !r.vips || typeof r.vips !== "object") return null;
  const gy = (r.goal_year ?? {}) as Record<string, unknown>;
  const v = r.vips as Record<string, unknown>;
  const referrers: Referrer[] = [];
  for (const x of r.referrers as Record<string, unknown>[]) {
    const id = str(x?.contact_id), name = str(x?.name);
    if (!id || !name) continue;
    referrers.push({ id, name, tier: str(x.tier), total: num(x.total), thisYear: num(x.this_year), closed: num(x.closed), value: numOrNull(x.value), lastAt: day(x.last_referral_at), lastTouchAt: day(x.last_touch_at) });
  }
  referrers.sort((a, b) => b.thisYear - a.thisYear || b.total - a.total || a.name.localeCompare(b.name));
  const recent: Recent[] = [];
  for (const x of (Array.isArray(r.recent) ? r.recent : []) as Record<string, unknown>[]) {
    const at = day(x?.at), name = str(x?.referred_name);
    if (!at || !name) continue;
    const c = x.client && typeof x.client === "object" ? (x.client as Record<string, unknown>) : null;
    const client = c && str(c.name) ? { id: str(c.contact_id), name: str(c.name)!, kind: isKind(c.kind) ? c.kind : null } : null;
    recent.push({ id: str(x.referred_contact_id) ?? `${name}:${at}`, name, by: str(x.referrer_contact_id), at, closed: x.closed === true, value: numOrNull(x.value), referralId: str(x.referral_id), thanked: typeof x.thanked === "boolean" ? x.thanked : null, thankOpen: x.thank_open === true, ...(client ? { client } : {}) });
  }
  recent.sort((a, b) => b.at.localeCompare(a.at));
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const x of (Array.isArray(r.candidates) ? r.candidates : []) as Record<string, unknown>[]) {
    const id = str(x?.contact_id), name = str(x?.name);
    if (!id || !name || !isWhy(x.why) || seen.has(id)) continue;
    seen.add(id);
    candidates.push({ id, name, tier: str(x.tier), why: x.why, words: str(x.words) ?? WHY_TITLE[x.why] });
  }
  candidates.sort((a, b) => WHY_ORDER.indexOf(a.why) - WHY_ORDER.indexOf(b.why));
  return {
    from: day(gy.from),
    to: day(gy.to),
    goal: numOrNull(r.goal) || null,
    count: num(r.count),
    thisYear: numOrNull(r.this_year),
    thankOwed: readThankOwed(r.thank_you_owed),
    readyToAsk: readReadyToAsk(r.ready_to_ask),
    referrers: referrers.slice(0, 50),
    recent: recent.slice(0, 10),
    vips: { count: num(v.count), ever: num(v.referred_ever), thisYear: num(v.referred_this_year) },
    candidates: candidates.slice(0, 10),
    warming: readWarming(r.warming),
    asksThisMonth: numOrNull(r.asks_this_month),
    thanksThisMonth: numOrNull(r.thanks_this_month),
    gciYear: numOrNull(r.referral_gci_year),
    askedThisMonth: readMonthPeople(r.asked_this_month),
    thankedThisMonth: readMonthPeople(r.thanked_this_month),
    gciClosings: readGciClosings(r.referral_gci_closings),
    pace: readPace(r.pace),
  };
}

/** The referral rate: VIPs who referred this goal year, of all VIPs. Null with no VIPs. */
export function referralRate(r: Referrals): number | null {
  return r.vips.count ? r.vips.thisYear / r.vips.count : null;
}

const ago = (d: string, today: string) => Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${d}T12:00:00Z`)) / 86_400_000);

/** Referrals not thanked yet (§3r.3): the last 90 days, no thank-you touch and no open thank-you task, oldest first
 * (the longest wait first). Only when ONE MOVE says so: an unknown is never shown as unthanked. */
export function unthanked(r: Referrals, today: string): Recent[] {
  return r.recent.filter((x) => x.thanked === false && !x.thankOpen && x.referralId && ago(x.at, today) <= 90).sort((a, b) => a.at.localeCompare(b.at));
}

/** Who sent it, by name. */
export const referrerName = (r: Referrals, x: Recent) => r.referrers.find((p) => p.id === x.by)?.name ?? null;

/** "Thank Jane Smith for referring Tom Lee". */
export const thankWords = (r: Referrals, x: Recent) => `Thank ${referrerName(r, x) ?? "them"} for referring ${x.name}`;

/** The example agent's tap, without ONE MOVE: the task is open, so it leaves the list. */
export const applyThank = (r: Referrals, referralId: string): Referrals => ({ ...r, recent: r.recent.map((x) => (x.referralId === referralId ? { ...x, thankOpen: true } : x)) });

/** Ask-worthy now: a quiet past referrer or a recent closing. These make the orb pulse. */
export const askNow = (r: Referrals) => r.candidates.filter((c) => c.why !== "fully_touched");

export function headline(r: Referrals): string {
  const n = yearCount(r);
  const got = `${n} ${n === 1 ? "referral" : "referrals"}`;
  if (r.goal) return n >= r.goal ? `${got}: goal of ${r.goal} reached` : `${got} of ${r.goal} this goal year`;
  return `${got} this goal year`;
}

/** The Referrals orb under ONE YOU: yellow when someone is worth asking now. */
export function withReferralsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, r: Referrals | null, today: string = new Date().toISOString().slice(0, 10)): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== REFERRALS_NODE);
  const edges = g.edges.filter((e) => e.target !== REFERRALS_NODE);
  if (!go || go.locked || !r) return { ...g, nodes, edges };
  const ask = askNow(r).length;
  const thank = thankCount(r, today);
  const rate = referralRate(r);
  nodes.push({
    id: REFERRALS_NODE,
    type: "feature",
    label: "Referrals",
    secondaryLabel: thank ? `${thank} to thank${ask ? ` · ${ask} worth asking` : ""}` : ask ? `${ask} worth asking now` : headline(r),
    parentId: "go",
    product: "go",
    importance: 1.0,
    status: ask || thank ? "attention" : "healthy",
    summary: `${headline(r)}.${rate != null ? ` ${Math.round(rate * 100)}% of your VIPs have referred this year.` : ""} Who sent you business, and who is likely next.`,
  });
  edges.push({ id: `go>${REFERRALS_NODE}`, source: "go", target: REFERRALS_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

const addDays = (d: string, k: number) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);

/** Example referrals for the demo dashboard (and until ONE MOVE answers). */
export function demoReferrals(today: string): Referrals {
  const ref = (id: string, name: string, total: number, thisYear: number, closed: number, value: number | null, lastAgo: number, touchAgo: number): Referrer => ({
    id, name, tier: "vip50", total, thisYear, closed, value, lastAt: addDays(today, -lastAgo), lastTouchAt: addDays(today, -touchAgo),
  });
  return {
    from: addDays(today, -220),
    to: addDays(today, 145),
    goal: 12,
    count: 7,
    thisYear: 7,
    thankOwed: [{ id: "r4", firstName: "David", sent: 1, lastSentAt: addDays(today, -12) }],
    readyToAsk: [
      { id: "r3", firstName: "Ann", why: "Sent you 3 referrals; no touch in 58 days" },
      { id: "c7", firstName: "Chris", why: "Closed with you 41 days ago; no referral since" },
    ],
    referrers: [
      ref("r1", "Jane Smith", 4, 2, 2, 812000, 54, 6),
      ref("r2", "Mike Torres", 2, 2, 1, 389000, 21, 3),
      ref("r3", "Ann Ruiz", 3, 1, 1, 455000, 160, 58),
      ref("r4", "David Park", 1, 1, 0, null, 12, 12),
      ref("r5", "Lisa Grant", 1, 1, 0, null, 90, 30),
    ],
    recent: [
      { id: "n1", name: "Tom Lee", by: "r4", at: addDays(today, -12), closed: false, value: null, referralId: "f1", thanked: false, thankOpen: false, client: { id: "n1", name: "Tom Lee", kind: "buying" } },
      { id: "n2", name: "Sara Kent", by: "r2", at: addDays(today, -21), closed: false, value: null, referralId: "f2", thanked: true, thankOpen: false, client: { id: "n2", name: "Sara Kent", kind: "selling" } },
      { id: "n3", name: "Ben Ortiz", by: "r1", at: addDays(today, -54), closed: true, value: 425000, referralId: "f3", thanked: true, thankOpen: false, client: { id: "n3", name: "Ben Ortiz", kind: "buying" } },
    ],
    warming: [
      { id: "w1", name: "Amy Chen", photo: null, done: 4, due: 5, next: "One more touch this month and she is ready to ask" },
      { id: "w2", name: "Dave Kim", photo: null, done: 3, due: 5, next: "Handwritten note due this week" },
      { id: "w3", name: "Paula Reyes", photo: null, done: 2, due: 5, next: "Birthday next week: a good moment for a call" },
    ],
    asksThisMonth: 2,
    thanksThisMonth: 3,
    gciYear: 9200,
    vips: { count: 48, ever: 9, thisYear: 5 },
    candidates: [
      { id: "r3", name: "Ann Ruiz", tier: "vip50", why: "past_referrer_quiet", words: "Sent you 3 referrals; no touch in 58 days" },
      { id: "c7", name: "Chris Hall", tier: "vip50", why: "recent_closing", words: "Closed with you 41 days ago; no referral since" },
      { id: "c8", name: "Nina Brooks", tier: "vip50", why: "fully_touched", words: "Every monthly touch for 3 months; has never referred" },
      { id: "c9", name: "Paul Diaz", tier: "vip50", why: "fully_touched", words: "Every monthly touch for 3 months; has never referred" },
    ],
  };
}

/** VIP-SUMMARY §3af: referrals between ONE agents (the VIP-50 network), counted for the Scoreboard. */
export const networkUrl = `${MOVE_URL}/api/brain/network`;
export interface NetworkCounts {
  sent: number;
  sentAccepted: number;
  sentClosed: number;
  received: number;
  receivedOpen: number;
  receivedClosed: number;
}
/** `GET /api/brain/network` answer, counted; null when it is not one. Only counts leave this function. */
export function readNetwork(j: unknown): NetworkCounts | null {
  if (!j || typeof j !== "object") return null;
  const r = j as { sent?: unknown; received?: unknown };
  if (!Array.isArray(r.sent) || !Array.isArray(r.received)) return null;
  const items = (v: unknown[]) => v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  const sent = items(r.sent), received = items(r.received);
  const accepted = (x: Record<string, unknown>) => typeof x.accepted_at === "string" && !!x.accepted_at;
  return {
    sent: sent.length,
    sentAccepted: sent.filter(accepted).length,
    sentClosed: sent.filter((x) => x.status === "closed").length,
    received: received.length,
    // waiting for this agent's answer: MASTER's status 'sent' (agent_referrals check: sent, declined, cancelled,
    // expired, accepted, working, under_contract, closed, lost)
    receivedOpen: received.filter((x) => x.status === "sent").length,
    receivedClosed: received.filter((x) => x.status === "closed").length,
  };
}
export const networkLine = (n: NetworkCounts) =>
  `Sent ${n.sent} (${n.sentAccepted} accepted, ${n.sentClosed} closed) · received ${n.received} (${n.receivedClosed} closed)`;
export const demoNetwork = (): NetworkCounts => ({ sent: 3, sentAccepted: 2, sentClosed: 1, received: 2, receivedOpen: 1, receivedClosed: 0 });
