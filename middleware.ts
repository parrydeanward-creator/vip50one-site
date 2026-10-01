import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookieDomainFor } from "./lib/host.ts";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "./lib/master.ts";

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
  const { data } = await sb.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;
  const demo = req.nextUrl.searchParams.get("demo") === "1";
  if (user && path === "/") {
    const to = req.nextUrl.clone();
    to.pathname = "/dashboard";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (!user && path.startsWith("/dashboard") && !demo) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (user && path === "/login") {
    const to = req.nextUrl.clone();
    to.pathname = "/dashboard";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = { matcher: ["/", "/dashboard/:path*", "/login", "/api/note", "/api/ask"] };
