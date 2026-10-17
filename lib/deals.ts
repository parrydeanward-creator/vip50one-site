import { MOVE_URL } from "./host.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";
export type PulseLevel = "now" | "today" | "good";

// VIP-SUMMARY §3z (v1.60, 10 Oct): deals under contract on the Utah REPC (2018 and 2027 forms). ONE MOVE keeps the
// deals and works out the dates (the 2027 weekend and holiday rule, days left to the deadline time); the Brain draws
// the deal orb, which pulses yellow the day before a deadline and red on the day, and marks a deal closed or fallen
// through. Pulse never explains cancellation rights; nothing is sent to anyone. Only the agent sees a deal.

export const DEALS_NODE = "move-deals";
export const dealsUrl = (status?: Status) => `${MOVE_URL}/api/brain/deals${status ? `?status=${status}` : ""}`;
export const dealUrl = (id: string) => `${MOVE_URL}/api/brain/deals/${encodeURIComponent(id)}`;

export type Status = "under_contract" | "closed" | "fell_through";
export type Side = "buy" | "sell" | "both";
export interface DealDate { key: string; label: string; on: string; effectiveOn: string | null; movedReason: string | null; daysLeft: number | null }
export type Source = "manual" | "rezen" | "marquee";
export interface Deal {
  id: string;
  /** Null for a deal ONE MOVE filled from reZEN or Marquee before the agent linked the client. */
  contact: { id: string; name: string } | null;
  address?: string | null;
  price?: number | null;
  gci?: number | null;
  source?: Source;
  hasRepc?: boolean;
  /** The agent's own REPC file, when ONE MOVE gives it (or the agent just uploaded it here). */
  repcPath?: string | null;
  side: Side;
  status: Status;
  form: "2018" | "2027";
  acceptedOn: string | null;
  deadlineTime: string;
  dates: DealDate[];
  next: { key: string; label: string; on: string } | null;
}

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const day = (v: unknown): string | null => {
  const s = str(v, 30);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const money = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const STATUSES: Status[] = ["under_contract", "closed", "fell_through"];

/** Keep only well-formed deals; a wrong shape is refused (null: no orb). */
export function readDeals(raw: unknown): Deal[] | null {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { deals?: unknown }).deals)) return null;
  const out: Deal[] = [];
  for (const d of (raw as { deals: unknown[] }).deals) {
    if (!d || typeof d !== "object") continue;
    const o = d as Record<string, unknown>;
    const c = o.contact as Record<string, unknown> | null;
    const id = str(o.id, 80);
    // A deal may come without a client (reZEN and Marquee fill it, vip50-web-crm#295); a half-filled client is refused.
    if (!id || (c != null && (typeof c !== "object" || !str(c.id, 80) || !str(c.name, 120)))) continue;
    const address = str(o.address, 200);
    if (!c && !address) continue;
    const dates: DealDate[] = Array.isArray(o.dates)
      ? (o.dates as unknown[]).flatMap((x) => {
          if (!x || typeof x !== "object") return [];
          const r = x as Record<string, unknown>;
          const key = str(r.key, 40);
          const on = day(r.on);
          if (!key || !on) return [];
          return [{ key, label: str(r.label, 60) ?? key, on, effectiveOn: day(r.effective_on), movedReason: str(r.moved_reason, 60), daysLeft: typeof r.days_left === "number" && Number.isFinite(r.days_left) ? Math.round(r.days_left) : null }];
        })
      : [];
    const n = o.next as Record<string, unknown> | null;
    out.push({
      id,
      contact: c ? { id: str(c.id, 80)!, name: str(c.name, 120)! } : null,
      address,
      price: money(o.price),
      gci: money(o.gci),
      source: o.source === "rezen" || o.source === "marquee" ? o.source : "manual",
      hasRepc: o.has_repc === true || !!str(o.repc_file_path, 200),
      repcPath: str(o.repc_file_path, 200),
      side: o.side === "sell" || o.side === "both" ? o.side : "buy",
      status: STATUSES.includes(o.status as Status) ? (o.status as Status) : "under_contract",
      form: o.repc_form === "2018" ? "2018" : "2027",
      acceptedOn: day(o.accepted_on),
      deadlineTime: str(o.deadline_time, 8)?.match(/^\d{2}:\d{2}/)?.[0] ?? "17:00",
      dates,
      next: n && typeof n === "object" && str(n.key, 40) && day(n.on) ? { key: str(n.key, 40)!, label: str(n.label, 60) ?? str(n.key, 40)!, on: day(n.on)! } : null,
    });
  }
  return out;
}

