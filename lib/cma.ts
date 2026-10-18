import { MOVE_URL } from "./host.ts";

// The agent's CMA in ONE Brain (LEADS.md §1.7c-d; the Brain half of vip50-web-crm#310, the hard rule of 13 Oct: every
// feature in Classic and the Brain). ONE Property builds it; ONE MOVE keeps the contact's list and answers the routes
// below. Pulse and the system never propose a value: Property's comparables come back labelled "Suggested", the agent
// keeps or drops each one, sets adjustments and their own range. The only figure shown that the agent did not type is
// arithmetic on their own adjustments, labelled "Suggested midpoint from your adjustments". Private notes never reach
// the client. Send makes the client's private page live and gives the link to copy; ONE emails nothing. Stop ends it.

export const cmaUrl = `${MOVE_URL}/api/brain/cma`;
export const cmaListUrl = (contactId: string) => `${cmaUrl}?contact_id=${encodeURIComponent(contactId)}`;
export const cmaOneUrl = (cmaId: string) => `${cmaUrl}?id=${encodeURIComponent(cmaId)}`;
export const cmaStartUrl = `${cmaUrl}/start`;
export const cmaSaveUrl = `${cmaUrl}/save`;
export const cmaSendUrl = `${cmaUrl}/send`;
/** Where the website is set up (Getting Started's website step goes here too). */
export const SITE_SETUP_URL = `${MOVE_URL}/profile/agent-hub`;

export const CARD_TITLE = "CMA";
export const MIDPOINT_LABEL = "Suggested midpoint from your adjustments";
/** ONE MOVE's words when there is no site (lib/cma.ts NO_SITE_WORDS there). */
export const NO_SITE_WORDS = "Your website is not set up yet, so there is no page to send. Set up your site first.";
export const EMPTY_LINE = "Pulse suggests comparables near their home; you keep or drop each one and set your own range.";
export const NOTES_LINE = "Private notes: only you see these. They never go to the client.";
export const SEND_CONFIRM = "Make the private page live for your client? You will get the link to send them yourself. Nothing is emailed by ONE.";
export const STOP_CONFIRM = "Stop the link? Your client's private page will no longer open.";

export type CmaStatus = "draft" | "ready" | "sent" | "stopped";
/** The list's words for each status. */
export const STATUS_WORD: Record<CmaStatus, string> = { draft: "Draft", ready: "Ready to send", sent: "Sent", stopped: "Link stopped" };
/** The workspace's longer words. */
export const STATUS_LONG: Record<CmaStatus, string> = {
  draft: "Draft, only you see it",
  ready: "Ready to send",
  sent: "Sent, the page is live",
  stopped: "Sent, the link is stopped",
};

export interface CmaRow {
  cmaId: string;
  address: string | null;
  status: CmaStatus;
  link: string | null;
  linkEnds: string | null;
  sentAt: string | null;
  createdAt: string | null;
}

export interface Adj { label: string; amount: number }
export interface CompValues {
  address_line?: string;
  city?: string;
  beds?: number;
  baths_total?: number;
  living_sqft?: number;
  year_built?: number;
  close_date?: string;
  standard_status?: string;
  days_on_market?: number;
  list_office_name?: string;
  list_agent_name?: string;
  list_office_phone?: string;
}
export interface Credit { listing: string | null; presenting: string | null; source: string | null; disclaimer: string | null }
export interface Comp {
  listingId: string;
  ord: number;
  suggested: boolean;
  price: number | null;
  priceIs: "sold" | "list";
  adjustments: Adj[];
  adjustedPrice: number | null;
  values: CompValues;
  credit: Credit | null;
}
export interface Cma {
  status: "draft" | "ready";
  facts: Record<string, unknown>;
  comparables: Comp[];
  notShown: number;
  range: { low: number; high: number } | null;
  midpoint: { value: number; label: string; count: number } | null;
  notes: string;
  source: string | null;
  sent: { sentAt: string; linkEnds: string | null; linkLive: boolean } | null;
}
export interface WelcomeVideo { on: boolean; seconds: number | null; recordUrl: string | null }
export interface CmaLoaded { contactId: string; cma: Cma; link: string | null; hasSite: boolean; welcomeVideo: WelcomeVideo | null }

