import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookieDomainFor } from "./lib/host.ts";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "./lib/master.ts";
import { LAST_COOKIE, afterSignIn, appTarget, homeSendsToBrain } from "./lib/landing.ts";
import { cleanupHeaders } from "./lib/staleCookies.ts";

// Keeps the MASTER session fresh and sends signed-out visitors from the
// dashboard to sign-in. ?demo=1 keeps the made-up agent reachable for the
// films and screenshots (it shows no one's real data).
//
// The home page is the sales page for visitors and the way in to the
// dashboard for clients (Parry, 29 Sep). A visitor has no MASTER cookie, so
// they get the sales page without this waiting on MASTER at all; only someone
// carrying a session is checked, and sent on to their dashboard.

const hasSession = (req: NextRequest) => req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  // A sign-in code (Google, an emailed link) that landed somewhere other than /auth/confirm, e.g. on MASTER's Site URL
  // when the asked-for return address is not used (14 Oct: Google came back to /dashboard and the code was lost on
  // the way to /login). Hand it to /auth/confirm, which signs the agent in, then opens the Brain.
  const code = req.nextUrl.searchParams.get("code");
  if (code && path !== "/auth/confirm") {
    const to = req.nextUrl.clone();
    to.pathname = "/auth/confirm";
    to.search = `?code=${encodeURIComponent(code)}&next=${encodeURIComponent(path === "/" || path === "/login" ? "/dashboard" : path)}`;
    return NextResponse.redirect(to);
  }
  if (path === "/" && !hasSession(req)) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const domain = cookieDomainFor(req.headers.get("host"));
  const sb = createServerClient(MASTER_URL, MASTER_PUBLISHABLE_KEY, {
    cookieOptions: domain ? { domain, path: "/", sameSite: "lax" } : undefined,
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  // getClaims checks the token's signature without a round trip to MASTER
  // whenever it can, refreshing the session first when it has expired.
  const { data, error } = await sb.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;
  // A stale copy of the sign-in cookie (see lib/staleCookies.ts) is removed on every answer below.
  // Only on a plain page load: never while a sign-in is being written (POST /login), so a fresh session is never cleared.
  const refreshFailed = !user && req.method === "GET" && path !== "/login" && (error as { code?: string } | null)?.code === "refresh_token_not_found";
  const clean = cleanupHeaders(req.headers.get("cookie"), domain, refreshFailed);
  const done = (r: NextResponse) => {
    for (const h of clean) r.headers.append("Set-Cookie", h);
    return r;
  };
  const demo = req.nextUrl.searchParams.get("demo") === "1";
  if (path === "/" && homeSendsToBrain(!!user, req.nextUrl.searchParams)) {
    const to = req.nextUrl.clone();
    to.pathname = "/dashboard";
    to.search = "";
    return done(NextResponse.redirect(to));
  }
  if (!user && path.startsWith("/dashboard") && !demo) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    // A link to a page (/dashboard/weekly, ?open=growth) comes back to that page after signing in (lib/landing.ts
    // keeps only places it knows); the plain dashboard needs no next.
    const asked = appTarget(path + req.nextUrl.search);
    to.search = asked !== "/dashboard" ? `?next=${encodeURIComponent(asked)}` : "";
    return done(NextResponse.redirect(to));
  }
  if (user && path === "/login") {
    // Already signed in: the place asked for, else where they last were, else the Brain (lib/landing.ts).
    const want = afterSignIn(req.nextUrl.searchParams.get("next"), req.cookies.get(LAST_COOKIE)?.value);
    const [p, q = ""] = want.split("?");
    const to = req.nextUrl.clone();
    to.pathname = p;
    to.search = q ? `?${q}` : "";
    return done(NextResponse.redirect(to));
  }
  return done(res);
}

export const config = { matcher: ["/", "/dashboard/:path*", "/login", "/reset/new", "/api/note", "/api/ask"] };
