import { MOVE_URL } from "./host.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";

// The broker's view (VIP-SUMMARY §3ao; ECOSYSTEM §7.1 ONE Brokerage). For a broker or an office manager: who is active,
// each office with its agents and teams, and the agents who need a word. Scores and counts only: no contact, note, goal
// amount or commitment text ever passes this checker. GO/MOVE serves `GET /api/brain/broker` (403 for anyone who is not a
// broker or office manager, 404 before it ships: the Broker orb is simply not drawn). Read only; the Nudge copies a note.

export const BROKER_NODE = "move-broker";
export const brokerUrl = () => `${MOVE_URL}/api/brain/broker`;
export const MAX_BROKER_AGENTS = 500;
const WAR_HOST = new URL(MOVE_URL).hostname;

export interface BrokerTeam {
  id: string;
  name: string;
  agents: number;
  avgScore: number;
  /** Only an https address on ONE MOVE's own host; null otherwise. */
  warRoomUrl: string | null;
}
export interface BrokerOffice {
  id: string;
  name: string;
  agents: number;
  active7d: number;
  avgScore: number;
  teams: BrokerTeam[];
}
export interface BrokerAgent {
  id: string;
  first: string;
  last: string;
  photo: string | null;
  officeId: string | null;
  teamId: string | null;
  score: number;
  last4: number[];
  lastActive: string | null;
  needsHelp: boolean;
}
export interface Broker {
  brokerage: { id: string; name: string; seatsUsed: number; seatsIncluded: number };
  weekStart: string | null;
  offices: BrokerOffice[];
  agents: BrokerAgent[];
  summary: { active7d: number; inactive14d: number; needsHelp: number; topOfficeId: string | null };
}

const str = (v: unknown, max = 60) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** A war room address is ONE MOVE's own: https, its host, no credentials or port. Anything else is dropped. */
export function cleanWarRoom(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 500) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.hostname !== WAR_HOST || u.username || u.password || u.port) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** A §3ao answer, checked; null when it is not one. Unknown fields never pass; offices and teams keep their ids so the
 * office scoping ONE MOVE applied is kept; agents are sorted by score (then name) and capped at 500. */
export function readBroker(j: unknown): Broker | null {
  const r = rec(j);
  const b = rec(r?.brokerage);
  if (!r || !b || !Array.isArray(r.offices) || !Array.isArray(r.agents)) return null;
  const bid = str(b.id), bname = str(b.name, 80);
  if (!bid || !bname) return null;

  const offices: BrokerOffice[] = [];
  const officeIds = new Set<string>();
  for (const o of r.offices) {
    const x = rec(o);
    const id = str(x?.id), name = str(x?.name, 60);
    if (!x || !id || !name || officeIds.has(id)) continue;
    officeIds.add(id);
    const teams: BrokerTeam[] = [];
    const teamIds = new Set<string>();
    for (const t of Array.isArray(x.teams) ? x.teams : []) {
      const y = rec(t);
      const tid = str(y?.id), tname = str(y?.name, 60);
      if (!y || !tid || !tname || teamIds.has(tid)) continue;
      teamIds.add(tid);
      teams.push({ id: tid, name: tname, agents: num(y.agents) ?? 0, avgScore: num(y.avg_score) ?? 0, warRoomUrl: cleanWarRoom(y.war_room_url) });
    }
    offices.push({ id, name, agents: num(x.agents) ?? 0, active7d: num(x.active_7d) ?? 0, avgScore: num(x.avg_score) ?? 0, teams });
  }

  const agents: BrokerAgent[] = [];
  const seen = new Set<string>();
  for (const a of r.agents) {
    const x = rec(a);
    const id = str(x?.user_id), first = str(x?.first_name, 30);
    if (!x || !id || !first || seen.has(id)) continue;
    seen.add(id);
    const oid = str(x.office_id), tid = str(x.team_id);
    agents.push({
      id,
      first,
      last: str(x.last_name, 30) ?? "",
      photo: str(x.photo_url, 500),
      // an agent in an office this answer does not carry (office managers see one) is not shown under any office
      officeId: oid && officeIds.has(oid) ? oid : null,
      teamId: tid,
      score: num(x.score) ?? 0,
      last4: (Array.isArray(x.last4) ? x.last4 : []).map(num).filter((n): n is number => n != null).slice(-4),
      lastActive: typeof x.last_active === "string" && !Number.isNaN(Date.parse(x.last_active)) ? x.last_active : null,
      needsHelp: x.needs_help === true,
    });
  }
  agents.sort((p, q) => q.score - p.score || p.first.localeCompare(q.first));

  const s = rec(r.summary);
  const top = str(s?.top_office_id);
  const wk = typeof r.week_start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.week_start) ? r.week_start : null;
  return {
    brokerage: { id: bid, name: bname, seatsUsed: num(b.seats_used) ?? 0, seatsIncluded: num(b.seats_included) ?? 0 },
    weekStart: wk,
    offices,
    agents: agents.slice(0, MAX_BROKER_AGENTS),
    summary: { active7d: num(s?.active_7d) ?? 0, inactive14d: num(s?.inactive_14d) ?? 0, needsHelp: num(s?.needs_help) ?? 0, topOfficeId: top && officeIds.has(top) ? top : null },
  };
}

