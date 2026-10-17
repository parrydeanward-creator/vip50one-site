import { MOVE_URL } from "./host.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";

// VIP-SUMMARY §3ab (v1.65, 10 Oct; Pulse roadmap #24): past clients likely to move. ONE Property sets the level from
// property facts only (years since the last sale, listed and not sold, area turnover) and labels it "Suggested". The
// agent's own life-event notes show beside it and never raise it (family status is a protected class). Only the agent
// sees this; it is never sent to the contact or shown to a coach or team. No pulse: it is a nudge, not a deadline.

export const LIKELY_NODE = "move-likely";
export const moveLikelyUrl = `${MOVE_URL}/api/brain/move-likely`;
export const notUsefulUrl = `${MOVE_URL}/api/brain/move-likely/not-useful`;
/** ONE MOVE's coming list of real past clients who closed 5 or more years ago (404 until it ships: the example shows). */
export const pastClientsUrl = `${MOVE_URL}/api/brain/likely-to-move`;

export type Level = "high" | "medium" | "low";
export interface Person { contactId: string; name: string; level: Level | null; label: string; reasons: string[]; youNoted: { event: string; words: string | null; at: string }[] }
export interface MoveLikely { ready: boolean; notLinked: boolean; updatedAt: string | null; people: Person[]; lowCount: number; missingHome: { contactId: string; name: string }[] }

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const LEVELS: Level[] = ["high", "medium", "low"];
const RANK: Record<string, number> = { high: 0, medium: 1, none: 2, low: 3 };

/** Keep only well-formed parts; a wrong shape is refused (null: no orb). */
export function readMoveLikely(raw: unknown): MoveLikely | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.people)) return null;
  const people: Person[] = (r.people as unknown[]).flatMap((p) => {
    if (!p || typeof p !== "object") return [];
    const o = p as Record<string, unknown>;
    const contactId = str(o.contact_id, 80);
    const name = str(o.name, 120);
    if (!contactId || !name) return [];
    const level = LEVELS.includes(o.level as Level) ? (o.level as Level) : null;
    const reasons = Array.isArray(o.reasons) ? (o.reasons as unknown[]).map((x) => str(x, 120)).filter((x): x is string => !!x).slice(0, 5) : [];
    const youNoted = Array.isArray(o.you_noted)
      ? (o.you_noted as unknown[]).flatMap((x) => {
          if (!x || typeof x !== "object") return [];
          const e = str((x as Record<string, unknown>).event, 40);
          const at = str((x as Record<string, unknown>).at, 40);
          return e && at ? [{ event: e, words: str((x as Record<string, unknown>).words, 60), at }] : [];
        })
      : [];
    return [{ contactId, name, level, label: str(o.label, 30) ?? "Suggested", reasons, youNoted }];
  });
  people.sort((a, b) => RANK[a.level ?? "none"] - RANK[b.level ?? "none"] || a.name.localeCompare(b.name));
  const missingHome = Array.isArray(r.missing_home)
    ? (r.missing_home as unknown[]).flatMap((m) => {
        if (!m || typeof m !== "object") return [];
        const o = m as Record<string, unknown>;
        return str(o.contact_id, 80) && str(o.name, 120) ? [{ contactId: str(o.contact_id, 80)!, name: str(o.name, 120)! }] : [];
      })
    : [];
  const low = typeof r.low_count === "number" && Number.isFinite(r.low_count) ? Math.max(0, Math.round(r.low_count)) : 0;
  return { ready: r.ready === true, notLinked: r.not_linked === true, updatedAt: str(r.updated_at, 40), people, lowCount: low, missingHome };
}

/** "High", "Medium", "Low", or "No MLS history yet" when ONE Property has no record of the house. */
export const levelWord = (l: Level | null) => (l ? l[0].toUpperCase() + l.slice(1) : "No MLS history yet");

const EVENT_WORD: Record<string, string> = { baby: "new baby", wedding: "wedding", new_job: "new job", retirement: "retiring", empty_nest: "kids left home", new_home: "new home", loss: "a loss", hard_time: "a hard time" };
/** "you noted: new baby" from the agent's own notes (§3y); shown beside the level, never in it. ONE MOVE's words first. */
export const notedLine = (p: Person) => (p.youNoted.length ? `you noted: ${p.youNoted.map((n) => n.words?.toLowerCase() ?? EVENT_WORD[n.event] ?? n.event.replace(/_/g, " ")).join(", ")}` : null);

