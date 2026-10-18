import { MOVE_URL } from "./host.ts";

// K19 "Closings that log themselves", Brain side. ONE MOVE finds the agent's own closed MLS listings and offers each
// once (vip50-web-crm lib/mls-closings.ts). The agent logs it toward the goal or says it is not theirs. Nothing is
// logged unless the agent taps Log. No price is shown.

export const closingsFoundUrl = `${MOVE_URL}/api/brain/closings/found`;

export type FoundSide = "buy" | "sell" | "both";
export type FoundOffer = { listingId: string; closeDate: string; side: FoundSide; sidesWords: string; address: string | null };
/** linked: true = offers read; false = MLS link not confirmed; null = could not reach ONE MOVE. */
export type FoundState = { linked: boolean | null; offers: FoundOffer[] };

const WORDS: Record<FoundSide, string> = { buy: "Buyer side", sell: "Listing side", both: "Both sides" };

export const NOT_LINKED_LINE = "Closings from the MLS show here once your MLS link is confirmed.";
export const UNREACHABLE_LINE = "Could not reach the MLS just now.";
export const DEMO_NOTE = "(Example: nothing was saved.)";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-12" -> "12 Oct 2026"; anything else is shown as given. */
export function dateWords(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const mo = MONTHS[Number(m[2]) - 1];
  return mo ? `${Number(m[3])} ${mo} ${m[1]}` : iso;
}

/** Reads ONE MOVE's answer; junk becomes the "could not reach" state, bad offers are dropped, newest first. */
export function readFound(j: unknown): FoundState {
  const o = j as { linked?: unknown; offers?: unknown } | null;
  if (!o || typeof o !== "object") return { linked: null, offers: [] };
  if (o.linked === false) return { linked: false, offers: [] };
  if (o.linked !== true) return { linked: null, offers: [] };
  const seen = new Set<string>();
  const offers: FoundOffer[] = [];
  for (const r of Array.isArray(o.offers) ? o.offers : []) {
    const x = r as Record<string, unknown> | null;
    const id = x && typeof x.listing_id === "string" ? x.listing_id.trim() : "";
    const date = x && typeof x.close_date === "string" ? x.close_date.slice(0, 10) : "";
    if (!id || !date || seen.has(id)) continue;
    seen.add(id);
    const side: FoundSide = x!.side === "buy" || x!.side === "both" ? (x!.side as FoundSide) : "sell";
    const address = typeof x!.address === "string" && x!.address.trim() ? x!.address.trim() : null;
    offers.push({ listingId: id, closeDate: date, side, sidesWords: typeof x!.sides_words === "string" && x!.sides_words ? (x!.sides_words as string) : WORDS[side], address });
  }
  offers.sort((a, b) => b.closeDate.localeCompare(a.closeDate));
  return { linked: true, offers };
}

/** "Closed 12 Oct 2026 · Listing side · 12 Elm St". */
export function offerLine(o: FoundOffer): string {
  return ["Closed " + dateWords(o.closeDate), o.sidesWords, o.address ?? "Address not in the MLS record"].join(" · ");
}

/** The one line shown when there is nothing to list, or null when offers exist. */
export function foundNote(s: FoundState | null): string | null {
  if (!s) return null;
  if (s.linked === false) return NOT_LINKED_LINE;
  if (s.linked === null) return UNREACHABLE_LINE;
  return null;
}

/** The body of a POST; null for a bad action. */
export function actionBody(listingId: string, action: string): { listing_id: string; action: "log" | "dismiss" } | null {
  return listingId && (action === "log" || action === "dismiss") ? { listing_id: listingId, action } : null;
}

/** ok when ONE MOVE answered {ok:true}; otherwise the reason in plain words. */
export function readActionResult(j: unknown): { ok: true; already: boolean } | { ok: false; error: string } {
  const o = j as { ok?: unknown; already?: unknown; error?: unknown } | null;
  if (o && o.ok === true) return { ok: true, already: o.already === true };
  return { ok: false, error: o && typeof o.error === "string" && o.error ? o.error : "That didn't save. Try again." };
}

/** Two example offers for ?demo=1. */
export function demoFound(): FoundState {
  return {
    linked: true,
    offers: [
      { listingId: "demo-1", closeDate: "2026-10-09", side: "sell", sidesWords: WORDS.sell, address: "412 Maple Ridge Dr, Bountiful" },
      { listingId: "demo-2", closeDate: "2026-09-26", side: "buy", sidesWords: WORDS.buy, address: "88 Cedar Lane, Centerville" },
    ],
  };
}
