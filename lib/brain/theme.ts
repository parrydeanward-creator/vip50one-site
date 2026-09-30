import type { NodeStatus, ProductKey } from "../graph/types.ts";

// ONE-BRAIN.md §2. Product colour is for edges, rings, pulses and selection
// only; node bodies stay dark glass.
export const BG = 0x050816;
export const BG_2 = 0x070b18;
export const GLASS = 0x0c1328;
export const GOLD = 0xd4af37;
export const GOLD_LIGHT = 0xf5c542;
export const WHITE = 0xffffff;
export const GREY = 0xa9b0bd;

export const PRODUCT_COLOR: Record<ProductKey, number> = {
  one: 0xd4af37,
  go: 0xf2a93b, // warm amber
  move: 0x2fb7a3, // teal
  marquee: 0x4f7fe0, // blue
  showly: 0x9b6ce0, // purple
  open: 0xf06a5a, // coral
};

export const STATUS: Record<NodeStatus, { color: number; label: string }> = {
  healthy: { color: 0x3fbf7f, label: "Healthy" },
  attention: { color: 0xe5b83a, label: "Attention" },
  action: { color: 0xe4574a, label: "Action needed" },
  opportunity: { color: 0xf5c542, label: "Opportunity" },
};

export const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
