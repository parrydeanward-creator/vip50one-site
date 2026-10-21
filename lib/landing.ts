import { pageFromAddress } from "./moveMenu.ts";
import { arrivalFor, contactIdOf, isArrivalPath, openTarget } from "./deepLink.ts";

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
  if (!to || !to.startsWith("/") || to.startsWith("//") || to.includes("\\")) return "/dashboard";
  const path = to.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  // ?open=<thing> survives signing in (lib/deepLink.ts), only for a name it knows; any other query is dropped
  let open = "";
  let contact = "";
  try {
    const q = new URLSearchParams(to.split("#")[0].split("?")[1] ?? "");
    const c = contactIdOf(q.get("contact"));
    if (c) contact = `?contact=${c}`;
    const o = q.get("open");
    if (o && o.length <= 120 && openTarget(o)) open = `?open=${encodeURIComponent(o)}`;
  } catch {}
  if (path === "/dashboard" || path === "/") return `/dashboard${contact || open}`;
  const inner = path.startsWith("/dashboard/") ? path.slice("/dashboard".length) : path;
  if (inner.includes("..") || !isArrivalPath(inner)) return `/dashboard${open}`;
  // /contacts/<uuid> keeps the contact; /contacts/<anything else> is the Contacts page (lib/deepLink.ts)
  const a = arrivalFor(inner, null);
  const kept = a && a.kind !== "gbp" && a.contact ? `/contacts/${a.contact}` : a && a.kind === "page" && inner.startsWith("/contacts/") ? a.path : inner;
  return `/dashboard${kept}${open}`;
}

/** After sign-in: an asked-for place on this site (Brain or the reactivate page), else the last place, else the Brain. */
export function afterSignIn(next: string | null | undefined, last: string | null | undefined): string {
  if (next === "/reactivate" || next?.startsWith("/reactivate?")) return next;
  // Back to a website's studio after signing in (/site/open?site=...; Websites, 15 Oct).
  if (next?.startsWith("/site/open?") && !next.includes("//") && !next.includes("\\")) return next;
  // Back to the product hop after signing in (/go/<product>?next=...; ENTITLEMENT §6b, 16 Oct), same refusals.
  if (next && /^\/go\/(vip-open|marquee|showly)(\?|$)/.test(next) && !next.includes("//") && !next.includes("\\")) return next;
  if (next) {
    const t = appTarget(next);
    if (t !== "/dashboard" || next === "/dashboard") return t;
  }
  return lastPlace(last) ?? "/dashboard";
}

/** Where Google and the email link return after /auth/confirm: the place asked for (as afterSignIn), else the Brain
 * (ENTITLEMENT §6b: a product hop survives every way of signing in). */
export function confirmNext(next: string | null | undefined): string {
  return next ? afterSignIn(next, null) : "/dashboard";
}

/** Plain /join (no package chosen) goes to the packages first; /join?package=... goes on to sign-up. */
export const JOIN_NO_PACKAGE = "/#packages";

/** Sign in with Google: shown once MASTER's Google provider is switched on (Parry's click; STATUS). */
export const GOOGLE_SIGNIN = true; // on 14 Oct: MASTER's Google provider switched on by Parry (Google Cloud vip-50-one)

/** The packages on the sales page for someone signed in without a plan: "/" would send them to the Brain, which sends
 * them back to the no-package page, so "See the packages" did nothing (walker, 14 Oct). ?packages lets "/" through. */
export const PACKAGES_SIGNED_IN = "/?packages=1#packages";
export const homeSendsToBrain = (signedIn: boolean, search: URLSearchParams) => signedIn && !search.has("packages");
