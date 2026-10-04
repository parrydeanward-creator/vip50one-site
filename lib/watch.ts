import type { BusinessGraph, GraphEdge, GraphNode, NodeStatus, ProductKey } from "./graph/types.ts";
import { radiusFor } from "./brain/layout.ts";
import type { Placed } from "./brain/layout.ts";

// Watch ONE Work (ONE-BRAIN.md §7): a 20-30 second story over the same
// engine. One person, Mark Davis, moves through all five products and ONE
// ends with the next thing to do. An example agent and invented people.
//
// Honesty rule (§7): show what exists, or label it as coming. The hand-offs
// between products (a visitor into ONE MOVE, ONE suggesting the call in ONE
// GO, a Showly reaction reaching ONE) wait on the event contract, so those
// steps carry `coming`.

export interface WatchStep {
  id: string;
  show: string[]; // nodes that appear at this step (they stay)
  focus: string[]; // what the camera frames
  flight?: [string, string]; // a light travels from -> to
  product: ProductKey; // caption colour
  kicker: string;
  title: string;
  line: string;
  coming?: boolean;
  clear?: boolean; // take away everything but ONE and the five products first
  n?: [number, number]; // "2 of 6" in the caption
  patch?: Record<string, { status?: NodeStatus; sub?: string }>; // nodes that change here (a task done)
  ms: number;
}

const PRODUCTS: [ProductKey, string, string][] = [
  ["go", "ONE GO", "Daily execution"],
  ["move", "ONE MOVE", "Relationship intelligence"],
  ["marquee", "MARQUEE", "Listing intelligence"],
  ["showly", "SHOWLY", "Buyer experience"],
  ["open", "ONE OPEN", "Open house intelligence"],
];

