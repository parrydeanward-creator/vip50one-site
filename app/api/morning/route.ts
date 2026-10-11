import { morningNote } from "@/lib/assistant.ts";
import { bearerOf } from "@/lib/bearer.ts";
import { phoneMorning } from "@/lib/phoneMorning.ts";
import { rankToday } from "@/lib/rank.ts";
import { signedInBundle } from "@/lib/server/live.ts";

// Morning Pulse on the phone (VIP-SUMMARY §3ac): the Brain's own morning note as plain text for ONE GO, which calls
// this with the agent's MASTER session as a bearer token, as it does /api/ask. The agent's own data only.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const live = await signedInBundle(bearerOf(req));
  if (!live?.bundle) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data, graph } = live.bundle;
  const note = await morningNote(data, rankToday(data));
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
  return Response.json(phoneMorning(note, graph.nodes, date), { headers: { "Cache-Control": "no-store" } });
}
