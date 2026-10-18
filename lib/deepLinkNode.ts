import type { Arrival } from "./deepLink.ts";
import { menuTarget } from "./examples/move.ts";
import type { BusinessGraph } from "./graph/types.ts";
import { withGrowthNodes } from "./growthOrb.ts";
import { withLearnNodes } from "./learn.ts";
import { withEventsNodes, withOutreachNodes } from "./outreach.ts";
import { demoDeals, withDealsNode } from "./deals.ts";
import { demoUpcoming, withLifeUpcomingNode } from "./lifeUpcoming.ts";
import { withOpportunities } from "./opportunities.ts";

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

/**
 * The first paint (Parry, 18 Oct; live check 18 Oct): the server draws the map before any route answers, so an orb the
 * Brain adds later (ONE Growth, Opportunities, the Outreach, Events and Learn rings, the example agent's Deals and Life
 * events) was missing, and the page painted the whole map and "Good morning" until the script ran; on a slow phone or
 * a failed script that is all the agent saw. When an arrival names such an orb, add those orbs to the first map (the
 * same builders the Brain runs once its data is in, with no data yet; the example agent's own Deals and Life events).
 * Nothing changes for a plain visit, or when the place is already on the map.
 */
export function seedArrival<G extends BusinessGraph>(g: G, a: Arrival | null, o: { growth: boolean; exampleToday: string | null }): G {
  if (!a || a.kind === "gbp") return g;
  const has = (x: G) => (id: string) => x.nodes.some((n) => n.id === id);
  if (arrivalExact(a, has(g))) return g;
  let x = withGrowthNodes(g, { growth: o.growth, siteHost: undefined, teamHosts: [], likely: false });
  x = withLearnNodes(withEventsNodes(withOutreachNodes(x, null), null), null);
  if (o.exampleToday) x = withDealsNode(withLifeUpcomingNode(x, demoUpcoming(o.exampleToday)), demoDeals(o.exampleToday), o.exampleToday);
  return withOpportunities(x);
}