export function watchGraph(): BusinessGraph {
  const nodes: GraphNode[] = [
    { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
    ...PRODUCTS.map(([id, label, sub]): GraphNode => ({ id, type: "product", label, secondaryLabel: sub, parentId: "one", product: id, importance: 0.9 })),
    { id: "w-oh", type: "event", label: "Open house", secondaryLabel: "1482 Maple Ridge Dr", parentId: "open", product: "open", importance: 0.8 },
    { id: "w-mark-open", type: "person", label: "Mark Davis", secondaryLabel: "Signed in · marked Hot", parentId: "open", product: "open", importance: 0.8, status: "opportunity" },
    { id: "w-mark-move", type: "person", label: "Mark Davis", secondaryLabel: "Tagged: open house", parentId: "move", product: "move", importance: 0.8 },
    { id: "w-mark-go", type: "task", label: "Call Mark", secondaryLabel: "Suggested · you accept", parentId: "go", product: "go", importance: 0.8, status: "action" },
    { id: "w-mark-showly", type: "opportunity", label: "Mark's tour", secondaryLabel: "Answered on 3 homes", parentId: "showly", product: "showly", importance: 0.8, status: "opportunity" },
    { id: "w-willow", type: "property", label: "742 Willow Lane", secondaryLabel: "Mark said Yes", parentId: "showly", product: "showly", importance: 0.8, status: "opportunity" },
  ];
  const edges: GraphEdge[] = nodes
    .filter((n) => n.parentId)
    .map((n) => ({ id: `${n.parentId}>${n.id}`, source: n.parentId!, target: n.id, relationshipType: "belongs_to" as const, strength: 1 }));
  const link = (source: string, target: string, relationshipType: GraphEdge["relationshipType"]) =>
    edges.push({ id: `${source}~${target}`, source, target, relationshipType, strength: 0.8 });
  link("w-mark-open", "w-mark-move", "connected_to");
  link("w-mark-move", "w-mark-go", "requires_action");
  link("w-mark-move", "w-mark-showly", "connected_to");
  link("w-mark-showly", "w-willow", "interested_in");
  return { nodes, edges, rootId: "one" };
}

const P = ["go", "move", "marquee", "showly", "open"];

export const WATCH_STEPS: WatchStep[] = [
  { id: "intro", show: ["one", ...P], focus: ["one", ...P], product: "one", kicker: "Watch ONE Work", title: "One relationship. Five products.", line: "Follow one person through your business.", ms: 3000 },
  { id: "open", n: [1, 6], show: ["w-oh", "w-mark-open"], focus: ["open", "w-oh", "w-mark-open", "one"], flight: ["w-oh", "w-mark-open"], product: "open", kicker: "ONE Open", title: "Mark Davis signs in at your open house.", line: "1482 Maple Ridge Dr, Saturday. You mark him Hot.", ms: 3600 },
  { id: "move", n: [2, 6], show: ["w-mark-move"], focus: ["w-mark-open", "one", "w-mark-move"], flight: ["w-mark-open", "w-mark-move"], product: "move", kicker: "ONE MOVE", title: "Mark lands in ONE MOVE, tagged open house.", line: "Not in your VIP-50. You decide who goes there.", coming: true, ms: 3600 },
  { id: "go", n: [3, 6], show: ["w-mark-go"], focus: ["w-mark-move", "move", "go", "w-mark-go"], flight: ["w-mark-move", "w-mark-go"], product: "go", kicker: "ONE GO", title: "Pulse suggests a follow-up call. You accept it.", line: "Nothing is created until you say yes.", coming: true, ms: 3600 },
  { id: "showly", n: [4, 6], show: ["w-mark-showly"], focus: ["w-mark-move", "one", "w-mark-showly"], flight: ["w-mark-move", "w-mark-showly"], product: "showly", kicker: "Showly", title: "Mark tours homes with you and answers on each.", line: "Yes, Maybe or No on three homes from Tuesday's tour.", ms: 3400 },
  { id: "willow", n: [5, 6], show: ["w-willow"], focus: ["w-mark-showly", "showly", "w-willow"], flight: ["w-mark-showly", "w-willow"], product: "showly", kicker: "Showly", title: "He says Yes to 742 Willow Lane.", line: "And leaves you a note: \"Can we see it again Saturday?\"", ms: 3200 },
  { id: "one", n: [6, 6], show: [], focus: ["w-willow", "one", "w-mark-go"], flight: ["w-willow", "one"], product: "one", kicker: "ONE recommends", title: "Call Mark today about 742 Willow Lane.", line: "Why: he said Yes to it on Tuesday, you met him Saturday, and you have not called yet.", coming: true, ms: 4200 },
  { id: "outro", show: [], focus: ["one", ...P, "w-oh", "w-mark-move", "w-mark-go", "w-willow"], product: "one", kicker: "", title: "One relationship. Five products. One connected system.", line: "", ms: 3600 },
];

// Hand-placed positions (world units, ONE at 0,0): the five products on a
// ring as on the dashboard, each person or place just outside its product.
const polar = (deg: number, d: number) => ({ x: Math.cos((deg * Math.PI) / 180) * d, y: Math.sin((deg * Math.PI) / 180) * d });
export const SPOTS: Record<string, [number, number]> = {
  go: [-90, 290],
  move: [-18, 290],
  marquee: [54, 290],
  showly: [126, 290],
  open: [198, 290],
  "w-oh": [214, 480],
  "w-mark-open": [186, 500],
  "w-mark-move": [-22, 480],
  "w-mark-go": [-72, 470],
  "w-mark-showly": [112, 480],
  "w-willow": [140, 520],
};

export function watchPlaced(ids: Iterable<string>, g: BusinessGraph = watchGraph(), spots: Record<string, [number, number]> = SPOTS, center = "one"): Placed[] {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const out: Placed[] = [];
  for (const id of ids) {
    const n = byId.get(id);
    if (!n) continue;
    if (id === center) {
      out.push({ id, role: "focus", x: 0, y: 0, r: radiusFor(n.type, "focus") });
      continue;
    }
    const [deg, d] = spots[id];
    out.push({ id, role: "child", ...polar(deg, d), r: radiusFor(n.type, "child") });
  }
  return out;
}

// Everything on screen at step i: what earlier steps showed, since the last
// step that cleared the stage (ONE and the products always stay once shown).
export function shownAt(i: number, steps: WatchStep[] = WATCH_STEPS, keep: string[] = ["one", ...PRODUCT_IDS]): string[] {
  let out: string[] = [];
  for (const s of steps.slice(0, i + 1)) {
    if (s.clear) out = out.filter((id) => keep.includes(id));
    for (const id of s.show) if (!out.includes(id)) out.push(id);
  }
  return out;
}

// The graph as it stands at step i: every change earlier steps made (a task
// turning done) applied, never mutating the base graph.
export function graphAt(g: BusinessGraph, i: number, steps: WatchStep[] = WATCH_STEPS): BusinessGraph {
  const patch = new Map<string, { status?: NodeStatus; sub?: string }>();
  for (const s of steps.slice(0, i + 1)) for (const [id, p] of Object.entries(s.patch ?? {})) patch.set(id, { ...patch.get(id), ...p });
  if (!patch.size) return g;
  return {
    ...g,
    nodes: g.nodes.map((n) => {
      const p = patch.get(n.id);
      return p ? { ...n, status: p.status ?? n.status, secondaryLabel: p.sub ?? n.secondaryLabel } : n;
    }),
  };
}

export const PRODUCT_IDS = ["go", "move", "marquee", "showly", "open"];
export const totalMs = (steps: WatchStep[]) => steps.reduce((t, s) => t + s.ms, 0);
export const WATCH_MS = totalMs(WATCH_STEPS);
