import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { GROWTH_JOIN } from "./sales.ts";
import type { SiteNext } from "./siteEdit.ts";

// The Brain's ONE Growth orb (GROWTH.md §3, §5: "the Brain's Growth orb" is the ecosystem bot's; Parry, 16 Oct: "growth
// is not opening, have we even built it and added it to the dashboard as an orb"). A product orb beside the other five,
// its seven pieces round it in GROWTH.md §3's order, each with one plain line and one button that goes somewhere real.
// Without ONE Growth it shows locked, with the offer. Pure: the Brain runs the actions.

export const GROWTH_NODE = "growth";
export const GROWTH_PREFIX = `${GROWTH_NODE}:`;
export const isGrowthChild = (id: string) => id.startsWith(GROWTH_PREFIX);

export const GROWTH_LOCKED_LINE =
  "ONE Growth: ads, farm areas, landing pages and speed to lead. $499 a month, or $199 added to ONE Complete or Elite. Month to month.";
export const GROWTH_SUMMARY =
  "People you don't know yet: Pulse writes your ads, works your farm areas, builds landing pages and answers new leads in seconds. You approve everything; ad spend is yours, at cost.";

export type GrowthAction =
  | { kind: "site"; next: SiteNext; host?: string } // the signed-in site opener (ENTITLEMENT §6a), as the menu's site rows
  | { kind: "movePage"; path: string } // a ONE MOVE page, inside the Brain where it opens there
  | { kind: "profile"; tab: "pulse" | "connections" } // My Profile, on that tab
  | { kind: "likely" } // the Likely to move view
  | { kind: "join"; href: string }; // the ONE Growth checkout

export interface GrowthButton { label: string; note: string; action: GrowthAction }
export interface GrowthChild { id: string; key: string; label: string; line: string; button: GrowthButton | null }

export interface GrowthState {
  growth: boolean;
  /** The agent's own site from MASTER; null: none on record; undefined: not read yet (no site buttons until it is). */
  siteHost: string | null | undefined;
  /** Team sites the agent owns or admins (Ad requests on each). */
  teamHosts: string[];
  /** The Likely to move answer is in (its view can open). */
  likely: boolean;
}

const SITE_FIRST = "Your website comes first.";
const builder: GrowthButton = { label: "Edit my website", note: "Opens your website builder.", action: { kind: "site", next: "/builder" } };

/** The locked orb's one button: the ONE Growth checkout. */
export const GROWTH_JOIN_BUTTON: GrowthButton = { label: "Add ONE Growth", note: "Month to month. Ad spend is yours, at cost.", action: { kind: "join", href: GROWTH_JOIN } };

