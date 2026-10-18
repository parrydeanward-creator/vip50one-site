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
export const cmaDraftUrl = `${cmaUrl}/draft`;
export const cmaRefreshUrl = `${cmaUrl}/refresh`;
export const cmaNextHomeSearchUrl = `${cmaUrl}/next-home-search`;
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
  // LEADS §1.7d: the parts under the range. Each is null until the agent sets it.
  net: NetSheet | null;
  prep: PrepItem[] | null;
  pitch: Pitch | null;
  nextHome: NextHome | null;
  buyerDemand: { count: number; asOf: string | null } | null;
}
export interface WelcomeVideo { on: boolean; seconds: number | null; recordUrl: string | null }
export interface CmaLoaded {
  contactId: string;
  cma: Cma;
  link: string | null;
  hasSite: boolean;
  welcomeVideo: WelcomeVideo | null;
  /** The sent CMA this draft was redrawn from (vip50-web-crm#320), with what changed since it was sent. */
  refreshedFrom?: string | null;
  changes?: CmaChanges | null;
}

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
    net: readNet(c.net),
    prep: readPrep(c.prep),
    pitch: readPitch(c.pitch),
    nextHome: readNextHome(c.next_home),
    buyerDemand: readDemand(c.buyer_demand),
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
    refreshedFrom: str(r.refreshed_from, 100),
    changes: readChanges(r.changes),
  };
}

// ---- The monthly redraw (vip50-web-crm#320; Classic's CmaEditor, same words) -----------------------------------------
export const REDRAW_BUTTON = "Redraw with this month's sales";
export const REDRAW_BUSY = "Redrawing…";
export const REDRAW_FAILED = "Could not redraw just now.";
export const REDRAW_HEAD = "Redrawn with this month's sales. What changed since you sent it:";
export const REDRAW_KEPT = "Your range, notes, net sheet and the rest are kept. Check it, then Send: their old page closes when the new one goes live.";
export const NO_CHANGE_LINE = "No change in the comparables since you sent it";
export const DEMO_SUFFIX = "(Example: nothing was saved.)";

export interface CmaChanges {
  carried: string[];
  noLongerShown: string[];
  new: string[];
  listingChanges: { listingId: string; kind: string }[];
}
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap((x) => (str(x, 100) ? [str(x, 100) as string] : [])) : []);

/** GET ?id='s `changes` (carried[], no_longer_shown[], new[], listing_changes[]); null when absent. */
export function readChanges(v: unknown): CmaChanges | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const listingChanges = (Array.isArray(o.listing_changes) ? o.listing_changes : []).flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const r = x as Record<string, unknown>;
    const listingId = str(r.listing_id, 100), kind = str(r.kind, 40);
    return listingId && kind ? [{ listingId, kind }] : [];
  });
  return { carried: strList(o.carried), noLongerShown: strList(o.no_longer_shown), new: strList(o.new), listingChanges };
}

const CHANGE_WORDS: Record<string, string> = {
  price_changed: "price changed",
  under_contract: "went under contract",
  back_on_market: "came back on the market",
  closed: "sold",
  no_longer_for_sale: "is no longer for sale",
};

/** Property's changes since the last send as plain lines (counts and kinds; no values), as Classic's changeLines. */
export function changeLines(c: CmaChanges | null | undefined, addressOf: (id: string) => string = (id) => `MLS ${id}`): string[] {
  if (!c) return [];
  const out: string[] = [];
  if (c.new.length) out.push(`${c.new.length} new comparable${c.new.length === 1 ? "" : "s"} suggested`);
  if (c.noLongerShown.length) out.push(`${c.noLongerShown.length} comparable${c.noLongerShown.length === 1 ? " is" : "s are"} no longer shown`);
  for (const l of c.listingChanges) out.push(`${addressOf(l.listingId)} ${CHANGE_WORDS[l.kind] ?? l.kind.replace(/_/g, " ")}`);
  if (!out.length) out.push(NO_CHANGE_LINE);
  return out;
}

/** The redraw button shows on a sent CMA whose link is live (as Classic). */
export const canRedraw = (c: Cma) => !!c.sent && c.sent.linkLive;

