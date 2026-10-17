import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { TEAM_NODE, teamLine, withTeamNode, type Team } from "./team.ts";
import { WAR_NODE, isManager, totals, warLine, withWarRoomNode, type WarRoom } from "./warroom.ts";
import { ONB_NODE, withOnboardingNodes, type OnbMember } from "./onboarding.ts";
import { AGENT_PREFIX, lateCount, peopleLine, war30Line, withAgentFaces, type TeamPeople, type War30 } from "./teamPeople.ts";

// One Team orb for team leads (Parry, 16 Oct 17:07 MT: "move to one team orb"; walker
// inbox/ecosystem/2026-10-16-2310-from-walker-one-team-orb.md). Shown only to a team's owner and admins; agents who are
// not leads never see it (their leaderboard is the Scoreboard's). It holds three parts, each a full side panel:
// Leaderboard (the week's ranking, full screen for the office TV), War room (team leads coming in, who has each, how
// fast) and Onboarding (each new member's Getting started list). The separate War room and Onboarding orbs left ONE YOU.
//
// Where it sits: its own orb on the main map, beside ONE YOU (it is the lead's job, not their personal plan). The main
// map then holds at most seven orbs round ONE (ONE YOU, Team, ONE MOVE, MARQUEE, SHOWLY, ONE OPEN, ONE GROWTH); the
// ring's radius is set by ONE's size, not the count, so seven fit with room at 1440x900 and 390 wide.

export const TEAM_HUB = "one-team";
/** The three parts, in this order. */
export const TEAM_PARTS = [TEAM_NODE, WAR_NODE, ONB_NODE] as const;

/** A team lead: an owner or admin of a team. Any one of ONE MOVE's lead-only answers says so (the war room's role, the
 * Onboarding board, which refuses everyone else, or a team site they manage). */
export function isTeamLead(war: WarRoom | null, onb: OnbMember[] | null, teamSites: number): boolean {
  return (!!war && isManager(war.team.role)) || onb !== null || teamSites > 0;
}

export interface HubInput {
  lead: boolean;
  team: Team | null;
  war: WarRoom | null;
  onb: OnbMember[] | null;
  removed?: string[];
  now: number;
  /** The team's agents as faces round the Team orb (lib/teamPeople.ts); null for anyone ONE MOVE refuses. */
  people?: TeamPeople | null;
  /** The War room's 30-day answer (lib/teamPeople.ts). */
  war30?: War30 | null;
}

const inHub = (id: string) => id === TEAM_HUB || id === TEAM_NODE || id === WAR_NODE || id === ONB_NODE || id.startsWith(`${ONB_NODE}:`) || id.startsWith(AGENT_PREFIX);

/** "Leaderboard · War room · Onboarding": the part's one line, never empty. */
export function partLines(h: HubInput): { leaderboard: string; war: string; onboarding: string } {
  const setting = h.onb?.length ?? 0;
  const red = h.onb?.filter((m) => m.urgency === "now").length ?? 0;
  return {
    leaderboard: h.team && h.team.agents.length ? teamLine(h.team) : "Waiting on this week's scores from ONE MOVE",
    war: h.war30 && !(h.war && totals(h.war, h.now).late) ? war30Line(h.war30) : h.war ? warLine(totals(h.war, h.now)) : "No team leads in the last 7 days",
    onboarding: setting ? `${setting} setting up${red ? `, ${red} with nothing done` : ""}` : "No one setting up right now",
  };
}

/**
 * The Team orb on the main map for a team lead, with its three parts; for anyone else none, and the parts are taken out
 * of ONE YOU wherever they were. Each part is always there for a lead (a plain line when ONE MOVE has nothing yet), so
 * no part is ever missing or empty. Red and yellow from the war room and the Onboarding board lift the Team orb.
 */
export function withTeamHub<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, h: HubInput): G {
  const base = { ...g, nodes: g.nodes.filter((n) => !inHub(n.id)), edges: g.edges.filter((e) => !inHub(e.target)) };
  const go = base.nodes.find((n) => n.id === "go");
  const root = base.nodes.find((n) => n.type === "core");
  if (!h.lead || !go || go.locked || !root) return base;
  const lines = partLines(h);
  base.nodes.push({
    id: TEAM_HUB,
    type: "product",
    label: "TEAM",
    secondaryLabel: h.people?.people.length ? peopleLine(h.people.people) : "Leaderboard, war room, onboarding",
    parentId: root.id,
    product: "go",
    // just under ONE YOU (0.95), so it sits beside it on the ring
    importance: 0.93,
    status: "healthy",
    summary: `${h.war?.team.name ?? "Your team"}: the week's leaderboard, the team leads coming in, and each new member's first days. For you as the team lead; your agents do not see this.`,
  });
  base.edges.push({ id: `${root.id}>${TEAM_HUB}`, source: root.id, target: TEAM_HUB, relationshipType: "belongs_to", strength: 1 });
  let out = withOnboardingNodes(withWarRoomNode(withTeamNode(base, h.team, TEAM_HUB), h.war, h.now, TEAM_HUB), h.onb, h.removed ?? [], TEAM_HUB);
  const ensure = (id: string, label: string, line: string, summary: string, importance: number) => {
    const have = out.nodes.find((n) => n.id === id);
    if (have) {
      out = { ...out, nodes: out.nodes.map((n) => (n.id === id ? { ...n, label, secondaryLabel: n.id === ONB_NODE || (n.id === WAR_NODE && h.war30) ? line : n.secondaryLabel, importance } : n)) };
      return;
    }
    out.nodes.push({ id, type: "feature", label, secondaryLabel: line, parentId: TEAM_HUB, product: "go", importance, status: "healthy", summary });
    out.edges.push({ id: `${TEAM_HUB}>${id}`, source: TEAM_HUB, target: id, relationshipType: "belongs_to", strength: 1 });
  };
  ensure(TEAM_NODE, "Leaderboard", lines.leaderboard, "The week's leaderboard, full screen for the office TV. Names, photos and weekly scores only.", 0.99);
  ensure(WAR_NODE, "War room", lines.war, WAR_SUMMARY, 0.98);
  if (h.war30) out = { ...out, nodes: out.nodes.map((n) => (n.id === WAR_NODE ? { ...n, summary: WAR_SUMMARY } : n)) };
  ensure(ONB_NODE, "Onboarding", lines.onboarding, "New team members in their first 30 days: their Getting started steps, and a Nudge for you to send from your phone.", 0.97);
  // A lead not reached in time on the 30-day answer turns the War room red, when the 7-day read has not already.
  const late = h.war30 ? lateCount(h.war30) : 0;
  if (late) out = { ...out, nodes: out.nodes.map((n) => (n.id === WAR_NODE && n.status !== "action" ? { ...n, secondaryLabel: lines.war, status: "action", needCount: late } : n)) };
  return withAgentFaces(out, h.people ?? null, TEAM_HUB);
}

const WAR_SUMMARY = "The team leads of the last 30 days: where they came from, who has each, who reached them and how fast. Reassign one here, or switch rotation. Nothing is sent to a lead from here.";

/** The side panel's words for how the Onboarding board pulses. */
export const ONB_RULE = "Yellow by day 3 and red by day 7 when nothing is done yet. The Nudge is for you to send from your own phone; ONE sends nothing.";
