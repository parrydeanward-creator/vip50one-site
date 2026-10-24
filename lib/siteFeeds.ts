import { MOVE_URL } from "./host.ts";
import { SITE_SETUP_URL } from "./cma.ts";

// SITE-FEEDS K16 and K17 and MY-HOME v0.2 in ONE Brain (the Brain half of vip50-web-crm#312; the hard rule of 13 Oct:
// every feature in Classic and the Brain). ONE MOVE keeps the switch, the referral code and the sign-in stamp and
// answers the routes below; the Brain shows and asks. Nothing here sends anything to anyone: the agent copies the link
// or opens their own phone's Messages.

// ---- K16: the client's deal dates on the agent's site ----------------------------------------------------------------

/** Classic's words beside the switch (components/contacts/DealCard.tsx CLIENT_PAGE_WORDS there). */
export const CLIENT_PAGE_WORDS = "Client can see their deal dates on your site (dates only: never the price, commission or notes)";
export const SAVING = "Saving...";
export const SAVED = "Saved.";
export const SAVE_FAILED = "Could not save. Nothing was changed.";

/** The body for POST deals/<id> setting the switch. */
export const clientPageBody = (on: boolean) => ({ client_page: on });

/** Classic shows the switch on a deal under contract with a client; a closed deal or one with no client has no page. */
export const showsClientPage = (d: { status: string; contact: unknown }) => d.status === "under_contract" && d.contact != null;

/** POST deals/<id>'s answer: ok, or ONE MOVE's own words (else plain ones). */
export function readSaveAnswer(raw: unknown, httpOk: boolean): { ok: true } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (httpOk && r.ok !== false) return { ok: true };
  const e = typeof r.error === "string" && r.error.trim() ? r.error.trim().slice(0, 200) : null;
  return { ok: false, error: e ?? SAVE_FAILED };
}

// ---- K17: "Share your link" on a VIP -------------------------------------------------------------------------------

export const SHARE_TITLE = "Share your link";
export const SHARE_LINE = "ONE sends nothing. You send it from your own phone.";
export const NO_SITE_LINK = SITE_SETUP_URL;
export const referralLinkUrl = (contactId: string) => `${MOVE_URL}/api/brain/people/${encodeURIComponent(contactId)}/referral-link`;

export type ReferralLink =
  | { ok: true; code: string; url: string; text: string; sms: string }
  | { ok: false; reason: "no_site" | "not_vip"; words: string };

const str = (v: unknown, max = 600): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** GET referral-link's answer, checked: an https link, words that hold it, an sms: link. Null for anything else. */
export function readReferralLink(raw: unknown): ReferralLink | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.ok === false) {
    const reason = r.reason === "no_site" ? "no_site" : r.reason === "not_vip" ? "not_vip" : null;
    const words = str(r.words, 300);
    return reason && words ? { ok: false, reason, words } : null;
  }
  if (r.ok !== true) return null;
  const url = str(r.url, 400);
  const text = str(r.text, 1000);
  const sms = str(r.sms, 3000);
  const code = str(r.code, 40) ?? "";
  if (!url || !/^https:\/\/[^\s]+$/.test(url) || !text || !sms || !/^sms:/i.test(sms)) return null;
  return { ok: true, code, url, text, sms };
}

/** The words the agent may send, as ONE MOVE writes them (lib/referral-link.ts referralText there). */
export function shareText(first: string | null | undefined, url: string): string {
  const hi = (first ?? "").trim();
  return `${hi ? `Hi ${hi}, ` : ""}thank you for always thinking of me. If a friend ever needs help buying or selling, here is a link just for you to send them: ${url}`;
}

/** The example agent's link for a VIP (no network). */
export function demoReferralLink(first: string | null | undefined): Extract<ReferralLink, { ok: true }> {
  const url = "https://sarah-bennett.vip50homes.com/r/ab12cd34";
  const text = shareText(first, url);
  return { ok: true, code: "ab12cd34", url, text, sms: `sms:?&body=${encodeURIComponent(text)}` };
}

