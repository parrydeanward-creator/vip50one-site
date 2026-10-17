"use client";

import { useState } from "react";
import { SOURCE_WORDS, cameIn, exampleWar30, isEmptyWar, reachWords, reassignError, reassignUrl, rotationUrl, sourceWords, type SourceKey, type War30 } from "@/lib/teamPeople.ts";

// The War room's 30 days (lib/teamPeople.ts), for the team lead: leads in, by source and by agent; the last 7 days' leads
// with who has each and whether they were reached (late ones red); Reassign per lead and the rotation switch. Pond access
// per agent stays in ONE MOVE's Team leads. Nothing is ever sent to a lead from here.
const SOURCES: SourceKey[] = ["team_site", "team_ads", "growth", "other"];

export default function TeamWarPanel({ war, agents, now, live, onChanged, onTeamLeads }: {
  war: War30;
  agents: { id: string; first: string }[];
  now: number;
  live: boolean;
  onChanged: () => void;
  onTeamLeads: () => void;
}) {
  const empty = isEmptyWar(war);
  const shown = empty ? exampleWar30(now) : war;
  const example = empty || !!war.example;
  const [pick, setPick] = useState<Record<string, string>>({});
  const [said, setSaid] = useState<Record<string, { ok: boolean; words: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [rotation, setRotation] = useState(war.rotationOn);
  const [rotSaid, setRotSaid] = useState<string | null>(null);

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    return { r, j };
  };

  const reassign = async (contactId: string, first: string) => {
    const to = pick[contactId];
    if (!to) return;
    const name = agents.find((a) => a.id === to)?.first ?? "them";
    if (example || !live) {
      setSaid((s) => ({ ...s, [contactId]: { ok: true, words: `Example only: nothing changed. On your team, ${first} would go to ${name}.` } }));
      return;
    }
    setBusy(contactId);
    try {
      const { r, j } = await post(reassignUrl, { contact_id: contactId, to_agent_id: to });
      if (r.ok && j?.ok) {
        setSaid((s) => ({ ...s, [contactId]: { ok: true, words: `${first} is now with ${name}.` } }));
        onChanged();
      } else setSaid((s) => ({ ...s, [contactId]: { ok: false, words: reassignError(r.status, j) } }));
    } catch {
      setSaid((s) => ({ ...s, [contactId]: { ok: false, words: reassignError(0, null) } }));
    }
    setBusy(null);
  };

  const switchRotation = async () => {
    const want = !rotation;
    setAsking(false);
    if (example || !live) {
      setRotSaid("Example only: nothing changed.");
      return;
    }
    setBusy("rotation");
    try {
      const { r, j } = await post(rotationUrl, { on: want });
      if (r.ok && j?.ok) {
        setRotation(j.rotation_on === true);
        setRotSaid(j.rotation_on ? "Rotation is on: new team leads go to the next agent in turn." : `Rotation is off: new team leads go to ${typeof j.default_route === "string" && j.default_route ? j.default_route : "the default route"}.`);
        onChanged();
      } else setRotSaid("Rotation did not change. Try again, or switch it in ONE MOVE's Team leads.");
    } catch {
      setRotSaid("Rotation did not change. Try again, or switch it in ONE MOVE's Team leads.");
    }
    setBusy(null);
  };

  return (
    <section className="tw-panel" aria-label="War room, last 30 days">
      {empty ? (
        <div className="tw-empty">
          <h2>No team leads yet</h2>
          <p className="d-sum">
            Team leads come from three places: the team site (a visitor asks a question or books a showing), team ads (run by you
            as the team lead) and ONE Growth. They start once the team site is live, a team ad is running, or ONE Growth is on for
            the team. Each lead then shows here: who has it, and whether they were reached in time.
          </p>
          <p className="tw-example">Below is an example, so you can see how it looks. None of it is real.</p>
        </div>
      ) : null}
      <h2>{example ? "Last 30 days (example)" : "Last 30 days"}</h2>
      <dl className="th-figs">
        <div><dt>Leads in</dt><dd>{shown.leadsIn}</dd></div>
        {SOURCES.map((k) => (
          <div key={k}><dt>{SOURCE_WORDS[k]}</dt><dd>{shown.bySource[k]}</dd></div>
        ))}
        <div className={shown.pondCount ? "today" : undefined}><dt>Lead pool</dt><dd>{shown.pondCount}</dd></div>
      </dl>
      {shown.byAgent.length ? (
        <>
          <h2>By agent</h2>
          <ul className="th-people" aria-label="Team leads by agent">
            {shown.byAgent.map((a) => (
              <li key={a.id}>
                <b>{a.first}</b>
                <small>
                  {a.leads} {a.leads === 1 ? "lead" : "leads"}, average reach {reachWords(a.avgReach)}
                  {a.late ? <span className="tw-late">, {a.late} late</span> : null}
                </small>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h2>{example ? "Last 7 days (example)" : "Last 7 days"}</h2>
      {shown.live.length ? (
        <ul className="tw-live" aria-label="Team leads, last 7 days">
          {shown.live.map((l) => (
            <li key={l.contactId} className={l.late ? "late" : undefined}>
              <span>
                <b>{l.first}</b>
                <small>{sourceWords(l.source)} · {l.holderFirst ? `with ${l.holderFirst}` : "in the lead pool"} · {cameIn(l.at, now)}</small>
                <small className={l.late ? "tw-late" : l.reached ? "tw-ok" : undefined}>{l.reached ? "Reached" : l.late ? "Not reached, late" : "Not reached yet"}</small>
              </span>
              <span className="tw-move">
                <select
                  aria-label={`Reassign ${l.first} to`}
                  value={pick[l.contactId] ?? ""}
                  onChange={(e) => setPick((p) => ({ ...p, [l.contactId]: e.target.value }))}
                >
                  <option value="">Reassign to...</option>
                  {agents.filter((a) => a.id !== l.holderId).map((a) => (
                    <option key={a.id} value={a.id}>{a.first}</option>
                  ))}
                </select>
                <button type="button" className="chip-btn" aria-label={`Reassign ${l.first}`} disabled={!pick[l.contactId] || busy === l.contactId} onClick={() => reassign(l.contactId, l.first)}>
                  {busy === l.contactId ? "Moving" : "Reassign"}
                </button>
              </span>
              {said[l.contactId] ? <small role="status" className={said[l.contactId].ok ? "tw-ok" : "tw-late"}>{said[l.contactId].words}</small> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="d-sum">No team leads in the last 7 days.</p>
      )}
      <div className="tw-rot">
        <span>
          <b>Lead rotation</b>
          <small>{rotation ? "On: new team leads go to the next agent in turn." : "Off: new team leads follow the team's default route."}</small>
        </span>
        <button type="button" role="switch" aria-checked={rotation} aria-label="Lead rotation" className="chip-btn" disabled={busy === "rotation"} onClick={() => setAsking(true)}>
          {rotation ? "On" : "Off"}
        </button>
      </div>
      {asking ? (
        <div className="tm-confirm" role="group" aria-label="Confirm lead rotation">
          <p>{rotation ? "Turn lead rotation off? New team leads will follow the team's default route." : "Turn lead rotation on? New team leads will go to the next agent in turn."}</p>
          <div className="decide-btns">
            <button type="button" className="chip-btn primary" onClick={switchRotation}>{rotation ? "Yes, turn it off" : "Yes, turn it on"}</button>
            <button type="button" className="chip-btn" onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {rotSaid ? <p className="pf-sub" role="status">{rotSaid}</p> : null}
      <p className="pf-sub">
        Lead pool: {shown.pondCount} waiting. Who may take from the pool is set per agent in ONE MOVE.{" "}
        <button type="button" className="tw-link" onClick={onTeamLeads}>Open Team leads in ONE MOVE</button>
      </p>
      <p className="pf-sub">Nothing is sent to a lead from here.</p>
    </section>
  );
}
