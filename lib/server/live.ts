import "server-only";
import { localDate } from "../demo.ts";
import { liveData, liveGraph } from "../live.ts";
import { identity, profileOf, type SignedIn } from "./auth.ts";
import { masterSummary, type SummaryResult } from "./summary.ts";

// Everything a signed-in agent's Brain is built from, in one place, so the
// page, the morning note and Ask ONE all see the same real data.
// Pass `pending` when the summary was already asked for (alongside the
// profile), so the two MASTER calls run side by side rather than one after
// the other.
export async function liveBundle(me: SignedIn, pending?: Promise<SummaryResult>) {
  const today = localDate("America/Denver");
  const res = await (pending ?? masterSummary(me.email));
  const env = res.ok ? res.env : null;
  const reachable = res.ok;
  return {
    res,
    graph: liveGraph(env, { pkg: me.pkg, firstName: me.firstName, reachable, today }),
    data: liveData(env, { email: me.email, firstName: me.firstName, pkg: me.pkg, founding: me.founding }, today, reachable),
  };
}

/**
 * The signed-in agent and their Brain, with MASTER's two calls (profile and
 * summary) made at the same time. Null when nobody is signed in; `bundle` is
 * null for a signed-in account without a ONE package.
 */
export async function signedInBundle() {
  const who = await identity();
  if (!who) return null;
  const pending = masterSummary(who.email);
  const me = await profileOf(who);
  if (!me.member) return { me, bundle: null };
  return { me, bundle: await liveBundle(me, pending) };
}
