import type { GraphNode } from "./graph/types.ts";
import type { Need } from "./needs.ts";

// A list row and its orb are one status (audit stage 2, 14 Oct: "Your business" showed a yellow dot for ONE YOU while its
// orb was red with 27). Both read the same needs (lib/needs.ts): red with the count if anything inside is red, yellow
// with the count when nothing is red but something needs the agent today, a still green ring when all is good.

export type RowKind = "now" | "today" | "ok" | "opportunity" | "none";
export interface RowState { kind: RowKind; count: number | null; label: string }

export function rowState(n: GraphNode, need: Need | undefined): RowState {
  if (n.locked) return { kind: "none", count: null, label: "" };
  if (need && need.count > 0) {
    return need.level === "now"
      ? { kind: "now", count: need.count, label: `${need.count} right now` }
      : { kind: "today", count: need.count, label: `${need.count} today` };
  }
  if (n.status === "opportunity") return { kind: "opportunity", count: null, label: "Opportunity" };
  if (n.status === "action" || n.status === "attention") {
    // A leaf the needs map did not count (no children): same colours, count of one.
    return n.status === "action" ? { kind: "now", count: 1, label: "Right now" } : { kind: "today", count: 1, label: "Today" };
  }
  return n.status || n.type === "product" || n.type === "category" ? { kind: "ok", count: null, label: "All good" } : { kind: "none", count: null, label: "" };
}

export const ROW_COLOR: Record<RowKind, string> = { now: "#e4574a", today: "#e5b83a", ok: "#3fbf7f", opportunity: "#f5c542", none: "transparent" };
