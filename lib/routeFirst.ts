// ONE MOVE's own route first (New to Sort, Looks Hot, past clients for Likely to move). The Brain's own fallback is
// used only when the route is not there: a 404 or 405, or no answer at all (a route ONE MOVE has not shipped answers
// without CORS, so the fetch itself fails). Any other refusal (signed out, a 500, a wrong shape) is not a reason to
// show a list built another way: the orb keeps what it had.

export type RouteAnswer<T> = { kind: "data"; data: T } | { kind: "missing" } | { kind: "error" };

export async function readRoute<T>(url: string, read: (j: unknown) => T | null, f: typeof fetch = fetch): Promise<RouteAnswer<T>> {
  let r: Response;
  try {
    r = await f(url, { credentials: "include", cache: "no-store" });
  } catch {
    return { kind: "missing" };
  }
  if (r.status === 404 || r.status === 405) return { kind: "missing" };
  if (!r.ok) return { kind: "error" };
  const j = await r.json().catch(() => null);
  const data = j == null ? null : read(j);
  return data == null ? { kind: "error" } : { kind: "data", data };
}
