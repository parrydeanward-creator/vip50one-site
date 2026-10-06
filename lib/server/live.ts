import "server-only";
import { localDate } from "../demo.ts";
import { OTHER_KEYS, liveData, liveGraph, type OtherAnswers } from "../live.ts";
import { includes } from "../products.ts";
import { identity, profileOf, type SignedIn } from "./auth.ts";
import { masterSummary, otherSummary, type SummaryResult } from "./summary.ts";

// Everything a signed-in agent's Brain is built from, in one place, so the
// page, the morning note and Ask ONE all see the same real data.
// Pass `pending` when the summary was already asked for (alongside the
// profile), so the two MASTER calls run side by side rather than one after
// the other.
export async function liveBundle(me: SignedIn, pending?: Promise<SummaryResult>) {
  const today = localDate("America/Denver");
  // Only the products in the agent's package are asked, all at the same time.
  const asked = OTHER_KEYS.filter((p) => includes(me.pkg, p));
  const [res, ...answers] = await Promise.all([pending ?? masterSummary(me.email), ...asked.map((p) => otherSummary(p, me.email))]);
  const env = res.ok ? res.env : null;
  const reachable = res.ok;
  const others: OtherAnswers = {};
  asked.forEach((p, k) => {
    const a = answers[k];
    // A product that refuses ONE (no `one-brain` row yet) shows as not connected.
    if (!a.ok && a.reason !== "unreachable") return;
    others[p] = { env: a.ok ? a.env : null, reachable: a.ok };
  });
  return {
    res,
    graph: liveGraph(env, { pkg: me.pkg, firstName: me.firstName, reachable, today }, others),
    data: liveData(env, { email: me.email, firstName: me.firstName, pkg: me.pkg, founding: me.founding }, today, reachable, others),
  };
}

/**
 * The signed-in agent and their Brain, with MASTER's two calls (profile and
 * summary) made at the same time. Null when nobody is signed in; `bundle` is
 * null for a signed-in account without a ONE package.
 */
export async function signedInBundle(token?: string) {
  const who = await identity(token);
  if (!who) return null;
  const pending = masterSummary(who.email);
  const me = await profileOf(who, token);
  if (!me.member) return { me, bundle: null };
  return { me, bundle: await liveBundle(me, pending) };
}
