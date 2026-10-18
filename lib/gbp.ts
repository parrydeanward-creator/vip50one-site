import { MOVE_URL } from "./host.ts";

// Google Business Profile in the Brain (GBP.md §3, §4, §5b; Parry, 18 Oct: "build the business profile"). ONE MOVE
// serves the routes below and reads MASTER's Google functions; the Brain shows and asks. Nothing is posted, replied or
// changed on Google until the agent taps Send, Publish or Fix on that exact piece, and each tap sends exactly the text
// shown. Pure: no fetching here, no secrets.

export const GBP_TITLE = "Google Business Profile";
export const GBP_PATH = "/dashboard/google-profile";
export const gbpUrl = `${MOVE_URL}/api/brain/gbp`;
export const gbpConnectUrl = `${gbpUrl}/connect`;
export const gbpDisconnectUrl = `${gbpUrl}/disconnect`;
export const gbpReplyUrl = `${gbpUrl}/reply`;
export const gbpPublishUrl = `${gbpUrl}/publish`;
export const gbpFixUrl = `${gbpUrl}/fix`;

export type GbpState = "not_complete" | "waiting_google" | "not_connected" | "connected";
export type PostSource = "listing" | "open_house" | "closing" | "guide" | "marquee";

export interface GbpReview { id: string; firstName: string; stars: number; text: string; at: string | null; reply: string | null; draft: string | null }
export interface GbpPost { id: string; source: PostSource | null; title: string; text: string; photoUrl: string | null; link: string | null; status: "draft" | "published"; publishedAt: string | null }
export interface GbpMismatch { field: string; google: string; one: string }
export interface GbpMetrics { month: string; calls: number; directions: number; clicks: number; views: number; source: string }
export interface GbpData {
  state: GbpState;
  location: string | null;
  reviews: GbpReview[];
  posts: GbpPost[];
  mismatches: GbpMismatch[];
  metrics: GbpMetrics | null;
}

export const SAVING = "Saving...";
export const FOOTER = "Nothing is posted, replied or changed on Google until you tap Send, Publish or Fix.";
export const DEMO_NOTE = "(Example: nothing was sent to Google.)";
export const CONNECT_LINE = "ONE asks Google for permission only when you turn this on.";
export const FAILED = "That did not go through. Nothing was changed on Google.";
export const DONE_REPLY = "Reply sent to Google.";
export const DONE_PUBLISH = "Published on Google.";
export const DONE_FIX = "Fixed on Google.";

const STATES: readonly GbpState[] = ["not_complete", "waiting_google", "not_connected", "connected"];
const EMPTY: Omit<GbpData, "state"> = { location: null, reviews: [], posts: [], mismatches: [], metrics: null };

/** The state line. `connected` names the location when it is known. */
export function stateWords(state: GbpState, location?: string | null): string {
  switch (state) {
    case "not_complete":
      return "Google Business Profile is part of ONE Complete.";
    case "waiting_google":
      return "Waiting on Google to approve ONE's access. Nothing to do yet; this turns on by itself.";
    case "not_connected":
      return CONNECT_LINE;
    case "connected":
      return location && location.trim() ? `Connected: ${location.trim()}` : "Connected.";
  }
}

const str = (v: unknown, max = 2000): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
const https = (v: unknown): string | null => {
  const s = str(v, 600);
  return s && /^https:\/\/[^\s]+$/.test(s) ? s : null;
};
const SOURCES: readonly PostSource[] = ["listing", "open_house", "closing", "guide", "marquee"];

/** When the route is missing (404) or does not answer, the state is waiting_google: nothing else is offered. */
export const waitingGoogle = (): GbpData => ({ state: "waiting_google", ...EMPTY });

