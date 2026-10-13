import type { GraphEdge, GraphNode } from "./graph/types.ts";

// "Hot on your website" (LOFTY-PARITY P3, vip50-web-crm#219): known visitors who came back to the agent's website
// (7 days), showed high interest (14 days: one home viewed 3+ times, 2+ saves, or a showing asked) or look like a
// seller (asked what their home is worth, 90 days). From ONE MOVE's `GET /api/brain/signals`. Read only: the orb points
// at the person; nothing is sent to anyone.

const MOVE_URL = "https://move.vip50one.com";
export const signalsUrl = `${MOVE_URL}/api/brain/signals`;
export const SIGNALS_NODE = "move-web-hot";
export const MAX_SHOWN = 12;

export interface WebSignal {
  contactId: string;
  name: string;
  words: string;
  cameBack: boolean;
  highInterest: boolean;
  likelySeller: boolean;
  at: string | null;
}

const str = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** ONE MOVE's answer, checked: one row per contact, strongest first (seller, then interest, then came back), newest first. */
export function readSignals(j: unknown): WebSignal[] | null {
  const list = j && typeof j === "object" ? (j as { signals?: unknown }).signals : null;
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  const out: WebSignal[] = [];
  for (const x of list as Record<string, unknown>[]) {
    const id = str(x?.contact_id), name = str(x?.name, 60);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const s = { contactId: id, name, words: str(x.words, 160) ?? "Active on your website", cameBack: x.came_back === true, highInterest: x.high_interest === true, likelySeller: x.likely_seller === true, at: str(x.at, 40) };
    if (!s.cameBack && !s.highInterest && !s.likelySeller) continue;
    out.push(s);
  }
  const rank = (s: WebSignal) => (s.likelySeller ? 0 : s.highInterest ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || (b.at ?? "").localeCompare(a.at ?? ""));
}

export const signalKind = (s: WebSignal) => (s.likelySeller ? "Likely seller" : s.highInterest ? "High interest" : "Came back");

/**
 * The orb under ONE MOVE with the people round it: yellow (attention today) while anyone is hot, gone when no one is.
 * Each person is their own orb with the contact link, so a tap brings them to the middle and "Go to" opens the contact.
 */
export function withSignalsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, list: WebSignal[] | null): G {
  const isMine = (id: string) => id === SIGNALS_NODE || id.startsWith(`${SIGNALS_NODE}:`);
  const nodes = g.nodes.filter((n) => !isMine(n.id));
  const edges = g.edges.filter((e) => !isMine(e.target));
  const move = g.nodes.find((n) => n.id === "move");
  if (!move || move.locked || !list?.length) return { ...g, nodes, edges };
  const sellers = list.filter((s) => s.likelySeller).length;
  nodes.push({
    id: SIGNALS_NODE,
    type: "feature",
    label: "Hot on your website",
    secondaryLabel: `${list.length} ${list.length === 1 ? "person" : "people"}${sellers ? ` · ${sellers} likely ${sellers === 1 ? "seller" : "sellers"}` : ""}`,
    parentId: "move",
    product: "move",
    importance: 0.97,
    status: "attention",
    needCount: list.length,
    summary: "People you know who came back to your website, looked hard at a home, or asked what theirs is worth. A reason to call; nothing is sent.",
  });
  edges.push({ id: `move>${SIGNALS_NODE}`, source: "move", target: SIGNALS_NODE, relationshipType: "belongs_to", strength: 1 });
  list.slice(0, MAX_SHOWN).forEach((s, i) => {
    const id = `${SIGNALS_NODE}:${s.contactId}`;
    nodes.push({
      id,
      type: "person",
      label: s.name,
      secondaryLabel: signalKind(s),
      parentId: SIGNALS_NODE,
      product: "move",
      importance: 0.9 - i * 0.02,
      status: "attention",
      contactId: s.contactId,
      summary: s.words,
    });
    edges.push({ id: `${SIGNALS_NODE}>${id}`, source: SIGNALS_NODE, target: id, relationshipType: "interested_in", strength: 1 });
  });
  return { ...g, nodes, edges };
}

/** The example agent's website signals. */
export const demoSignals = (): WebSignal[] =>
  readSignals({
    signals: [
      { contact_id: "r2", name: "Mike Torres", words: "Viewed 1420 E Maple Way 4 times this week and saved it", high_interest: true, came_back: true, at: "2026-10-13T15:00:00Z" },
      { contact_id: "r6", name: "Dave Ortiz", words: "Asked what his home is worth on your website (Oct 12)", likely_seller: true, at: "2026-10-12T19:00:00Z" },
      { contact_id: "r4", name: "Annie Park", words: "Came back to your website after 3 weeks away", came_back: true, at: "2026-10-13T02:00:00Z" },
    ],
  })!;
