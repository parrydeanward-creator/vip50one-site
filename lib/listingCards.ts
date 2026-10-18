import { goHref, productLink } from "./productSignIn.ts";
import { PIECES, PIECE_NAME, type Launch, type PieceKey, type PieceState } from "./launch.ts";

// The agent's own listings as rich cards (Parry, 18 Oct, on /dashboard/listings: "I thought we were going to update
// this page so it is not so boring. we have pics and whatnot"). Everything here comes from data the Brain already
// reads: Marquee's vip_summary listings, posts, reports and approval items (VIP-SUMMARY §3a, §3ai), ONE Open's upcoming
// open houses (v1.2), the launch checklist (LAUNCH.md) and "Who of mine fits" (§3aj). Nothing is invented: a figure
// Marquee does not send is left out of the card, never guessed.

export type ListingStage = "live" | "under_contract" | "closed" | "other";

/** One listing's facts, carried on its orb (`marquee:listing:<ref>`) so the page and the panel read the same thing. */
export interface ListingFacts {
  ref: string;
  street: string;
  place: string | null; // "Bountiful, UT 84010"
  stage: ListingStage;
  price: number | null; // list price (sold price once closed)
  liveOn: string | null;
  daysOnMarket: number | null;
  /** Only when Marquee sends them (beds, baths, sqft on its listing; not sent as of 18 Oct). */
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  image: string | null; // Marquee's hero photo through its signed route; never a person's face
  marquee: string | null; // the listing in Marquee, through the one sign-in hop
  report: { href: string; words: string } | null; // the newest seller report
  approvals: number; // pieces waiting for the agent's approval
  scheduled: number; // posts scheduled from today on
  posted: number; // posts that went out in the last 30 days
  openHouse: { when: string; href: string | null; ahead: number } | null; // the next one, from ONE Open
}

