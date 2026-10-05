import type { GraphNode } from "./graph/types.ts";

// Follow the pulse (Parry, 5 Oct): every orb with something the agent must do
// pulses, and so does every orb above it, carrying how many are inside, so the
// pulse leads from ONE MOVE to Contacts to the group to the person.
// Red ("now") is overdue or an alert: right now. Yellow ("today") needs
// attention today. Nothing else pulses; an orb with nothing to do wears a still
// green ring (scene.ts), and opportunities keep the small gold dot.

export type NeedLevel = "now" | "today";
export interface Need {
  count: number;
  level: NeedLevel;
}

const LEVEL: Partial<Record<NonNullable<GraphNode["status"]>, NeedLevel>> = { action: "now", attention: "today" };

/** What needs the agent, per node: the leaves that need doing, added up every orb above them. */
export function needsOf(nodes: readonly GraphNode[]): Map<string, Need> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hasKids = new Set<string>();
  for (const n of nodes) if (n.parentId && byId.has(n.parentId)) hasKids.add(n.parentId);
  const out = new Map<string, Need>();
  for (const n of nodes) {
    if (n.locked || hasKids.has(n.id) || n.type === "core" || n.type === "product") continue;
    const level = n.status ? LEVEL[n.status] : undefined;
    if (!level) continue;
    const weight = Math.max(1, n.dueContacts?.length ?? 0); // a page orb counts the people inside it
    const seen = new Set<string>();
    for (let id: string | null = n.id; id && byId.has(id) && !seen.has(id); id = byId.get(id)!.parentId) {
      seen.add(id);
      const cur = out.get(id);
      out.set(id, { count: (cur?.count ?? 0) + weight, level: cur?.level === "now" || level === "now" ? "now" : "today" });
    }
  }
  return out;
}

/** Plain words for screen readers and the card: "3 need you, 1 overdue". */
export function needWords(need: Need | undefined, leaf: boolean): string {
  if (!need) return "";
  if (leaf) return need.level === "now" ? "needs you now" : "needs you today";
  return `${need.count} ${need.count === 1 ? "needs" : "need"} you${need.level === "now" ? ", some overdue" : " today"}`;
}
