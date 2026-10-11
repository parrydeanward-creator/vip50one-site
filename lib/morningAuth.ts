import { timingSafeEqual } from "node:crypto";

// §3ac server path: ONE MOVE's server asks for one agent's Morning Pulse with the shared ONE_MORNING_SECRET in the
// `x-one-morning` header. No secret set means the path is closed. Compared in constant time.
export function serverCallOk(header: string | null, secret: string | undefined): boolean {
  const s = secret?.trim();
  if (!s || !header) return false;
  const a = Buffer.from(header.trim());
  const b = Buffer.from(s);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A plain, lower-cased email or null. */
export function cleanEmail(v: string | null): string | null {
  const e = v?.trim().toLowerCase() ?? "";
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/.test(e) ? e : null;
}