/** GET /api/brain/gbp, checked. A missing route, a network error or anything unreadable reads as waiting_google. */
export function readGbp(raw: unknown, httpOk = true): GbpData {
  if (!httpOk || !raw || typeof raw !== "object") return waitingGoogle();
  const r = raw as Record<string, unknown>;
  if (r.ok === false) return waitingGoogle();
  const state = STATES.find((s) => s === r.state);
  if (!state) return waitingGoogle();
  if (state !== "connected") return { state, ...EMPTY, location: null };
  const list = (v: unknown) => (Array.isArray(v) ? v : []).filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  const reviews: GbpReview[] = [];
  for (const x of list(r.reviews)) {
    const id = str(x.id, 200);
    const stars = typeof x.stars === "number" ? Math.round(x.stars) : 0;
    if (!id || stars < 1 || stars > 5) continue;
    reviews.push({ id, firstName: str(x.first_name, 60) ?? "A client", stars, text: str(x.text, 4000) ?? "", at: str(x.at, 40), reply: str(x.reply, 4000), draft: str(x.draft, 4000) });
  }
  const posts: GbpPost[] = [];
  for (const x of list(r.posts)) {
    const id = str(x.id, 200);
    if (!id) continue;
    posts.push({
      id,
      source: SOURCES.find((s) => s === x.source) ?? null,
      title: str(x.title, 200) ?? "",
      text: str(x.text, 4000) ?? "",
      photoUrl: https(x.photo_url),
      link: https(x.link),
      status: x.status === "published" ? "published" : "draft",
      publishedAt: str(x.published_at, 40),
    });
  }
  const mismatches: GbpMismatch[] = [];
  for (const x of list(r.mismatches)) {
    const field = str(x.field, 40);
    if (field) mismatches.push({ field, google: str(x.google, 600) ?? "", one: str(x.one, 600) ?? "" });
  }
  const m = r.metrics && typeof r.metrics === "object" ? (r.metrics as Record<string, unknown>) : null;
  const month = m ? str(m.month, 20) : null;
  return {
    state,
    location: str(r.location, 200) ?? (r.location && typeof r.location === "object" ? str((r.location as Record<string, unknown>).name, 200) : null),
    reviews: sortReviews(reviews),
    posts,
    mismatches,
    metrics: m && month ? { month, calls: num(m.calls), directions: num(m.directions), clicks: num(m.clicks), views: num(m.views), source: str(m.source, 120) ?? "Google" } : null,
  };
}

/** Newest first; a review with no date goes last. */
export function sortReviews(rs: GbpReview[]): GbpReview[] {
  const t = (r: GbpReview) => (r.at ? Date.parse(r.at) || 0 : 0);
  return [...rs].sort((a, b) => t(b) - t(a));
}

/** 1 and 2 star reviews are marked (GBP §3.1: red). */
export const isLowStar = (stars: number) => stars <= 2;

export const starsWords = (stars: number) => `${stars} ${stars === 1 ? "star" : "stars"}`;

const SOURCE_WORDS: Record<PostSource, string> = {
  listing: "From your listing",
  marquee: "From your listing in Marquee",
  open_house: "From your open house in ONE Open",
  closing: "From a closing",
  guide: "From a guide on your website",
};
/** The source of a post in plain words. */
export const sourceWords = (s: PostSource | null) => (s ? SOURCE_WORDS[s] : "Written by Pulse");

const FIELD_WORDS: Record<string, string> = {
  name: "Name",
  phone: "Phone",
  website: "Website",
  hours: "Hours",
  service_areas: "Service areas",
  description: "Description",
};
export const fieldWords = (f: string) => FIELD_WORDS[f] ?? f.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-09" or "September 2026" -> "September 2026". */
export function monthWords(m: string): string {
  const x = /^(\d{4})-(\d{2})/.exec(m);
  if (!x) return m;
  const k = Number(x[2]) - 1;
  return k >= 0 && k < 12 ? `${MONTHS[k]} ${x[1]}` : m;
}

/** "12 Oct 2026" for an ISO date; the raw text when it is not one. */
export function dateWords(iso: string | null): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return iso ?? "";
  const d = new Date(t);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

// ---- request bodies ---------------------------------------------------------------------------------------------------

