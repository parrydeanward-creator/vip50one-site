import { readDraftRequest, rulesDraft } from "@/lib/drafts.ts";
import { draftTouch } from "@/lib/draftAI.ts";
import { signedInBundle } from "@/lib/server/live.ts";
import { bearerOf } from "@/lib/bearer.ts";

// Pulse Drafts: POST { kind, facts, agentFirst?, ask?, demo? } -> Draft. Signed-in agents get Pulse's draft (plain
// rules when the model is not available); the demo gets the plain-rules draft only. Nothing is sent from here.

export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; at: number }>();
const PER_HOUR = 60;

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const r = readDraftRequest(raw);
  if (!r) return Response.json({ error: "Pick what to draft." }, { status: 400 });
  if ((raw as { demo?: unknown }).demo === true) return Response.json(rulesDraft(r.kind, r.facts, r.agentFirst), { headers: { "Cache-Control": "no-store" } });
  const live = await signedInBundle(bearerOf(req));
  if (!live?.me) return Response.json({ error: "Sign in first." }, { status: 401 });
  const key = live.me.email, now = Date.now();
  const h = hits.get(key);
  const cur = h && now - h.at < 3_600_000 ? h : { n: 0, at: now };
  if (cur.n >= PER_HOUR) return Response.json({ error: "That's a lot of drafts this hour. Try again in a little while." }, { status: 429 });
  hits.set(key, { n: cur.n + 1, at: cur.at });
  const d = await draftTouch(r.kind, r.facts, live.me.firstName || r.agentFirst, r.ask);
  return Response.json(d, { headers: { "Cache-Control": "no-store" } });
}