/** POST refresh's answer: the new cma_id, or ONE MOVE's words (else plain ones). */
export function readRefreshAnswer(j: unknown, httpOk: boolean): { ok: true; cmaId: string } | { ok: false; words: string } {
  const r = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  const id = str(r.cma_id, 100);
  if (httpOk && r.ok !== false && id) return { ok: true, cmaId: id };
  return { ok: false, words: str(r.words, 300) ?? str(r.error, 300) ?? REDRAW_FAILED };
}

// ---- Your next home: "Approve the search for them" (vip50-web-crm#319) -------------------------------------------------
export const APPROVE_SEARCH = "Approve the search for them";
export const APPROVE_BUSY = "Saving…";
export const SEARCH_SAVED = "Saved in their account on your site. They get alerts only if they turn them on.";
export const SEARCH_FAILED = "Could not save the search.";

/** POST next-home-search's answer: the saved line on ok, else ONE MOVE's words (else plain ones). */
export function readSearchAnswer(j: unknown, httpOk = true): { ok: boolean; text: string } {
  const r = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  if (httpOk && r.ok === true) return { ok: true, text: SEARCH_SAVED };
  return { ok: false, text: str(r.words, 300) ?? str(r.error, 300) ?? SEARCH_FAILED };
}

/** The example after a redraw: a fresh draft that keeps the range, notes and parts, with a few example changes. */
export function demoRedraw(d: CmaLoaded, fromId: string): CmaLoaded {
  const first = d.cma.comparables[0]?.listingId ?? "demo-l1";
  const second = d.cma.comparables[1]?.listingId ?? "demo-l2";
  return {
    ...d,
    link: null,
    refreshedFrom: fromId,
    changes: { carried: d.cma.comparables.map((c) => c.listingId), noLongerShown: ["demo-old-1"], new: ["demo-new-1", "demo-new-2"], listingChanges: [{ listingId: first, kind: "price_changed" }, { listingId: second, kind: "under_contract" }] },
    cma: { ...d.cma, status: d.cma.range ? "ready" : "draft", sent: null },
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
  const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
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
      net: null,
      prep: null,
      pitch: null,
      nextHome: null,
      buyerDemand: null,
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


// ---------------------------------------------------------------------------------------------------------------------
// The four parts under the range (LEADS §1.7d; GO/MOVE's vip50-web-crm#316, same words as Classic). Each part saves on its
// own through POST /api/brain/cma/save with only that part (a part left out stays unchanged; null clears it). Pulse
// drafts fill fields and nothing else; nothing is saved until the agent presses that part's Save. No part ever proposes
// a value: the net figures are arithmetic on the agent's own range and the agent's own costs.

export type PartKey = "net" | "prep" | "pitch" | "next_home";
export const PREP_MAX = 8;
export const PITCH_HEADLINE_MAX = 120;
export const PITCH_LINES_MAX = 5;
export const COMMISSION_MAX = 10;
export const PART_SAVING = "Saving...";
export const PART_SAVED = "Saved.";
export const PART_FAILED = "That did not save. Nothing was changed.";
export const PREP_ERROR = `Up to ${PREP_MAX} items, each with Fix or Skip.`;

// Net sheet
export interface NetSheet { payoff: number; payoff2: number; commission_pct: number; title: number; tax: number; other: number }
export type NetKey = keyof NetSheet;
export const NET_FIELDS: { key: NetKey; label: string; pct?: boolean }[] = [
  { key: "payoff", label: "Mortgage payoff" },
  { key: "payoff2", label: "Second loan payoff" },
  { key: "commission_pct", label: "Commission %", pct: true },
  { key: "title", label: "Title and escrow" },
  { key: "tax", label: "Prorated taxes" },
  { key: "other", label: "Other costs" },
];
export type NetDraft = Record<NetKey, string>;
export const emptyNetDraft = (): NetDraft => ({ payoff: "", payoff2: "", commission_pct: "", title: "", tax: "", other: "" });

function readNet(v: unknown): NetSheet | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const n = (k: string) => Math.max(0, numOr(o[k]) ?? 0);
  return { payoff: n("payoff"), payoff2: n("payoff2"), commission_pct: n("commission_pct"), title: n("title"), tax: n("tax"), other: n("other") };
}
export const netDraftOf = (n: NetSheet | null): NetDraft =>
  n ? Object.fromEntries(NET_FIELDS.map((f) => [f.key, n[f.key] ? String(n[f.key]) : ""])) as NetDraft : emptyNetDraft();

/** One typed number: blank is nothing (0); money is whole dollars; commission may have up to two decimals. Null when it is not a number. */
function netNumber(s: string, pct: boolean): number | null {
  const t = s.replace(/[$,%\s]/g, "");
  if (t === "") return 0;
  if (!(pct ? /^\d{1,3}(\.\d{1,2})?$/ : /^\d{1,9}$/).test(t)) return null;
  return Number(t);
}

/** The six fields as typed, or the first problem in words. All six blank is no net sheet. */
export function parseNet(d: NetDraft): { net: NetSheet | null } | { error: string } {
  const out = {} as NetSheet;
  for (const f of NET_FIELDS) {
    const n = netNumber(d[f.key], !!f.pct);
    if (n == null) return { error: f.pct ? `${f.label} must be a number, 0 to ${COMMISSION_MAX}.` : `${f.label} must be a dollar amount.` };
    out[f.key] = n;
  }
  if (out.commission_pct < 0 || out.commission_pct > COMMISSION_MAX) return { error: `Commission % must be between 0 and ${COMMISSION_MAX}.` };
  if (NET_FIELDS.every((f) => d[f.key].trim() === "")) return { net: null };
  return { net: out };
}

/** The save body for the net sheet part only. */
export function netBody(cmaId: string, d: NetDraft): { cma_id: string; net: NetSheet | null } | { error: string } {
  const r = parseNet(d);
  return "error" in r ? r : { cma_id: cmaId, net: r.net };
}

/**
 * What the seller nets at the agent's own low and high: price less commission less costs. Null until the range and the
 * fields exist (a range, and at least the commission % typed with every field a number).
 */
export function netFigures(range: { low: number; high: number } | null, d: NetDraft): { low: number; high: number } | null {
  if (!range || d.commission_pct.trim() === "") return null;
  const r = parseNet(d);
  if ("error" in r || !r.net) return null;
  const n = r.net;
  const costs = n.payoff + n.payoff2 + n.title + n.tax + n.other;
  const at = (price: number) => Math.round(price - (price * n.commission_pct) / 100 - costs);
  return { low: at(range.low), high: at(range.high) };
}
export const netLine = (f: { low: number; high: number }) => `At your range, the seller nets about ${money(f.low)} to ${money(f.high)}.`;

// Your next home
export interface NextHome {
  area: string | null;
  filters: { zip?: string; city?: string; beds_min?: number; baths_min?: number; price_min?: number; price_max?: number; sub_types?: string[] };
  count: number | null;
  asOf: string | null;
}
export interface NextDraft { where: string; beds: string; price: string }
export const emptyNextDraft = (): NextDraft => ({ where: "", beds: "", price: "" });

function readNextHome(v: unknown): NextHome | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const f = (o.filters && typeof o.filters === "object" ? o.filters : {}) as Record<string, unknown>;
  const filters: NextHome["filters"] = {};
  const zip = str(f.zip, 10), city = str(f.city, 80);
  if (zip) filters.zip = zip;
  if (city) filters.city = city;
  for (const k of ["beds_min", "baths_min", "price_min", "price_max"] as const) {
    const n = numOr(f[k]);
    if (n != null) filters[k] = n;
  }
  if (Array.isArray(f.sub_types)) filters.sub_types = f.sub_types.filter((x): x is string => typeof x === "string");
  const count = numOr(o.count);
  return { area: str(o.area, 80), filters, count: count == null ? null : Math.max(0, Math.round(count)), asOf: str(o.as_of, 40) };
}
function readDemand(v: unknown): { count: number; asOf: string | null } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const count = numOr(o.count);
  return count == null ? null : { count: Math.max(0, Math.round(count)), asOf: str(o.as_of, 40) };
}
export function nextDraftOf(n: NextHome | null): NextDraft {
  if (!n) return emptyNextDraft();
  return {
    where: n.filters.zip ?? n.filters.city ?? n.area ?? "",
    beds: n.filters.beds_min != null ? String(n.filters.beds_min) : "",
    price: n.filters.price_max != null ? String(n.filters.price_max) : "",
  };
}

