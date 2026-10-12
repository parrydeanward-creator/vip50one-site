import { morningNote } from "@/lib/assistant.ts";
import { bearerOf } from "@/lib/bearer.ts";
import { cleanEmail, serverCallOk } from "@/lib/morningAuth.ts";
import { phoneMorning } from "@/lib/phoneMorning.ts";
import { rankToday } from "@/lib/rank.ts";
import { profileByEmail } from "@/lib/server/byEmail.ts";
import { liveBundle, signedInBundle } from "@/lib/server/live.ts";
import { rulesNote } from "@/lib/note.ts";
import { within } from "@/lib/within.ts";

// Morning Pulse on the phone (VIP-SUMMARY §3ac): the Brain's own morning note as plain text for ONE GO.
// - ONE GO: the agent's MASTER session as a bearer, as /api/ask takes it.
// - ONE MOVE's server, for the 7:00 push: `?email=` plus the shared ONE_MORNING_SECRET in `x-one-morning`. Closed
//   (401) until that secret is set in both projects. Only that agent's own note; nothing is sent from here.

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const asked = url.searchParams.get("email");
  let bundle;
  // ONE MOVE's 7:00 push waits 8 s per agent (vip50-web-crm#187). The AI note gets 4 s here; past that the plain-rules
  // note (instant, same data) answers, so the push carries the agent's real first line, never the bare fallback.
  let aiMs = 20_000;
  if (asked !== null) {
    aiMs = 4_000;
    if (!serverCallOk(req.headers.get("x-one-morning"), process.env.ONE_MORNING_SECRET)) {
      return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
    }
    const email = cleanEmail(asked);
    const me = email ? await profileByEmail(email) : null;
    if (!me?.member) return Response.json({ error: "No ONE package for that agent." }, { status: 404, headers: NO_STORE });
    bundle = await liveBundle(me);
  } else {
    const live = await signedInBundle(bearerOf(req));
    if (!live?.bundle) return Response.json({ error: "Sign in first." }, { status: 401, headers: NO_STORE });
    bundle = live.bundle;
  }
  const ranked = rankToday(bundle.data);
  const data = bundle.data;
  const note = await within(morningNote(data, ranked), aiMs, () => rulesNote(data, ranked));
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
  return Response.json(phoneMorning(note, bundle.graph.nodes, date), { headers: NO_STORE });
}