/** The day a deadline really falls (the 2027 form moves earnest money and settlement off weekends and holidays). */
export const dueOn = (d: DealDate) => d.effectiveOn ?? d.on;

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** The next deadline still to come (today counts), by the day it really falls. */
export function nextDate(d: Deal, today: string): DealDate | null {
  return [...d.dates].filter((x) => dueOn(x) >= today).sort((a, b) => dueOn(a).localeCompare(dueOn(b)))[0] ?? null;
}

/** §3z.7: red on a deadline's day, yellow the day before, a still ring otherwise. Only deals under contract pulse. */
export function dealLevel(d: Deal, today: string): PulseLevel {
  if (d.status !== "under_contract") return "good";
  const n = nextDate(d, today);
  if (!n) return "good";
  const k = daysBetween(today, dueOn(n));
  return k <= 0 ? "now" : k === 1 ? "today" : "good";
}

/** "Due diligence today", "Settlement tomorrow", "Appraisal in 9 days". */
export function whenLine(x: DealDate, today: string): string {
  const k = daysBetween(today, dueOn(x));
  if (k < 0) return `${x.label}, passed`;
  if (k === 0) return `${x.label} today`;
  if (k === 1) return `${x.label} tomorrow`;
  return `${x.label} in ${k} days`;
}

