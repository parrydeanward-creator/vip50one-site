import type { GraphEdge, GraphNode } from "./graph/types.ts";

// New leads today (LOFTY-PARITY P9, vip50-web-crm#227): contacts that arrived on their own today (website, portal, ad,
// open house, the Lofty sync), and whether the agent has touched each yet. From ONE MOVE's GET /api/brain/today.
// Red while any is untouched, a still green ring once every one is (follow the pulse). Deal deadlines from the same
// answer are already on the Deals orb (§3z), so only the leads are drawn here.

const MOVE_URL = "https://move.vip50one.com";
export const todayUrl = `${MOVE_URL}/api/brain/today`;
export const LEADS_NODE = "move-new-leads";

export interface NewLead { id: string; name: string; source: string | null; at: string | null; touched: boolean }
export interface NewLeads { today: string | null; count: number; untouched: number; people: NewLead[] }

const str = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** The answer's `new_leads`, checked; untouched first, then newest. Null when it is not one. */
export function readNewLeads(j: unknown): NewLeads | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const nl = r.new_leads as Record<string, unknown> | undefined;
  if (!nl || typeof nl !== "object" || !Array.isArray(nl.people)) return null;
  const seen = new Set<string>();
  const people: NewLead[] = [];
  for (const x of nl.people as Record<string, unknown>[]) {
    const id = str(x?.id), name = str(x?.name, 60);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    people.push({ id, name, source: str(x.source, 60), at: str(x.at, 40), touched: x.touched === true });
  }
  people.sort((a, b) => Number(a.touched) - Number(b.touched) || (b.at ?? "").localeCompare(a.at ?? ""));
  return { today: str(r.today, 10), count: people.length, untouched: people.filter((p) => !p.touched).length, people };
}

/** The orb under ONE MOVE with the people round it; gone on a day with no new leads. */
export function withNewLeadsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, l: NewLeads | null): G {
  const mine = (id: string) => id === LEADS_NODE || id.startsWith(`${LEADS_NODE}:`);
  const nodes = g.nodes.filter((n) => !mine(n.id));
  const edges = g.edges.filter((e) => !mine(e.target));
  const move = g.nodes.find((n) => n.id === "move");
  if (!move || move.locked || !l || !l.count) return { ...g, nodes, edges };
  nodes.push({
    id: LEADS_NODE,
    type: "feature",
    label: "New leads today",
    secondaryLabel: l.untouched ? `${l.untouched} of ${l.count} not reached yet` : `${l.count} today, all reached`,
    parentId: "move",
    product: "move",
    importance: l.untouched ? 1 : 0.8,
    status: l.untouched ? "action" : "healthy",
    needCount: l.untouched || undefined,
    summary: "People who came in today from your website, portals, ads or open houses. Red until you have reached each one.",
  });
  edges.push({ id: `move>${LEADS_NODE}`, source: "move", target: LEADS_NODE, relationshipType: "belongs_to", strength: 1 });
  l.people.slice(0, 15).forEach((p, i) => {
    const id = `${LEADS_NODE}:${p.id}`;
    nodes.push({
      id,
      type: "person",
      label: p.name,
      secondaryLabel: [p.source, p.touched ? "reached" : "not reached yet"].filter(Boolean).join(" · "),
      parentId: LEADS_NODE,
      product: "move",
      importance: 0.9 - i * 0.02,
      status: p.touched ? "healthy" : "action",
      contactId: p.id,
      summary: p.touched ? `${p.name} came in today${p.source ? ` from ${p.source}` : ""}. Reached.` : `${p.name} came in today${p.source ? ` from ${p.source}` : ""}. Reach them now.`,
    });
    edges.push({ id: `${LEADS_NODE}>${id}`, source: LEADS_NODE, target: id, relationshipType: "requires_action", strength: 1 });
  });
  return { ...g, nodes, edges };
}

export const demoNewLeads = (): NewLeads =>
  readNewLeads({
    today: "2026-10-14",
    new_leads: {
      people: [
        { id: "n1", name: "Ann Lee", source: "Website Property Valuation", at: "2026-10-14T15:10:00Z", touched: false },
        { id: "n2", name: "Raj Patel", source: "Zillow", at: "2026-10-14T14:20:00Z", touched: true },
      ],
    },
  })!;