const str = (v: unknown, max = 300): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const numOr = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const statusOf = (v: unknown): CmaStatus => (v === "ready" || v === "sent" || v === "stopped" ? v : "draft");
const https = (v: unknown): string | null => {
  const s = str(v, 2000);
  return s && /^https:\/\/[^\s]+$/.test(s) ? s : null;
};

/** GET ?contact_id= -> the contact's CMAs, newest first; null when it is not that answer. */
export function readCmaList(j: unknown): CmaRow[] | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as { cmas?: unknown }).cmas)) return null;
  return ((j as { cmas: unknown[] }).cmas).flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const r = x as Record<string, unknown>;
    const cmaId = str(r.cma_id, 100);
    if (!cmaId) return [];
    return [{
      cmaId,
      address: str(r.address),
      status: statusOf(r.status),
      link: https(r.link),
      linkEnds: str(r.link_ends, 40),
      sentAt: str(r.sent_at, 40),
      createdAt: str(r.created_at, 40),
    }];
  });
}

function readAdj(v: unknown): Adj[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((a) => {
    if (!a || typeof a !== "object") return [];
    const o = a as Record<string, unknown>;
    const amount = numOr(o.amount);
    return amount == null ? [] : [{ label: typeof o.label === "string" ? o.label.slice(0, 60) : "", amount: Math.round(amount) }];
  });
}

function readCredit(v: unknown): Credit | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const c = { listing: str(o.listing, 400), presenting: str(o.presenting, 400), source: str(o.source, 1200), disclaimer: str(o.disclaimer, 1200) };
  return c.listing || c.presenting || c.source || c.disclaimer ? c : null;
}

function readComp(x: unknown, i: number): Comp | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const listingId = str(r.listing_id, 100);
  if (!listingId) return null;
  const values = (r.values && typeof r.values === "object" ? r.values : {}) as CompValues;
  return {
    listingId,
    ord: numOr(r.ord) ?? i,
    // Property's own draft comps are the "Suggested" ones (added_by "draft"); the label marks them on every row.
    suggested: r.added_by === "draft" || r.label === "Suggested",
    price: numOr(r.price),
    priceIs: r.price_is === "sold" ? "sold" : "list",
    adjustments: readAdj(r.adjustments),
    adjustedPrice: numOr(r.adjusted_price),
    values,
    credit: readCredit(r.credit),
  };
}

/** ONE Property's render as ONE MOVE passes it on. */
export function readCma(x: unknown): Cma | null {
  if (!x || typeof x !== "object") return null;
  const c = x as Record<string, unknown>;
  if (!Array.isArray(c.comparables)) return null;
  const rg = c.range as Record<string, unknown> | null | undefined;
  const low = numOr(rg?.low), high = numOr(rg?.high);
  const mp = c.midpoint_from_adjustments as Record<string, unknown> | null | undefined;
  const mpv = numOr(mp?.value);
  const sent = c.sent as Record<string, unknown> | null | undefined;
  return {
    status: c.status === "ready" ? "ready" : "draft",
    facts: (c.subject && typeof c.subject === "object" && (c.subject as { facts?: unknown }).facts && typeof (c.subject as { facts?: unknown }).facts === "object"
      ? (c.subject as { facts: Record<string, unknown> }).facts : {}),
    comparables: (c.comparables as unknown[]).map(readComp).filter((v): v is Comp => !!v).sort((a, b) => a.ord - b.ord),
    notShown: Math.max(0, Math.round(numOr(c.not_shown) ?? 0)),
    range: low != null && high != null ? { low, high } : null,
    midpoint: mpv != null ? { value: mpv, label: MIDPOINT_LABEL, count: Math.round(numOr(mp?.count) ?? 0) } : null,
    notes: typeof c.notes === "string" ? c.notes : "",
    source: str(c.source, 1200),
    sent: sent && typeof sent === "object" ? { sentAt: str(sent.sent_at, 40) ?? "", linkEnds: str(sent.link_ends, 40), linkLive: sent.link_live === true } : null,
  };
}

