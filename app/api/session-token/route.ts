import { masterClient } from "@/lib/server/auth.ts";
import { sameOriginAsk } from "@/lib/moveAuth.ts";

// The Brain's own MASTER access token, for the browser to send to ONE MOVE's /api/brain/* as `Authorization: Bearer`
// (lib/moveAuth.ts; 17 Oct, a stale sign-in cookie on move.vip50one.com made every Brain save to ONE MOVE fail).
// Same origin only, never cached, never logged. getClaims checks the session (and refreshes it when it has run out)
// before the token is handed back.

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, private", Vary: "Cookie" };

export async function GET(req: Request) {
  if (!sameOriginAsk(req.headers.get("sec-fetch-site"), req.headers.get("origin"), req.headers.get("host"))) {
    return Response.json({ error: "Forbidden." }, { status: 403, headers: noStore });
  }
  const sb = await masterClient();
  const { data } = await sb.auth.getClaims();
  if (!data?.claims?.sub) return Response.json({ error: "Sign in first." }, { status: 401, headers: noStore });
  const { data: s } = await sb.auth.getSession();
  const token = s.session?.access_token;
  if (!token) return Response.json({ error: "Sign in first." }, { status: 401, headers: noStore });
  return Response.json({ access_token: token, expires_at: s.session?.expires_at ?? 0 }, { headers: noStore });
}
