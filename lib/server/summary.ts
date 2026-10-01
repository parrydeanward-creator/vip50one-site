import "server-only";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "../master.ts";
import type { OtherKey, SummaryEnvelope } from "../live.ts";

// MASTER's answer to vip_summary for one agent (VIP-SUMMARY.md). The secret
// never leaves the server; the email is the one MASTER verified at sign-in.
// The Brain waits at most 1.5 s per product, all at once, then shows
// "couldn't reach" for any that did not answer (§1).

export type SummaryResult = { ok: true; env: SummaryEnvelope } | { ok: false; reason: "no-secret" | "unreachable" | "unauthorized" };

export async function masterSummary(email: string): Promise<SummaryResult> {
  return askSummary(MASTER_URL, MASTER_PUBLISHABLE_KEY, email);
}

// Marquee, ONE Open and Showly answer the same contract from their own
// databases (built 1 Oct; `one-brain` rows written by the ecosystem bot).
// Publishable keys: public by design, like MASTER's.
export const OTHER_SOURCES: Record<OtherKey, { url: string; key: string }> = {
  marquee: { url: "https://etsmvpptyukttnaoamnh.supabase.co", key: "sb_publishable_vMKRfTEYfLhaWoUykNZwrQ_i_NkGCA8" },
  open: { url: "https://zrbwywbtykuvifxrplho.supabase.co", key: "sb_publishable_udIPYrs0Ddz8dXTpOYIdhQ_1RZSvzUc" },
  showly: { url: "https://nhkgxpkfuvzcesdcnher.supabase.co", key: "sb_publishable_DJ54fLUWwY1gaLamxsh0rQ_dPJW9ORp" },
};

export async function otherSummary(p: OtherKey, email: string): Promise<SummaryResult> {
  return askSummary(OTHER_SOURCES[p].url, OTHER_SOURCES[p].key, email);
}

async function askSummary(base: string, apikey: string, email: string): Promise<SummaryResult> {
  const secret = process.env.VIP_ECOSYSTEM_SECRET;
  if (!secret) return { ok: false, reason: "no-secret" };
  try {
    const r = await fetch(`${base}/rest/v1/rpc/vip_summary`, {
      method: "POST",
      headers: { apikey, "Content-Type": "application/json" },
      body: JSON.stringify({ p_partner: "one-brain", p_secret: secret, p_email: email }),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (r.status === 400 || r.status === 401 || r.status === 403) {
      const body = await r.text();
      return { ok: false, reason: body.includes("unauthorized") ? "unauthorized" : "unreachable" };
    }
    if (!r.ok) return { ok: false, reason: "unreachable" };
    return { ok: true, env: (await r.json()) as SummaryEnvelope };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
