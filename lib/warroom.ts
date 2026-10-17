import type { GraphEdge, GraphNode } from "./graph/types.ts";

// The team war room (PULSE-ROADMAP K22; VIP-SUMMARY §3ae). For a team's owner and admins: the team leads that came in,
// who has them, who has reached them and how fast, the lead pool and the routing log. It reads ONE MOVE's team routes
// with the owner's own session (§3ae.11); nothing is sent to a lead from here. Reassigning and claiming stay in ONE
// MOVE's Team leads page, one tap away.

const MOVE_URL = "https://move.vip50one.com";
export const WAR_NODE = "go-warroom";
export const leadsUrl = (days = 7) => `${MOVE_URL}/api/brain/team/leads?days=${days}`;
export const logUrl = () => `${MOVE_URL}/api/brain/team/log`;
export const teamDealsUrl = () => `${MOVE_URL}/api/brain/team/deals`;
/** ONE MOVE's Team Leads page, opened inside the Brain (moveMenu.ts TEAM_LEADS_PAGE), never the classic site. */
export const TEAM_LEADS_PATH = "/team-leads";
/** A lead not reached in this many minutes turns red: the team's next-up window (§3ae.3 default). */
export const SLOW_MINUTES = 15;

export type Role = "owner" | "admin" | "agent";

export interface WarLead {
  id: string;
  status: "assigned" | "pond";
  name: string;
  source: string | null;
  area: string | null;
  interest: string | null;
  arrivedAt: string;
  assignedTo: string | null;
  assignedName: string | null;
  contacted: boolean;
  minutes: number | null;
}
export interface WarMember {
  id: string;
  name: string;
  role: Role;
}
export interface WarLine {
  id: string;
  at: string;
  event: string;
  words: string;
  from: string | null;
  to: string | null;
}
/** A deal that began as a team lead (§3ae.14): under contract, or closed in the last 30 days. */
export interface WarDeal {
  id: string;
  agentId: string;
  agentName: string;
  client: string;
  side: string | null;
  status: "under_contract" | "closed";
  next: { label: string; on: string } | null;
}
export interface WarRoom {
  team: { slug: string; name: string; role: Role };
  leads: WarLead[];
  pond: WarLead[];
  members: WarMember[];
  log: WarLine[];
  deals: WarDeal[];
}

const str = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const iso = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);
const ROLES: Role[] = ["owner", "admin", "agent"];
export const isManager = (r: Role) => r === "owner" || r === "admin";

function readLead(x: unknown): WarLead | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = str(r.id), at = iso(r.arrived_at);
  if (!id || !at || (r.status !== "assigned" && r.status !== "pond")) return null;
  const m = typeof r.minutes_to_contact === "number" && Number.isFinite(r.minutes_to_contact) && r.minutes_to_contact >= 0 ? Math.round(r.minutes_to_contact) : null;
  return {
    id,
    status: r.status,
    name: str(r.name, 60) ?? "New lead",
    source: str(r.source, 60),
    area: str(r.area, 60),
    interest: str(r.interest, 20),
    arrivedAt: at,
    assignedTo: str(r.assigned_to),
    assignedName: str(r.assigned_name, 60),
    contacted: r.contacted === true,
    minutes: m,
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** ONE MOVE's `/api/brain/team/deals` answer (§3ae.14), checked; nearest deadline first, closed last. */
export function readTeamDeals(j: unknown): WarDeal[] {
  const list = j && typeof j === "object" && Array.isArray((j as Record<string, unknown>).deals) ? ((j as Record<string, unknown>).deals as unknown[]) : [];
  const out: WarDeal[] = [];
  for (const x of list) {
    const r = (x ?? {}) as Record<string, unknown>;
    const a = (r.agent ?? {}) as Record<string, unknown>;
    const id = str(r.id), agentId = str(a.user_id);
    if (!id || !agentId || (r.status !== "under_contract" && r.status !== "closed")) continue;
    const n = (r.next ?? null) as Record<string, unknown> | null;
    const next = n && str(n.label, 60) && typeof n.on === "string" && DAY.test(n.on) ? { label: str(n.label, 60)!, on: n.on } : null;
    out.push({ id, agentId, agentName: str(a.name, 60) ?? "Agent", client: str(r.client, 60) ?? "No name", side: str(r.side, 10), status: r.status, next: r.status === "closed" ? null : next });
  }
  const key = (d: WarDeal) => (d.status === "closed" ? "9" : d.next ? `0${d.next.on}` : "5");
  return out.sort((a, b) => key(a).localeCompare(key(b))).slice(0, 100);
}

/** A deal's deadline urgency: "today" when the next date is today or already here, else null. */
export const dealLevel = (d: WarDeal, today: string): "today" | null => (d.next && d.next.on <= today ? "today" : null);

/** ONE MOVE's `/api/brain/team/leads`, `/log` and `/deals` answers, checked; null when not on a team. */
export function readWarRoom(leadsJ: unknown, logJ: unknown, dealsJ: unknown = null): WarRoom | null {
  if (!leadsJ || typeof leadsJ !== "object") return null;
  const j = leadsJ as Record<string, unknown>;
  const t = j.team as Record<string, unknown> | null;
  if (!t || typeof t !== "object") return null;
  const slug = str(t.slug), name = str(t.name);
  const role = ROLES.includes(t.role as Role) ? (t.role as Role) : null;
  if (!slug || !name || !role) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v.map(readLead).filter((l): l is WarLead => !!l) : []);
  const byNew = (a: WarLead, b: WarLead) => b.arrivedAt.localeCompare(a.arrivedAt);
  const members = (Array.isArray(j.members) ? j.members : [])
    .map((m: unknown) => {
      const r = (m ?? {}) as Record<string, unknown>;
      const id = str(r.user_id), nm = str(r.name, 60);
      return id && nm ? { id, name: nm, role: ROLES.includes(r.role as Role) ? (r.role as Role) : "agent" } : null;
    })
    .filter((m): m is WarMember => !!m);
  const raw = logJ && typeof logJ === "object" && Array.isArray((logJ as Record<string, unknown>).log) ? ((logJ as Record<string, unknown>).log as unknown[]) : [];
  const log = raw
    .map((x) => {
      const r = (x ?? {}) as Record<string, unknown>;
      const at = iso(r.at), event = str(r.event, 30);
      if (!at || !event) return null;
      return { id: String(r.id ?? `${at}-${event}`), at, event, words: str(r.words, 80) ?? event, from: str(r.from, 60), to: str(r.to, 60) };
    })
    .filter((l): l is WarLine => !!l)
    .slice(0, 100);
  return { team: { slug, name, role }, leads: list(j.leads).sort(byNew), pond: list(j.pond).sort(byNew), members, log, deals: readTeamDeals(dealsJ) };
}

