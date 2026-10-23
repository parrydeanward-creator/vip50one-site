import { MOVE_URL } from "./host.ts";
import { referrerName, unthanked, yearCount, type ClientKind, type Referrals, type Warming } from "./referrals.ts";
import { touchSegments, type VipRoster } from "./vips.ts";

// The Brain's Referral Network page (VIP-SUMMARY §3aq; Parry, 22 Oct: "yes on referral network"). Pure rules for the
// page: the goal gauge, the referral tree, the three lanes (thank-you owed, ready to ask, warming up) and the
// agent-to-agent list. Everything reads ONE MOVE's live answers; each §3aq addition GO/MOVE has not shipped yet has a
// fallback from data that is live, or the part hides. Nothing here sends anything to anyone.

export const networkListUrl = `${MOVE_URL}/api/brain/network`;
export const networkActUrl = `${MOVE_URL}/api/brain/network/act`;
export const networkListedUrl = `${MOVE_URL}/api/brain/network/listed`;
export const networkAgentsUrl = (q: string) => `${MOVE_URL}/api/brain/network/agents?q=${encodeURIComponent(q.trim().slice(0, 60))}`;

const DAY = 86_400_000;
const at = (d: string) => Date.parse(`${d}T12:00:00Z`);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-21" -> "Oct 21". */
export const shortDay = (d: string | null | undefined) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}` : "");
export const firstOf = (name: string) => name.trim().split(/\s+/)[0] ?? name;
export function initials(name: string): string {
  const w = name.split(/[\s&]+/).filter((x) => /[\p{L}\p{N}]/u.test(x));
  if (!w.length) return "?";
  if (w.length === 1) return Array.from(w[0]).slice(0, 2).join("").toUpperCase();
  return (Array.from(w[0])[0] + Array.from(w[w.length - 1])[0]).toUpperCase();
}
/** "Jake", "Jake & Lena", "Jake, Lena & Sam". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

// ---- the goal gauge -------------------------------------------------------------------------------------------------

export interface Gauge {
  count: number;
  goal: number | null;
  /** count / goal, 0..1; null with no goal. */
  share: number | null;
  /** Where the agent would be on an even pace today, 0..1 of the goal; null without a goal or goal year. */
  pace: number | null;
  paceCount: number | null;
  left: number | null;
  /** "14 to go · 1 every 3 weeks", "Goal reached", or null without a goal. */
  line: string | null;
}

/** The referrals goal against the goal year: on-pace marker and what it takes from here. */
export function goalGauge(o: { count: number; goal: number | null; from: string | null; to: string | null; today: string }): Gauge {
  const { count, goal } = o;
  if (!goal || goal <= 0) return { count, goal: null, share: null, pace: null, paceCount: null, left: null, line: null };
  const share = Math.max(0, Math.min(1, count / goal));
  const left = Math.max(0, goal - count);
  let pace: number | null = null;
  let weeksLeft: number | null = null;
  if (o.from && o.to && at(o.to) > at(o.from)) {
    const span = at(o.to) - at(o.from);
    pace = Math.max(0, Math.min(1, (at(o.today) - at(o.from)) / span));
    weeksLeft = Math.max(0, (at(o.to) - at(o.today)) / (7 * DAY));
  }
  const paceCount = pace == null ? null : Math.round(goal * pace);
  let line: string;
  if (!left) line = "Goal reached";
  else if (weeksLeft == null) line = `${left} to go`;
  else if (weeksLeft < 1) line = `${left} to go · this week`;
  else {
    const every = weeksLeft / left;
    line = every >= 1.5 ? `${left} to go · 1 every ${Math.round(every)} weeks` : every >= 1 ? `${left} to go · 1 every week` : `${left} to go · ${Math.ceil(left / weeksLeft)} a week`;
  }
  return { count, goal, share, pace, paceCount, left, line };
}

export const gaugeOf = (r: Referrals, today: string) => goalGauge({ count: yearCount(r), goal: r.goal, from: r.from, to: r.to, today });

// ---- stat tiles: only what ONE MOVE sends ---------------------------------------------------------------------------

export type TileKey = "thanks" | "asks" | "gci";
export function tiles(r: Referrals): TileKey[] {
  const out: TileKey[] = [];
  if (r.thanksThisMonth != null) out.push("thanks");
  if (r.asksThisMonth != null) out.push("asks");
  if (r.gciYear != null) out.push("gci");
  return out;
}

// ---- thank-you owed --------------------------------------------------------------------------------------------------

export interface OwedRow {
  id: string;
  first: string;
  name: string;
  sent: number;
  lastAt: string | null;
  /** The people they sent, newest first (from `recent`), with what they are doing when ONE MOVE says. */
  clients: { name: string; kind: ClientKind | null }[];
}

/** ONE MOVE's `thank_you_owed` when it sends it, else the per-referral reading (§3r.3), one row per referrer. */
export function owedRows(r: Referrals, today: string): OwedRow[] {
  const clientsOf = (id: string) =>
    r.recent
      .filter((x) => x.by === id && x.thanked !== true)
      .map((x) => ({ name: x.client?.name ?? x.name, kind: x.client?.kind ?? null }));
  const full = (id: string, fallback: string) => r.referrers.find((p) => p.id === id)?.name ?? fallback;
  if (r.thankOwed) return r.thankOwed.map((x) => ({ id: x.id, first: x.firstName, name: full(x.id, x.firstName), sent: x.sent, lastAt: x.lastSentAt, clients: clientsOf(x.id) }));
  const by = new Map<string, OwedRow>();
  for (const x of unthanked(r, today).reverse()) {
    if (!x.by) continue;
    const name = referrerName(r, x);
    if (!name) continue;
    const row = by.get(x.by) ?? { id: x.by, first: firstOf(name), name, sent: 0, lastAt: x.at, clients: [] };
    row.sent++;
    if (!row.lastAt || x.at > row.lastAt) row.lastAt = x.at;
    row.clients.push({ name: x.client?.name ?? x.name, kind: x.client?.kind ?? null });
    by.set(x.by, row);
  }
  return [...by.values()];
}

/** The thank-you Pulse offers before the model answers (and when it cannot): short, true, the agent sends it. */
export function thankDraft(first: string, clients: string[]): string {
  const who = joinNames(clients.map(firstOf));
  return who
    ? `${first}, thank you for sending ${who} my way. It means a lot that you trust me with the people you care about.`
    : `${first}, thank you for the referral. It means a lot that you trust me with the people you care about.`;
}
/** What Pulse is asked for when it drafts the thank-you in the agent's voice (POST /api/draft `ask`). */
export const thankAsk = (clients: string[]) =>
  `A short thank-you text for referring ${joinNames(clients) || "someone"} to me. Thank them only; do not ask for more referrals.`;
/** The ask, in words the agent says themselves. */
export const askDraft = (first: string) => `${first}, who do you know who is thinking about a move this year? I would take great care of them.`;

// ---- warming up ------------------------------------------------------------------------------------------------------

/**
 * Warming up: ONE MOVE's `warming` (§3aq) when it sends it; else computed from the VIP roster this month (VIP-50s who
 * have not referred and are not ready to ask, with at least one of this month's touches done, closest first); else
 * nothing, and the lane hides. Never invented.
 */
export function warmingRows(r: Referrals, roster: VipRoster | null): { rows: Warming[]; from: "one_move" | "roster" | null } {
  if (r.warming) return { rows: r.warming, from: "one_move" };
  if (!roster) return { rows: [], from: null };
  const skip = new Set([...r.referrers.map((x) => x.id), ...(r.readyToAsk ?? []).map((x) => x.id)]);
  const rows: Warming[] = [];
  for (const p of roster.vip50) {
    if (skip.has(p.id)) continue;
    const segs = touchSegments(p.month);
    const done = segs.filter((s) => s.done).length;
    if (!segs.length || !done || done >= segs.length) continue;
    const miss = segs.find((s) => !s.done)!;
    rows.push({ id: p.id, name: p.name, photo: p.photo ?? null, done, due: segs.length, next: `Next: ${miss.label.toLowerCase()} this month` });
  }
  rows.sort((a, b) => b.done / b.due - a.done / a.due || a.name.localeCompare(b.name));
  return { rows: rows.slice(0, 5), from: "roster" };
}

/** "Amy Chen is one touch away." for an empty Ready to ask; null with nobody warming. */
export function closestLine(w: Warming | undefined): string | null {
  if (!w) return null;
  const n = Math.max(1, w.due - w.done);
  return `${w.name} is ${n === 1 ? "one touch" : `${n} touches`} away.`;
}

// ---- agent to agent (§3af, §3aq stage) -------------------------------------------------------------------------------

export const STAGES = ["sent", "accepted", "under_contract", "closed", "fee_paid"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = { sent: "Sent", accepted: "Accepted", under_contract: "Under contract", closed: "Closed", fee_paid: "Fee paid" };
const isStage = (v: unknown): v is Stage => typeof v === "string" && (STAGES as readonly string[]).includes(v);

export interface NetItem {
  id: string;
  direction: "sent" | "received";
  status: string;
  statusWords: string;
  /** §3aq: the five-step track, when ONE MOVE sends it. */
  stage: Stage | null;
  kind: "buyer" | "seller" | "both" | null;
  area: string | null;
  feeTerms: string;
  other: string;
  client: string;
  contactId: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  closedOn: string | null;
}
const s = (v: unknown, n = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

function readItem(x: Record<string, unknown>, direction: "sent" | "received"): NetItem | null {
  const id = s(x.id), status = s(x.status, 30);
  if (!id || !status) return null;
  const c = x.client && typeof x.client === "object" ? (x.client as Record<string, unknown>) : {};
  const o = x.other && typeof x.other === "object" ? (x.other as Record<string, unknown>) : {};
  const client = [s(c.first_name, 40), s(c.last_name, 40)].filter(Boolean).join(" ") || "A client";
  const kind = x.kind === "buyer" || x.kind === "seller" || x.kind === "both" ? x.kind : null;
  return {
    id, direction, status,
    statusWords: s(x.status_words, 80) ?? status.replace(/_/g, " "),
    stage: isStage(x.stage) ? x.stage : null,
    kind, area: s(x.area, 80), feeTerms: s(x.fee_terms, 400) ?? "",
    other: s(o.name, 60) ?? "ONE agent", client,
    contactId: s(x.contact_id, 60),
    createdAt: s(x.created_at, 40)?.slice(0, 10) ?? null,
    expiresAt: s(x.expires_at, 40)?.slice(0, 10) ?? null,
    closedOn: s(x.closed_on, 20)?.slice(0, 10) ?? null,
  };
}
/** `GET /api/brain/network`, checked; null when it is not one. */
export function readNetworkItems(j: unknown): { sent: NetItem[]; received: NetItem[] } | null {
  if (!j || typeof j !== "object") return null;
  const r = j as { sent?: unknown; received?: unknown };
  if (!Array.isArray(r.sent) || !Array.isArray(r.received)) return null;
  const list = (v: unknown[], d: "sent" | "received") => v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object").map((x) => readItem(x, d)).filter((x): x is NetItem => !!x);
  return { sent: list(r.sent, "sent"), received: list(r.received, "received") };
}

export const KIND_WORDS: Record<"buyer" | "seller" | "both", string> = { buyer: "buying", seller: "selling", both: "buying and selling" };
/** "The Ortegas · buying in Draper". */
export const netTitle = (x: NetItem) => [x.client, x.kind ? `${KIND_WORDS[x.kind]}${x.area ? ` in ${x.area}` : ""}` : x.area].filter(Boolean).join(" · ");

/** What the agent may do on one referral (the same rules as ONE MOVE's page; MASTER checks them again). */
export type Move = { label: string; body: Record<string, unknown>; primary?: boolean; needsReason?: boolean; needsDate?: boolean };
export function movesFor(x: NetItem): Move[] {
  if (x.direction === "sent") return x.status === "sent" ? [{ label: "Cancel referral", body: { id: x.id, action: "cancel" } }] : [];
  if (x.status === "sent")
    return [
      { label: "Accept and agree to the fee", body: { id: x.id, action: "accept" }, primary: true },
      { label: "Decline", body: { id: x.id, action: "decline" }, needsReason: true },
    ];
  if (x.status === "accepted" || x.status === "working")
    return [
      ...(x.status === "accepted" ? [{ label: "Working with them", body: { id: x.id, action: "status", status: "working" } }] : []),
      { label: "Move to Under contract", body: { id: x.id, action: "status", status: "under_contract" }, primary: true },
      { label: "Lost", body: { id: x.id, action: "status", status: "lost" }, needsReason: true },
    ];
  if (x.status === "under_contract")
    return [
      { label: "Move to Closed", body: { id: x.id, action: "status", status: "closed" }, primary: true, needsDate: true },
      { label: "Lost", body: { id: x.id, action: "status", status: "lost" }, needsReason: true },
    ];
  return [];
}

/** Agents the agent trades with, from their own referrals: "sent you 1 · you sent 2". */
export function tradePartners(n: { sent: NetItem[]; received: NetItem[] }): { name: string; sentYou: number; youSent: number }[] {
  const m = new Map<string, { name: string; sentYou: number; youSent: number }>();
  for (const x of [...n.received, ...n.sent]) {
    const p = m.get(x.other) ?? { name: x.other, sentYou: 0, youSent: 0 };
    if (x.direction === "received") p.sentYou++;
    else p.youSent++;
    m.set(x.other, p);
  }
  return [...m.values()].sort((a, b) => b.sentYou + b.youSent - (a.sentYou + a.youSent) || a.name.localeCompare(b.name)).slice(0, 4);
}

// ---- the referral tree -----------------------------------------------------------------------------------------------

export interface Leaf {
  name: string;
  line: string;
  contactId: string | null;
  closed: boolean;
}
export interface Branch {
  id: string;
  name: string;
  /** a person in the agent's sphere, or another ONE agent */
  kind: "sphere" | "agent";
  contactId: string | null;
  leaves: Leaf[];
  total: number;
  info: string;
}
const CLIENT_KIND: Record<ClientKind, string> = { buying: "buying", selling: "selling", both: "buying and selling" };

/**
 * Referrer -> client from `recent` (who sent whom, newest first), then referrers with nothing recent (the fallback:
 * referrers only), then ONE agents who sent the agent a client. At most `max` branches.
 */
export function treeOf(r: Referrals, net: { received: NetItem[] } | null, max = 5): Branch[] {
  const out: Branch[] = [];
  const seen = new Set<string>();
  for (const x of r.recent) {
    if (!x.by || seen.has(x.by)) continue;
    const name = referrerName(r, x);
    if (!name) continue;
    seen.add(x.by);
    const mine = r.recent.filter((y) => y.by === x.by);
    const leaves = mine.map((y) => ({
      name: y.client?.name ?? y.name,
      line: [y.client?.kind ? CLIENT_KIND[y.client.kind] : null, y.closed ? "closed" : null, shortDay(y.at)].filter(Boolean).join(", "),
      contactId: y.client?.id ?? (y.id.includes(":") ? null : y.id),
      closed: y.closed,
    }));
    const total = r.referrers.find((p) => p.id === x.by)?.total ?? mine.length;
    out.push({ id: x.by, name, kind: "sphere", contactId: x.by, leaves, total, info: `${name} sent you ${joinNames(leaves.map((l) => `${l.name}${l.line ? ` (${l.line})` : ""}`))}.` });
  }
  for (const p of r.referrers) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ id: p.id, name: p.name, kind: "sphere", contactId: p.id, leaves: [], total: p.total, info: `${p.name} has sent you ${p.total} ${p.total === 1 ? "referral" : "referrals"}${p.closed ? `, ${p.closed} closed` : ""}.` });
  }
  const sphere = out.slice(0, Math.max(1, max - Math.min(2, net?.received.length ?? 0)));
  const agents: Branch[] = [];
  for (const x of net?.received ?? []) {
    if (agents.length >= 2 || ["declined", "cancelled", "expired"].includes(x.status)) continue;
    agents.push({ id: `agent:${x.id}`, name: x.other, kind: "agent", contactId: null, leaves: [{ name: x.client, line: x.stage ? STAGE_LABEL[x.stage].toLowerCase() : x.statusWords.toLowerCase(), contactId: x.contactId, closed: x.status === "closed" }], total: 1, info: `${x.other} (a ONE agent) sent you ${x.client}: ${x.statusWords.toLowerCase()}.` });
  }
  return [...sphere, ...agents].slice(0, max);
}

// ---- the example agent -----------------------------------------------------------------------------------------------

const ago = (today: string, n: number) => new Date(at(today) - n * DAY).toISOString().slice(0, 10);
/** The example agent's agent-to-agent referrals (never shown to a signed-in agent). */
export function demoNetworkItems(today: string): { sent: NetItem[]; received: NetItem[] } {
  const base = { feeTerms: "Referral fee of 25% of the receiving agent's side of the commission, paid broker to broker at closing.", expiresAt: null, closedOn: null };
  return {
    received: [
      { ...base, id: "ex-in-1", direction: "received", status: "under_contract", statusWords: "Under contract", stage: "under_contract", kind: "buyer", area: "Draper", other: "Kate Morgan", client: "The Ortegas", contactId: "ex-ortega", createdAt: ago(today, 9) },
      { ...base, id: "ex-in-2", direction: "received", status: "sent", statusWords: "Waiting for an answer", stage: "sent", kind: "seller", area: "Sandy", other: "Jill Parker", client: "Sam", contactId: null, createdAt: ago(today, 2), expiresAt: ago(today, -5) },
    ],
    sent: [{ ...base, id: "ex-out-1", direction: "sent", status: "accepted", statusWords: "Accepted", stage: "accepted", kind: "buyer", area: "Boise", other: "Ryan Shaw", client: "The Hales", contactId: "ex-hale", createdAt: ago(today, 50) }],
  };
}
export const demoAgents = [
  { name: "Kate Morgan", where: "St. George, UT" },
  { name: "Ryan Shaw", where: "Boise, ID" },
  { name: "Jill Parker", where: "Phoenix, AZ" },
];
