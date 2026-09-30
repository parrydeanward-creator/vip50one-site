import type { BusinessGraph, ChangeNote, GraphNode, ProductKey } from "./graph/types.ts";
import type { GraphIndex } from "./graph/model.ts";

// Live signals (BRAIN-HANDOFF.md feature 3): something new arrives in a
// product, a light travels from that product's orb into ONE and the number
// ticks. This file decides what changed and what the new numbers are; the
// scene only draws it.
//
// Demo today: a timer plays the examples below. Real: poll each product's
// `vip_summary` (VIP-SUMMARY.md) every few minutes and diff (diffSummaries).

export type SignalProduct = Exclude<ProductKey, "one">;

export interface Bump {
  nodeId: string;
  label?: string; // a stat on that node, by label
  sub?: boolean; // or the node's short descriptor ("4 new reactions")
  by: number;
}

export interface Signal {
  id: string;
  product: SignalProduct; // where it came from: the light starts at this orb
  nodeId: string; // what it is about ("Go to")
  what: string; // one line, facts only
  bumps: Bump[];
}

// Add `by` to the first number in a display value, keeping the rest:
// "4" -> "5", "14 / 26" -> "15 / 26", "1,284 contacts" -> "1,285 contacts".
// A value with no number is returned unchanged.
export function bumpValue(value: string, by: number): string {
  const m = /\d[\d,]*/.exec(value);
  if (!m) return value;
  const n = Number(m[0].replace(/,/g, "")) + by;
  const text = m[0].includes(",") || n >= 10000 ? Math.max(0, n).toLocaleString("en-US") : String(Math.max(0, n));
  return value.slice(0, m.index) + text + value.slice(m.index + m[0].length);
}

// The graph after a signal: numbers bumped, the change at the top of Since you
// were last here. Never mutates the graph it is given.
export function applySignal(g: BusinessGraph, s: Signal, at: string): BusinessGraph {
  const byNode = new Map<string, Bump[]>();
  for (const b of s.bumps) byNode.set(b.nodeId, [...(byNode.get(b.nodeId) ?? []), b]);
  const nodes = g.nodes.map((n): GraphNode => {
    const bs = byNode.get(n.id);
    if (!bs || n.locked) return n;
    let stats = n.stats;
    let secondaryLabel = n.secondaryLabel;
    for (const b of bs) {
      if (b.label && stats) stats = stats.map((st) => (st.label === b.label ? { ...st, value: bumpValue(st.value, b.by) } : st));
      if (b.sub && secondaryLabel) secondaryLabel = bumpValue(secondaryLabel, b.by);
    }
    return { ...n, stats, secondaryLabel };
  });
  const note: ChangeNote = { id: s.nodeId, product: s.product, what: s.what, at };
  return { ...g, nodes, changes: [note, ...(g.changes ?? [])] };
}

// Only signals the agent can see: their product is in the package, and every
// node they name exists.
export function usable(signals: Signal[], ix: GraphIndex): Signal[] {
  return signals.filter((s) => {
    const orb = ix.byId.get(s.product);
    return orb && !orb.locked && ix.byId.has(s.nodeId) && s.bumps.every((b) => ix.byId.has(b.nodeId));
  });
}

// Where the light starts: the product orb when it is on screen, else the
// nearest thing on screen on the way from the item up to ONE.
export function lightFrom(s: Signal, path: string[], visible: (id: string) => boolean): string | null {
  if (visible(s.product)) return s.product;
  for (const id of [...path].reverse()) if (id !== "one" && visible(id)) return id;
  return null;
}

// Demo examples (every name and address invented). One per product, in the
// order they play.
export const DEMO_SIGNALS: Signal[] = [
  {
    id: "sig-showly",
    product: "showly",
    nodeId: "showly-2",
    what: "The Parkers said Yes to 742 Willow Lane on today's tour.",
    bumps: [{ nodeId: "showly", label: "New answers", by: 1 }, { nodeId: "showly-2", sub: true, by: 1 }],
  },
  {
    id: "sig-move",
    product: "move",
    nodeId: "move-4",
    what: "New contact to sort from Saturday's open house (tagged: open house).",
    bumps: [{ nodeId: "move", label: "New to sort", by: 1 }, { nodeId: "move-4", sub: true, by: 1 }],
  },
  {
    id: "sig-go",
    product: "go",
    nodeId: "go-daily",
    what: "Call with Jen Alvarez logged in ONE GO: +1 point.",
    bumps: [
      { nodeId: "one", label: "Daily score", by: 1 },
      { nodeId: "one", label: "Weekly score", by: 1 },
      { nodeId: "go", label: "Daily score", by: 1 },
      { nodeId: "go", label: "Weekly score", by: 1 },
      { nodeId: "go-daily", label: "Points today", by: 1 },
      { nodeId: "go-daily", sub: true, by: 1 },
    ],
  },
  {
    id: "sig-marquee",
    product: "marquee",
    nodeId: "marquee-3",
    what: "2 more posts for 1482 Maple Ridge Dr are ready for your approval.",
    bumps: [{ nodeId: "marquee", label: "Waiting for approval", by: 2 }, { nodeId: "marquee-3", sub: true, by: 2 }],
  },
  {
    id: "sig-open",
    product: "open",
    nodeId: "open-3",
    what: "A visitor from Saturday's open house asked for the disclosures.",
    bumps: [{ nodeId: "open-3", sub: true, by: 1 }],
  },
];

// ---- real data: diff two vip_summary answers ------------------------------
// The shapes below are the parts of VIP-SUMMARY.md §2-3 this needs.

export interface SummaryItem {
  id: string;
  kind: string;
  title: string;
  detail?: string;
}

export interface SummaryStat {
  key: string;
  label: string;
  value: number;
  max?: number;
}

export interface Summary {
  product: SignalProduct;
  found: boolean;
  items: SummaryItem[];
  stats: SummaryStat[];
}

export interface SummaryDiff {
  arrived: SummaryItem[]; // items not in the last answer
  changed: { key: string; label: string; from: number; to: number }[];
}

// What is new between two answers from the same product. The first answer
// (prev null) is the starting point, not news.
export function diffSummaries(prev: Summary | null, next: Summary): SummaryDiff {
  if (!prev || !prev.found || !next.found) return { arrived: [], changed: [] };
  const seen = new Set(prev.items.map((i) => i.id));
  const before = new Map(prev.stats.map((s) => [s.key, s.value]));
  return {
    arrived: next.items.filter((i) => !seen.has(i.id)),
    changed: next.stats
      .filter((s) => before.has(s.key) && before.get(s.key) !== s.value)
      .map((s) => ({ key: s.key, label: s.label, from: before.get(s.key)!, to: s.value })),
  };
}
