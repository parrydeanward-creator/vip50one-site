import type { GraphEdge, GraphNode, NodeStatus } from "./graph/types.ts";

// Team and War room show the people and the leads (walker 0321; Parry, 17 Oct: "teams and war room are super vague";
// "yes"). For a team's owner and admins only: ONE MOVE answers everyone else with a 403, and then nothing here shows
// (an agent still sees only their own place on the Scoreboard). Read with the lead's own session; nothing is ever sent
// to a lead or an agent from here. Call, Text and Nudge open the lead's own phone.

const MOVE_URL = "https://move.vip50one.com";
export const peopleUrl = `${MOVE_URL}/api/brain/team/people`;
export const war30Url = `${MOVE_URL}/api/brain/team/war-room`;
export const reassignUrl = `${MOVE_URL}/api/brain/team/war-room/reassign`;
export const rotationUrl = `${MOVE_URL}/api/brain/team/war-room/rotation`;

/** One face orb per team agent, under the Team orb. */
export const AGENT_PREFIX = "team-agent:";
export const agentNodeId = (id: string) => `${AGENT_PREFIX}${id}`;
export const agentIdOf = (nodeId: string) => (nodeId.startsWith(AGENT_PREFIX) ? nodeId.slice(AGENT_PREFIX.length) : null);
/** At most this many faces round the Team orb; the rest are in the Team panel's list. */
export const MAX_FACES = 24;

export type Standing = "on_track" | "behind" | "stalled";
export interface TeamPerson {
  id: string;
  first: string;
  photo: string | null;
  /** Only when ONE MOVE sends one (the route does not today): Call and Text need it. */
  phone: string | null;
  weekScore: number;
  standing: Standing;
  isNew: boolean;
  vipTouches: number;
  /** 0-1, or null when they set no commitments (then nothing is said). */
  kept: number | null;
  leadsHeld: number;
  avgReach: number | null;
  start: { done: number; total: number } | null;
}
export interface TeamPeople {
  team: string | null;
  people: TeamPerson[];
  example?: boolean;
}

export type SourceKey = "team_site" | "team_ads" | "growth" | "other";
export const SOURCE_WORDS: Record<SourceKey, string> = { team_site: "Team site", team_ads: "Team ads", growth: "ONE Growth", other: "Other" };
export interface WarAgent {
  id: string;
  first: string;
  leads: number;
  avgReach: number | null;
  late: number;
}
export interface LiveLead {
  contactId: string;
  first: string;
  source: string;
  holderId: string | null;
  holderFirst: string | null;
  at: string;
  reached: boolean;
  late: boolean;
}
export interface War30 {
  leadsIn: number;
  bySource: Record<SourceKey, number>;
  byAgent: WarAgent[];
  live: LiveLead[];
  rotationOn: boolean;
  pondCount: number;
  example?: boolean;
}

const str = (v: unknown, max = 60) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const https = (v: unknown) => {
  const s = str(v, 500);
  return s && s.startsWith("https://") ? s : null;
};
const STANDINGS: Standing[] = ["on_track", "behind", "stalled"];

/** ONE MOVE's `/api/brain/team/people`, checked; null when it is not one (a 403, or not live yet). */
export function readPeople(j: unknown): TeamPeople | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as { people?: unknown }).people)) return null;
  const r = j as Record<string, unknown>;
  const t = r.team as Record<string, unknown> | string | null;
  const team = typeof t === "string" ? str(t) : t && typeof t === "object" ? str(t.name) : null;
  const seen = new Set<string>();
  const people: TeamPerson[] = [];
  for (const x of r.people as Record<string, unknown>[]) {
    const id = str(x?.agent_id), first = str(x?.first_name, 30);
    if (!id || !first || seen.has(id)) continue;
    seen.add(id);
    const kept = numOrNull(x.commitments_kept);
    const gs = x.getting_started as Record<string, unknown> | null;
    const total = gs && typeof gs === "object" ? int(gs.total) : 0;
    const phone = str(x.phone, 30);
    people.push({
      id,
      first,
      photo: https(x.photo_url),
      phone: phone && /\d{7,}/.test(phone.replace(/\D/g, "")) ? phone : null,
      weekScore: int(x.week_score),
      standing: STANDINGS.includes(x.standing as Standing) ? (x.standing as Standing) : "on_track",
      isNew: x.new_30d === true,
      vipTouches: int(x.vip_touches),
      kept: kept == null ? null : Math.min(1, kept),
      leadsHeld: int(x.leads_held),
      avgReach: numOrNull(x.avg_reach_minutes) == null ? null : Math.round(x.avg_reach_minutes as number),
      start: total ? { done: Math.min(int(gs!.done), total), total } : null,
    });
  }
  return { team, people: sortPeople(people) };
}

