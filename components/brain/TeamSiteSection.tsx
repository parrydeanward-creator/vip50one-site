"use client";

import { useEffect, useState } from "react";
import { REACH_GOAL, reachWords, readTeamSite, slowReach, smsLink, teamSiteUrl, type TeamSite } from "@/lib/siteActivity.ts";
import { exampleTeamSiteBody } from "@/lib/examples/siteActivity.ts";
import "@/app/site-activity.css";

// "Team sites this week" for a team's owner and admins (VIP-SUMMARY §3ar; Parry, 23 Oct: "yes build it. looks great";
// research/mockups/client-portal #lead). Every site on the team, by agent: visits, signed-in people, leads and time to
// reach, with a Nudge for a slow one (a text draft on the lead's own phone; nothing is sent from ONE). Team-site
// visitors waiting to be routed open Team Leads to assign; the homes the team's visitors want. ONE MOVE answers only an
// owner or admin; anyone else, or a route not live yet, shows nothing.

const nudge = (first: string, minutes: number | null) =>
  minutes == null ? `Hi ${first}, your new site leads this week are still waiting on a first call. Can you reach them today?` : `Hi ${first}, your site leads waited about ${reachWords(minutes)} this week. Can we get that under ${REACH_GOAL} minutes?`;

export default function TeamSiteSection({ live, people, onTeamLeads, onOpenAgent }: {
  live: boolean;
  /** The team's people from the war room (phones for the Nudge). */
  people: { id: string; first: string; phone?: string | null }[];
  onTeamLeads: () => void;
  onOpenAgent: (id: string) => boolean;
}) {
  const [t, setT] = useState<TeamSite | null>(() => (live ? null : readTeamSite(exampleTeamSiteBody())));
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    if (!live) return;
    let gone = false;
    fetch(teamSiteUrl("7d"), { credentials: "include", cache: "no-store" })
      .then(async (r) => (r.status === 200 ? readTeamSite(await r.json().catch(() => null)) : null))
      .catch(() => null)
      .then((x) => {
        if (!gone) setT(x);
      });
    return () => {
      gone = true;
    };
  }, [live]);
  if (!t) return null;

  const first = (name: string) => name.replace(/\s*\(example\)$/, "").split(" ")[0];
  const open = (id: string, name: string) => {
    if (!onOpenAgent(id)) setSaid(`${first(name)} is not on the map yet. Their leads are in Team Leads.`);
  };
  const doNudge = (id: string, name: string, minutes: number | null) => {
    const p = people.find((x) => x.id === id);
    const href = smsLink(p?.phone ?? null, nudge(first(name), minutes));
    if (!live) return setSaid(`(Example: nothing was sent.) A text to ${first(name)} would open on your phone: "${nudge(first(name), minutes)}"`);
    if (href) window.location.href = href;
    else setSaid(`No mobile number for ${first(name)} in ONE MOVE. Nudge them from Team Leads.`);
  };

  return (
    <section className="sa-team" aria-label="Team sites this week">
      <h2>{live ? "Team sites this week" : "Team sites this week (example)"}</h2>
      <p className="d-sum">The team site plus every agent's site. Team-site visitors and team leads are named; an agent's own clients are counts only.</p>
      <dl className="th-figs">
        <div><dt>Visits, all sites</dt><dd>{t.visits.toLocaleString("en-US")}</dd></div>
        <div><dt>Signed in</dt><dd>{t.signedIn}</dd></div>
        <div><dt>New leads</dt><dd>{t.newLeads}</dd></div>
        <div className={t.avgMinutesToReach != null && t.avgMinutesToReach > REACH_GOAL ? "today" : undefined}>
          <dt>Avg time to reach</dt>
          <dd>{t.avgMinutesToReach == null ? "–" : `${Math.round(t.avgMinutesToReach)}m`}</dd>
        </div>
      </dl>
      {t.agents.length ? (
        <>
          <h3>By agent</h3>
          <ul className="sa-tl-agents" aria-label="Team sites by agent">
            {t.agents.map((a) => {
              const slow = slowReach(a);
              return (
                <li key={a.userId}>
                  <span>
                    <b>{a.name}</b>
                    <small>
                      {a.visits.toLocaleString("en-US")} visits · {a.signedIn} signed in · {a.newLeads} {a.newLeads === 1 ? "lead" : "leads"} ·{" "}
                      <span className={slow ? "tw-late" : undefined}>reach {reachWords(a.minutesToReach)}</span>
                    </small>
                  </span>
                  {slow ? (
                    <button type="button" className="chip-btn primary" onClick={() => doNudge(a.userId, a.name, a.minutesToReach)}>Nudge</button>
                  ) : (
                    <button type="button" className="chip-btn" onClick={() => open(a.userId, a.name)}>Open</button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {t.toRoute.length ? (
        <>
          <h3>Team-site visitors to route</h3>
          <ul className="sa-tl-agents" aria-label="Team-site visitors to route">
            {t.toRoute.map((r) => (
              <li key={r.contactId}>
                <span><b>{r.name}</b><small>{r.line}</small></span>
                <button type="button" className="chip-btn primary" onClick={onTeamLeads}>Assign</button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {t.topHomes.length ? (
        <>
          <h3>Top homes across the team</h3>
          <ul className="sa-tl-agents" aria-label="Top homes across the team">
            {t.topHomes.map((h) => (
              <li key={h.address}>
                <span><b>{h.address}</b><small>{h.views} views · {h.saves} saves{h.agent ? ` · ${h.agent}` : ""}</small></span>
                <button type="button" className="chip-btn" onClick={onTeamLeads}>Leads</button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {said ? <p className="pf-sub" role="status">{said}</p> : null}
      <p className="pf-sub">Nothing is sent from here: a Nudge opens a text on your own phone.</p>
    </section>
  );
}
