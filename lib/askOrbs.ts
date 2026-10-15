import type { GraphEdge, GraphNode } from "./graph/types.ts";
import type { AskPerson } from "./ask.ts";

// Ask Pulse's people as orbs (Parry, 15 Oct: "who havent I called in 60 days ... it is supposed to be the vip-50 orbs
// with the ones that need a call"). While an answer is open, each person Pulse found is an orb on the map, pulsing
// yellow (they need you), with their reason under the name; tapping one opens their card. They leave with the answer.

export const ASK_PERSON = "ask-p:";

export function withAskPeople<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, people: AskPerson[] | null | undefined): G {
  const mine = (id: string) => id.startsWith(ASK_PERSON);
  const nodes = g.nodes.filter((n) => !mine(n.id));
  const edges = g.edges.filter((e) => !mine(e.target));
  const root = g.nodes.find((n) => n.type === "core");
  if (!root || !people?.length) return { ...g, nodes, edges };
  people.forEach((p, i) => {
    const id = `${ASK_PERSON}${p.contactId}`;
    nodes.push({
      id,
      type: "person",
      label: p.name,
      secondaryLabel: p.reasons[0] ?? undefined,
      parentId: root.id,
      product: "move",
      importance: 0.9 - i * 0.02,
      status: "attention",
      contactId: p.contactId,
      summary: p.reasons.join(" · ") || p.name,
    });
    edges.push({ id: `${root.id}>${id}`, source: root.id, target: id, relationshipType: "belongs_to", strength: 1 });
  });
  return { ...g, nodes, edges };
}

/** The orbs an answer shows: its people first, then what else it found. */
export const askOrbIds = (people: AskPerson[] | null | undefined, resultIds: string[]) => [...(people ?? []).map((p) => `${ASK_PERSON}${p.contactId}`), ...resultIds];
