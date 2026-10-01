import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "./lib/master.ts";

// Keeps the MASTER session fresh and sends signed-out visitors from the
// dashboard to sign-in. ?demo=1 keeps the made-up agent reachable for the
// films and screenshots (it shows no one's real data).

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(MASTER_URL, MASTER_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  const demo = req.nextUrl.searchParams.get("demo") === "1";
  if (!data.user && path.startsWith("/dashboard") && !demo) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (data.user && path === "/login") {
    const to = req.nextUrl.clone();
    to.pathname = "/dashboard";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = { matcher: ["/dashboard/:path*", "/login", "/api/note", "/api/ask"] };
