import "server-only";
import { localDate } from "../demo.ts";
import { liveData, liveGraph } from "../live.ts";
import type { SignedIn } from "./auth.ts";
import { masterSummary } from "./summary.ts";

// Everything a signed-in agent's Brain is built from, in one place, so the
// page, the morning note and Ask ONE all see the same real data.
export async function liveBundle(me: SignedIn) {
  const today = localDate("America/Denver");
  const res = await masterSummary(me.email);
  const env = res.ok ? res.env : null;
  const reachable = res.ok;
  return {
    res,
    graph: liveGraph(env, { pkg: me.pkg, firstName: me.firstName, reachable, today }),
    data: liveData(env, { email: me.email, firstName: me.firstName, pkg: me.pkg, founding: me.founding }, today, reachable),
  };
}