/** The level line: ONE MOVE sends the whole line ("High · Suggested"); an older answer sent only "Suggested". */
export function levelLine(p: Person): string {
  if (!p.level) return levelWord(null);
  return p.label.toLowerCase().startsWith(p.level) ? p.label : `${levelWord(p.level)} · ${p.label}`;
}

/** The touch: a check-in, never a pitch. */
export const touchLine = (p: Person) => `Check in with ${p.name.split(" ")[0]}: ask how the house is working for them now. No pitch.`;

/** People after "Not useful" (hidden 90 days by ONE MOVE), before it answers again. */
export const withoutPerson = (m: MoveLikely, contactId: string): MoveLikely => ({ ...m, people: m.people.filter((p) => p.contactId !== contactId) });

// Until the feed: one honest reason, never two (Parry, 17 Oct, via the ecosystem bot). With no MLS member id in My
// Profile, that is the reason, with a button to My Profile; once it is set, the reason is the UtahRealEstate.com feed.
export type Reason = { kind: "mls_missing" | "waiting_feed"; short: string; line: string };
export const MLS_MISSING: Reason = { kind: "mls_missing", short: "Add your MLS member id", line: "Your MLS member id is missing. Add it in My Profile and ONE can look at your past clients' homes." };
export const WAITING_FEED: Reason = { kind: "waiting_feed", short: "Waiting for the UtahRealEstate.com feed", line: "Waiting for the UtahRealEstate.com feed. Once it is live, ONE looks at your past clients' homes each week and shows who may be getting ready to move." };
/** ONE MOVE's own word for the reason (vip50-web-crm#293 `reason`). */
export type RouteReason = "no_mls_id" | "waiting_feed";
/**
 * The one reason. ONE MOVE's likely-to-move route says which when it answers (`reason`); before that, the missing
 * member id while My Profile shows it missing (or ONE Property says the MLS link is not set), else the feed.
 */
export const likelyReason = (mlsMissing: boolean | null, m: MoveLikely | null, route: RouteReason | null = null): Reason =>
  route === "no_mls_id" ? MLS_MISSING : route === "waiting_feed" ? WAITING_FEED : mlsMissing === true || (mlsMissing == null && m?.notLinked) ? MLS_MISSING : WAITING_FEED;
/** The list has real people to show (ONE Property answered for this agent). */
export const likelyReady = (m: MoveLikely | null): m is MoveLikely => !!m && m.ready;

/** Past clients who closed 5 or more years ago (ONE MOVE's coming route), until the feed rates their homes. */
export interface PastClient { contactId: string; firstName: string; years: number; closedOn: string | null; example?: boolean }
export function readPastClients(raw: unknown): PastClient[] | null {
  const list = raw && typeof raw === "object" ? (raw as { people?: unknown }).people : null;
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  const out: PastClient[] = [];
  for (const x of list as Record<string, unknown>[]) {
    const contactId = str(x?.contact_id, 80), firstName = str(x?.first_name, 60);
    const years = typeof x?.years === "number" && Number.isFinite(x.years) ? Math.floor(x.years) : null;
    if (!contactId || !firstName || years == null || years < 5 || seen.has(contactId)) continue;
    seen.add(contactId);
    out.push({ contactId, firstName, years, closedOn: str(x.closed_on, 10) });
  }
  return out.sort((a, b) => b.years - a.years || a.firstName.localeCompare(b.firstName));
}
/** ONE MOVE's whole answer: the one reason and its past clients (max 15, oldest purchase first). */
export interface PastClientsAnswer { reason: RouteReason | null; people: PastClient[] }
export function readPastClientsAnswer(raw: unknown): PastClientsAnswer | null {
  const people = readPastClients(raw);
  if (!people) return null;
  const r = (raw as { reason?: unknown }).reason;
  return { reason: r === "no_mls_id" || r === "waiting_feed" ? r : null, people: people.slice(0, 15) };
}
/** "Call them": ONE MOVE adds "Call <name>" to today's tasks, once a day per person (vip50-web-crm#293). */
export const callUrl = `${MOVE_URL}/api/brain/likely-to-move/call`;
export const callBody = (contactId: string) => ({ contact_id: contactId });
export const CALL_ADDED = "Added to today's tasks";