/** The pieces round the Growth orb for this agent, in order; none without ONE Growth (the orb is locked). */
export function growthChildren(s: GrowthState): GrowthChild[] {
  if (!s.growth) return [];
  const site = (key: string, label: string, line: string, next: SiteNext, open: string): GrowthChild => {
    const id = `${GROWTH_PREFIX}${key}`;
    if (s.siteHost === undefined) return { id, key, label, line, button: null };
    if (s.siteHost === null) return { id, key, label, line: `${SITE_FIRST} ${line}`, button: builder };
    return { id, key, label, line, button: { label: open, note: "Opens your website studio, signed in.", action: { kind: "site", next } } };
  };
  const out: GrowthChild[] = [
    site("ads", "Pulse Ads", "Ads Pulse writes for you, on your own Meta and Google accounts. You approve and publish.", "/ads", "Open Pulse Ads"),
    site("areas", "Farm areas", "Your chosen areas: area pages, ads and a monthly market note.", "/manage/areas", "Open my farm areas"),
    {
      id: `${GROWTH_PREFIX}landing`,
      key: "landing",
      label: "Landing pages",
      line: "Home value, buyer and seller guides, relocation.",
      button: { label: "Open Landing Pages", note: "Opens Landing Pages in ONE MOVE.", action: { kind: "movePage", path: "/landing-pages" } },
    },
    {
      id: `${GROWTH_PREFIX}speed`,
      key: "speed",
      label: "Speed to lead",
      line: "Pulse answers a new lead in seconds, in the mode you pick.",
      button: { label: "Choose Pulse's mode", note: "Opens My Profile, Pulse: Off, Ask me or Autopilot.", action: { kind: "profile", tab: "pulse" } },
    },
    s.likely
      ? {
          id: `${GROWTH_PREFIX}signals`,
          key: "signals",
          label: "Seller signals",
          line: "People who may sell soon, with the reasons. Suggestions for you only.",
          button: { label: "Open likely to move", note: "Who may move, why, and a check-in to send.", action: { kind: "likely" } },
        }
      : { id: `${GROWTH_PREFIX}signals`, key: "signals", label: "Seller signals", line: "Coming with the MLS feed.", button: null },
    {
      id: `${GROWTH_PREFIX}inbox`,
      key: "inbox",
      label: "Lead inbox",
      line: "Zillow, Realtor.com and Homes.com lead emails turned into contacts.",
      button: { label: "Open my lead inbox", note: "Your private lead-mail address, in My Profile, Connections.", action: { kind: "profile", tab: "connections" } },
    },
    site("results", "Results", "Spend, leads, appointments and closings by source.", "/manage/results", "Open results"),
  ];
  // Team owners and admins with a team site: the ads their agents asked for (as the menu's Ad requests row).
  const many = s.teamHosts.length > 1;
  for (const host of s.teamHosts) {
    out.push({
      id: `${GROWTH_PREFIX}adreq:${host}`,
      key: `adreq:${host}`,
      label: many ? `Ad requests · ${host.split(".")[0]}` : "Ad requests",
      line: "Ads your agents have asked you to run. Only you or an admin approves and publishes.",
      button: { label: "Open ad requests", note: "Opens your team site's studio, signed in.", action: { kind: "site", host, next: "/manage/ad-requests" } },
    });
  }
  return out;
}

/** The Growth orb and its pieces on the map; rebuilt on every call (nothing else touches these ids). */
export function withGrowthNodes<G extends { nodes: GraphNode[]; edges: GraphEdge[]; rootId: string }>(g: G, s: GrowthState | null): G {
  const mine = (id: string) => id === GROWTH_NODE || isGrowthChild(id);
  const nodes = g.nodes.filter((n) => !mine(n.id));
  const edges = g.edges.filter((e) => !mine(e.source) && !mine(e.target));
  if (!s || !nodes.some((n) => n.id === g.rootId)) return { ...g, nodes, edges };
  const base = { id: GROWTH_NODE, type: "product" as const, label: "ONE GROWTH", secondaryLabel: "New people, new business", parentId: g.rootId, product: "growth" as const, importance: 0.78 };
  nodes.push(s.growth ? { ...base, summary: GROWTH_SUMMARY } : { ...base, locked: true, summary: GROWTH_LOCKED_LINE });
  edges.push({ id: `${g.rootId}>${GROWTH_NODE}`, source: g.rootId, target: GROWTH_NODE, relationshipType: "belongs_to", strength: 1 });
  growthChildren(s).forEach((c, i) => {
    nodes.push({ id: c.id, type: "feature", label: c.label, parentId: GROWTH_NODE, product: "growth", importance: 0.9 - i * 0.01, summary: c.line });
    edges.push({ id: `${GROWTH_NODE}>${c.id}`, source: GROWTH_NODE, target: c.id, relationshipType: "belongs_to", strength: 1 });
  });
  return { ...g, nodes, edges };
}

/** What a demo or tour button says instead of calling a real endpoint (the example agent has no site or account). */
export function growthDemoNote(a: GrowthAction): string | null {
  if (a.kind === "site") return `Example agent: signed in, this opens your own website studio (${a.next}).`;
  if (a.kind === "movePage") return `Example agent: signed in, this opens ${a.path === "/landing-pages" ? "Landing Pages" : "that page"} in ONE MOVE.`;
  return null; // My Profile, Likely to move and the checkout link work on example data already
}

/** The line under a locked orb: Growth is never part of Complete (GROWTH.md §2), so it says how to add it. */
export function lockedLine(n: { id?: string; product?: string | null }): string {
  return n.id === GROWTH_NODE || n.product === "growth" ? "Add ONE Growth" : "Included in Complete";
}
