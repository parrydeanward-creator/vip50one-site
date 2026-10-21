"use client";

import { dollars, type Network, type Revshare } from "@/lib/rezenOrbs.ts";
import { REZEN_OPEN, sinceWords, type RezenPlan } from "@/lib/rezen.ts";

// The Revenue share and My network orbs (REZEN.md §3a): what reZEN sent, for the agent only. Read only; reZEN itself
// is one tap away.
export function RevsharePanel({ r, plans = [] }: { r: Revshare; plans?: RezenPlan[] }) {
  const max = Math.max(1, ...r.months.map((m) => m.earnings));
  return (
    <section className="rz-orb" aria-label="Revenue share">
      <dl className="rz-figs">
        <div><dt>Paid</dt><dd>{dollars(r.paid)}</dd></div>
        <div><dt>Pending</dt><dd>{dollars(r.pending)}{r.contributions ? <small> from {r.contributions}</small> : null}</dd></div>
      </dl>
      {r.months.length ? (
        <ol className="rz-bars" aria-label="Month by month">
          {r.months.map((m) => (
            <li key={m.label} title={`${m.label}: ${dollars(m.earnings)}`}>
              <span style={{ height: `${Math.round((m.earnings / max) * 100)}%` }} />
              <small>{m.label}</small>
            </li>
          ))}
        </ol>
      ) : null}
      <PlansList plans={plans} />
      <Foot at={r.readAt} />
    </section>
  );
}

export function NetworkPanel({ n }: { n: Network }) {
  return (
    <section className="rz-orb" aria-label="My network">
      {n.tiers.length ? (
        <dl className="rz-figs">
          {n.tiers.map((t) => (
            <div key={t.tier}><dt>Tier {t.tier}</dt><dd>{t.size}</dd></div>
          ))}
        </dl>
      ) : null}
      {n.front.length ? (
        <>
          <h2 className="rz-h">Front line</h2>
          <ul className="rz-front">
            {n.front.map((a) => (
              <li key={`${a.name}-${a.since}`}>
                <b>{a.name}</b>
                <small>{[a.status ? a.status.charAt(0) + a.status.slice(1).toLowerCase() : null, a.network ? `${a.network} in their network` : null, a.since ? `since ${a.since.slice(0, 10)}` : null].filter(Boolean).join(" · ")}</small>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Foot at={n.readAt} />
    </section>
  );
}

function Foot({ at }: { at: string | null }) {
  return (
    <p className="pf-sub">
      From reZEN{at ? `, read ${sinceWords(at) ?? "recently"}` : ""}. Change what comes through in My Profile.{" "}
      <a href={REZEN_OPEN} target="_blank" rel="noopener noreferrer">Open reZEN ↗</a>
    </p>
  );
}

/** My plans (vip50-web-crm#349): each kind of plan reZEN has for the agent, with its name. Hidden when there are none. */
export function PlansList({ plans }: { plans: RezenPlan[] }) {
  if (!plans.length) return null;
  return (
    <>
      <h2 className="rz-h">My plans</h2>
      <ul className="rz-front" aria-label="My plans">
        {plans.map((p) => (
          <li key={p.kind}>
            <b>{p.kind}</b>
            <small>{p.plan}</small>
          </li>
        ))}
      </ul>
    </>
  );
}
