import type { GraphNode, ProductKey } from "./graph/types.ts";

// One morning (CONNECTIONS gap 7, 14 Oct): the one thing in each product that needs the agent today, in one list, not
// five. Read from the graph the Brain already draws (each product's own `vip_summary` items), so the Brain and ONE GO's
// Morning Pulse say the same. Red (action) before yellow (attention); within those, the orb the products rank highest.

export interface ProductPick { product: ProductKey; productName: string; id: string; label: string; line: string | null; level: "action" | "attention" }

const ORDER: ProductKey[] = ["go", "move", "marquee", "open", "showly"];
const NAME: Record<string, string> = { go: "ONE YOU", move: "ONE MOVE", marquee: "Marquee", open: "ONE Open", showly: "Showly" };
const RANK = { action: 0, attention: 1 } as const;

/** At most one pick per product, in the products' usual order. Locked products and group orbs are left out. */
export function perProduct(nodes: readonly GraphNode[]): ProductPick[] {
  const parents = new Set(nodes.map((n) => n.parentId).filter((p): p is string => !!p));
  const best = new Map<ProductKey, GraphNode>();
  for (const n of nodes) {
    if (n.locked || parents.has(n.id) || n.type === "core" || n.type === "product") continue;
    if (n.status !== "action" && n.status !== "attention") continue;
    const cur = best.get(n.product);
    const better =
      !cur ||
      RANK[n.status] < RANK[cur.status as "action" | "attention"] ||
      (RANK[n.status] === RANK[cur.status as "action" | "attention"] && (n.importance ?? 0) > (cur.importance ?? 0));
    if (better) best.set(n.product, n);
  }
  return ORDER.filter((p) => best.has(p)).map((p) => {
    const n = best.get(p)!;
    return { product: p, productName: NAME[p] ?? p, id: n.id, label: n.label, line: n.secondaryLabel ?? null, level: n.status as "action" | "attention" };
  });
}

/** One plain line per pick, for ONE GO: "Marquee: 2 pieces to approve". */
export const pickLine = (p: ProductPick) => `${p.productName}: ${p.label}${p.line ? `, ${p.line}` : ""}`.slice(0, 160);
