import { MOVE_URL } from "./host.ts";

// Reviews (vip50-web-crm#370): the agent's client reviews, with a switch for each one to show on their website.
// ONE MOVE keeps them; the Brain lists, adds, switches and deletes. Hidden until the route answers 200.
// Testimonials are real, named people only (SETTLED): the form asks for the reviewer's name and the review text.

export const reviewsUrl = `${MOVE_URL}/api/brain/reviews`;
export const REVIEWS_TITLE = "Reviews";
export const REVIEWS_COPY = "Client reviews, in one place. Switch a review on to show it on your website.";
export const REVIEWS_FAILED = "That didn't go through. Nothing was changed.";
export const REVIEWS_SAVING = "Saving...";
export const DELETE_CONFIRM = "Delete this review? It also comes off your website.";

export type ReviewSource = "google" | "zillow" | "ratemyagent" | "other";
export const SOURCES: { key: ReviewSource; label: string }[] = [
  { key: "google", label: "Google" },
  { key: "zillow", label: "Zillow" },
  { key: "ratemyagent", label: "RateMyAgent" },
  { key: "other", label: "Other" },
];
export const TEXT_MAX = 4000;
export const NAME_MAX = 120;

export interface Review { id: string; reviewer: string; text: string; rating: number; source: ReviewSource; site_ok: boolean; created_at: string | null }
export interface ReviewList { count: number; shown_on_site: number; reviews: Review[] }
export type ReviewFilter = "all" | "site";

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export const sourceWords = (s: ReviewSource): string => SOURCES.find((x) => x.key === s)?.label ?? "Other";
export const starsWords = (n: number): string => "★".repeat(n) + "☆".repeat(5 - n);

/** One review, or null when it lacks an id, a reviewer, text or a 1 to 5 rating. */
export function readReview(v: unknown): Review | null {
  const r = rec(v);
  const id = typeof r.id === "string" || typeof r.id === "number" ? String(r.id).slice(0, 80) : "";
  const reviewer = str(r.reviewer, NAME_MAX);
  const text = str(r.text, TEXT_MAX);
  const rating = Number(r.rating);
  if (!id || !reviewer || !text || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  const source = SOURCES.some((s) => s.key === r.source) ? (r.source as ReviewSource) : "other";
  return { id, reviewer, text, rating, source, site_ok: r.site_ok === true, created_at: str(r.created_at, 40) };
}

/** The list. Null (card stays hidden) unless the route answered 200 with ok and a reviews array. Counts are recomputed. */
export function readReviews(status: number, j: unknown): ReviewList | null {
  const r = rec(j);
  if (status !== 200 || r.ok !== true || !Array.isArray(r.reviews)) return null;
  const reviews = r.reviews.map(readReview).filter((x): x is Review => x !== null).slice(0, 500);
  return { count: reviews.length, shown_on_site: reviews.filter((x) => x.site_ok).length, reviews };
}

/** One review back from an add or a switch. */
export function readReviewAnswer(status: number, j: unknown): { ok: true; review: Review } | { ok: false; error: string } {
  const r = rec(j);
  const err = str(r.error, 240);
  if (status !== 200 || r.ok !== true) return { ok: false, error: err ?? REVIEWS_FAILED };
  const review = readReview(r.review);
  return review ? { ok: true, review } : { ok: false, error: REVIEWS_FAILED };
}

export function readDeleteAnswer(status: number, j: unknown): { ok: true } | { ok: false; error: string } {
  const r = rec(j);
  if (status === 200 && r.ok === true) return { ok: true };
  return { ok: false, error: str(r.error, 240) ?? REVIEWS_FAILED };
}

export interface AddForm { reviewer: string; text: string; rating: number; source: ReviewSource }
export const emptyForm = (): AddForm => ({ reviewer: "", text: "", rating: 5, source: "google" });

export function checkAdd(f: AddForm): string | null {
  if (!f.reviewer.trim()) return "Add the reviewer's name.";
  if (!f.text.trim()) return "Add what they said.";
  if (!Number.isInteger(f.rating) || f.rating < 1 || f.rating > 5) return "Choose 1 to 5 stars.";
  if (!SOURCES.some((s) => s.key === f.source)) return "Choose where the review is from.";
  return null;
}
export const addBody = (f: AddForm) => ({ action: "add", reviewer: f.reviewer.trim().slice(0, NAME_MAX), text: f.text.trim().slice(0, TEXT_MAX), rating: f.rating, source: f.source });
export const siteBody = (id: string, on: boolean) => ({ action: "site_ok", id, on });
export const deleteBody = (id: string) => ({ action: "delete", id });

export const countWords = (l: ReviewList): { all: string; site: string } => ({
  all: `${l.count} ${l.count === 1 ? "review" : "reviews"}`,
  site: `${l.shown_on_site} on your website`,
});

export function filterReviews(l: Review[], f: ReviewFilter): Review[] {
  return f === "site" ? l.filter((x) => x.site_ok) : l;
}

/** Local counts after a change, so the chips never lag the list. */
export const withReviews = (reviews: Review[]): ReviewList => ({ count: reviews.length, shown_on_site: reviews.filter((x) => x.site_ok).length, reviews });

export function dateWords(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function demoReviews(): ReviewList {
  return withReviews([
    { id: "demo-1", reviewer: "Sarah Bennett", text: "Sold our home in nine days, over asking. Every step was explained and we never had to chase for an update.", rating: 5, source: "google", site_ok: true, created_at: "2026-10-12T16:00:00Z" },
    { id: "demo-2", reviewer: "Marcus & Elena Ruiz", text: "First-time buyers and we were nervous. Patient, honest, and found us the right house on a tight budget.", rating: 5, source: "zillow", site_ok: true, created_at: "2026-09-28T16:00:00Z" },
    { id: "demo-3", reviewer: "Dana Whitfield", text: "Good communication and a fair price. Closing ran a little late but it all worked out.", rating: 4, source: "ratemyagent", site_ok: false, created_at: "2026-09-03T16:00:00Z" },
  ]);
}
