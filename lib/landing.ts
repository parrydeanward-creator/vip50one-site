import { IN_BRAIN, pageFromAddress } from "./moveMenu.ts";

// Where a signed-in agent lands (audit stage 1, Parry 14 Oct: "fix all of the above issues. even the new onnes").
// - Land where they last were: the Brain keeps its last page in a cookie; sign-in goes back there.
// - /app?to=/weekly opens that page inside the Brain (never ONE MOVE Classic).

export const LAST_COOKIE = "one_last";
export const LAST_MAX_AGE = 60 * 60 * 24 * 30;

/** A Brain address worth returning to, or null. Only /dashboard and its in-Brain pages, never a query. */
export function lastPlace(v: string | null | undefined): string | null {
  if (!v) return null;
  let p: string;
  try {
    p = decodeURIComponent(v);
  } catch {
    return null;
  }
  if (p === "/dashboard") return p;
  return pageFromAddress(p) ? p : null;
}

/** /app?to=...: a ONE MOVE path ("/weekly") or a Brain address ("/dashboard/weekly") opens inside the Brain. */
export function appTarget(to: string | null | undefined): string {
  if (!to || !to.startsWith("/") || to.startsWith("//")) return "/dashboard";
  const path = to.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/dashboard" || path === "/") return "/dashboard";
  const inner = path.startsWith("/dashboard/") ? path.slice("/dashboard".length) : path;
  return IN_BRAIN.has(inner) ? `/dashboard${inner}` : "/dashboard";
}

/** After sign-in: an asked-for place on this site (Brain or the reactivate page), else the last place, else the Brain. */
export function afterSignIn(next: string | null | undefined, last: string | null | undefined): string {
  if (next === "/reactivate" || next?.startsWith("/reactivate?")) return next;
  if (next) {
    const t = appTarget(next);
    if (t !== "/dashboard" || next === "/dashboard") return t;
  }
  return lastPlace(last) ?? "/dashboard";
}

/** Plain /join (no package chosen) goes to the packages first; /join?package=... goes on to sign-up. */
export const JOIN_NO_PACKAGE = "/#packages";

/** Sign in with Google: shown once MASTER's Google provider is switched on (Parry's click; STATUS). */
export const GOOGLE_SIGNIN = false;
