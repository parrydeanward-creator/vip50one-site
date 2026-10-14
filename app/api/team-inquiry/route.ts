import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "@/lib/master.ts";
import { ecosystemSecret } from "@/lib/server/summary.ts";
import { readTalk } from "@/lib/teamInquiry.ts";

// The sales page's "Talk to Parry" form (teams and brokerages). Saved in MASTER, which emails Parry.
export const dynamic = "force-dynamic";

const SORRY = "We could not send this just now. Please try again in a few minutes.";

export async function POST(req: Request) {
  const read = readTalk(await req.json().catch(() => null));
  if (!read.ok) return Response.json({ ok: false, error: read.error }, { status: 400 });
  const secret = ecosystemSecret();
  if (!secret) return Response.json({ ok: false, error: SORRY }, { status: 503 });
  const f = read.form;
  try {
    const r = await fetch(`${MASTER_URL}/rest/v1/rpc/team_inquiry_save`, {
      method: "POST",
      headers: { apikey: MASTER_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_partner: "one-brain", p_secret: secret, p_name: f.name, p_email: f.email, p_phone: f.phone, p_team: f.team, p_agents: f.agents }),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!r.ok) return Response.json({ ok: false, error: SORRY }, { status: 502 });
  } catch {
    return Response.json({ ok: false, error: SORRY }, { status: 502 });
  }
  return Response.json({ ok: true });
}