export const connectBody = () => ({});
export const disconnectBody = () => ({});
export const replyBody = (reviewId: string, text: string) => ({ review_id: reviewId, text });
export const publishBody = (postId: string, text: string) => ({ post_id: postId, text });
export const fixBody = (field: string) => ({ field });

/** Whether the shown text may be sent: something is there, and it is not only spaces. */
export const canSendText = (text: string) => text.trim().length > 0;

export type GbpAnswer = { ok: true; url?: string } | { ok: false; words: string };

/** A POST's answer: `{ok}` or `{ok:false, words}`. A failure shows ONE MOVE's own words, else plain ones. */
export function readGbpAnswer(raw: unknown, httpOk: boolean): GbpAnswer {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (httpOk && r.ok !== false) return { ok: true, url: https(r.url) ?? https(r.redirect) ?? undefined };
  return { ok: false, words: str(r.words, 300) ?? str(r.error, 300) ?? FAILED };
}

// ---- the example agent (?demo=1): local, nothing is called ------------------------------------------------------------

export function demoGbp(state: GbpState = "connected"): GbpData {
  if (state !== "connected") return { state, ...EMPTY };
  return {
    state,
    // Google's name rule: the agent's real name only, no "REALTOR" or keywords added.
    location: "Sarah Bennett",
    reviews: [
      { id: "demo-rv-3", firstName: "Marcus", stars: 5, text: "Sarah made selling our home feel easy. She answered every question and kept us calm the whole way.", at: "2026-10-09T17:20:00Z", reply: null, draft: "Thank you, Marcus. It was a pleasure to help you and your family. I wish you the very best in your new home." },
      { id: "demo-rv-2", firstName: "Dana", stars: 2, text: "I wish the process had been quicker and I did not always know what was happening.", at: "2026-10-02T15:05:00Z", reply: null, draft: "Dana, thank you for telling me. I am sorry it felt unclear at times. I would like to hear more, so please call me when you have a moment." },
      { id: "demo-rv-1", firstName: "Priya", stars: 5, text: "Warm, honest and always on time. We found our first home in three weekends.", at: "2026-09-21T19:40:00Z", reply: "Thank you, Priya. Congratulations again on your first home.", draft: null },
    ],
    posts: [
      { id: "demo-po-1", source: "marquee", title: "New listing", text: "Just listed: 3 bed, 2 bath near the park, with a fenced yard. Call or message me for a private showing. Sarah Bennett, Summit Home Realty.", photoUrl: null, link: "https://sarah-bennett.vip50homes.com/listings/demo", status: "draft", publishedAt: null },
      { id: "demo-po-2", source: "open_house", title: "Open house", text: "Open house this Saturday, 1 to 3 pm. Come see the kitchen and the new back deck. Sarah Bennett, Summit Home Realty.", photoUrl: null, link: "https://sarah-bennett.vip50homes.com/open-houses/demo", status: "draft", publishedAt: null },
      { id: "demo-po-0", source: "guide", title: "Neighbourhood guide", text: "Thinking about moving to Bountiful? Here is my guide to parks, schools and local favourites.", photoUrl: null, link: "https://sarah-bennett.vip50homes.com/areas/bountiful", status: "published", publishedAt: "2026-09-28T16:00:00Z" },
    ],
    mismatches: [
      { field: "phone", google: "(801) 555-0100", one: "(801) 555-0142" },
      { field: "website", google: "sarahbennett-homes.example", one: "https://sarah-bennett.vip50homes.com" },
    ],
    metrics: { month: "2026-09", calls: 18, directions: 31, clicks: 64, views: 1240, source: "Google Business Profile Performance" },
  };
}

/** Demo state from `?gbp=waiting|connect|complete`; anything else is connected. */
export function demoStateFrom(search: string): GbpState {
  const v = new URLSearchParams(search).get("gbp");
  return v === "waiting" ? "waiting_google" : v === "connect" ? "not_connected" : v === "complete" ? "not_complete" : "connected";
}