/** GET ?id= -> the workspace's data; null when it is not that answer. */
export function readCmaLoaded(j: unknown): CmaLoaded | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const cma = readCma(r.cma);
  if (!cma) return null;
  const v = r.welcome_video as Record<string, unknown> | null | undefined;
  return {
    contactId: str(r.contact_id, 100) ?? "",
    cma,
    link: https(r.link),
    hasSite: r.has_site !== false,
    welcomeVideo: v && typeof v === "object" ? { on: v.on === true, seconds: numOr(v.seconds), recordUrl: https(v.record_url) } : null,
  };
}

/** The workspace's status: sent and stopped come from `sent`, else Property's draft/ready. */
export function cmaStatus(c: Cma): CmaStatus {
  return c.sent ? (c.sent.linkLive ? "sent" : "stopped") : c.status;
}

/** A dollar amount the agent typed: "$-5,000", "+12500", "-3k" is not taken. Null when it is not a whole number. */
export function parseAmount(s: string): number | null {
  const t = s.replace(/[$,\s]/g, "");
  if (!/^[+-]?\d{1,8}$/.test(t)) return null;
  return Number(t);
}

/** "-$5,000", "+$12,500", "$650,000". */
export function money(n: number | null | undefined, signed = false): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "–";
  const abs = `$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
  if (n < 0) return `-${abs}`;
  return signed ? `+${abs}` : abs;
}

/** The workspace's editable adjustment: the amount kept as typed, so "-" can be typed first. */
export interface AdjDraft { label: string; amount: string }
export const toDrafts = (a: Adj[]): AdjDraft[] => a.map((x) => ({ label: x.label, amount: String(x.amount) }));

/** The adjustments that count: a row with no label and no amount is ignored; anything half filled is a problem. */
export function cleanAdjustments(rows: AdjDraft[]): { adjustments: Adj[] } | { error: string } {
  const adjustments: Adj[] = [];
  for (const r of rows) {
    const label = r.label.trim();
    const blank = r.amount.trim() === "" || parseAmount(r.amount) === 0;
    if (!label && blank) continue;
    const amount = parseAmount(r.amount);
    if (!label || label.length > 60 || amount == null || Math.abs(amount) > 10_000_000) {
      return { error: "Each adjustment needs a short label (60 characters) and an amount." };
    }
    adjustments.push({ label, amount });
  }
  return { adjustments };
}

/** The comp's price after the agent's own adjustments, as typed now (half-typed rows count as nothing). */
export function adjustedNow(price: number | null, rows: AdjDraft[]): number | null {
  if (price == null) return null;
  return price + rows.reduce((s, r) => s + (parseAmount(r.amount) ?? 0), 0);
}

/**
 * The midpoint from the agent's adjustments, as ONE Property works it out (the median of the kept comps' adjusted
 * prices, the middle two averaged): only kept comps with a price. Null when there are none. Never a value of ONE's own.
 */
export function midpointFromAdjustments(comps: { price: number | null; keep: boolean; rows: AdjDraft[] }[]): { value: number; count: number } | null {
  const v = comps.filter((c) => c.keep).map((c) => adjustedNow(c.price, c.rows)).filter((n): n is number => n != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  const value = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  return { value: Math.round(value), count: v.length };
}

/** The agent's range as typed: both empty is no range; otherwise both, above zero, low no more than high. */
export function parseRange(low: string, high: string): { range: { low: number; high: number } | null } | { error: string } {
  const l = low.replace(/[$,\s]/g, ""), h = high.replace(/[$,\s]/g, "");
  if (!l && !h) return { range: null };
  const lo = /^\d{1,9}$/.test(l) ? Number(l) : NaN, hi = /^\d{1,9}$/.test(h) ? Number(h) : NaN;
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi < lo) return { error: "The low price must be above zero and no more than the high price." };
  return { range: { low: lo, high: hi } };
}

export interface SaveBody {
  cma_id: string;
  comps: { listing_id: string; adjustments: Adj[] }[];
  range: { low: number; high: number } | null;
  notes: string;
}

/**
 * POST /api/brain/cma/save's body (ONE MOVE's parseSave): `comps` is the whole kept list in Property's order, each with
 * the agent's adjustments; a dropped comp is left out. The range is the agent's own. Or the first problem, in words.
 */
export function saveBody(
  cmaId: string,
  comps: Comp[],
  keep: Record<string, boolean>,
  adj: Record<string, AdjDraft[]>,
  low: string,
  high: string,
  notes: string,
): SaveBody | { error: string } {
  const kept: SaveBody["comps"] = [];
  for (const c of comps) {
    if (!keep[c.listingId]) continue;
    const a = cleanAdjustments(adj[c.listingId] ?? []);
    if ("error" in a) return a;
    kept.push({ listing_id: c.listingId, adjustments: a.adjustments });
  }
  if (kept.length > 25) return { error: "At most 25 comparables, each listed once." };
  const r = parseRange(low, high);
  if ("error" in r) return r;
  if (notes.length > 4000) return { error: "Notes are limited to 4,000 characters." };
  return { cma_id: cmaId, comps: kept, range: r.range, notes };
}

/** "4 bd · 2.5 ba · 2,310 sq ft · built 1998" */
export function compFacts(v: CompValues): string {
  return [
    v.beds != null && `${v.beds} bd`,
    v.baths_total != null && `${v.baths_total} ba`,
    v.living_sqft != null && `${Number(v.living_sqft).toLocaleString("en-US")} sq ft`,
    v.year_built != null && `built ${v.year_built}`,
  ].filter(Boolean).join(" · ");
}

/** "Sold 2026-09-14" or "List price · Active". */
export function priceWords(c: Comp): string {
  if (c.priceIs === "sold") return `Sold${c.values.close_date ? ` ${String(c.values.close_date).slice(0, 10)}` : ""}`;
  return `List price${c.values.standard_status ? ` · ${c.values.standard_status}` : ""}`;
}

/** Each comp's credit line: Property's own when it sends one, else built from the listing's brokerage and agent. */
export function creditLine(c: Comp): string | null {
  if (c.credit?.listing) return c.credit.listing;
  const v = c.values;
  const who = [v.list_office_name, v.list_agent_name, v.list_office_phone].filter((x) => typeof x === "string" && x.trim());
  return who.length ? `Listing courtesy of ${who.join(", ")}.` : null;
}

/** The subject home's facts in a line, or the plain words when none were given. */
export function subjectLine(facts: Record<string, unknown>): string {
  const n = (k: string) => (typeof facts[k] === "number" || typeof facts[k] === "string" ? facts[k] : null);
  const parts = [
    n("beds") != null && `${n("beds")} beds`,
    n("living_sqft") != null && `${Number(n("living_sqft")).toLocaleString("en-US")} sq ft`,
    n("year_built") != null && `built ${n("year_built")}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Their facts: none given yet. Check the county parcel record.";
}

