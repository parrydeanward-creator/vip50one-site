import { readDayAI } from "@/lib/overviewAI.ts";
import { readOverview } from "@/lib/overview.ts";
import { identity, profileOf } from "@/lib/server/auth.ts";
import { bearerOf } from "@/lib/bearer.ts";

// Tell Pulse your day: POST { text, demo? } -> { items: [{id, title, start, end, where}], source }.
// Pulse (Claude) reads it when ANTHROPIC_API_KEY is set; the local reading otherwise. Signed-in agents,
// or the example agent with demo: true (local reading only, so the public demo costs nothing).

export const dynamic = "force-dynamic";
const MAX_TELL = 600;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: unknown; demo?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_TELL) return Response.json({ error: `Tell Pulse your day in up to ${MAX_TELL} characters.` }, { status: 400 });
  if (body?.demo === true) return Response.json({ items: readOverview(text), source: "rules" }, { headers: { "Cache-Control": "no-store" } });
  const token = bearerOf(req);
  const who = await identity(token);
  if (!who) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!(await profileOf(who, token)).member) return Response.json({ error: "Pulse plans days for ONE members." }, { status: 403 });
  return Response.json(await readDayAI(text), { headers: { "Cache-Control": "no-store" } });
}