/**
 * The save body for the next-home part only: exactly one of zip or city (five digits is a ZIP, anything else a city),
 * beds at least, price up to. The filters the screen does not show (baths, lowest price, home types) are carried over as
 * they were. All three blank clears it.
 */
export function nextHomeBody(cmaId: string, d: NextDraft, prior: NextHome | null): { cma_id: string; next_home: Record<string, unknown> | null } | { error: string } {
  const where = d.where.trim(), beds = d.beds.trim(), price = d.price.replace(/[$,\s]/g, "");
  if (!where && !beds && !price) return { cma_id: cmaId, next_home: null };
  if (!where) return { error: "Give a city or a ZIP." };
  const isZip = /^\d{5}$/.test(where);
  if (!isZip && (/\d/.test(where) || where.length > 80)) return { error: "Give a city or a five-digit ZIP, not both." };
  if (beds && !/^\d{1,2}$/.test(beds)) return { error: "Beds at least must be a whole number." };
  if (price && !/^\d{1,9}$/.test(price)) return { error: "Price up to must be a dollar amount." };
  const nh: Record<string, unknown> = isZip ? { zip: where } : { city: where };
  if (beds) nh.beds_min = Number(beds);
  if (price) nh.price_max = Number(price);
  const p = prior?.filters;
  if (p?.baths_min != null) nh.baths_min = p.baths_min;
  if (p?.price_min != null && (!price || p.price_min <= Number(price))) nh.price_min = p.price_min;
  if (p?.sub_types?.length) nh.sub_types = p.sub_types;
  return { cma_id: cmaId, next_home: nh };
}

