import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { cameInWords, clockTime, denverDay } from "./leadClock.ts";

// New leads today (LOFTY-PARITY P9, vip50-web-crm#227): contacts that arrived on their own today (website, portal, ad,
// open house, the Lofty sync), and whether the agent has touched each yet. From ONE MOVE's GET /api/brain/today.
// Red while any is untouched, a still green ring once every one is (follow the pulse). Deal deadlines from the same
// answer are already on the Deals orb (§3z), so only the leads are drawn here.

const MOVE_URL = "https://move.vip50one.com";
export const todayUrl = `${MOVE_URL}/api/brain/today`;
export const LEADS_NODE = "move-new-leads";

export const leadsOutcomeUrl = `${MOVE_URL}/api/brain/leads/outcome`;

export type LeadOutcome = "reached" | "left_message" | "no_answer";
export type RetryWhen = "later_today" | "tomorrow_morning";

export interface NewLead {
  id: string;
  /** "No name" when the source gave none. */
  name: string;
  firstName: string | null;
  nameMissing: boolean;
  source: string | null;
  at: string | null;
  /** Came in on today's (Denver) day; earlier ones stay on the list until reached. */
  today: boolean;
  touched: boolean;
  attempts: number;
  lastAttempt: { outcome: LeadOutcome; at: string } | null;
  followUpOn: string | null;
  /** Set in this session after Left a message / No answer, from the outcome route. */
  retryWhen?: RetryWhen | null;
}
/** `count` is today's leads; `untouched` everyone listed not reached yet. */
export interface NewLeads { today: string | null; count: number; untouched: number; people: NewLead[] }

const str = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isOutcome = (v: unknown): v is LeadOutcome => v === "reached" || v === "left_message" || v === "no_answer";
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);

/** The answer's `new_leads`, checked; not reached first, then newest. Null when it is not one. */
export function readNewLeads(j: unknown): NewLeads | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const nl = r.new_leads as Record<string, unknown> | undefined;
  if (!nl || typeof nl !== "object" || !Array.isArray(nl.people)) return null;
  const today = str(r.today, 10);
  const seen = new Set<string>();
  const people: NewLead[] = [];
  for (const x of nl.people as Record<string, unknown>[]) {
    const id = str(x?.id);
    if (!id || seen.has(id)) continue;
    const firstName = str(x.first_name, 40);
    const named = str(x.name, 60);
    const nameMissing = x.name_missing === true || !named || (named === "No name" && !firstName);
    if (!named && !nameMissing) continue;
    seen.add(id);
    const at = str(x.created_at, 40) ?? str(x.at, 40);
    const la = x.last_attempt as Record<string, unknown> | null | undefined;
    const laAt = la && typeof la === "object" ? str(la.at, 40) : null;
    people.push({
      id,
      name: nameMissing ? "No name" : named!,
      firstName: nameMissing ? null : firstName ?? named!.split(/\s+/)[0],
      nameMissing,
      source: str(x.source, 60),
      at,
      today: typeof x.today === "boolean" ? x.today : !!(today && at && dayIn(at) === today),
      touched: x.touched === true || x.reached === true,
      attempts: num(x.attempts) ?? 0,
      lastAttempt: la && isOutcome(la.outcome) && laAt ? { outcome: la.outcome, at: laAt } : null,
      followUpOn: str(x.follow_up_on, 10),
    });
  }
  people.sort((a, b) => Number(a.touched) - Number(b.touched) || (b.at ?? "").localeCompare(a.at ?? ""));
  return { today, count: num(nl.count) ?? people.filter((p) => p.today).length, untouched: people.filter((p) => !p.touched).length, people };
}

const dayIn = (iso: string) => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? denverDay(ms) : null;
};

export const NO_LEADS_LINE = "No new leads yet today. People who come in on their own (your website, portals, ads, open houses) land here; red until you reach each one.";

/**
 * The orb with the people round it: one of the four parts of Opportunities (lib/opportunities.ts places it there).
 * Always there while ONE MOVE is in the package (Parry, 17 Oct: the four parts of Opportunities): a still green ring
 * on a day with no new leads, just its name before ONE MOVE answers.
 */
