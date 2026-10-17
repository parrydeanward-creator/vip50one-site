import { productToolOrbs, toolId, type ToolProduct } from "../productTools.ts";
import type { Add } from "./go.ts";
import type { NodeStatus } from "./types.ts";

// The demo dashboard's tool orbs for Marquee, ONE Open and Showly (VIP-SUMMARY §3ai): the same adapters the live Brain
// uses, fed nothing, so every tool shows its product's labelled example. One row per product carries the demo's
// pulse, so the product orb's colour still leads somewhere (follow the pulse).
const DEMO_PULSE: Record<ToolProduct, { key: string; status: NodeStatus }> = {
  marquee: { key: "posts", status: "attention" },
  open: { key: "visitors", status: "attention" },
  showly: { key: "answers", status: "opportunity" },
};

// The demo agent's own two listings (invented, as everywhere in the demo), so Ask Pulse and the morning note's
// "Maple Ridge" still lead somewhere: they take the Listings tool's place of its example row.
const DEMO_HOMES = [
  { id: "marquee:listing:demo-maple", label: "1482 Maple Ridge Dr", sub: "Live · 5 to approve" },
  { id: "marquee:listing:demo-aspen", label: "88 Aspen Ct", sub: "Listing appointment Thu" },
];

export function addTools(add: Add, p: ToolProduct, today: string) {
  const pulse = DEMO_PULSE[p];
  productToolOrbs(p, null, today).forEach((t, ti) => {
    const homes = p === "marquee" && t.key === "listings";
    add({ id: t.id, type: "category", label: t.label, secondaryLabel: homes ? "2 homes" : t.sub, parentId: p, product: p, importance: 1.2 - ti * 0.01, summary: homes ? "Every listing's marketing in one place: live, under contract and recently closed, each with its campaign." : t.summary, stats: t.stats, href: t.href });
    if (homes) {
      DEMO_HOMES.forEach((h, j) => add({ id: h.id, type: "property", label: h.label, secondaryLabel: h.sub, parentId: t.id, product: p, importance: 0.95 - j * 0.03, summary: `${h.label}. ${h.sub}.`, href: t.href }));
      return;
    }
    t.rows.forEach((r, j) =>
      add({
        id: r.id,
        type: r.type ?? "feature",
        label: r.label,
        secondaryLabel: r.sub,
        parentId: t.id,
        product: p,
        importance: 0.9 - j * 0.03,
        status: t.id === toolId(p, pulse.key) && j === 0 ? pulse.status : undefined,
        summary: r.sub ? `${r.label}. ${r.sub}.` : r.label,
        href: r.href ?? t.href,
      }),
    );
  });
}