const asOfWords = (iso: string | null) => (day(iso) ? ` (as of ${day(iso)})` : "");
/** "14 homes for sale there match (as of Oct 18, 2026)." */
export function nextCountLine(n: NextHome | null): string | null {
  if (!n || n.count == null) return null;
  return `${n.count} ${n.count === 1 ? "home for sale there matches" : "homes for sale there match"}${asOfWords(n.asOf)}.`;
}
/** "Buyers looking now: 3 saved searches on your site cover this home in your range (as of ...)." */
export function demandLine(b: { count: number; asOf: string | null } | null): string | null {
  if (!b) return null;
  return `Buyers looking now: ${b.count} saved ${b.count === 1 ? "search" : "searches"} on your site cover this home in your range${asOfWords(b.asOf)}.`;
}

// Fix this, skip that
export interface PrepItem { item: string; why: string; do: "fix" | "skip"; pro: { name: string; phone: string } | null }
export interface PrepDraft { item: string; why: string; do: "fix" | "skip" | ""; proName: string; proPhone: string }
export const blankPrep = (): PrepDraft => ({ item: "", why: "", do: "", proName: "", proPhone: "" });

function readPrep(v: unknown): PrepItem[] | null {
  if (!Array.isArray(v)) return null;
  return v.flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    const item = str(o.item, 200);
    if (!item) return [];
    const pr = o.pro && typeof o.pro === "object" ? (o.pro as Record<string, unknown>) : null;
    const name = str(pr?.name, 120);
    return [{ item, why: str(o.why, 400) ?? "", do: o.do === "skip" ? "skip" as const : "fix" as const, pro: name ? { name, phone: str(pr?.phone, 40) ?? "" } : null }];
  });
}
export const prepDraftsOf = (p: PrepItem[] | null): PrepDraft[] =>
  (p ?? []).map((x) => ({ item: x.item, why: x.why, do: x.do, proName: x.pro?.name ?? "", proPhone: x.pro?.phone ?? "" }));

/** The save body for the prep part only: blank rows are ignored; at most 8; each needs What and Fix or Skip. */
export function prepBody(cmaId: string, rows: PrepDraft[]): { cma_id: string; prep: unknown[] | null } | { error: string } {
  const used = rows.filter((r) => r.item.trim() || r.why.trim() || r.proName.trim() || r.proPhone.trim() || r.do);
  if (used.length > PREP_MAX) return { error: PREP_ERROR };
  const prep: unknown[] = [];
  for (const r of used) {
    if (!r.item.trim() || (r.do !== "fix" && r.do !== "skip") || r.item.trim().length > 200 || r.why.trim().length > 400) return { error: PREP_ERROR };
    const row: Record<string, unknown> = { item: r.item.trim(), do: r.do };
    if (r.why.trim()) row.why = r.why.trim();
    if (r.proName.trim()) row.pro = r.proPhone.trim() ? { name: r.proName.trim(), phone: r.proPhone.trim() } : { name: r.proName.trim() };
    prep.push(row);
  }
  return { cma_id: cmaId, prep: prep.length ? prep : null };
}

