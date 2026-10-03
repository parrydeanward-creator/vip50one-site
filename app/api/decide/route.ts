import { masterClient } from "@/lib/server/auth.ts";

// VIP-SUMMARY §3b (v1.3): Accept or Dismiss a listing suggestion from the
// Brain. Called with the agent's own MASTER session (the shared sign-in), never
// a secret; listing_suggestion_decide checks auth.uid() and acts only on the
// caller's own suggestions.

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const { id, accept, gci } = (body ?? {}) as { id?: unknown; accept?: unknown; gci?: unknown };
  if (typeof id !== "string" || !UUID.test(id) || typeof accept !== "boolean") return Response.json({ error: "Bad request." }, { status: 400 });
  const g = gci == null || gci === "" ? null : Number(gci);
  if (g !== null && (!Number.isFinite(g) || g < 0 || g > 100_000_000)) return Response.json({ error: "GCI must be a number." }, { status: 400 });

  const sb = await masterClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await sb.rpc("listing_suggestion_decide", { p_id: id, p_accept: accept, p_gci: accept ? g : null });
  if (error) return Response.json({ error: "ONE MOVE didn't take that. Try again, or decide it in ONE MOVE." }, { status: 502 });
  return Response.json(data ?? {}, { headers: { "Cache-Control": "no-store" } });
}
