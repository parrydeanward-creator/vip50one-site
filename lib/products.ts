import type { PackageId, ProductId } from "./types.ts";

export interface ProductInfo {
  id: ProductId;
  name: string;
  tagline: string; // one line, shown on a locked card
  href: string | null; // null: not reached by URL (GO is the phone app)
}

// Fixed order on the dashboard.
export const PRODUCTS: ProductInfo[] = [
  {
    id: "go",
    name: "GO",
    tagline: "Your VIP list and today's touches, on your phone.",
    href: null,
  },
  {
    id: "move",
    name: "MOVE",
    tagline: "Every contact, every follow-up, in one CRM.",
    href: "https://move.vip50one.com",
  },
  {
    id: "marquee",
    name: "Marquee",
    tagline: "Enter a listing once. Get the whole 60-day campaign.",
    href: "https://marquee.vip-50.com",
  },
  {
    id: "open",
    name: "ONE Open",
    tagline: "Run the open house from plan to follow-up.",
    href: "https://open.vip-50.com",
  },
  {
    id: "showly",
    name: "Showly",
    tagline: "Turn a buyer tour into a page they react to, house by house.",
    href: "https://showly.net",
  },
];

// ECOSYSTEM.md §7.1: Relationship = GO + MOVE; Complete and Elite = all five.
const INCLUDES: Record<PackageId, ProductId[]> = {
  relationship: ["go", "move"],
  complete: ["go", "move", "marquee", "open", "showly"],
  elite: ["go", "move", "marquee", "open", "showly"],
};

export function includes(pkg: PackageId, product: ProductId): boolean {
  return INCLUDES[pkg].includes(product);
}

export const PACKAGE_LABEL: Record<PackageId, string> = {
  relationship: "Relationship",
  complete: "Complete",
  elite: "Elite",
};

export function productName(id: ProductId): string {
  return PRODUCTS.find((p) => p.id === id)?.name ?? id;
}

// Where "Add with Complete" goes. The package checkout is being built by
// GO/MOVE (CHECKOUT.md); /upgrade is today's live upgrade path.
export const UPGRADE_URL = "/upgrade";