export const agentName = (a: BrokerAgent) => (a.last ? `${a.first} ${a.last}` : a.first);
export const officeAgents = (b: Broker, officeId: string) => b.agents.filter((a) => a.officeId === officeId);
export const helpAgents = (b: Broker) => b.agents.filter((a) => a.needsHelp);
/** No sign-in for 14 days or more (or never), at `now`. The route counts them in `summary.inactive_14d`; this lists them. */
export const inactiveAgents = (b: Broker, now: number) =>
  b.agents.filter((a) => a.lastActive == null || now - Date.parse(a.lastActive) >= 14 * 86_400_000);
export const topOffice = (b: Broker) => b.offices.find((o) => o.id === b.summary.topOfficeId) ?? null;
export const nudgeNote = (first: string) => `Hi ${first}, checking in on your week. Anything I can help with?`;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** The one line the Morning Pulse says about the brokerage (no second route); null when there is nothing to say. */
export function brokerSummaryLine(b: Broker | null): string | null {
  if (!b || (!b.agents.length && !b.offices.length)) return null;
  const s = b.summary;
  const parts = [`${s.active7d} ${plural(s.active7d, "agent was", "agents were")} active in the last 7 days`];
  if (s.inactive14d) parts.push(`${s.inactive14d} ${plural(s.inactive14d, "has", "have")} been quiet for 14 days`);
  if (s.needsHelp) parts.push(`${s.needsHelp} ${plural(s.needsHelp, "needs", "need")} a word from you`);
  const top = topOffice(b);
  const tail = top ? ` ${top.name} leads the week.` : "";
  return `${b.brokerage.name}: ${parts.join(", ")}.${tail}`;
}

export function brokerLine(b: Broker): string {
  const s = b.summary;
  return s.needsHelp ? `${s.needsHelp} ${plural(s.needsHelp, "needs", "need")} help · ${s.active7d} active` : `${s.active7d} active this week`;
}

/** The Broker orb under ONE MOVE: only when the route answered (a broker or office manager). */
export function withBrokerNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, b: Broker | null, parent = "move"): G {
  const move = g.nodes.find((n) => n.id === parent);
  const nodes = g.nodes.filter((n) => n.id !== BROKER_NODE);
  const edges = g.edges.filter((e) => e.target !== BROKER_NODE);
  if (!move || move.locked || !b) return { ...g, nodes, edges };
  nodes.push({
    id: BROKER_NODE,
    type: "feature",
    label: "Broker",
    secondaryLabel: brokerLine(b),
    parentId: parent,
    product: "move",
    importance: b.summary.needsHelp ? 0.97 : 0.75,
    status: b.summary.needsHelp ? "attention" : "healthy",
    summary: "Your offices and agents: who is active, who has gone quiet, who needs a word. Scores and counts only.",
  });
  edges.push({ id: `${parent}>${BROKER_NODE}`, source: parent, target: BROKER_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** An example brokerage for the demo dashboard, in the route's own shape. */
export function demoBroker(weekStart: string, now: number): Broker {
  const ago = (d: number) => new Date(now - d * 86_400_000).toISOString();
  const ag = (id: string, first: string, last: string, office: string, team: string | null, score: number, last4: number[], days: number, help = false) => ({
    user_id: id, first_name: first, last_name: last, photo_url: null, office_id: office, team_id: team, score, last4, last_active: ago(days), needs_help: help,
  });
  return readBroker({
    brokerage: { id: "bk1", name: "Example Realty", seats_used: 37, seats_included: 50 },
    week_start: weekStart,
    offices: [
      { id: "o1", name: "Draper", agents: 5, active_7d: 4, avg_score: 78, teams: [{ id: "t1", name: "Luxury Agency", agents: 3, avg_score: 86, war_room_url: `${MOVE_URL}/team/war-room?team=t1` }] },
      { id: "o2", name: "Provo", agents: 3, active_7d: 2, avg_score: 55, teams: [] },
      { id: "o3", name: "St. George", agents: 2, active_7d: 1, avg_score: 40, teams: [{ id: "t2", name: "Red Rock Group", agents: 2, avg_score: 40, war_room_url: `${MOVE_URL}/team/war-room?team=t2` }] },
    ],
    agents: [
      ag("a1", "Julie", "S", "o1", "t1", 112, [96, 104, 108, 112], 0),
      ag("a2", "Travis", "M", "o1", "t1", 96, [88, 92, 95, 96], 1),
      ag("a3", "Angelina", "R", "o1", "t1", 84, [70, 75, 80, 84], 2),
      ag("a4", "Dave", "K", "o1", null, 62, [70, 66, 60, 62], 5),
      ag("a5", "Sherrie", "L", "o1", null, 36, [60, 48, 40, 36], 9, true),
      ag("a6", "Marcus", "T", "o2", null, 91, [80, 85, 88, 91], 1),
      ag("a7", "Amy", "P", "o2", null, 48, [70, 60, 52, 48], 6, true),
      ag("a8", "Kyle", "W", "o2", null, 26, [44, 30, 28, 26], 17, true),
      ag("a9", "Rachel", "D", "o3", "t2", 58, [66, 62, 60, 58], 3),
      ag("a10", "Lisa", "H", "o3", "t2", 22, [40, 31, 25, 22], 21, true),
    ],
    summary: { active_7d: 7, inactive_14d: 2, needs_help: 4, top_office_id: "o1" },
  })!;
}