// How we'd sell it
export interface Pitch { headline: string; lines: string[] }
export interface PitchDraft { headline: string; lines: string }
function readPitch(v: unknown): Pitch | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const headline = str(o.headline, 400);
  if (!headline) return null;
  const lines = Array.isArray(o.lines) ? o.lines.flatMap((l) => (str(l, 600) ? [str(l, 600) as string] : [])) : [];
  return { headline, lines };
}
export const pitchDraftOf = (p: Pitch | null): PitchDraft => ({ headline: p?.headline ?? "", lines: (p?.lines ?? []).join("\n") });
export const pitchLines = (s: string): string[] => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** The save body for the pitch part only: headline up to 120 characters, at most 5 lines. Both blank clears it. */
export function pitchBody(cmaId: string, d: PitchDraft): { cma_id: string; pitch: Pitch | null } | { error: string } {
  const headline = d.headline.trim(), lines = pitchLines(d.lines);
  if (!headline && !lines.length) return { cma_id: cmaId, pitch: null };
  if (!headline) return { error: "Add a headline." };
  if (headline.length > PITCH_HEADLINE_MAX) return { error: `The headline is up to ${PITCH_HEADLINE_MAX} characters.` };
  if (lines.length > PITCH_LINES_MAX) return { error: `Up to ${PITCH_LINES_MAX} lines.` };
  return { cma_id: cmaId, pitch: { headline, lines } };
}

/** POST /api/brain/cma/draft's answer: Pulse's drafts to fill the fields, or the words when there are none. */
export function readDraft(j: unknown): { prep: PrepDraft[]; pitch: PitchDraft | null } | { error: string } {
  const o = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  if (o.ok === false || o.ok == null) return { error: str(o.words, 300) ?? str(o.error, 300) ?? "Pulse could not draft that just now. Fill it in yourself." };
  const prep = (readPrep(o.prep) ?? []).slice(0, PREP_MAX);
  let pitch: PitchDraft | null = null;
  if (typeof o.pitch === "string" && o.pitch.trim()) pitch = { headline: o.pitch.trim().slice(0, PITCH_HEADLINE_MAX), lines: "" };
  else {
    const p = readPitch(o.pitch);
    if (p) pitch = { headline: p.headline.slice(0, PITCH_HEADLINE_MAX), lines: p.lines.slice(0, PITCH_LINES_MAX).join("\n") };
  }
  return { prep: prepDraftsOf(prep), pitch };
}

/** The example's Pulse draft (?demo=1): what Pulse would fill in from a seller's answers. Nothing is saved. */
export const DEMO_DRAFT: { prep: PrepDraft[]; pitch: PitchDraft } = {
  prep: [
    { item: "Repaint the front door", why: "First thing a buyer sees; cheap and quick.", do: "fix", proName: "", proPhone: "" },
    { item: "Replace the carpet in the basement", why: "Buyers will price it in; leave it.", do: "skip", proName: "", proPhone: "" },
    { item: "Deep clean and declutter", why: "Rooms read bigger.", do: "fix", proName: "", proPhone: "" },
    { item: "Re-grout the guest bath", why: "Small fix, noticed on tours.", do: "fix", proName: "", proPhone: "" },
    { item: "Redo the landscaping", why: "Costs more than it returns here.", do: "skip", proName: "", proPhone: "" },
  ],
  pitch: { headline: "A well-kept home, priced to be seen first this month", lines: "Photos and a video tour in the first week\nOpen house the first weekend\nEvery showing request answered the same day" },
};

/** The example after a part Save: the part is kept; the next-home counts are the example's own. */
export function demoPart(d: CmaLoaded, body: Record<string, unknown>): CmaLoaded {
  let cma = { ...d.cma };
  if ("net" in body) cma = { ...cma, net: body.net as NetSheet | null };
  if ("prep" in body) cma = { ...cma, prep: readPrep(body.prep) };
  if ("pitch" in body) cma = { ...cma, pitch: body.pitch as Pitch | null };
  if ("next_home" in body) {
    const nh = readNextHome({ area: (body.next_home as { city?: string; zip?: string } | null)?.city ?? (body.next_home as { zip?: string } | null)?.zip, filters: body.next_home, count: body.next_home ? 14 : null, as_of: "2026-10-18" });
    cma = { ...cma, nextHome: nh, buyerDemand: nh ? { count: 3, asOf: "2026-10-18" } : null };
  }
  return { ...d, cma };
}
