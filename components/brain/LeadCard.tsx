"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cameInWords } from "@/lib/leadClock.ts";
import {
  OUTCOME_BUTTONS,
  firstText,
  lastTryLine,
  leadCardMode,
  postOutcome,
  retryLine,
  retryWords,
  saveName,
  whereFrom,
  type LeadOutcome,
  type NewLead,
  type OutcomeResult,
  type RetryWhen,
} from "@/lib/newLeads.ts";
import { smsHref } from "@/lib/drafts.ts";
import { SORT_BUTTONS, sortPerson, sortedLine, type SortTo } from "@/lib/newToSort.ts";
import type { SuggestPlan } from "@/lib/actionPlans.ts";
import { PlanSuggest } from "./PlansPanel.tsx";

// A new lead's card, in place of the VIP "This month / This quarter" boxes (ecosystem 17 Oct, Parry: "yes on fixes").
// Not reached yet: when they came in, where from, Pulse's first text (opens the phone's own Messages; ONE sends
// nothing) and "Did you reach them?" (Reached / Left a message / No answer, ONE MOVE's leads/outcome). Once reached:
// "Sort them" (the New to Sort buttons), then the next steps (a Showly tour invite) below. Demo: on screen only.

/** The example agent's suggestion after Reached (on screen only). */
const DEMO_SUGGEST: SuggestPlan = { planId: "example", name: "New buyer follow-up" };

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
  // Start <plan>? after Reached or a sort, when ONE MOVE suggests one (walker 0245)
  const [suggest, setSuggest] = useState<SuggestPlan | null>(null);
  // the name, saved in place (POST /api/brain/people/<id>; walker 0245)
  const [first, setFirst] = useState("");
  const [lastName, setLastName] = useState("");
  const [named, setNamed] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameErr, setNameErr] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const mode = leadCardMode(lead, false);
  const clock = cameInWords(lead.at, now);
  const firstName = named ? named.split(" ")[0] : lead.firstName;
  const them = firstName ?? "them";
  const draft = firstText(firstName, lead.source, agentFirst);
  const sms = tel ? smsHref(tel, draft, isIOS()) : null;
  const retry = retryLine(lead, now);
  const last = lastTryLine(lead, now);

  const outcome = async (o: LeadOutcome) => {
    setBusy(true);
    setErr(null);
    const r: OutcomeResult = live ? await postOutcome(lead.id, o) : { ok: true, when: (o === "reached" ? null : "later_today") as RetryWhen | null, error: null };
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setLine(o === "reached" ? `${firstName ?? "This lead"} is reached. Call logged.` : r.when ? `${retryWords(r.when)}. It's on your task list.` : "Logged.");
    if (o === "reached" && r.suggestPlan) setSuggest(r.suggestPlan);
    else if (o === "reached" && !live) setSuggest(DEMO_SUGGEST);
    onOutcome(o, r.when);
  };

  const sort = async (to: SortTo) => {
    setBusy(true);
    setErr(null);
    const who = { contactId: lead.id, firstName: firstName ?? "This lead", name: named ?? lead.name, wherePlain: "", said: null, rating: null, phone, email, at: lead.at, suggest: null };
    const r: { ok: boolean; line: string; suggestPlan?: SuggestPlan } = live ? await sortPerson(who, to) : { ok: true, line: sortedLine(who.firstName, to) };
    setBusy(false);
    if (!r.ok) return setErr(r.line);
    setSorted(to);
    setLine(r.line);
    if (r.suggestPlan) setSuggest(r.suggestPlan);
    onSorted?.(to);
  };

  const saveTheName = async () => {
    setNameErr(null);
    setNameBusy(true);
    const r = live ? await saveName(lead.id, first, lastName) : { ok: !!(first.trim() || lastName.trim()), name: [first.trim(), lastName.trim()].filter(Boolean).join(" "), error: "Type a first or last name." };
    setNameBusy(false);
    if (!r.ok || !r.name) return setNameErr(r.error);
    setNamed(r.name);
  };

  return (
    <section className={`lc lc-${mode}`} aria-label="New lead">
      {lead.nameMissing && !named && (
        <form
          className="lc-noname"
          aria-label="Add their name"
          onSubmit={(e) => {
            e.preventDefault();
            void saveTheName();
          }}
        >
          <b>No name</b>
          {(email || phone) && <small>{[email, phone].filter(Boolean).join(" · ")}</small>}
          <div className="lc-name-row">
            <label className="lc-name">
              <span>First name</span>
              <input value={first} maxLength={60} onChange={(e) => setFirst(e.target.value)} aria-label="First name" autoComplete="off" disabled={nameBusy} />
            </label>
            <label className="lc-name">
              <span>Last name</span>
              <input value={lastName} maxLength={60} onChange={(e) => setLastName(e.target.value)} aria-label="Last name" autoComplete="off" disabled={nameBusy} />
            </label>
          </div>
          <button type="submit" className="chip-btn primary" disabled={nameBusy || !(first.trim() || lastName.trim())} aria-label="Save their name">
            {nameBusy ? "Saving..." : "Save"}
          </button>
          {nameErr && <p className="cc-err" role="alert">{nameErr}</p>}
        </form>
      )}
      {named && (
        <p className="lc-named" role="status">
          <b>{named}</b> {live ? "Name saved." : "Name saved (example)."}
        </p>
      )}
      <h2>Where they came from</h2>
      {clock && <p className="lc-clock">{clock}</p>}
      <p className="lc-where">{whereFrom(lead.source, [sourceLabel])}</p>

      {mode === "reach" && (
        <>
          <h2>Pulse suggests a first text</h2>
          <p className="lc-draft">{draft}</p>
          {sms ? (
            <a className="chip-btn" href={sms} aria-label={`Text ${them} this`}>Text {them} this</a>
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
      {suggest && <PlanSuggest suggest={suggest} contactId={lead.id} firstName={firstName ?? "this lead"} live={live} />}
      {err && <p className="cc-err" role="alert">{err}</p>}
      {mode === "sort" && sorted && after}
    </section>
  );
}
