import { morningNote } from "@/lib/assistant.ts";
import { demoData } from "@/lib/demo.ts";
import { PACKAGE_LABEL } from "@/lib/products.ts";
import { rankToday } from "@/lib/rank.ts";
import { signedInBundle } from "@/lib/server/live.ts";
import type { PackageId } from "@/lib/types.ts";

// The morning note for ONE's card. Written by Claude when ANTHROPIC_API_KEY is
// set; otherwise, or if anything goes wrong, the plain rules write it
// (lib/assistant.ts). ?demo=1: the made-up agent. Otherwise the signed-in
// agent's own data from MASTER.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (q.get("demo") === "1") {
    const p = q.get("package") ?? "";
    const pkg: PackageId = p in PACKAGE_LABEL ? (p as PackageId) : "complete";
    const data = demoData({ pkg });
    return Response.json(await morningNote(data, rankToday(data)), { headers: { "Cache-Control": "no-store" } });
  }
  const live = await signedInBundle();
  if (!live?.bundle) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data } = live.bundle;
  return Response.json(await morningNote(data, rankToday(data)), { headers: { "Cache-Control": "no-store" } });
}
