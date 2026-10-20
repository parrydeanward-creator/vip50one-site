import "server-only";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "../master.ts";
import { parseVoice, type Voice } from "../voice.ts";
import { ecosystemSecret } from "./summary.ts";

// The agent's voice from MASTER (vip_agent_voice, partner one-brain), for Pulse Drafts. 2 seconds, kept 10 minutes per
// agent; null on any failure, and Pulse then drafts as it did before (PROFILE §5c O3).
const TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; v: Voice | null }>();

export async function agentVoice(email: string): Promise<Voice | null> {
  const key = email.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.v;
  const secret = ecosystemSecret();
  if (!secret || !key) return null;
  try {
    const r = await fetch(`${MASTER_URL}/rest/v1/rpc/vip_agent_voice`, {
      method: "POST",
      headers: { apikey: MASTER_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_partner: "one-brain", p_secret: secret, p_email: key }),
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    const v = r.ok ? parseVoice(await r.json()) : null;
    if (r.ok) cache.set(key, { at: Date.now(), v });
    return v;
  } catch {
    return null;
  }
}
