import { NextResponse, type NextRequest } from "next/server";
import { masterClient } from "@/lib/server/auth.ts";
import { isOtpType, safeNext } from "@/lib/reset.ts";

// Where MASTER's email links land (password reset first). Either form of link is accepted: a token hash (the email
// template's {{ .TokenHash }}) or a one-time code (the default link). Signed in, the agent goes on to `next`, which can
// only be a path on this site.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const next = safeNext(q.get("next"));
  const back = (path: string) => {
    const to = req.nextUrl.clone();
    const [p, s = ""] = path.split("?");
    to.pathname = p;
    to.search = s ? `?${s}` : "";
    return NextResponse.redirect(to);
  };
  const sb = await masterClient();
  const tokenHash = q.get("token_hash");
  const type = q.get("type");
  const code = q.get("code");
  if (tokenHash && isOtpType(type)) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    return back(error ? "/reset?error=expired" : next);
  }
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    return back(error ? "/reset?error=expired" : next);
  }
  return back("/reset?error=expired");
}
