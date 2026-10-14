import type { GraphNode, ProductKey } from "./graph/types.ts";

// One morning (CONNECTIONS gap 7, 14 Oct): the one thing in each product that needs the agent today, in one list, not
// five. Read from the graph the Brain already draws (each product's own `vip_summary` items), so the Brain and ONE GO's
// Morning Pulse say the same. Red (action) before yellow (attention); within those, the orb the products rank highest.

export interface ProductPick { product: ProductKey; productName: string; id: string; label: string; line: string | null; level: "action" | "attention" | "ok"; more: number }

const ORDER: ProductKey[] = ["go", "move", "marquee", "open", "showly"];
const NAME: Record<string, string> = { go: "ONE YOU", move: "ONE MOVE", marquee: "Marquee", open: "ONE Open", showly: "Showly" };
const RANK = { action: 0, attention: 1 } as const;

/** One row per product the agent has, in the usual order: the most urgent item (red before yellow, then the one that holds
 * the most people, then the products' own rank), the rest as a count; a product with nothing due is one quiet "all good"
 * line, so the agent knows it was checked (audit stage 2, Parry 14 Oct: "I am open to all of your ideas"). */
export function perProduct(nodes: readonly GraphNode[]): ProductPick[] {
  const parents = new Set(nodes.map((n) => n.parentId).filter((p): p is string => !!p));
  const has = new Set(nodes.filter((n) => n.type === "product" && !n.locked).map((n) => n.product));
  const due = new Map<ProductKey, GraphNode[]>();
  for (const n of nodes) {
    if (n.locked || parents.has(n.id) || n.type === "core" || n.type === "product") continue;
    if (n.status !== "action" && n.status !== "attention") continue;
    due.set(n.product, [...(due.get(n.product) ?? []), n]);
  }
  const weight = (n: GraphNode) => Math.max(1, n.needCount ?? n.dueContacts?.length ?? 0);
  const out: ProductPick[] = [];
  for (const p of ORDER) {
    const list = due.get(p);
    if (!list?.length) {
      if (has.has(p)) out.push({ product: p, productName: NAME[p] ?? p, id: p, label: "all good", line: null, level: "ok", more: 0 });
      continue;
    }
    list.sort((a, b) => RANK[a.status as "action" | "attention"] - RANK[b.status as "action" | "attention"] || weight(b) - weight(a) || (b.importance ?? 0) - (a.importance ?? 0));
    const n = list[0];
    out.push({ product: p, productName: NAME[p] ?? p, id: n.id, label: n.label, line: n.secondaryLabel ?? null, level: n.status as "action" | "attention", more: list.length - 1 });
  }
  return out;
}

/** One plain line per pick, for ONE GO: "Marquee: 2 pieces to approve". */
export const pickLine = (p: ProductPick) => `${p.productName}: ${p.label}${p.line ? `, ${p.line}` : ""}${p.more ? ` (+${p.more} more)` : ""}`.slice(0, 160);