const RANK: Record<Standing, number> = { stalled: 0, behind: 1, on_track: 2 };
/** Who needs the lead first: stalled, then behind, then on track; within each, the lower score first, then name. */
export const sortPeople = (ps: TeamPerson[]) => [...ps].sort((a, b) => RANK[a.standing] - RANK[b.standing] || a.weekScore - b.weekScore || a.first.localeCompare(b.first));

/** Follow the pulse: red stalled, yellow behind, a still green ring on track. */
export const standingStatus = (s: Standing): NodeStatus => (s === "stalled" ? "action" : s === "behind" ? "attention" : "healthy");
export const STANDING_COLOUR: Record<Standing, string> = { stalled: "#ff5a6a", behind: "#f5c542", on_track: "#7ee2a8" };
export const STANDING_WORDS: Record<Standing, string> = { stalled: "Stalled", behind: "Behind", on_track: "On track" };

/** What rolls up to the Team orb from the faces: how many need the lead, and how soon; null when everyone is on track. */
export function peopleRollup(ps: TeamPerson[]): { count: number; level: "now" | "today" } | null {
  const red = ps.filter((p) => p.standing === "stalled").length;
  const yellow = ps.filter((p) => p.standing === "behind").length;
  if (!red && !yellow) return null;
  return { count: red + yellow, level: red ? "now" : "today" };
}

/** "5 agents: 1 stalled, 1 behind" */
export function peopleLine(ps: TeamPerson[]): string {
  if (!ps.length) return "No agents on the team yet";
  const red = ps.filter((p) => p.standing === "stalled").length;
  const yellow = ps.filter((p) => p.standing === "behind").length;
  const head = `${ps.length} ${ps.length === 1 ? "agent" : "agents"}`;
  const parts = [red ? `${red} stalled` : null, yellow ? `${yellow} behind` : null].filter(Boolean);
  return parts.length ? `${head}: ${parts.join(", ")}` : `${head}, all on track`;
}

/** Average time to reach a lead, in plain words: "12 min", "1 h 5 min", "2 days"; null as "none reached yet". */
export function reachWords(m: number | null): string {
  if (m == null) return "none reached yet";
  const v = Math.max(0, Math.round(m));
  if (v < 60) return `${v} min`;
  if (v < 1440) {
    const h = Math.floor(v / 60), r = v % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  }
  const d = Math.round(v / 1440);
  return `${d} ${d === 1 ? "day" : "days"}`;
}

/** Commitments kept as "80%", or null when they set none (then the panel says nothing). */
export const keptWords = (k: number | null) => (k == null ? null : `${Math.round(k * 100)}%`);

/** "Came in 6 min ago", "Came in 3 h ago", "Came in 2 days ago". */
export function cameIn(at: string, now: number): string {
  const m = Math.max(0, Math.round((now - Date.parse(at)) / 60000));
  if (m < 1) return "Came in just now";
  if (m < 60) return `Came in ${m} min ago`;
  if (m < 1440) return `Came in ${Math.floor(m / 60)} h ago`;
  const d = Math.floor(m / 1440);
  return `Came in ${d} ${d === 1 ? "day" : "days"} ago`;
}

/** The Nudge: a short note for the lead to send from their own phone. ONE sends nothing. */
export const nudgeText = (first: string) => `Hi ${first}, checking in on your week. Anything I can help with?`;
const digits = (p: string) => p.replace(/[^\d+]/g, "");
export const telHref = (p: string) => `tel:${digits(p)}`;
/** Opens the lead's own Messages with the note ready; null when there is no number (then the note is copied). */
export const smsHref = (p: string | null, body?: string) => (p ? `sms:${digits(p)}${body ? `?&body=${encodeURIComponent(body)}` : ""}` : null);