/** Minutes a lead has waited, from arrival to now. */
export const waited = (l: WarLead, now: number) => Math.max(0, Math.round((now - Date.parse(l.arrivedAt)) / 60000));

/** How urgent one lead is: "now" when not reached past the window, "today" while still inside it, null when reached. */
export function leadLevel(l: WarLead, now: number): "now" | "today" | null {
  if (l.status === "pond") return "today";
  if (l.contacted) return null;
  return waited(l, now) > SLOW_MINUTES ? "now" : "today";
}

/** The Mountain-time day of a moment, as YYYY-MM-DD. */
export const denverDay = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date(ms));

export interface AgentLine {
  id: string;
  name: string;
  leads: number;
  reached: number;
  waiting: number;
  late: number;
  /** Median minutes to first contact over the reached leads; null when none reached yet. */
  median: number | null;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2);
};

/** One line per agent who holds a team lead in the window, plus every member with none (so a quiet agent shows). */
export function agentLines(w: WarRoom, now: number): AgentLine[] {
  const out = new Map<string, AgentLine>();
  for (const m of w.members) out.set(m.id, { id: m.id, name: m.name, leads: 0, reached: 0, waiting: 0, late: 0, median: null });
  const mins = new Map<string, number[]>();
  for (const l of w.leads) {
    if (!l.assignedTo) continue;
    const a = out.get(l.assignedTo) ?? { id: l.assignedTo, name: l.assignedName ?? "Agent", leads: 0, reached: 0, waiting: 0, late: 0, median: null };
    a.leads++;
    if (l.contacted) {
      a.reached++;
      if (l.minutes != null) mins.set(a.id, [...(mins.get(a.id) ?? []), l.minutes]);
    } else {
      a.waiting++;
      if (leadLevel(l, now) === "now") a.late++;
    }
    out.set(a.id, a);
  }
  for (const a of out.values()) a.median = median(mins.get(a.id) ?? []);
  return [...out.values()].sort((a, b) => b.late - a.late || b.waiting - a.waiting || b.leads - a.leads || a.name.localeCompare(b.name));
}

export interface WarTotals {
  today: number;
  waiting: number;
  late: number;
  pond: number;
  reached: number;
  median: number | null;
  /** Deals under contract, and how many have a deadline today. */
  deals: number;
  dueToday: number;
}
export function totals(w: WarRoom, now: number): WarTotals {
  const day = denverDay(now);
  const all = [...w.leads, ...w.pond];
  const reached = w.leads.filter((l) => l.contacted);
  return {
    today: all.filter((l) => denverDay(Date.parse(l.arrivedAt)) === day).length,
    waiting: w.leads.filter((l) => !l.contacted).length,
    late: w.leads.filter((l) => leadLevel(l, now) === "now").length,
    pond: w.pond.length,
    reached: reached.length,
    median: median(reached.map((l) => l.minutes).filter((m): m is number => m != null)),
    deals: w.deals.filter((d) => d.status === "under_contract").length,
    dueToday: w.deals.filter((d) => dealLevel(d, day)).length,
  };
}

