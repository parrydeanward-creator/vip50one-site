import { MOVE_URL } from "./host.ts";

// "Who of mine fits this home" (VIP-SUMMARY §3aj, K18) in ONE Brain: on each listing orb's side panel, how many of the
// agent's own people the listing fits, and one tap to a call list. ONE MOVE answers the two routes below. Nothing here
// sends anything to anyone: the agent makes the calls.

export const fitsUrl = (listingId: string) => `${MOVE_URL}/api/brain/listings/fits?listing_id=${encodeURIComponent(listingId)}`;
export const fitsCallUrl = `${MOVE_URL}/api/brain/listings/fits/call`;

export const MAX_FITS = 15;
export const FITS_TITLE = "Who of mine fits";
export const NOT_LINKED_WORDS = "Matching starts when your MLS link is confirmed.";
export const WAITING_FEED_WORDS = "Matching starts when the MLS feed is on.";
export const NONE_WORDS = "None of your people fit this home yet.";
export const CALL_BUTTON = "Make my call list";
export const SAVING = "Saving...";
export const ADDED_WORDS = "Added to today's calls.";
export const CALL_FAILED = "Could not add the calls. Nothing was changed.";
export const NOTHING_SENT_LINE = "Nothing is sent to anyone. These are calls for you to make.";
export const DEMO_SUFFIX = "(Example: nothing was saved.)";

export type FitFrom = "need" | "site_search";
export interface FitPerson { contactId: string; firstName: string; why: string; from: FitFrom }
export type FitReason = "not_linked" | "waiting_feed";
export interface Fits { reason: FitReason | null; count: number; people: FitPerson[]; words?: string }

export const FROM_WORDS: Record<FitFrom, string> = { need: "your buyer need", site_search: "their saved search on your site" };

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
export const NOT_LINKED: Fits = { reason: "not_linked", count: 0, people: [] };

/** GET fits' answer, checked. Anything unreadable, or ok:false without a known reason, reads as not_linked. */
export function readFits(raw: unknown): Fits {
  if (!raw || typeof raw !== "object") return NOT_LINKED;
  const r = raw as Record<string, unknown>;
  const w = str(r.words, 300);
  const words = w ? { words: w } : {};
  if (r.ok !== true) return r.reason === "waiting_feed" ? { reason: "waiting_feed", count: 0, people: [], ...words } : { ...NOT_LINKED, ...words };
  if (r.reason === "not_linked" || r.reason === "waiting_feed") return { reason: r.reason, count: 0, people: [], ...words };
  const people: FitPerson[] = [];
  const seen = new Set<string>();
  for (const x of Array.isArray(r.people) ? r.people : []) {
    if (!x || typeof x !== "object") continue;
    const p = x as Record<string, unknown>;
    const contactId = str(p.contact_id, 100);
    const firstName = str(p.first_name, 60);
    const why = str(p.why, 160);
    if (!contactId || !firstName || !why || (p.from !== "need" && p.from !== "site_search") || seen.has(contactId)) continue;
    seen.add(contactId);
    people.push({ contactId, firstName, why, from: p.from });
    if (people.length === MAX_FITS) break;
  }
  const n = typeof r.count === "number" && Number.isFinite(r.count) ? Math.max(0, Math.floor(r.count)) : people.length;
  return { reason: null, count: people.length ? Math.max(n, people.length) : n, people };
}

/** The count line, or the reason's words. */
export function fitsLine(f: Fits): string {
  if (f.reason === "not_linked") return f.words ?? NOT_LINKED_WORDS;
  if (f.reason === "waiting_feed") return f.words ?? WAITING_FEED_WORDS;
  if (f.count <= 0) return NONE_WORDS;
  return f.count === 1 ? "1 of your people fits this home" : `${f.count} of your people fit this home`;
}

/** The button shows only when there are people to call and no reason. */
export const canMakeCalls = (f: Fits) => f.reason === null && f.count > 0 && f.people.length > 0;

/** The body for POST fits/call. */
export const fitsCallBody = (listingId: string, contactIds: string[], address: string | null = null) => ({
  listing_id: listingId,
  contact_ids: contactIds,
  ...(address && address.trim() ? { address: address.trim().slice(0, 200) } : {}),
});

export type CallAnswer = { ok: true; taskIds: string[] } | { ok: false; words: string };

/** POST fits/call's answer: the task ids, or ONE MOVE's own words (else plain ones). */
export function readCallAnswer(raw: unknown, httpOk = true): CallAnswer {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (httpOk && r.ok === true) {
    const ids = (Array.isArray(r.task_ids) ? r.task_ids : []).map((v) => str(v, 100)).filter((v): v is string => !!v);
    return { ok: true, taskIds: ids };
  }
  return { ok: false, words: str(r.words, 200) ?? str(r.error, 200) ?? CALL_FAILED };
}

/** The example agent: the Maple Ridge listing fits two people, the Aspen Ct listing none. */
export function demoFits(listingId: string): Fits {
  if (listingId === "demo-maple") {
    return {
      reason: null,
      count: 2,
      people: [
        { contactId: "demo-fit-jane", firstName: "Jane", why: "3 beds, Draper, under $600k", from: "need" },
        { contactId: "demo-fit-mike", firstName: "Mike", why: "4 beds, Sandy, yard mentioned", from: "site_search" },
      ],
    };
  }
  return { reason: null, count: 0, people: [] };
}
