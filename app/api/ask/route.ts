import { MAX_QUESTION } from "@/lib/ask.ts";
import { askOne } from "@/lib/askAI.ts";
import { demoGraph } from "@/lib/graph/demo.ts";
import { indexGraph } from "@/lib/graph/model.ts";
import { PACKAGE_LABEL } from "@/lib/products.ts";
import type { PackageId } from "@/lib/types.ts";

// Ask ONE: POST { question, package } -> { answer, results[{id, reasons}], source }.
// Claude when ANTHROPIC_API_KEY is set, plain rules otherwise (lib/askAI.ts).
// Demo data until sign-in and the product contracts.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { question?: unknown; package?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_QUESTION) {
    return Response.json({ error: "Ask a question of up to 300 characters." }, { status: 400 });
  }
  const p = typeof body?.package === "string" ? body.package : "";
  const pkg: PackageId = p in PACKAGE_LABEL ? (p as PackageId) : "complete";
  const ix = indexGraph(demoGraph(pkg));
  const answer = await askOne(question, ix, `demo|${pkg}`);
  return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
}