export const minutesWords = (m: number | null) => (m == null ? "not yet" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 6) / 10} h` : `${Math.round(m / 144) / 10} days`);

export function warLine(t: WarTotals): string {
  if (t.late) return `${t.late} not reached in ${SLOW_MINUTES} min`;
  if (t.waiting) return `${t.waiting} waiting to be reached`;
  if (t.pond) return `${t.pond} in the lead pool`;
  if (t.dueToday) return `${t.dueToday} deal ${t.dueToday === 1 ? "deadline" : "deadlines"} today`;
  return t.today ? `${t.today} today, all reached` : "All team leads reached";
}

/**
 * The war room orb under ONE YOU, for a team's owner and admins only. Red when a team lead has waited past the window,
 * yellow while one is waiting or sits in the pool, a still green ring when every lead is reached (follow the pulse).
 */
export function withWarRoomNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, w: WarRoom | null, now: number, parent = "go"): G {
  const go = g.nodes.find((n) => n.id === parent);
  const nodes = g.nodes.filter((n) => n.id !== WAR_NODE);
  const edges = g.edges.filter((e) => e.target !== WAR_NODE);
  if (!go || go.locked || !w || !isManager(w.team.role)) return { ...g, nodes, edges };
  const t = totals(w, now);
  const need = t.waiting + t.pond + t.dueToday;
  nodes.push({
    id: WAR_NODE,
    type: "feature",
    label: "War room",
    secondaryLabel: warLine(t),
    parentId: parent,
    product: "go",
    importance: t.late ? 1 : need ? 0.97 : 0.85,
    status: t.late ? "action" : need ? "attention" : "healthy",
    needCount: need || undefined,
    summary: `${w.team.name}: the team leads that came in, who has them, who reached them and how fast. Reassign in ONE MOVE's Team leads. Nothing is sent to a lead from here.`,
  });
  edges.push({ id: `${parent}>${WAR_NODE}`, source: parent, target: WAR_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** Example war room for the demo dashboard: one lead late, one waiting inside the window, one in the pool. */
export function demoWarRoom(now: number): WarRoom {
  const ago = (min: number) => new Date(now - min * 60000).toISOString();
  const lead = (id: string, name: string, min: number, to: [string, string] | null, reachedIn: number | null, source = "Team website", area = "Draper", interest = "buy") => ({
    id, status: to ? "assigned" : "pond", name, source, area, interest, arrived_at: ago(min),
    assigned_to: to?.[0] ?? null, assigned_name: to?.[1] ?? null, contacted: reachedIn != null, minutes_to_contact: reachedIn,
  });
  return readWarRoom(
    {
      team: { slug: "luxury-agency", name: "The Luxury Agency", role: "owner" },
      leads: [
        lead("w1", "Kara Lund", 42, ["a1", "Rachel"], null, "Team website", "Holladay", "sell"),
        lead("w2", "Ben Ortiz", 6, ["a2", "Kyle"], null, "Facebook ad", "Sandy"),
        lead("w3", "Mia Chen", 190, ["a1", "Rachel"], 4),
        lead("w4", "Sam Reyes", 400, ["a3", "Aaron"], 22, "Zillow", "South Jordan"),
        lead("w5", "Ivy Brooks", 1500, ["a2", "Kyle"], 9, "Open house", "Bountiful", "both"),
      ],
      pond: [lead("w6", "Noah Pike", 25, null, null, "Team website", "Herriman")],
      members: [
        { user_id: "a1", name: "Rachel", role: "admin" },
        { user_id: "a2", name: "Kyle", role: "agent" },
        { user_id: "a3", name: "Aaron", role: "admin" },
        { user_id: "a4", name: "Jen", role: "agent" },
      ],
    },
    {
      log: [
        { id: 1, at: ago(6), event: "assigned", words: "Assigned", to: "Kyle" },
        { id: 2, at: ago(25), event: "to_pond", words: "To the lead pool" },
        { id: 3, at: ago(42), event: "assigned", words: "Assigned", to: "Rachel" },
        { id: 4, at: ago(186), event: "contacted", words: "Contacted", to: "Rachel" },
      ],
    },
    {
      deals: [
        { id: "d1", agent: { user_id: "a3", name: "Aaron" }, client: "Sam Reyes", side: "buy", status: "under_contract", next: { label: "Due diligence", on: denverDay(now + 3 * 86_400_000) } },
        { id: "d2", agent: { user_id: "a1", name: "Rachel" }, client: "Lena Ford", side: "sell", status: "under_contract", next: { label: "Settlement", on: denverDay(now + 11 * 86_400_000) } },
        { id: "d3", agent: { user_id: "a2", name: "Kyle" }, client: "Omar Hale", side: "buy", status: "closed", next: null },
      ],
    },
  )!;
}
