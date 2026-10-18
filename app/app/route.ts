import { NextResponse, type NextRequest } from "next/server";
import { identity } from "@/lib/server/auth.ts";
import { appTarget } from "@/lib/landing.ts";

// vip50one.com/app (audit stage 1, 14 Oct): signed in, the Brain (or the in-Brain page ?to= names); signed out, ONE's
// sign-in, which comes back to the same place. Never ONE MOVE Classic.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const target = appTarget(req.nextUrl.searchParams.get("to"));
  const to = req.nextUrl.clone();
  to.search = "";
  if (await identity()) {
    const [p, q = ""] = target.split("?");
    to.pathname = p;
    to.search = q ? `?${q}` : "";
  } else {
    to.pathname = "/login";
    if (target !== "/dashboard") to.search = `?next=${encodeURIComponent(target)}`;
  }
  return NextResponse.redirect(to);
}