/** "Moved to Mon 6 Jul (Independence Day)" when the 2027 rule moved it, else null. */
export function movedLine(x: DealDate): string | null {
  if (!x.effectiveOn || x.effectiveOn === x.on) return null;
  const d = new Date(`${x.effectiveOn}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return `Moved to ${d}${x.movedReason ? ` (${x.movedReason})` : ""}`;
}

/** 12-hour clock for the deadline time ("5:00 pm"). */
export function timeWords(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export const SIDE_WORD: Record<Side, string> = { buy: "Buyer", sell: "Seller", both: "Both sides" };

/** The body for POST deals/<id> setting the status; `closing` answers ONE MOVE's 409 confirm_closing question. */
export function statusBody(status: Status, closing?: { id: string } | "new"): Record<string, string> {
  const b: Record<string, string> = { status };
  if (closing === "new") b.closing = "new";
  else if (closing) b.closing_id = closing.id;
  return b;
}

export interface ClosingAsk { id: string; closedOn: string; question: string }
/** ONE MOVE's 409 `{reason:'confirm_closing', closing:{id, closed_on}, question}`, or null. */
export function readClosingAsk(raw: unknown): ClosingAsk | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const c = r.closing as Record<string, unknown> | null;
  if (r.reason !== "confirm_closing" || !c || typeof c !== "object" || !str(c.id, 80)) return null;
  const on = day(c.closed_on) ?? "";
  return { id: str(c.id, 80)!, closedOn: on, question: str(r.question, 200) ?? `Is this the closing you logged on ${on}?` };
}

/** Who the deal is for, in plain words: the client, else the address. */
export const dealName = (d: Deal): string => d.contact?.name ?? d.address ?? "A deal";
/** The client's first name, else the street number and name. */
export const shortName = (d: Deal): string => (d.contact ? d.contact.name.split(" ")[0] : (d.address ?? "A deal").split(",")[0]);

/** The deals after one status change, before ONE MOVE answers again. */
export const withStatus = (list: Deal[], id: string, status: Status): Deal[] => list.map((d) => (d.id === id ? { ...d, status } : d));

/** The deal orb under ONE MOVE (§3z.7): open deals and the nearest deadline; red or yellow as dealLevel says. */
export function withDealsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, deals: Deal[] | null, today: string): G {
  const move = g.nodes.find((n) => n.id === "move");
  const nodes = g.nodes.filter((n) => n.id !== DEALS_NODE);
  const edges = g.edges.filter((e) => e.target !== DEALS_NODE);
  if (!move || move.locked || !deals) return { ...g, nodes, edges };
  const open = deals.filter((d) => d.status === "under_contract");
  const levels = open.map((d) => dealLevel(d, today));
  const soon = open
    .map((d) => ({ d, x: nextDate(d, today) }))
    .filter((v): v is { d: Deal; x: DealDate } => !!v.x)
    .sort((a, b) => dueOn(a.x).localeCompare(dueOn(b.x)))[0];
  nodes.push({
    id: DEALS_NODE,
    type: "feature",
    label: "Deals",
    secondaryLabel: open.length ? (soon ? `${open.length} under contract · ${shortName(soon.d)}: ${whenLine(soon.x, today)}` : `${open.length} under contract`) : "None under contract",
    parentId: "move",
    product: "move",
    importance: levels.includes("now") ? 1 : levels.includes("today") ? 0.97 : open.length ? 0.8 : 0.5,
    status: levels.includes("now") ? "action" : levels.includes("today") ? "attention" : open.length ? "healthy" : undefined,
    summary: "Your deals under contract and every REPC deadline, with days left. Only you see them; nothing is sent.",
  });
  edges.push({ id: `move>${DEALS_NODE}`, source: "move", target: DEALS_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

const plus = (today: string, k: number) => new Date(Date.parse(`${today}T12:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);

/** The example agent's deals: one with due diligence today, one with settlement tomorrow, one calm, one closed. */
export function demoDeals(today: string): Deal[] {
  const d = (key: string, label: string, k: number, extra: Partial<Record<string, unknown>> = {}) => ({ key, label, on: plus(today, k), ...extra });
  return readDeals({
    deals: [
      { id: "d1", contact: { id: "r1", name: "Jane Smith" }, address: "418 Maple Ridge Dr, Lehi", price: 612000, gci: 15300, source: "manual", has_repc: true, side: "buy", status: "under_contract", repc_form: "2018", accepted_on: plus(today, -12), deadline_time: "17:00",
        dates: [d("earnest_money", "Earnest money", -9), d("seller_disclosure", "Seller disclosures", -5), d("due_diligence", "Due diligence", 0), d("financing_appraisal", "Financing and appraisal", 9), d("settlement", "Settlement", 21), d("possession", "Possession", 22)] },
      { id: "d2", contact: { id: "r2", name: "Mike Torres" }, address: "77 Canyon View Ln, Draper", price: 845000, source: "marquee", side: "sell", status: "under_contract", repc_form: "2027", accepted_on: plus(today, -30), deadline_time: "17:00",
        dates: [d("earnest_money", "Earnest money", -27), d("seller_disclosure", "Seller disclosures", -23), d("due_diligence", "Due diligence", -9), d("appraisal", "Appraisal", -6), d("financing", "Financing", -2), d("settlement", "Settlement", 1, { effective_on: plus(today, 1), moved_reason: null }), d("possession", "Possession", 2)] },
      { id: "d3", contact: { id: "r5", name: "Linda Park" }, address: "1290 E Willow Way, Sandy", price: 498000, source: "rezen", side: "buy", status: "under_contract", repc_form: "2027", accepted_on: plus(today, -2), deadline_time: "17:00",
        dates: [d("earnest_money", "Earnest money", 2), d("seller_disclosure", "Seller disclosures", 5), d("due_diligence", "Due diligence", 14), d("appraisal", "Appraisal", 18), d("financing", "Financing", 21), d("settlement", "Settlement", 33), d("possession", "Possession", 34)] },
      { id: "d4", contact: { id: "r3", name: "Sara Lee" }, address: "5 Aspen Ct, Alpine", source: "manual", side: "sell", status: "closed", repc_form: "2018", accepted_on: plus(today, -50), deadline_time: "17:00", dates: [d("settlement", "Settlement", -8)] },
    ],
  })!;
}

// ---- Adding a deal (walker note, Parry: "yes"; vip50-web-crm#295) ----
// The agent picks the client, types the address and side, and either types the REPC dates or uploads the signed REPC
// for Pulse to read. Pulse's dates fill the form for the agent to check; nothing is saved until the agent presses Save.

export const repcUploadUrl = `${MOVE_URL}/api/brain/deals/repc`;
export const repcLinkUrl = (path: string) => `${MOVE_URL}/api/brain/deals/repc?path=${encodeURIComponent(path)}`;
export const REPC_MAX_BYTES = 20 * 1024 * 1024;

/** ONE MOVE's date keys and words (lib/deals.ts DATE_LABELS there). */
export const DATE_LABEL: Record<string, string> = {
  earnest_money_on: "Earnest money",
  seller_disclosure_on: "Seller disclosure",
  due_diligence_on: "Due diligence",
  financing_appraisal_on: "Financing and appraisal",
  appraisal_on: "Appraisal",
  financing_on: "Financing",
  settlement_on: "Settlement",
  possession_on: "Possession",
};
/** The dates each REPC form uses, in contract order (ONE MOVE FORM_DATES). */
export const FORM_KEYS: Record<"2018" | "2027", string[]> = {
  "2018": ["earnest_money_on", "seller_disclosure_on", "due_diligence_on", "financing_appraisal_on", "settlement_on", "possession_on"],
  "2027": ["earnest_money_on", "seller_disclosure_on", "due_diligence_on", "appraisal_on", "financing_on", "settlement_on", "possession_on"],
};
export const SOURCE_WORD: Record<Source, string> = { manual: "Added by you", rezen: "From reZEN", marquee: "From Marquee" };

export interface DealForm {
  contact: { id: string; name: string } | null;
  address: string;
  side: Side | "";
  form: "2018" | "2027" | "";
  acceptedOn: string;
  price: string;
  gci: string;
  dates: Record<string, string>;
  /** True once Pulse filled the form from the REPC: every date is marked "check each date". */
  pulseRead: boolean;
  /** Fields Pulse could not read, by ONE MOVE's key (repc_form, accepted_on, the date keys). */
  unread: string[];
  filePath: string | null;
}

/** A blank form. The 2027 form is the default from 1 Jan 2027; before then the agent picks (ONE MOVE asks the same). */
export function emptyForm(today: string): DealForm {
  return { contact: null, address: "", side: "", form: today >= "2027-01-01" ? "2027" : "", acceptedOn: "", price: "", gci: "", dates: {}, pulseRead: false, unread: [], filePath: null };
}

export interface RepcRead {
  form: "2018" | "2027" | null;
  acceptedOn: string | null;
  address: string | null;
  price: number | null;
  side: Side | null;
  dates: Record<string, string | null>;
  unread: string[];
}
export type RepcAnswer = { ok: true; filePath: string; read: RepcRead | null; note: string | null } | { ok: false; error: string };

/** POST deals/repc's answer, checked. `read` null (with ONE MOVE's note) when Pulse could not read the file. */
export function readRepcAnswer(raw: unknown, httpOk = true): RepcAnswer {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const path = str(r.file_path, 200);
  if (!httpOk || r.ok !== true || !path) return { ok: false, error: str(r.error, 200) ?? "That upload didn't go through. Try again, or type the dates in." };
  const x = r.read as Record<string, unknown> | null;
  if (!x || typeof x !== "object") return { ok: true, filePath: path, read: null, note: str(r.note, 200) ?? "Pulse could not read it; type the dates in." };
  const dates: Record<string, string | null> = {};
  const raw2 = (x.dates && typeof x.dates === "object" ? x.dates : {}) as Record<string, unknown>;
  for (const k of Object.keys(DATE_LABEL)) dates[k] = day(raw2[k]);
  const p = typeof x.price === "number" ? x.price : Number(String(x.price ?? "").replace(/[$,\s]/g, ""));
  return {
    ok: true,
    filePath: path,
    read: {
      form: x.repc_form === "2018" || x.repc_form === "2027" ? x.repc_form : null,
      acceptedOn: day(x.accepted_on),
      address: str(x.address, 200),
      price: Number.isFinite(p) && p > 0 ? p : null,
      side: x.side === "buy" || x.side === "sell" || x.side === "both" ? x.side : null,
      dates,
      unread: Array.isArray(x.unread) ? (x.unread as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 20) : [],
    },
    note: null,
  };
}

/**
 * Pulse's read laid over the form. What Pulse read replaces what was there; what it could not read keeps what the
 * agent had typed and is flagged. The client the agent picked always stays.
 */
export function formFromRead(prev: DealForm, a: Extract<RepcAnswer, { ok: true }>): DealForm {
  if (!a.read) return { ...prev, filePath: a.filePath };
  const r = a.read;
  const form = r.form ?? prev.form;
  const dates: Record<string, string> = {};
  for (const k of form ? FORM_KEYS[form] : Object.keys(DATE_LABEL)) dates[k] = r.dates[k] ?? prev.dates[k] ?? "";
  const unread = [...new Set(r.unread)].filter((k) => k === "repc_form" || k === "accepted_on" || (form ? FORM_KEYS[form].includes(k) : k in DATE_LABEL));
  if (!r.address && !prev.address.trim()) unread.push("address");
  if (!r.side && !prev.side) unread.push("side");
  return {
    ...prev,
    address: r.address ?? prev.address,
    side: r.side ?? prev.side,
    form,
    acceptedOn: r.acceptedOn ?? prev.acceptedOn,
    price: r.price != null ? String(r.price) : prev.price,
    dates,
    pulseRead: true,
    unread,
    filePath: a.filePath,
  };
}

const amount = (v: string): number | null | "bad" => {
  const t = v.replace(/[$,\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 1e9 ? n : "bad";
};

/** The body for POST deals, or the field to fix in plain words (the same checks ONE MOVE makes). */
export function dealBody(f: DealForm): { ok: true; body: Record<string, unknown> } | { ok: false; field: string; error: string } {
  const fail = (field: string, error: string) => ({ ok: false as const, field, error });
  if (!f.contact) return fail("contact_id", "Pick the client from your contacts.");
  if (!f.address.trim()) return fail("address", "Add the property address.");
  if (f.address.trim().length > 200) return fail("address", "The address is too long (200 characters at most).");
  if (!f.side) return fail("side", "Pick buyer or seller.");
  if (!f.form) return fail("repc_form", "Pick the REPC form this contract uses: 2018 or 2027.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.acceptedOn)) return fail("accepted_on", "Add the date the offer was accepted.");
  const body: Record<string, unknown> = { contact_id: f.contact.id, address: f.address.trim(), side: f.side, repc_form: f.form, accepted_on: f.acceptedOn };
  const price = amount(f.price);
  if (price === "bad") return fail("price", "Price must be a dollar amount.");
  if (price != null) body.price = price;
  const gci = amount(f.gci);
  if (gci === "bad") return fail("gci", "GCI must be a dollar amount.");
  if (gci != null) body.gci = gci;
  for (const k of FORM_KEYS[f.form]) {
    const v = (f.dates[k] ?? "").trim();
    if (!v) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return fail(k, `${DATE_LABEL[k]} must be a date.`);
    if (k !== "possession_on" && v < f.acceptedOn) return fail(k, `${DATE_LABEL[k]} cannot be before the acceptance date.`);
    body[k] = v;
  }
  if (f.filePath) body.repc_file_path = f.filePath;
  return { ok: true, body };
}

/** A file the upload takes: a PDF of 20 MB at most. The words to show, or null when it is fine. */
export function uploadProblem(file: { type: string; size: number; name?: string }): string | null {
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name ?? "")) return "The REPC must be a PDF.";
  if (file.size > REPC_MAX_BYTES) return "That PDF is over 20 MB.";
  return null;
}

export type DateLevel = "passed" | "now" | "today" | "good";
/** Days from today to the day a deadline really falls. */
export const daysLeft = (x: DealDate, today: string) => daysBetween(today, dueOn(x));
/** One date's colour: red on the day, yellow the day before, green after that, grey once passed. */
export function dateLevel(x: DealDate, today: string): DateLevel {
  const k = daysLeft(x, today);
  return k < 0 ? "passed" : k === 0 ? "now" : k === 1 ? "today" : "good";
}
export const LEVEL_HUE: Record<DateLevel, string> = { passed: "#8089a2", now: "#ff6b6b", today: "#f5c542", good: "#3fbf7f" };
/** "Today", "Tomorrow", "9 days left", "Passed". */
export function daysWords(x: DealDate, today: string): string {
  const k = daysLeft(x, today);
  return k < 0 ? "Passed" : k === 0 ? "Today" : k === 1 ? "Tomorrow" : `${k} days left`;
}
/** The deal's dates in the order they fall, each with its colour (a closed or fallen-through deal shows all grey). */
export function timeline(d: Deal, today: string): (DealDate & { level: DateLevel })[] {
  return [...d.dates]
    .sort((a, b) => dueOn(a).localeCompare(dueOn(b)))
    .map((x) => ({ ...x, level: d.status === "under_contract" ? dateLevel(x, today) : "passed" }));
}

/** The example on an empty Deals panel: a buyer deal whose due diligence is tomorrow (yellow). Never saved. */
export function exampleDeal(today: string): Deal {
  const d = (key: string, k: number) => ({ key, label: DATE_LABEL[`${key}_on`] ?? key, on: plus(today, k) });
  return readDeals({
    deals: [
      { id: "example", contact: { id: "example-client", name: "Example: Jane Smith" }, address: "418 Maple Ridge Dr, Lehi", price: 612000, source: "manual", side: "buy", status: "under_contract", repc_form: "2027", accepted_on: plus(today, -9), deadline_time: "17:00",
        dates: [d("earnest_money", -5), d("seller_disclosure", -2), d("due_diligence", 1), d("appraisal", 8), d("financing", 15), d("settlement", 27), d("possession", 28)] },
    ],
  })![0];
}

/** What the example agent's upload reads (the demo): every date but financing, which is flagged for the agent. */
export function demoRepcAnswer(today: string): Extract<RepcAnswer, { ok: true }> {
  return readRepcAnswer({
    ok: true,
    file_path: "demo/repc.pdf",
    read: {
      repc_form: "2027", accepted_on: plus(today, -1), address: "2240 N Juniper Ave, Lehi", price: 575000, side: "buy",
      dates: { earnest_money_on: plus(today, 3), seller_disclosure_on: plus(today, 6), due_diligence_on: plus(today, 15), appraisal_on: plus(today, 19), financing_on: null, settlement_on: plus(today, 34), possession_on: plus(today, 35) },
      unread: ["financing_on"],
    },
  }) as Extract<RepcAnswer, { ok: true }>;
}

/** A deal the example agent saves in the demo, shaped as ONE MOVE would answer. */
export function demoSaved(f: DealForm, today: string): Deal | null {
  const b = dealBody(f);
  if (!b.ok || !f.form) return null;
  const dates = FORM_KEYS[f.form].filter((k) => f.dates[k]).map((k) => ({ key: k.replace(/_on$/, ""), label: DATE_LABEL[k], on: f.dates[k] }));
  return readDeals({ deals: [{ id: `new-${today}-${f.address.length}-${Date.now() % 100000}`, contact: f.contact, address: f.address, price: b.body.price ?? null, gci: b.body.gci ?? null, source: "manual", has_repc: !!f.filePath, repc_file_path: f.filePath, side: f.side, status: "under_contract", repc_form: f.form, accepted_on: f.acceptedOn, deadline_time: "17:00", dates }] })?.[0] ?? null;
}
