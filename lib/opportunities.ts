import type { GraphEdge, GraphNode, NodeStatus } from "./graph/types.ts";
import { LEADS_NODE } from "./newLeads.ts";
import { DEMO_NTS_NODE, NTS_NODE } from "./newToSort.ts";
import { LOOKS_NODE } from "./looksHot.ts";
import { LIKELY_NODE } from "./moveLikely.ts";

// Opportunities (Parry, 17 Oct: "yes on regrouping them. and calling it Opportunities"). One orb on the ONE MOVE ring
// holding four parts, in this order: New leads today, New to Sort, Looks Hot (with Hot on your website inside it) and
// Likely to move. The four leave the ring as separate orbs; Follow-ups stays its own orb.
//
// Its colour is its most urgent part: an unreached new lead makes it red, someone to sort or someone who looks hot makes
// it yellow, and the pulse leads on down through the part to the person (follow the pulse, lib/needs.ts). Always shown,
// with a count line ("1 new lead · 3 to sort · 2 look hot"); all clear, a still green ring and a line saying what lands
// here. Opened, it comes to the middle with the four parts round it, and each part opens exactly as it did on the ring.

export const OPP_NODE = "move-opportunities";
export const isOpportunitiesOrb = (id: string) => id === OPP_NODE;
export const OPP_LABEL = "Opportunities";
export const ALL_CLEAR_LINE = "All clear. New leads, people to sort from your open houses, tours, website and listings, people who look hot and past clients likely to move land here.";
export const SUMMARY = "Everything new that could become business: today's new leads, new people to sort, people who look hot and past clients likely to move. The most urgent part sets the colour.";

/** The four parts, in Parry's order. New to Sort has the example agent's id too (lib/graph/move.ts). */
export const PART_IDS: readonly (readonly string[])[] = [[LEADS_NODE], [NTS_NODE, DEMO_NTS_NODE], [LOOKS_NODE], [LIKELY_NODE]];
export const PART_LABELS = ["New leads today", "New to Sort", "Looks Hot", "Likely to move"] as const;
const isPart = (id: string) => PART_IDS.some((ids) => ids.includes(id));

const RANK: Partial<Record<NodeStatus, number>> = { action: 0, attention: 1 };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const statNumber = (n: GraphNode | undefined) => {
  const v = n?.stats?.[0]?.value;
  return v && /^\d+$/.test(v) ? Number(v) : 0;
};

/** The count line, never empty: "1 new lead · 3 to sort · 2 look hot · 2 likely to move", or "All clear". */
export function oppLine(c: { leads: number; sort: number; hot: number; likely: number }): string {
  const bits = [
    c.leads ? plural(c.leads, "new lead", "new leads") : null,
    c.sort ? `${c.sort} to sort` : null,
    c.hot ? `${c.hot} ${c.hot === 1 ? "looks" : "look"} hot` : null,
    c.likely ? `${c.likely} likely to move` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "All clear";
}

/**
 * The Opportunities orb directly on ONE MOVE with the four parts moved inside it. Pure on the graph: it reads each
 * part's own status and count, so it can run after any of them changes. Nothing when ONE MOVE is locked.
 */
export function withOpportunities<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G): G {
  const move = g.nodes.find((n) => n.id === "move");
  const without = { nodes: g.nodes.filter((n) => n.id !== OPP_NODE), edges: g.edges.filter((e) => e.target !== OPP_NODE) };
  if (!move || move.locked) return { ...g, ...without };
  const byId = new Map(without.nodes.map((n) => [n.id, n]));
  const parts = PART_IDS.map((ids) => ids.map((id) => byId.get(id)).find(Boolean));
  const [leads, nts, looks, likely] = parts;
  const urgent = (n: GraphNode | undefined) => (n?.status ? RANK[n.status] : undefined);
  const ranks = parts.map(urgent).filter((r): r is number => r != null);
  const known = parts.some((p) => p?.status);
  const status: NodeStatus | undefined = ranks.length ? (Math.min(...ranks) === 0 ? "action" : "attention") : known ? "healthy" : undefined;
  const counts = { leads: leads?.needCount ?? 0, sort: nts?.needCount ?? 0, hot: looks?.needCount ?? 0, likely: statNumber(likely) };
  const line = oppLine(counts);
  const opp: GraphNode = {
    id: OPP_NODE,
    type: "category",
    label: OPP_LABEL,
    secondaryLabel: known ? line : undefined,
    parentId: "move",
    product: "move",
    importance: 0.995,
    status,
    summary: known && line === "All clear" ? ALL_CLEAR_LINE : SUMMARY,
  };
  const ids = new Set<string>();
  const nodes = without.nodes.map((n) => {
    if (!isPart(n.id) || (n.parentId !== "move" && n.parentId !== OPP_NODE)) return n;
    ids.add(n.id);
    const order = PART_IDS.findIndex((p) => p.includes(n.id));
    return { ...n, parentId: OPP_NODE, importance: 1 - order * 0.02 };
  });
  nodes.push(opp);
  const edges = without.edges.filter((e) => !ids.has(e.target) || (e.source !== "move" && e.source !== OPP_NODE));
  edges.push({ id: `move>${OPP_NODE}`, source: "move", target: OPP_NODE, relationshipType: "belongs_to", strength: 1 });
  for (const id of ids) edges.push({ id: `${OPP_NODE}>${id}`, source: OPP_NODE, target: id, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/**
 * The People menu keeps a link to each part (Parry, 17 Oct). New to Sort is a ONE MOVE page and already in People
 * (lib/moveMenu.ts); these three are orbs only, so their rows open the orb.
 */
export const PEOPLE_MENU_PARTS: { label: (typeof PART_LABELS)[number]; id: string }[] = [
  { label: "New leads today", id: LEADS_NODE },
  { label: "Looks Hot", id: LOOKS_NODE },
  { label: "Likely to move", id: LIKELY_NODE },
];
