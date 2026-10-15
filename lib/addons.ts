import { MOVE_URL } from "./host.ts";

// ONE Complete add-ons (CHECKOUT.md §2; ECOSYSTEM §7.1; vip50-web-crm#260, merged by Parry 15 Oct). ONE MOVE owns the
// prices and the purchase; the Brain only lists them and hands the agent to Stripe Checkout (or adds to the plan, after
// ONE MOVE's own confirm words). Nothing is bought without the agent pressing Buy, and confirming where asked.

export const addonsUrl = `${MOVE_URL}/api/brain/addons`;
export const addonCheckoutUrl = `${MOVE_URL}/api/brain/addons/checkout`;

export interface Addon { key: string; name: string; blurb: string; priceWords: string; monthly: boolean; needs: "area" | "template" | null; joinsPlan: boolean; confirm: string | null }
export interface MyAddon { id: string; key: string; area: string | null; template: string | null; status: string; createdAt: string | null }
export interface Addons { canBuy: boolean; addons: Addon[]; mine: MyAddon[] }

const str = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function readAddons(j: unknown): Addons | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.addons)) return null;
  const addons: Addon[] = [];
  for (const x of r.addons as Record<string, unknown>[]) {
    const key = str(x?.key, 60), name = str(x?.name, 80), price = str(x?.price_words, 80);
    if (!key || !name || !price) continue;
    addons.push({
      key, name, blurb: str(x.blurb) ?? "", priceWords: price, monthly: x.monthly === true,
      needs: x.needs === "area" || x.needs === "template" ? x.needs : null, joinsPlan: x.joins_plan === true, confirm: str(x.confirm, 400),
    });
  }
  const mine: MyAddon[] = (Array.isArray(r.mine) ? (r.mine as Record<string, unknown>[]) : []).flatMap((m) => {
    const id = str(m?.id, 80), key = str(m?.addon_key, 60);
    return id && key ? [{ id, key, area: str(m.area, 120), template: str(m.template, 120), status: str(m.status, 40) ?? "active", createdAt: str(m.created_at, 40) }] : [];
  });
  return { canBuy: r.can_buy === true, addons, mine };
}

export type CheckoutResult = { kind: "url"; url: string } | { kind: "joined" } | { kind: "confirm"; confirm: string } | { kind: "error"; line: string };

/** The checkout answer: Stripe's page (only checkout.stripe.com), added to the plan, ask first, or plain words. */
export function readCheckout(status: number, j: unknown): CheckoutResult {
  const r = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  if (r.ok === true && typeof r.url === "string" && /^https:\/\/checkout\.stripe\.com\//.test(r.url)) return { kind: "url", url: r.url };
  if (r.ok === true && r.joined === true) return { kind: "joined" };
  if (r.ok === false && r.needs_confirm === true && typeof r.confirm === "string") return { kind: "confirm", confirm: r.confirm.slice(0, 400) };
  return { kind: "error", line: str(r.error, 200) ?? (status === 0 ? "ONE MOVE could not be reached. Nothing was bought." : "That didn't go through. Nothing was bought.") };
}

export const nameOf = (a: Addons, key: string) => a.addons.find((x) => x.key === key)?.name ?? key.replace(/_/g, " ");
