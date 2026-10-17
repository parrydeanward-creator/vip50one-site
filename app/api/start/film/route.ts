import { signedIn } from "@/lib/server/auth.ts";
import { ecosystemSecret } from "@/lib/server/summary.ts";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "@/lib/master.ts";
import { filmKey } from "@/lib/gettingStarted.ts";

// Getting started step 11 (GETTING-STARTED §5, v0.2): a tour film played to the end in the Brain. Records
// `films:a` (What everything means) or `films:b` (the ONE GO tour) for the signed-in agent with MASTER's
// vip_start_mark, asked with the Brain's own `one-brain` partner secret for the email MASTER verified at sign-in.
// The secret never leaves the server and is never logged. Failures are quiet: the film still played.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await signedIn();
  if (!me) return Response.json({ ok: false, error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { film?: unknown } | null;
  const key = filmKey(body?.film);
  if (!key) return Response.json({ ok: false, error: "Which film?" }, { status: 400 });
  const secret = ecosystemSecret();
  if (!secret) return Response.json({ ok: false });
  try {
    const r = await fetch(`${MASTER_URL}/rest/v1/rpc/vip_start_mark`, {
      method: "POST",
      headers: { apikey: MASTER_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_partner: "one-brain", p_secret: secret, p_email: me.email, p_key: key }),
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    const j = r.ok ? ((await r.json().catch(() => null)) as { ok?: unknown } | null) : null;
    return Response.json({ ok: j?.ok === true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
