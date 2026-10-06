// The bearer token on a request (ONE GO asking Pulse, VIP-SUMMARY §3m), or undefined. Anything that
// does not look like one is ignored, so a cookie session still works.
export function bearerOf(req: { headers: { get(name: string): string | null } }): string | undefined {
  const m = /^Bearer\s+([A-Za-z0-9._-]{20,4096})$/.exec(req.headers.get("authorization") ?? "");
  return m?.[1];
}