const day = (iso: string | null): string | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" }) : null;
};

/** The list row's second line: "Sent Oct 18, 2026 · link ends Nov 17, 2026", "Draft · Oct 18, 2026". */
export function rowLine(r: CmaRow): string {
  const sent = day(r.sentAt), ends = day(r.linkEnds), made = day(r.createdAt);
  if (r.status === "sent") return [`Sent${sent ? ` ${sent}` : ""}`, ends ? `link ends ${ends}` : null].filter(Boolean).join(" · ");
  if (r.status === "stopped") return [`Link stopped`, sent ? `sent ${sent}` : null].filter(Boolean).join(" · ");
  return [STATUS_WORD[r.status], made].filter(Boolean).join(" · ");
}

/** "Their private page (until Nov 17, 2026):" */
export const linkUntil = (ends: string | null) => `Their private page${day(ends) ? ` (until ${day(ends)})` : ""}:`;

/** The welcome video line (Websites 0310), or null when ONE MOVE sends none (no site). */
export function videoLine(v: WelcomeVideo | null): { text: string; action: string | null; url: string | null } | null {
  if (!v) return null;
  const state = v.on ? `on${v.seconds ? `, ${v.seconds}s` : ""}` : "not yet";
  return { text: `Your welcome video (top of every CMA page): ${state}`, action: v.recordUrl ? (v.on ? "Change it" : "Record it") : null, url: v.recordUrl };
}

