import { morningNote } from "@/lib/assistant.ts";
import { bearerOf } from "@/lib/bearer.ts";
import { cleanEmail, serverCallOk } from "@/lib/morningAuth.ts";
import { phoneMorning } from "@/lib/phoneMorning.ts";
import { rankToday } from "@/lib/rank.ts";
import { profileByEmail } from "@/lib/server/byEmail.ts";
import { liveBundle, signedInBundle } from "@/lib/server/live.ts";

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
  if (asked !== null) {
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
  const note = await morningNote(bundle.data, rankToday(bundle.data));
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
  return Response.json(phoneMorning(note, bundle.graph.nodes, date), { headers: NO_STORE });
}
