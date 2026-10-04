import type { GraphIndex } from "./graph/model.ts";
import { childrenOf } from "./graph/model.ts";
import type { GraphNode, NodeStatus } from "./graph/types.ts";

// What a ONE MOVE group's right panel leads with (Parry, 4 Oct): the people
// who need the agent now, the month's progress, what is coming up, one tip.
// Pure: built from the graph the Brain already has.

const RANK: Record<NodeStatus, number> = { action: 0, attention: 1, opportunity: 2, healthy: 3 };

/** Every live item under a node (people, tasks, homes), most urgent first. */
export function liveItemsUnder(ix: GraphIndex, id: string): GraphNode[] {
  const out: GraphNode[] = [];
  const walk = (pid: string) =>
    childrenOf(ix, pid).forEach((n) => {
      if (n.id.startsWith("live:")) out.push(n);
      walk(n.id);
    });
  walk(id);
  return out.sort(
    (a, b) =>
      RANK[a.status ?? "healthy"] - RANK[b.status ?? "healthy"] ||
      (a.timestamps?.due ?? "9999").localeCompare(b.timestamps?.due ?? "9999") ||
      b.importance - a.importance,
  );
}

/** "3 / 16" -> {value: 3, max: 16}; anything else -> null. */
export function meter(v: string | undefined): { value: number; max: number } | null {
  const m = v ? /^\s*(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(v) : null;
  if (!m) return null;
  const max = Number(m[2]);
  return max > 0 ? { value: Number(m[1]), max } : null;
}

/** Days left in the agent's month, today included. */
export function daysLeftInMonth(today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return last - d + 1;
}

/** One plain line: who to start with, and why. */
export function tipFor(items: GraphNode[]): string | null {
  const first = items[0];
  if (!first) return null;
  const why = first.recommendations?.[0]?.why?.[0] ?? first.secondaryLabel ?? "";
  return `Start with ${first.label.replace(/^(Call|Text|Video text|Email)\s+/i, "")}${why ? `: ${why.replace(/\.$/, "")}` : ""}.`;
}