export function withNewLeadsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, l: NewLeads | null, now: number = Date.now()): G {
  const mine = (id: string) => id === LEADS_NODE || id.startsWith(`${LEADS_NODE}:`);
  const nodes = g.nodes.filter((n) => !mine(n.id));
  const edges = g.edges.filter((e) => !mine(e.target));
  const move = g.nodes.find((n) => n.id === "move");
  if (!move || move.locked) return { ...g, nodes, edges };
  if (!l || !l.people.length) {
    nodes.push({ id: LEADS_NODE, type: "feature", label: "New leads today", secondaryLabel: l ? "None yet today" : undefined, parentId: "move", product: "move", importance: 0.8, status: l ? "healthy" : undefined, summary: NO_LEADS_LINE });
    edges.push({ id: `move>${LEADS_NODE}`, source: "move", target: LEADS_NODE, relationshipType: "belongs_to", strength: 1 });
    return { ...g, nodes, edges };
  }
  nodes.push({
    id: LEADS_NODE,
    type: "feature",
    label: "New leads today",
    secondaryLabel: l.untouched ? `${l.untouched} not reached yet · ${l.count} today` : `${l.count} today, all reached`,
    parentId: "move",
    product: "move",
    importance: l.untouched ? 1 : 0.8,
    status: l.untouched ? "action" : "healthy",
    needCount: l.untouched || undefined,
    summary: "People who came in from your website, portals, ads or open houses. Each one stays here, red, until you have reached them.",
  });
  edges.push({ id: `move>${LEADS_NODE}`, source: "move", target: LEADS_NODE, relationshipType: "belongs_to", strength: 1 });
  l.people.slice(0, 15).forEach((p, i) => {
    const id = `${LEADS_NODE}:${p.id}`;
    const clock = cameInWords(p.at, now);
    const from = p.source ? ` from ${p.source}` : "";
    nodes.push({
      id,
      type: "person",
      label: p.name,
      secondaryLabel: [clock, p.source, p.touched ? "reached" : "not reached yet"].filter(Boolean).join(" · "),
      parentId: LEADS_NODE,
      product: "move",
      importance: 0.9 - i * 0.02,
      status: p.touched ? "healthy" : "action",
      contactId: p.id,
      summary: `${clock ?? "Came in"}${from}. ${p.touched ? "Reached." : retryLine(p, now) ?? "Reach them now."}`,
    });
    edges.push({ id: `${LEADS_NODE}>${id}`, source: LEADS_NODE, target: id, relationshipType: "requires_action", strength: 1 });
  });
  return { ...g, nodes, edges };
}

// ---- the lead card (ecosystem 17 Oct) ---------------------------------------------------------------------------

/** The lead with this contact id, or null. */
export const leadOf = (l: NewLeads | null, contactId: string | null | undefined) => (l && contactId ? l.people.find((p) => p.id === contactId) ?? null : null);

/**
 * What the person card shows in place of the VIP boxes: "reach" (where they came from, Pulse's first text, Did you
 * reach them?) for a lead not reached yet, "sort" once reached and until sorted, "none" (the VIP boxes) otherwise.
 */
export function leadCardMode(lead: NewLead | null | undefined, sorted = false): "none" | "reach" | "sort" {
  if (!lead || sorted) return "none";
  return lead.touched ? "sort" : "reach";
}

export const OUTCOME_BUTTONS: { outcome: LeadOutcome; label: string }[] = [
  { outcome: "reached", label: "Reached" },
  { outcome: "left_message", label: "Left a message" },
  { outcome: "no_answer", label: "No answer" },
];
const OUTCOME_WORDS: Record<LeadOutcome, string> = { reached: "reached", left_message: "left a message", no_answer: "no answer" };

export const retryWords = (when: RetryWhen) => (when === "later_today" ? "Try again later today" : "Try again tomorrow morning");

/** "Try again later today" / "Try again tomorrow morning" after a try; null when there is none to show. */
export function retryLine(p: NewLead, now: number = Date.now()): string | null {
  if (p.touched) return null;
  if (p.retryWhen) return retryWords(p.retryWhen);
  if (!p.followUpOn || !p.lastAttempt) return null;
  const today = denverDay(now);
  if (p.followUpOn <= today) return retryWords("later_today");
  const tomorrow = denverDay(Date.parse(`${today}T12:00:00Z`) + 86_400_000);
  return p.followUpOn === tomorrow ? retryWords("tomorrow_morning") : `Try again on ${p.followUpOn}`;
}

