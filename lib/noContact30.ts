import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { CONTACTS_NODE } from "./moveMenu.ts";
import { readGroups, type Groups } from "./people.ts";

// "No contact 30 days" (Parry, 23 Oct): the fourth orb inside Contacts, after Contacts, Import and Clean Up. ONE MOVE
// sends it as a `gap` group in /api/brain/people/groups (vip50-web-crm#397); the orb shows that count, pulses yellow
// while anyone is waiting, and opens My Contacts with the list filtered to the group (never-touched first, then oldest
// last touch). An older ONE MOVE without the group gets no orb: no invented numbers.

export const NC30_KEY = "no_contact_30";
export const NC30_NODE = "move-p-contacts-nc30";
export const NC30_LABEL = "No contact 30 days";

/** The group's count from ONE MOVE's groups answer; null when ONE MOVE does not send it. */
export function noContact30Count(g: Groups | null): number | null {
  const x = g?.groups.find((y) => y.key === NC30_KEY);
  return x ? x.count : null;
}

/** Reads the groups answer into the count (for the Brain's own fetch). */
export const readNoContact30 = (j: unknown): number | null => noContact30Count(readGroups(j));

const people = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "person" : "people"}`;

/** Adds (or refreshes, or removes) the orb inside the Contacts parent orb. A map with no Contacts parent (the demo) is left alone. */
export function withNoContact30<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, count: number | null): G {
  const nodes = g.nodes.filter((x) => x.id !== NC30_NODE);
  const edges = g.edges.filter((e) => e.target !== NC30_NODE);
  if (count == null || !g.nodes.some((x) => x.id === CONTACTS_NODE)) return { ...g, nodes, edges };
  nodes.push({
    id: NC30_NODE,
    type: "feature",
    label: NC30_LABEL,
    secondaryLabel: count ? `${people(count)} to call` : "No one waiting",
    parentId: CONTACTS_NODE,
    product: "move",
    importance: 0.72,
    summary: count ? `${people(count)} you have not been in touch with for 30 days, never-touched first. Open it to call or text them.` : "Everyone has been in touch within 30 days.",
    status: count ? "attention" : undefined,
    needCount: count || undefined,
  });
  edges.push({ id: `${CONTACTS_NODE}>${NC30_NODE}`, source: CONTACTS_NODE, target: NC30_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}
