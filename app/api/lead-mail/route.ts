import { masterClient } from "@/lib/server/auth.ts";

// LEADS §1.1 Portals: the signed-in agent's lead email address and the last five lead emails, read with the agent's
// own MASTER session (my_lead_mail_address; inbound_mail rows are the agent's own by row-level security). No secret.

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await masterClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Sign in first." }, { status: 401 });
  const [{ data: address, error }, { data: rows }] = await Promise.all([
    sb.rpc("my_lead_mail_address"),
    sb.from("inbound_mail").select("received_at, summary, status").order("received_at", { ascending: false }).limit(5),
  ]);
  if (error || typeof address !== "string") return Response.json({ address: null }, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ address, recent: rows ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