export const sourceWords = (s: string) => SOURCE_WORDS[s as SourceKey] ?? (s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) || "Other");

/** ONE MOVE's `/api/brain/team/war-room`, checked; null when it is not one (a 403, or not live yet). */
export function readWar30(j: unknown): War30 | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (typeof r.leads_in !== "number" && !Array.isArray(r.live) && !Array.isArray(r.by_agent)) return null;
  const s = (r.by_source ?? {}) as Record<string, unknown>;
  const byAgent: WarAgent[] = [];
  for (const x of Array.isArray(r.by_agent) ? (r.by_agent as Record<string, unknown>[]) : []) {
    const id = str(x?.agent_id), first = str(x?.first_name, 30);
    if (!id || !first) continue;
    const avg = numOrNull(x.avg_reach_minutes);
    byAgent.push({ id, first, leads: int(x.leads), avgReach: avg == null ? null : Math.round(avg), late: int(x.late) });
  }
  const live: LiveLead[] = [];
  for (const x of Array.isArray(r.live) ? (r.live as Record<string, unknown>[]) : []) {
    const contactId = str(x?.contact_id), at = typeof x?.at === "string" && !Number.isNaN(Date.parse(x.at)) ? x.at : null;
    if (!contactId || !at) continue;
    live.push({
      contactId,
      first: str(x.first_name, 30) ?? "New lead",
      source: str(x.source, 30) ?? "other",
      holderId: str(x.holder_id),
      holderFirst: str(x.holder_first, 30),
      at,
      reached: x.reached === true,
      late: x.late === true && x.reached !== true,
    });
  }
  live.sort((a, b) => Number(b.late) - Number(a.late) || b.at.localeCompare(a.at));
  byAgent.sort((a, b) => b.late - a.late || b.leads - a.leads || a.first.localeCompare(b.first));
  return {
    leadsIn: int(r.leads_in),
    bySource: { team_site: int(s.team_site), team_ads: int(s.team_ads), growth: int(s.growth), other: int(s.other) },
    byAgent,
    live: live.slice(0, 100),
    rotationOn: r.rotation_on === true,
    pondCount: int(r.pond_count),
    example: false,
  };
}

export const lateCount = (w: War30) => w.live.filter((l) => l.late).length;
/** The War room part's line from the 30-day answer. */
export function war30Line(w: War30): string {
  const late = lateCount(w);
  if (late) return `${late} not reached in time`;
  if (!w.leadsIn && !w.live.length) return "No team leads in the last 30 days";
  return `${w.leadsIn} ${w.leadsIn === 1 ? "lead" : "leads"} in 30 days`;
}
export const isEmptyWar = (w: War30) => !w.leadsIn && !w.live.length;

/** An example's name says so, everywhere it shows. */
export const exampleLabel = (name: string) => (name.endsWith("(example)") ? name : `${name} (example)`);

/** A name without its "(example)" mark, for the orb itself (its initials) and the Nudge's greeting. */
export const plainName = (name: string) => name.replace(/\s*\(example\)$/, "");

/** The face orbs round the Team orb, coloured by standing; red and yellow pulse and roll up to the Team orb. */
export function withAgentFaces<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, tp: TeamPeople | null, parent: string): G {
  const nodes = g.nodes.filter((n) => !n.id.startsWith(AGENT_PREFIX));
  const edges = g.edges.filter((e) => !e.target.startsWith(AGENT_PREFIX));
  if (!tp?.people.length || !nodes.some((n) => n.id === parent)) return { ...g, nodes, edges };
  tp.people.slice(0, MAX_FACES).forEach((p, i) => {
    const id = agentNodeId(p.id);
    nodes.push({
      id,
      type: "person",
      label: plainName(p.first),
      secondaryLabel: [tp.example ? "Example" : null, p.isNew ? "New" : null, `${p.weekScore} this week`, STANDING_WORDS[p.standing]].filter(Boolean).join(" · "),
      parentId: parent,
      product: "go",
      importance: 0.9 - i * 0.005,
      status: standingStatus(p.standing),
      image: p.photo ?? undefined,
      summary: `${p.first}'s week${tp.example ? " (an example)" : ""}: score, VIP touches, commitments, team leads and how fast they reach them.`,
    });
    edges.push({ id: `${parent}>${id}`, source: parent, target: id, relationshipType: p.standing === "on_track" ? "belongs_to" : "requires_action", strength: 1 });
  });
  return { ...g, nodes, edges };
}