/** "Last try: left a message, 2:10 pm · 2 tries"; null before the first. */
export function lastTryLine(p: NewLead, now: number = Date.now()): string | null {
  if (!p.lastAttempt) return null;
  const ms = Date.parse(p.lastAttempt.at);
  const when = Number.isFinite(ms) ? (denverDay(ms) === denverDay(now) ? clockTime(ms) : (cameInWords(p.lastAttempt.at, now) ?? "").replace(/^Came in /, "")) : null;
  const n = Math.max(p.attempts, 1);
  return `Last try: ${OUTCOME_WORDS[p.lastAttempt.outcome]}${when ? `, ${when}` : ""} · ${n} ${n === 1 ? "try" : "tries"}`;
}

/** The list after one outcome, at `nowIso`: Reached turns the lead green; the other two count a try. */
export function withOutcome(l: NewLeads, contactId: string, outcome: LeadOutcome, when: RetryWhen | null, nowIso: string): NewLeads {
  const people = l.people.map((p) => {
    if (p.id !== contactId) return p;
    if (outcome === "reached") return { ...p, touched: true, retryWhen: null };
    return { ...p, attempts: p.attempts + 1, lastAttempt: { outcome, at: nowIso }, retryWhen: when ?? p.retryWhen ?? null };
  });
  return { ...l, people, untouched: people.filter((p) => !p.touched).length };
}

export interface OutcomeResult { ok: boolean; when: RetryWhen | null; error: string | null }

/** POST the outcome. Nothing is sent to the lead; ONE MOVE logs the call (Reached) or the try and a follow-up task. */
export async function postOutcome(contactId: string, outcome: LeadOutcome, f: typeof fetch = fetch): Promise<OutcomeResult> {
  try {
    const r = await f(leadsOutcomeUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: contactId, outcome }) });
    const j = (await r.json().catch(() => null)) as { ok?: unknown; error?: unknown; follow_up?: { when?: unknown } } | null;
    if (!r.ok || !j || j.ok !== true) return { ok: false, when: null, error: str(j?.error, 200) ?? "ONE MOVE didn't take that. Nothing was changed." };
    const w = j.follow_up?.when;
    return { ok: true, when: w === "later_today" || w === "tomorrow_morning" ? w : null, error: null };
  } catch {
    return { ok: false, when: null, error: "ONE MOVE didn't answer. Nothing was changed." };
  }
}

/** Where they came from, in plain words: "Came in from Zillow". The page, home or message too, when sent. */
export function whereFrom(source: string | null, extra: (string | null | undefined)[] = []): string {
  const bits = [source ? `Came in from ${source}` : "Came in on their own"];
  for (const e of extra) {
    const t = (e ?? "").trim();
    if (t && !bits.some((b) => b.toLowerCase().includes(t.toLowerCase()))) bits.push(t);
  }
  return bits.join(" · ");
}

/**
 * Pulse's suggested first text: short and plain, from their first name and where they came from. It opens in the
 * phone's own Messages for the agent to send; ONE sends nothing.
 */
export function firstText(first: string | null, source: string | null, agentFirst?: string | null): string {
  const hi = first ? `Hi ${first}` : "Hi";
  const me = agentFirst ? `, this is ${agentFirst}` : "";
  const s = (source ?? "").toLowerCase();
  const why = /valuation|home value|what.?s my home/.test(s)
    ? "Thanks for asking about your home's value. I'll put the numbers together for you."
    : /open[\s-]?house/.test(s)
      ? "Thanks for stopping by the open house."
      : /tour|showing|showly/.test(s)
        ? "Thanks for asking about a showing."
        : /zillow|realtor|trulia|homes\.com|portal/.test(s)
          ? `Thanks for reaching out on ${source}.`
          : /website|site|room/.test(s)
            ? "Thanks for reaching out through my website."
            : /ad|facebook|google|campaign/.test(s)
              ? "Thanks for answering my ad."
              : "Thanks for reaching out.";
  return `${hi}${me}. ${why} When is a good time for a quick call?`;
}

export const demoNewLeads = (now: number = Date.now()): NewLeads => {
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  return readNewLeads({
    today: denverDay(now),
    new_leads: {
      count: 2,
      people: [
        { id: "n1", name: "Ann Lee", first_name: "Ann", source: "Website Property Valuation", created_at: ago(20), today: true, touched: false, attempts: 1, last_attempt: { outcome: "left_message", at: ago(5) }, follow_up_on: denverDay(now) },
        { id: "n2", name: "Raj Patel", first_name: "Raj", source: "Zillow", created_at: ago(95), today: true, touched: true },
      ],
    },
  })!;
};
