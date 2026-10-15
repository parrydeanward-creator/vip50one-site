import { MOVE_URL } from "./host.ts";

// TEAM-ONBOARDING §2.1 (vip50-web-crm#256): one invite link per team, 7 days, up to 25 joins; a new link ends the old
// one. Joining is the same as the admin's Add (agent, team leads off). Owner and admins only; nothing is charged.

export const inviteUrl = `${MOVE_URL}/api/brain/team/invite`;
export const INVITE_ABOUT = "One link for several people joining at once. Anyone who opens it joins as an agent, with team leads off until you switch them on. It works for 7 days.";

export interface InviteLink { url: string; expiresAt: string | null; uses: number; maxUses: number; line: string | null }

/** The link from GET/POST/DELETE, null when there is none; undefined when the answer is not usable (hide the card). */
export function readInvite(ok: boolean, j: unknown): InviteLink | null | undefined {
  if (!ok || !j || typeof j !== "object") return undefined;
  const r = j as Record<string, unknown>;
  if (r.ok === false) return undefined;
  const l = r.link;
  if (l === null) return null;
  if (!l || typeof l !== "object") return undefined;
  const x = l as Record<string, unknown>;
  const url = typeof x.url === "string" && /^https:\/\/move\.vip50one\.com\/join\/team\/[\w-]+$/.test(x.url) ? x.url : null;
  if (!url) return undefined;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return { url, expiresAt: typeof x.expires_at === "string" ? x.expires_at : null, uses: num(x.uses, 0), maxUses: num(x.max_uses, 25), line: typeof x.line === "string" && x.line.trim() ? x.line.trim().slice(0, 120) : null };
}
