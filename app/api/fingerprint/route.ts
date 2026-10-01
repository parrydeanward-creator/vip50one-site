import { createHash } from "node:crypto";
import { identity } from "@/lib/server/auth.ts";
import { ecosystemSecret } from "@/lib/server/summary.ts";

// The SHA-256 fingerprint of the VIP_ECOSYSTEM_SECRET this site actually holds,
// for the owner only. A fingerprint is not a secret (CLAUDE.md §2); Parry
// pastes it to the ecosystem bot, which writes it into each product's
// private.partner_links `one-brain` row. The secret itself never leaves.

const OWNERS = ["parrydeanward@gmail.com"];

export const dynamic = "force-dynamic";

export async function GET() {
  const who = await identity();
  if (!who || !OWNERS.includes(who.email)) return Response.json({ error: "Not available." }, { status: 404 });
  const raw = process.env.VIP_ECOSYSTEM_SECRET;
  const secret = ecosystemSecret();
  if (!raw || !secret) return Response.json({ set: false }, { headers: { "Cache-Control": "no-store" } });
  return Response.json(
    {
      set: true,
      fingerprint: createHash("sha256").update(secret).digest("hex"),
      // true when Vercel's value had a space or line break at either end (now ignored)
      trimmed: raw !== secret,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
