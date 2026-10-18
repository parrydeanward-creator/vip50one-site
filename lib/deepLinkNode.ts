import type { Arrival } from "./deepLink.ts";
import { menuTarget } from "./examples/move.ts";

// Where an arrival (lib/deepLink.ts) lands on this agent's map. Pure.

export type Landing = { id: string; exact: true } | { id: string; exact: false; note: string } | null;

/** The orb that is the asked-for place, if the map has it now. */
export function arrivalExact(a: Arrival, has: (id: string) => boolean): string | null {
  if (a.kind === "gbp") return null;
  if (a.kind === "page") {
    const id = menuTarget(a.path, has);
    return has(id) ? id : a.alt.find(has) ?? null;
  }
  return a.ids.find(has) ?? null;
}

/**
 * Where to land: the place itself; or, once it is clear it will not come (`final`), the nearest orb the map has (a
 * locked product shows its locked line; anything else carries a plain note). null: wait (it may still arrive).
 */
export function landing(a: Arrival, has: (id: string) => boolean, locked: (id: string) => boolean, final: boolean): Landing {
  if (a.kind === "gbp") return null;
  const id = arrivalExact(a, has);
  if (id) return { id, exact: true };
  // A locked product orb is the answer itself (its panel says what it is and how to add it): no need to wait.
  const lockedNow = a.fallback.find((f) => has(f) && locked(f));
  if (lockedNow) return { id: lockedNow, exact: false, note: "" };
  if (!final) return null;
  const near = a.fallback.find(has);
  return near ? { id: near, exact: false, note: a.missing } : null;
}