// ---- MY-HOME v0.2: a past client's own page on the agent's site --------------------------------------------------------

export interface Improvement { id: string; what: string; doneOn: string | null; cost: number | null; photos?: string[] }

/** Photos on an improvement: at most 3, https links only (they expire in a day, so they are shown, never stored). */
export const MAX_IMPROVEMENT_PHOTOS = 3;
export function readPhotos(v: unknown): string[] {
  const out: string[] = [];
  for (const x of Array.isArray(v) ? v : []) {
    const u = str(x, 2000);
    if (u && /^https:\/\/[^\s"'<>]+$/.test(u) && !out.includes(u)) out.push(u);
    if (out.length === MAX_IMPROVEMENT_PHOTOS) break;
  }
  return out;
}
export interface MyHome { signedInAt: string | null; words: string; improvements?: Improvement[] }

export const IMPROVEMENTS_HEAD = "Home improvements they shared with you:";

/** One line, as Classic: "what (YYYY-MM) · $cost"; a missing month or cost is left out. */
export function improvementLine(i: Improvement): string {
  const month = i.doneOn && /^\d{4}-\d{2}/.test(i.doneOn) ? ` (${i.doneOn.slice(0, 7)})` : "";
  const cost = i.cost != null ? ` · $${i.cost.toLocaleString("en-US")}` : "";
  return `${i.what}${month}${cost}`;
}

/** `my_home.improvements`, shared rows only (GO/MOVE reads Websites); at most 5, as Classic. */
export function readImprovements(v: unknown): Improvement[] {
  const out: Improvement[] = [];
  for (const x of Array.isArray(v) ? v : []) {
    if (!x || typeof x !== "object") continue;
    const r = x as Record<string, unknown>;
    const id = str(r.id, 100);
    const what = str(r.what, 200);
    if (!id || !what) continue;
    const cost = typeof r.cost === "number" && Number.isFinite(r.cost) && r.cost >= 0 ? Math.round(r.cost) : null;
    const photos = readPhotos(r.photos);
    out.push({ id, what, doneOn: str(r.done_on, 40), cost, ...(photos.length ? { photos } : {}) });
    if (out.length === 5) break;
  }
  return out;
}
export interface PersonExtras { canShareLink: boolean; myHome: MyHome | null; siteSearch?: SiteSearch | null }

// ---- A client's own saved home search on the agent's site (vip50-web-crm#402; one-websites#304) ----------------------

/** `site_search.search` off GET people/<id>: the client's own filters, known keys only. */
export interface ClientSearch {
  beds_min?: number; baths_min?: number; sqft_min?: number; lot_min_acres?: number; price_min?: number; price_max?: number;
  areas?: string[]; types?: string[]; must_haves?: string[];
}
export interface SiteSearch { search: ClientSearch; words: string; savedAt: string | null }

export const SITE_SEARCH_HEAD = "Their own search on your website";
export const USE_AS_WANTS = "Use as their wants";
/** Classic's Save on the wants card (POST /api/brain/needs, VIP-SUMMARY §3ah.1). */
export const needsUrl = `${MOVE_URL}/api/brain/needs`;

const cnum = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
const clist = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 80)).slice(0, 20) : undefined);

/** `site_search` ({search, words, saved_at}) or null; nothing usable reads as null. */
export function readSiteSearch(raw: unknown): SiteSearch | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const words = str(r.words, 300);
  const q = r.search && typeof r.search === "object" && !Array.isArray(r.search) ? (r.search as Record<string, unknown>) : null;
  if (!words || !q) return null;
  const search: ClientSearch = {};
  for (const k of ["beds_min", "baths_min", "sqft_min", "lot_min_acres", "price_min", "price_max"] as const) { const v = cnum(q[k]); if (v !== undefined) search[k] = v; }
  for (const k of ["areas", "types", "must_haves"] as const) { const v = clist(q[k]); if (v?.length) search[k] = v; }
  return { search, words, savedAt: str(r.saved_at, 40) };
}