/** The one clearly labelled example shown until there are real people. */
export const EXAMPLE_PAST_CLIENT: PastClient = { contactId: "example", firstName: "Example", years: 7, closedOn: null, example: true };
export const pastClientLine = (p: PastClient) => (p.example ? `Example: bought ${p.years} years ago` : `Bought ${p.years} years ago`);

/**
 * The orb, one of the four parts of Opportunities (lib/opportunities.ts places it there). Always there while ONE MOVE is
 * in the package. With ONE Property's answer: a gold opportunity dot when someone is High; never a pulse. Before it:
 * the one honest reason (or the past clients ONE MOVE found, when its route sends them).
 */
export function withMoveLikelyNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, m: MoveLikely | null, o: { mlsMissing?: boolean | null; pastClients?: PastClient[] | null; routeReason?: RouteReason | null } = {}): G {
  const move = g.nodes.find((n) => n.id === "move");
  const nodes = g.nodes.filter((n) => n.id !== LIKELY_NODE);
  const edges = g.edges.filter((e) => e.target !== LIKELY_NODE);
  if (!move || move.locked) return { ...g, nodes, edges };
  const ready = likelyReady(m);
  const high = ready ? m.people.filter((p) => p.level === "high").length : 0;
  const medium = ready ? m.people.filter((p) => p.level === "medium").length : 0;
  const reason = likelyReason(o.mlsMissing ?? null, m, o.routeReason ?? null);
  const past = o.pastClients ?? [];
  nodes.push({
    id: LIKELY_NODE,
    type: "feature",
    label: "Likely to move",
    secondaryLabel: ready
      ? high || medium ? [high ? `${high} high` : null, medium ? `${medium} medium` : null].filter(Boolean).join(" · ") + " · past clients" : "No past clients flagged"
      : past.length ? `${past.length} past ${past.length === 1 ? "client" : "clients"} 5+ years` : reason.short,
    parentId: "move",
    product: "move",
    importance: ready && high ? 0.85 : 0.5,
    status: ready && high ? "opportunity" : undefined,
    stats: ready && high + medium ? [{ label: "Likely to move", value: String(high + medium) }] : !ready && past.length ? [{ label: "Past clients 5+ years", value: String(past.length) }] : undefined,
    summary: ready
      ? "Past clients whose homes suggest a move may be coming, from the home's facts only. A nudge to check in; only you see it."
      : `${reason.line} Only you see it; nothing is sent.`,
  });
  edges.push({ id: `move>${LIKELY_NODE}`, source: "move", target: LIKELY_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** Before ONE MOVE answers (or when it cannot): nothing rated yet, so the view shows the one honest reason. */
export const emptyMoveLikely = (): MoveLikely => ({ ready: false, notLinked: false, updatedAt: null, people: [], lowCount: 0, missingHome: [] });

/** The example agent's past clients. */
export function demoMoveLikely(): MoveLikely {
  return readMoveLikely({
    ready: true,
    updated_at: "2026-10-06T08:00:00Z",
    people: [
      { contact_id: "r6", name: "Dave Ortiz", level: "high", label: "Suggested", reasons: ["owned 11 years", "area turnover high"], you_noted: [{ event: "empty_nest", at: "2026-09-10" }] },
      { contact_id: "r3", name: "Sara Lee", level: "medium", label: "Suggested", reasons: ["owned 8 years"], you_noted: [{ event: "wedding", at: "2026-09-20" }] },
      { contact_id: "r9", name: "Tom Becker", level: "high", label: "Suggested", reasons: ["listed and not sold in the last 2 years", "owned 6 years"], you_noted: [] },
      { contact_id: "r8", name: "Kim Nguyen", level: null, label: "Suggested", reasons: [], you_noted: [] },
    ],
    low_count: 14,
    missing_home: [{ contact_id: "r7", name: "Amy Chen" }],
  })!;
}
