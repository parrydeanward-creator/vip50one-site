import { morningNote } from "@/lib/assistant.ts";
import { demoData } from "@/lib/demo.ts";
import { PACKAGE_LABEL } from "@/lib/products.ts";
import { rankToday } from "@/lib/rank.ts";
import type { PackageId } from "@/lib/types.ts";

// The morning note for ONE's card. Written by Claude when ANTHROPIC_API_KEY is
// set; otherwise, or if anything goes wrong, the plain rules write it
// (lib/assistant.ts). Demo data until sign-in and the product contracts.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("package") ?? "";
  const pkg: PackageId = p in PACKAGE_LABEL ? (p as PackageId) : "complete";
  const data = demoData({ pkg });
  const note = await morningNote(data, rankToday(data));
  return Response.json(note, { headers: { "Cache-Control": "no-store" } });
}
