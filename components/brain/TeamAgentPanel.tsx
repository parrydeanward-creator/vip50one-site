"use client";

import { useState } from "react";
import { STANDING_COLOUR, STANDING_WORDS, keptWords, nudgeText, plainName, reachWords, smsHref, telHref, type TeamPerson } from "@/lib/teamPeople.ts";

// One team agent's week, for the team lead (lib/teamPeople.ts): score, VIP touches, commitments kept, team leads held
// and how fast they reach them, Getting started. Call and Text open the lead's own phone when a number is known; the
// Nudge opens the lead's own Messages with a short note ready, or copies it. ONE sends nothing.
export default function TeamAgentPanel({ p, example }: { p: TeamPerson; example: boolean }) {
  const [copied, setCopied] = useState(false);
  const note = nudgeText(plainName(p.first));
  const kept = keptWords(p.kept);
  const sms = smsHref(p.phone, note);
  return (
    <section className="ta-panel" aria-label={`${plainName(p.first)}'s week`}>
      <p className="ta-standing" style={{ borderColor: STANDING_COLOUR[p.standing] }}>
        <i style={{ background: STANDING_COLOUR[p.standing] }} aria-hidden="true" />
        <b>{STANDING_WORDS[p.standing]}</b>
        {p.isNew ? <span className="ta-new">New</span> : null}
        {example ? <small> An example agent</small> : null}
      </p>
      <dl className="th-figs">
        <div><dt>Week score</dt><dd>{p.weekScore}</dd></div>
        <div><dt>VIP touches this week</dt><dd>{p.vipTouches}</dd></div>
        {kept ? <div><dt>Commitments kept</dt><dd>{kept}</dd></div> : null}
        <div><dt>Team leads held</dt><dd>{p.leadsHeld}</dd></div>
        <div className={p.avgReach != null && p.avgReach > 15 ? "today" : undefined}><dt>Average time to reach</dt><dd>{reachWords(p.avgReach)}</dd></div>
        {p.start ? <div><dt>Getting started</dt><dd>{p.start.done} of {p.start.total}</dd></div> : null}
      </dl>
      <div className="decide-btns">
        {p.phone ? (
          <>
            <a className="chip-btn" href={telHref(p.phone)} aria-label={`Call ${plainName(p.first)}`}>Call</a>
            <a className="chip-btn" href={smsHref(p.phone)!} aria-label={`Text ${plainName(p.first)}`}>Text</a>
          </>
        ) : null}
        {sms ? (
          <a className="chip-btn primary" href={sms} aria-label={`Nudge ${plainName(p.first)}`}>Nudge</a>
        ) : (
          <button
            type="button"
            className="chip-btn primary"
            aria-label={`Nudge ${plainName(p.first)}`}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(note);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }}
          >
            {copied ? "Copied" : "Nudge"}
          </button>
        )}
      </div>
      <p className="ta-note">{note}</p>
      {p.phone ? null : <p className="pf-sub">Their number is in ONE MOVE. The Nudge copies the note for you to send.</p>}
      <p className="pf-sub">ONE sends nothing. You send it from your own phone, or don&apos;t.</p>
    </section>
  );
}
