"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MOVE_URL } from "@/lib/host.ts";
import { cameInWords } from "@/lib/leadClock.ts";
import {
  OUTCOME_BUTTONS,
  firstText,
  lastTryLine,
  leadCardMode,
  postOutcome,
  retryLine,
  retryWords,
  whereFrom,
  type LeadOutcome,
  type NewLead,
  type RetryWhen,
} from "@/lib/newLeads.ts";
import { smsHref } from "@/lib/drafts.ts";
import { SORT_BUTTONS, sortPerson, sortedLine, type SortTo } from "@/lib/newToSort.ts";

// A new lead's card, in place of the VIP "This month / This quarter" boxes (ecosystem 17 Oct, Parry: "yes on fixes").
// Not reached yet: when they came in, where from, Pulse's first text (opens the phone's own Messages; ONE sends
// nothing) and "Did you reach them?" (Reached / Left a message / No answer, ONE MOVE's leads/outcome). Once reached:
// "Sort them" (the New to Sort buttons), then the next steps (a Showly tour invite) below. Demo: on screen only.

const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|Macintosh/.test(navigator.userAgent);

export default function LeadCard({
  lead,
  phone,
  email,
  tel,
  sourceLabel,
  agentFirst,
  live,
  tried,
  after,
  onOutcome,
  onSorted,
}: {
  lead: NewLead;
  phone: string | null;
  email: string | null;
  /** The phone, dialable, for the sms: link. */
  tel: string | null;
  sourceLabel?: string | null;
  agentFirst?: string | null;
  live: boolean;
  /** Call, Text or Email was just tapped: ask "Did you reach them?" right away. */
  tried?: boolean;
  /** Shown under Sort them (the Showly tour invite). */
  after?: ReactNode;
  onOutcome: (outcome: LeadOutcome, when: RetryWhen | null) => void;
  onSorted?: (to: SortTo) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sorted, setSorted] = useState<SortTo | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const mode = leadCardMode(lead, false);
  const clock = cameInWords(lead.at, now);
  const first = lead.firstName ?? "them";
  const draft = firstText(lead.firstName, lead.source, agentFirst);
  const sms = tel ? smsHref(tel, draft, isIOS()) : null;
  const retry = retryLine(lead, now);
  const last = lastTryLine(lead, now);

  const outcome = async (o: LeadOutcome) => {
    setBusy(true);
    setErr(null);
    const r = live ? await postOutcome(lead.id, o) : { ok: true, when: (o === "reached" ? null : "later_today") as RetryWhen | null, error: null };
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setLine(o === "reached" ? `${lead.firstName ?? "This lead"} is reached. Call logged.` : r.when ? `${retryWords(r.when)}. It's on your task list.` : "Logged.");
    onOutcome(o, r.when);
  };

  const sort = async (to: SortTo) => {
    setBusy(true);
    setErr(null);
    const who = { contactId: lead.id, firstName: lead.firstName ?? "This lead", name: lead.name, wherePlain: "", said: null, rating: null, phone, email, at: lead.at, suggest: null };
    const r = live ? await sortPerson(who, to) : { ok: true, line: sortedLine(who.firstName, to) };
    setBusy(false);
    if (!r.ok) return setErr(r.line);
    setSorted(to);
    setLine(r.line);
    onSorted?.(to);
  };

  return (
    <section className={`lc lc-${mode}`} aria-label="New lead">
      {lead.nameMissing && (
        <div className="lc-noname">
          <b>No name</b>
          {(email || phone) && <small>{[email, phone].filter(Boolean).join(" · ")}</small>}
          <label className="lc-name">
            <span>Add their name</span>
            <input disabled aria-label="Add their name" placeholder="First and last name" />
          </label>
          <a className="link" href={`${MOVE_URL}/contacts/${encodeURIComponent(lead.id)}`} target="_blank" rel="noopener noreferrer">
            Add their name in ONE MOVE →
          </a>
        </div>
      )}
      <h2>Where they came from</h2>
      {clock && <p className="lc-clock">{clock}</p>}
      <p className="lc-where">{whereFrom(lead.source, [sourceLabel])}</p>

      {mode === "reach" && (
        <>
          <h2>Pulse suggests a first text</h2>
          <p className="lc-draft">{draft}</p>
          {sms ? (
            <a className="chip-btn" href={sms} aria-label={`Text ${first} this`}>Text {first} this</a>
          ) : (
            <span className="chip-btn off" aria-disabled="true">No phone to text</span>
          )}
          <p className="lc-note">Opens your phone's own Messages. ONE sends nothing.</p>

          <div className={`lc-reach${tried ? " is-asking" : ""}`} role={tried ? "status" : undefined}>
            <h2>Did you reach them?</h2>
            <div className="decide-btns" role="group" aria-label="Did you reach them?">
              {OUTCOME_BUTTONS.map((b) => (
                <button key={b.outcome} type="button" className={`chip-btn${b.outcome === "reached" ? " primary" : ""}`} disabled={busy} onClick={() => outcome(b.outcome)}>
                  {b.label}
                </button>
              ))}
            </div>
            {retry && <p className="lc-retry">{retry}</p>}
            {last && <p className="lc-last">{last}</p>}
          </div>
        </>
      )}

      {mode === "sort" && !sorted && (
        <div className="lc-sort">
          <h2>Sort them</h2>
          <div className="decide-btns" role="group" aria-label="Sort them">
            {SORT_BUTTONS.map((b) => (
              <button key={b.to} type="button" className="chip-btn" disabled={busy} onClick={() => sort(b.to)} style={b.color ? { borderColor: b.color } : undefined}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {line && <p className="cc-done" role="status">{line}</p>}
      {err && <p className="cc-err" role="alert">{err}</p>}
      {mode === "sort" && sorted && after}
    </section>
  );
}