/** The example team for the demo dashboard: 5 agents, one stalled, one behind, one new. Every name is labelled. */
export function demoPeople(): TeamPeople {
  const p = (agent_id: string, first: string, week_score: number, standing: Standing, extra: Record<string, unknown> = {}) => ({
    agent_id, first_name: exampleLabel(first), photo_url: null, week_score, standing, new_30d: false, vip_touches: 0, commitments_kept: null, leads_held: 0, avg_reach_minutes: null, getting_started: null, ...extra,
  });
  const out = readPeople({
    team: { name: "Example team" },
    people: [
      p("x1", "Jen", 112, "on_track", { vip_touches: 31, commitments_kept: 0.8, leads_held: 4, avg_reach_minutes: 6 }),
      p("x2", "Marcus", 104, "on_track", { vip_touches: 24, commitments_kept: 1, leads_held: 3, avg_reach_minutes: 11 }),
      p("x3", "Dave", 71, "behind", { vip_touches: 9, commitments_kept: 0.4, leads_held: 2, avg_reach_minutes: 38 }),
      p("x4", "Lisa", 12, "stalled", { vip_touches: 0, leads_held: 1, avg_reach_minutes: null }),
      p("x5", "Angelina", 46, "on_track", { new_30d: true, vip_touches: 6, commitments_kept: 0.6, leads_held: 0, getting_started: { done: 3, total: 12 } }),
    ],
  })!;
  return { ...out, example: true };
}

/** Example War room numbers: the demo, and the empty state's labelled example list (one lead late). */
export function exampleWar30(now: number): War30 {
  const ago = (min: number) => new Date(now - min * 60000).toISOString();
  const out = readWar30({
    leads_in: 14,
    by_source: { team_site: 6, team_ads: 5, growth: 2, other: 1 },
    by_agent: [
      { agent_id: "x1", first_name: exampleLabel("Jen"), leads: 5, avg_reach_minutes: 6, late: 0 },
      { agent_id: "x2", first_name: exampleLabel("Marcus"), leads: 4, avg_reach_minutes: 11, late: 0 },
      { agent_id: "x3", first_name: exampleLabel("Dave"), leads: 3, avg_reach_minutes: 38, late: 1 },
      { agent_id: "x4", first_name: exampleLabel("Lisa"), leads: 2, avg_reach_minutes: null, late: 1 },
    ],
    live: [
      { contact_id: "e1", first_name: exampleLabel("Kara"), source: "team_site", holder_id: "x4", holder_first: exampleLabel("Lisa"), at: ago(42), reached: false, late: true },
      { contact_id: "e2", first_name: exampleLabel("Ben"), source: "team_ads", holder_id: "x1", holder_first: exampleLabel("Jen"), at: ago(6), reached: false, late: false },
      { contact_id: "e3", first_name: exampleLabel("Mia"), source: "growth", holder_id: "x2", holder_first: exampleLabel("Marcus"), at: ago(190), reached: true, late: false },
      { contact_id: "e4", first_name: exampleLabel("Sam"), source: "team_site", holder_id: "x3", holder_first: exampleLabel("Dave"), at: ago(1500), reached: true, late: false },
    ],
    rotation_on: true,
    pond_count: 1,
  })!;
  return { ...out, example: true };
}

/** Plain words for a refused reassign (409 not_member, 404 not_found, or anything else). */
export function reassignError(status: number, body: unknown): string {
  const b = (body ?? {}) as Record<string, unknown>;
  const said = str(b.message, 200) ?? str(b.error, 200);
  if (said && /\s/.test(said)) return said;
  if (status === 409 || said === "not_member") return "That agent is not on the team any more. Pick someone else.";
  if (status === 404 || said === "not_found") return "That lead was not found. It may have been removed in ONE MOVE.";
  if (status === 403) return "Only the team lead and admins can reassign team leads.";
  return "That did not go through. Try again, or use Team leads in ONE MOVE.";
}
