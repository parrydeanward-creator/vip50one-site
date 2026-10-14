// A stale sign-in cookie next to a fresh one (14 Oct: Parry's browser held an old MASTER session cookie only for
// www.vip50one.com beside the shared .vip50one.com one; the old one was read first, so every call failed with "Refresh
// Token Not Found": website buttons missing from the menu, My Profile asking to sign in again). The browser sends both
// under the same name; these headers expire the extra copies so only the shared one is left.

const AUTH = /^sb-[a-z0-9]+-auth-token(?:-code-verifier)?(?:\.\d+)?$/;

/** Auth cookie names in a raw Cookie header, with how many times each was sent. */
export function authCookieCounts(header: string | null | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const part of (header ?? "").split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name && AUTH.test(name)) out.set(name, (out.get(name) ?? 0) + 1);
  }
  return out;
}

const expire = (name: string, domain?: string) => `${name}=; Path=/; Max-Age=0; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;

/**
 * Set-Cookie headers that clean up. Duplicates: the host-only copy goes (the shared .vip50one.com one stays). A session
 * that can no longer refresh: every copy goes, so the next sign-in starts clean.
 */
export function cleanupHeaders(header: string | null | undefined, domain: string | undefined, refreshFailed: boolean): string[] {
  const counts = authCookieCounts(header);
  const out: string[] = [];
  for (const [name, n] of counts) {
    if (refreshFailed) {
      out.push(expire(name));
      if (domain) out.push(expire(name, domain));
    } else if (n > 1 && domain) out.push(expire(name));
  }
  return out;
}
