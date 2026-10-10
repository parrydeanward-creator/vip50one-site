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
export interface Deal {
  id: string;
  contact: { id: string; name: string };
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
    if (!id || !c || typeof c !== "object" || !str(c.id, 80) || !str(c.name, 120)) continue;
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
      contact: { id: str(c.id, 80)!, name: str(c.name, 120)! },
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
    secondaryLabel: open.length ? (soon ? `${open.length} under contract · ${soon.d.contact.name.split(" ")[0]}: ${whenLine(soon.x, today)}` : `${open.length} under contract`) : "None under contract",
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
      { id: "d1", contact: { id: "r1", name: "Jane Smith" }, side: "buy", status: "under_contract", repc_form: "2018", accepted_on: plus(today, -12), deadline_time: "17:00",
        dates: [d("earnest_money", "Earnest money", -9), d("seller_disclosure", "Seller disclosures", -5), d("due_diligence", "Due diligence", 0), d("financing_appraisal", "Financing and appraisal", 9), d("settlement", "Settlement", 21), d("possession", "Possession", 22)] },
      { id: "d2", contact: { id: "r2", name: "Mike Torres" }, side: "sell", status: "under_contract", repc_form: "2027", accepted_on: plus(today, -30), deadline_time: "17:00",
        dates: [d("earnest_money", "Earnest money", -27), d("seller_disclosure", "Seller disclosures", -23), d("due_diligence", "Due diligence", -9), d("appraisal", "Appraisal", -6), d("financing", "Financing", -2), d("settlement", "Settlement", 1, { effective_on: plus(today, 1), moved_reason: null }), d("possession", "Possession", 2)] },
      { id: "d3", contact: { id: "r5", name: "Linda Park" }, side: "buy", status: "under_contract", repc_form: "2027", accepted_on: plus(today, -2), deadline_time: "17:00",
        dates: [d("earnest_money", "Earnest money", 2), d("seller_disclosure", "Seller disclosures", 5), d("due_diligence", "Due diligence", 14), d("appraisal", "Appraisal", 18), d("financing", "Financing", 21), d("settlement", "Settlement", 33), d("possession", "Possession", 34)] },
      { id: "d4", contact: { id: "r3", name: "Sara Lee" }, side: "sell", status: "closed", repc_form: "2018", accepted_on: plus(today, -50), deadline_time: "17:00", dates: [d("settlement", "Settlement", -8)] },
    ],
  })!;
}
