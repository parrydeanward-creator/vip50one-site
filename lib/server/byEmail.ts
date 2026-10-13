import "server-only";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "../master.ts";
import { firstNameOf, initials, packageOf } from "../live.ts";
import type { SignedIn } from "./auth.ts";
import { ecosystemSecret } from "./summary.ts";

// One agent's profile without their session, for server-to-server calls only (§3ac: ONE MOVE's 7:00 push). Uses the
// Brain's own `one-brain` partner secret with MASTER's vip_entitlement and vip_profile, the same gate as vip_summary.

async function rpc(fn: string, email: string): Promise<Record<string, unknown> | null> {
  const secret = ecosystemSecret();
  if (!secret) return null;
  try {
    const r = await fetch(`${MASTER_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: MASTER_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_partner: "one-brain", p_secret: secret, p_email: email }),
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    return r.ok ? ((await r.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The agent as the Brain needs them, from MASTER by email; null when MASTER does not know them. */
export async function profileByEmail(email: string): Promise<SignedIn | null> {
  const [ent, prof] = await Promise.all([rpc("vip_entitlement", email), rpc("vip_profile", email)]);
  if (!ent || !prof || prof.found !== true) return null;
  const name = (typeof prof.preferred_name === "string" && prof.preferred_name.trim()) || (typeof prof.full_name === "string" ? prof.full_name.trim() : "");
  const firstName = firstNameOf(name, email);
  return {
    email,
    firstName,
    displayName: name || firstName,
    initials: initials(name || firstName),
    pkg: packageOf(typeof ent.plan === "string" ? ent.plan : null),
    founding: false,
    member: ent.member === true,
    admin: false,
    // ENTITLEMENT §3 v1.4: "growth" in detail.includes (the Growth plan, or the add-on on Complete/Elite)
    growth: Array.isArray((ent.detail as { includes?: unknown } | undefined)?.includes) && ((ent.detail as { includes: unknown[] }).includes).includes("growth"),
  };
}
