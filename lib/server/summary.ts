import "server-only";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "../master.ts";
import type { SummaryEnvelope } from "../live.ts";

// MASTER's answer to vip_summary for one agent (VIP-SUMMARY.md). The secret
// never leaves the server; the email is the one MASTER verified at sign-in.
// The Brain waits at most 1.5 s, then shows "couldn't reach" (§1).

export type SummaryResult = { ok: true; env: SummaryEnvelope } | { ok: false; reason: "no-secret" | "unreachable" | "unauthorized" };

export async function masterSummary(email: string): Promise<SummaryResult> {
  const secret = process.env.VIP_ECOSYSTEM_SECRET;
  if (!secret) return { ok: false, reason: "no-secret" };
  try {
    const r = await fetch(`${MASTER_URL}/rest/v1/rpc/vip_summary`, {
      method: "POST",
      headers: { apikey: MASTER_PUBLISHABLE_KEY, "Content-Type": "application/json" },
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