type Loose = Record<string, unknown>;
const str = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : typeof v === "string" && /^\d+(\.\d+)?$/.test(v.trim()) && Number(v) > 0 ? Number(v) : null);
const arr = (v: unknown): Loose[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Loose[]) : []);
const https = (v: unknown): string | null => {
  const s = str(v, 1000);
  if (!s) return null;
  try {
    return new URL(s).protocol === "https:" ? s : null;
  } catch {
    return null;
  }
};
const ymdDenver = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date(iso));
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000));
const streetKey = (s: string) => s.split(",")[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function whenWords(iso: string, today: string): string {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", ...o }).format(d);
  const time = f({ hour: "numeric", minute: "2-digit" });
  return ymdDenver(iso) === today ? `Today, ${time}` : `${f({ weekday: "short" })} ${f({ day: "numeric" })} ${f({ month: "short" })}, ${time}`;
}

const REPORT_WORDS: Record<string, string> = { asked: "waiting on your answers", answered: "ready to send", sent: "sent", skipped: "skipped" };

/**
 * One Marquee summary listing (lib/live.ts SummaryListing) with what the Brain knows about it elsewhere: Marquee's own
 * posts, reports and approval items, and ONE Open's upcoming open houses. `marquee` and `open` are those products'
 * vip_summary answers (null when not asked or not answered).
 */
export function listingFacts(l: Loose, marquee: Loose | null, open: Loose | null, today: string): ListingFacts | null {
  const ref = str(l.ref, 80);
  const address = str(l.address, 200);
  if (!ref || !address) return null;
  const [street, ...rest] = address.split(",").map((x) => x.trim());
  const status = str(l.status, 30);
  const stage: ListingStage = status === "live" || status === "under_contract" || status === "closed" ? status : "other";
  const liveOn = str(l.live_on, 10);
  const valid = (d: string | null) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
  const endOn = stage === "under_contract" ? str(l.under_contract_on, 10) : stage === "closed" ? str(l.closed_on, 10) : null;
  const dom = valid(liveOn) ? daysBetween(liveOn!, valid(endOn) ? endOn! : today) : null;
  const key = str(l.property_key, 200);
  const sk = streetKey(street);

  // Marquee: posts for this listing (listing_ref), the newest seller report, and approval items (property_key).
  const posts = arr(marquee?.posts).filter((p) => p.listing_ref === ref && typeof p.at === "string" && !Number.isNaN(Date.parse(p.at as string)));
  const scheduled = posts.filter((p) => p.state === "scheduled" && ymdDenver(p.at as string) >= today).length;
  const monthAgo = new Date(Date.parse(`${today}T12:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10);
  const posted = posts.filter((p) => p.state === "sent" && ymdDenver(p.at as string) >= monthAgo).length;
  const rep = arr(marquee?.reports).find((r) => r.listing_ref === ref);
  const repPath = rep ? str(rep.url, 300) : null;
  const report = rep
    ? {
        href: repPath && repPath.startsWith("/") && !repPath.startsWith("//") ? goHref("marquee", repPath) : goHref("marquee", "/"),
        words: [typeof rep.week === "number" ? `Week ${rep.week}` : null, REPORT_WORDS[String(rep.state)] ?? null].filter(Boolean).join(", ") || "Seller report",
      }
    : null;
  const approvals = arr(marquee?.items)
    .filter((it) => it.kind === "approval" && ((key && it.property_key === key) || (typeof it.title === "string" && streetKey(String(it.title).replace(/^Approve \d+ pieces? for /, "")) === sk)))
    .reduce((n, it) => n + (Number(/^Approve (\d+) piece/.exec(String(it.title))?.[1]) || 1), 0);

  // ONE Open: the next open house at this home (same property key, else the same street).
  const next = arr(open?.open_houses)
    .filter((h) => typeof h.starts_at === "string" && !Number.isNaN(Date.parse(h.starts_at as string)) && ymdDenver(h.starts_at as string) >= today)
    .filter((h) => (key && h.property_key === key) || (typeof h.address === "string" && streetKey(h.address) === sk))
    .sort((a, b) => Date.parse(a.starts_at as string) - Date.parse(b.starts_at as string))[0];
  const nextLink = next ? https(next.link) : null;

  const price = stage === "closed" ? num(l.sold_price) ?? num(l.list_price) : num(l.list_price);
  const link = https(l.link);
  return {
    ref,
    street,
    place: rest.length ? rest.join(", ") : null,
    stage,
    price,
    liveOn: valid(liveOn) ? liveOn : null,
    daysOnMarket: dom,
    beds: num(l.beds),
    baths: num(l.baths),
    sqft: num(l.sqft),
    image: https(l.image),
    marquee: link ? (productLink(link) as string) : null,
    report,
    approvals,
    scheduled,
    posted,
    openHouse: next ? { when: whenWords(next.starts_at as string, today), href: nextLink ? (productLink(nextLink) as string) : null, ahead: Math.max(0, Math.round(num(next.signed_up_ahead) ?? 0)) } : null,
  };
}

export const STAGE_WORDS: Record<ListingStage, string> = { live: "Live", under_contract: "Under contract", closed: "Closed", other: "Listing" };

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** "4 bd · 3 ba · 3,120 sq ft", only the figures there are; null when none. */
export function factsLine(f: Pick<ListingFacts, "beds" | "baths" | "sqft">): string | null {
  const parts = [f.beds ? `${f.beds} bd` : null, f.baths ? `${f.baths} ba` : null, f.sqft ? `${Math.round(f.sqft).toLocaleString("en-US")} sq ft` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** "12 days on market", "Not live yet", or null when Marquee sent no live date. */
export function domWords(f: Pick<ListingFacts, "stage" | "daysOnMarket">): string | null {
  if (f.daysOnMarket == null) return null;
  const d = `${f.daysOnMarket} ${f.daysOnMarket === 1 ? "day" : "days"}`;
  return f.stage === "live" ? `${d} on market` : f.stage === "under_contract" ? `${d} to contract` : f.stage === "closed" ? `${d} to close` : null;
}

/** The launch's five pieces for the card: each piece's state, how many are done, and the next one in plain words. */
export interface LaunchProgress {
  launched: boolean;
  pieces: { key: PieceKey; name: string; state: PieceState | "off" }[];
  done: number;
  total: number;
  next: string;
}

export function launchProgress(launch: Launch | null | undefined): LaunchProgress {
  if (!launch) {
    return { launched: false, pieces: PIECES.map((k) => ({ key: k, name: PIECE_NAME[k], state: "off" as const })), done: 0, total: PIECES.length, next: "Not launched yet. One tap drafts all five pieces." };
  }
  const pieces = PIECES.filter((k) => launch.pieces.some((p) => p.piece === k)).map((k) => ({ key: k, name: PIECE_NAME[k], state: launch.pieces.find((p) => p.piece === k)!.state }));
  const counted = pieces.filter((p) => p.state !== "skipped");
  const done = counted.filter((p) => p.state === "done").length;
  const ready = counted.find((p) => p.state === "ready");
  const failed = counted.find((p) => p.state === "failed");
  const drafting = counted.find((p) => p.state === "drafting" || p.state === "requested");
  const next = failed
    ? `${failed.name}: something went wrong. Open it to look.`
    : ready
      ? `${ready.name} is ready for you to ${ready.key === "buyer_notes" ? "send" : "approve"}.`
      : drafting
        ? `Pulse is drafting ${drafting.name.toLowerCase()}.`
        : "Every piece is done.";
  return { launched: true, pieces, done, total: counted.length, next };
}

/** The orb a card opens (the orbs rule: a click centres it and opens its side panel). */
export const listingOrb = (ref: string) => `marquee:listing:${ref}`;
