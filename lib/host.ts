// vip50one.com is shared (Parry, 29 Sep): this site owns the front door, the
// sign-in and ONE Brain; ONE MOVE lives at move.vip50one.com. The split below
// is the one the GO/MOVE bot built its side for (vip50-web-crm
// docs/MOVE-HOST-SWITCH.md, step 7; ecosystem inbox 2026-09-30 10:45).

export const MOVE_URL = "https://move.vip50one.com";

/**
 * The classic dashboard (ONE MOVE's). ONE Brain and ONE MOVE each carry a
 * "New dashboard | Classic" switch at the top (Parry, 2 Oct; vip50-web-crm#25
 * is the other half). The sign-in is shared on .vip50one.com, so switching
 * never asks for a password.
 */
export const CLASSIC_DASHBOARD_URL = `${MOVE_URL}/dashboard`;

/**
 * Paths that are links people already hold: they stay on vip50one.com and
 * hand over to ONE MOVE, where sign-up, checkout and reactivation live
 * (CHECKOUT.md §4). The query (package, interval, code) goes with them.
 * Temporary redirects, so a browser never remembers where they land.
 */
export const HANDOVER = ["/join", "/reactivate", "/app"] as const;

/**
 * Proxied, not redirected: Lofty subscriptions, Twilio text replies, one-click
 * unsubscribe POSTs and images inside sent emails do not reliably follow a
 * redirect. This site's own /api/note and /api/ask are matched first.
 */
export const PROXIED = ["/api/:path*", "/newsletter-icons/:path*"] as const;

/** Any other path that is not this site's goes to the same place on ONE MOVE. */
export function moveUrlFor(pathname: string, search: string): string {
  return `${MOVE_URL}${pathname}${search}`;
}

/**
 * The MASTER session cookie is shared across *.vip50one.com, the same way
 * ONE MOVE sets it, so a client signed in on either opens the other signed in.
 * Anywhere else (vercel.app previews, localhost) it stays on that host.
 */
export function cookieDomainFor(host: string | null | undefined): string | undefined {
  const h = (host ?? "").split(":")[0].toLowerCase();
  return h === "vip50one.com" || h.endsWith(".vip50one.com") ? ".vip50one.com" : undefined;
}
