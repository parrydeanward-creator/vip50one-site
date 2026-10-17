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

// ---- Outreach and Events: each part's line, never a bare link (walker, 17 Oct 07:40 MT) ----------------------------
// On Parry's live account the Outreach and Events panels said "Nothing here needs you right now" above plain links:
// this panel looked only at live summary items ("live:" ids) and the menu's pages, never at the part orbs that carry
// each tool's line and pulse (lib/outreach.ts withParts). Now the part orbs lead the panel.

export interface PartRow {
  id: string;
  label: string;
  /** The part's line ("Not sent yet", "3 set up · 2 ready for the 1st"), or a plain stand-in until ONE MOVE answers. */
  line: string;
  status?: NodeStatus;
  lit: boolean;
}

/** The part orbs of an Outreach or Events group, in their ring order; [] for any other group. */
export function partRows(ix: GraphIndex, groupId: string, parts: readonly { ids: string[]; label: string }[]): PartRow[] {
  return parts.flatMap((p) => {
    const n = p.ids.map((id) => ix.byId.get(id)).find((x): x is GraphNode => !!x && x.parentId === groupId);
    if (!n) return [];
    const lit = n.status === "action" || n.status === "attention";
    return [{ id: n.id, label: n.label || p.label, line: n.secondaryLabel || "Open to see the numbers", status: n.status, lit }];
  });
}

/** The "Open" tiles for a group: a page already listed as a part is not repeated, and Outreach's "Overview" row is
 * Outreach itself, never a tile of its own. */
export function openTiles<P extends { path: string }>(pages: readonly P[], partPaths: ReadonlySet<string>): P[] {
  return pages.filter((pg) => pg.path !== "/outreach" && !partPaths.has(pg.path));
}