// The example agent (?demo=1): one labelled example CMA with three Suggested comps. Nothing is called and nothing is sent.
export const DEMO_CMA_ID = "demo-cma-example";
export const DEMO_LINK = "https://sarah-bennett.vip50homes.com/cma/example";
const DEMO_COMPS: Comp[] = [
  {
    listingId: "demo-l1", ord: 1, suggested: true, price: 642000, priceIs: "sold", adjustments: [{ label: "Smaller lot", amount: 8000 }], adjustedPrice: 650000,
    values: { address_line: "1314 E Pepperwood Dr", city: "Sandy", beds: 4, baths_total: 3, living_sqft: 2410, year_built: 1996, close_date: "2026-09-12", list_office_name: "Example Realty", list_agent_name: "Jordan Lee", list_office_phone: "801-555-0141" },
    credit: null,
  },
  {
    listingId: "demo-l2", ord: 2, suggested: true, price: 675000, priceIs: "sold", adjustments: [{ label: "New kitchen", amount: -15000 }], adjustedPrice: 660000,
    values: { address_line: "1188 E Vintage Oak Ln", city: "Sandy", beds: 4, baths_total: 2.5, living_sqft: 2290, year_built: 1999, close_date: "2026-08-28", list_office_name: "Wasatch Homes", list_agent_name: "Casey Park", list_office_phone: "801-555-0177" },
    credit: null,
  },
  {
    listingId: "demo-l3", ord: 3, suggested: true, price: 659900, priceIs: "list", adjustments: [], adjustedPrice: 659900,
    values: { address_line: "1402 E Creek Rd", city: "Sandy", beds: 5, baths_total: 3, living_sqft: 2550, year_built: 1994, standard_status: "Active", list_office_name: "Summit Group", list_agent_name: "Riley Moss", list_office_phone: "801-555-0190" },
    credit: null,
  },
];
export const DEMO_ROW: CmaRow = { cmaId: DEMO_CMA_ID, address: "Example: 1290 E Pepperwood Dr, Sandy", status: "draft", link: null, linkEnds: null, sentAt: null, createdAt: "2026-10-17T16:00:00Z" };

export function demoLoaded(contactId: string): CmaLoaded {
  const comps = DEMO_COMPS.map((c) => ({ ...c, adjustments: [...c.adjustments], values: { ...c.values } }));
  const m = midpointFromAdjustments(comps.map((c) => ({ price: c.price, keep: true, rows: toDrafts(c.adjustments) })));
  return {
    contactId,
    cma: {
      status: "draft",
      facts: { beds: 4, living_sqft: 2350, year_built: 1997 },
      comparables: comps,
      notShown: 0,
      range: null,
      midpoint: m ? { ...m, label: MIDPOINT_LABEL } : null,
      notes: "",
      source: "Example data. Based on information from UtahRealEstate.com once the feed is live.",
      sent: null,
    },
    link: null,
    hasSite: true,
    welcomeVideo: { on: false, seconds: null, recordUrl: null },
  };
}

/** The example after a Save: dropped comps leave, adjustments and range kept, ready once a range is set. */
export function demoSaved(d: CmaLoaded, body: SaveBody): CmaLoaded {
  const comps = body.comps.flatMap((k) => {
    const c = d.cma.comparables.find((x) => x.listingId === k.listing_id);
    return c ? [{ ...c, adjustments: k.adjustments, adjustedPrice: adjustedNow(c.price, toDrafts(k.adjustments)) }] : [];
  });
  const m = midpointFromAdjustments(comps.map((c) => ({ price: c.price, keep: true, rows: toDrafts(c.adjustments) })));
  return { ...d, cma: { ...d.cma, comparables: comps, range: body.range, notes: body.notes, status: body.range ? "ready" : "draft", midpoint: m ? { ...m, label: MIDPOINT_LABEL } : null } };
}

/** The example after Send or Stop. */
export function demoShared(d: CmaLoaded, action: "send" | "stop", now: Date): CmaLoaded {
  if (action === "stop") return { ...d, link: null, cma: { ...d.cma, sent: d.cma.sent ? { ...d.cma.sent, linkLive: false } : null } };
  const ends = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  return { ...d, link: DEMO_LINK, cma: { ...d.cma, sent: { sentAt: now.toISOString(), linkEnds: ends, linkLive: true } } };
}

/** The list row after the workspace changed it (status, link and dates follow the CMA). */
export function rowFrom(r: CmaRow, d: CmaLoaded): CmaRow {
  const status = cmaStatus(d.cma);
  return { ...r, status, link: status === "sent" ? d.link : null, sentAt: d.cma.sent?.sentAt ?? r.sentAt, linkEnds: d.cma.sent?.linkEnds ?? r.linkEnds };
}
