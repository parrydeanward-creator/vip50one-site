import { signedInBundle } from "@/lib/server/live.ts";

// The signed-in agent's Brain, fresh (Parry, 5 Oct: "the screen keeps blinking and going back
// to the dashboard"). The Brain re-reads its numbers from here every minute instead of
// router.refresh(): a refresh re-rendered the route, and once the address had moved to
// /dashboard/<page> (history.replaceState) that was a different route, so the whole Brain was
// rebuilt, the open page reloaded and the agent lost their place.

export const dynamic = "force-dynamic";

export async function GET() {
  const live = await signedInBundle();
  if (!live?.bundle) return Response.json({ error: "Sign in first." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return Response.json({ graph: live.bundle.graph }, { headers: { "Cache-Control": "no-store" } });
}
