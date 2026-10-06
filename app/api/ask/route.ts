import { MAX_QUESTION } from "@/lib/ask.ts";
import { askOne } from "@/lib/askAI.ts";
import { demoGraph } from "@/lib/graph/demo.ts";
import { indexGraph } from "@/lib/graph/model.ts";
import { PACKAGE_LABEL } from "@/lib/products.ts";
import type { PackageId } from "@/lib/types.ts";
import { signedInBundle } from "@/lib/server/live.ts";
import { bearerOf } from "@/lib/bearer.ts";
import { askItems } from "@/lib/ask.ts";

// Ask ONE: POST { question, package } -> { answer, results[{id, reasons}], source }.
// Claude when ANTHROPIC_API_KEY is set, plain rules otherwise (lib/askAI.ts).
// demo: true asks about the made-up agent; otherwise the signed-in agent's
// own data from MASTER.
// One Pulse (VIP-SUMMARY §3m): ONE GO asks the same Pulse with its own MASTER session as a bearer
// token, and gets `items` it can open on the phone (title, reasons, ref, contact_id, link).

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { question?: unknown; package?: unknown; demo?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_QUESTION) {
    return Response.json({ error: "Ask a question of up to 300 characters." }, { status: 400 });
  }
  const p = typeof body?.package === "string" ? body.package : "";
  const pkg: PackageId = p in PACKAGE_LABEL ? (p as PackageId) : "complete";
  if (body?.demo === true) {
    const answer = await askOne(question, indexGraph(demoGraph(pkg)), `demo|${pkg}`);
    return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
  }
  const live = await signedInBundle(bearerOf(req));
  if (!live?.bundle) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { me } = live;
  const { graph } = live.bundle;
  const ix = indexGraph(graph);
  const answer = await askOne(question, ix, `live|${me.email}|${new Date().toISOString().slice(0, 13)}`);
  return Response.json({ ...answer, items: askItems(ix, answer) }, { headers: { "Cache-Control": "no-store" } });
}