/** The body Classic's Save sends, filled from their search (GO/MOVE 24 Oct). */
export function wantsBody(contactId: string, s: ClientSearch) {
  return {
    contact_id: contactId,
    cities: s.areas ?? [],
    ...(s.price_min != null ? { price_min: s.price_min } : {}),
    ...(s.price_max != null ? { price_max: s.price_max } : {}),
    ...(s.beds_min != null ? { beds_min: s.beds_min } : {}),
    ...(s.baths_min != null ? { baths_min: s.baths_min } : {}),
    sub_types: s.types ?? [],
    ...(s.must_haves?.length ? { note: `Must have: ${s.must_haves.join(", ")}` } : {}),
  };
}

/** "saved 23 Oct" from an ISO time; none when the time is missing or wrong. */
export function savedWords(at: string | null): string {
  const t = at ? Date.parse(at) : NaN;
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  return `saved ${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The words after "My Home:". ONE MOVE's words already start "My Home: " (lib/my-home.ts there), so that is taken off
 * here and the label is drawn once; a date written 2026-10-12 reads "12 Oct".
 */
export function myHomeWords(words: string): string {
  return words
    .replace(/^\s*my home:\s*/i, "")
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (all, _y, m, d) => {
      const k = Number(m) - 1;
      return k >= 0 && k < 12 ? `${Number(d)} ${MONTHS[k]}` : all;
    })
    .trim();
}

/** `can_share_link` and `my_home` off GET people/<id>; a missing or wrong field reads as off. */
export function readPersonExtras(raw: unknown): PersonExtras {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const h = r.my_home && typeof r.my_home === "object" ? (r.my_home as Record<string, unknown>) : null;
  const words = h ? str(h.words, 120) : null;
  const shown = words ? myHomeWords(words) : "";
  return {
    canShareLink: r.can_share_link === true,
    myHome: h && shown ? { signedInAt: str(h.signed_in_at, 40), words: shown, improvements: readImprovements(h.improvements) } : null,
    siteSearch: readSiteSearch(r.site_search),
  };
}

const demoPhoto = (c1: string, c2: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect width="112" height="112" fill="${c1}"/><path d="M0 80 L40 40 L70 70 L90 50 L112 72 V112 H0Z" fill="${c2}"/></svg>`)}`;
/** The example's improvement photos: drawn in place, so the example needs no network. */
export const DEMO_PHOTOS = [demoPhoto("#33507a", "#1f3555"), demoPhoto("#6a4b2f", "#3d2a18"), demoPhoto("#2f6a52", "#1b3d2f")];

/** The example's saved search (made up). */
export const DEMO_SITE_SEARCH: SiteSearch = {
  search: { beds_min: 4, baths_min: 3, price_min: 800000, price_max: 1200000, areas: ["Draper", "Suncrest"], types: ["house"], must_haves: ["3+ car garage", "view"] },
  words: "4+ beds, 3+ baths, house, Draper, Suncrest, $800k to $1.2M; must have: 3+ car garage, view",
  savedAt: "2026-10-23T18:00:00Z",
};

/** The example agent's people (lib/homeReport.ts demoMonthCard): Jane is a VIP; Sara is a past client and a VIP. */
export function demoPersonExtras(contactId: string): PersonExtras {
  if (contactId === "demo-hr-sara") return { canShareLink: true, myHome: { signedInAt: "2026-10-12T15:04:00Z", words: myHomeWords("My Home: signed in, last on 2026-10-12"), improvements: [{ id: "demo-imp-1", what: "New roof", doneOn: "2026-06-14", cost: 14500, photos: DEMO_PHOTOS }] } };
  if (contactId === "demo-hr-jane") return { canShareLink: true, myHome: null, siteSearch: DEMO_SITE_SEARCH };
  return { canShareLink: false, myHome: null };
}
