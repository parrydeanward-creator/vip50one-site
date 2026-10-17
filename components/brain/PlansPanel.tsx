"use client";

import { useEffect, useState } from "react";
import { contactsSearchUrl, type ContactHit } from "@/lib/contact.ts";
import {
  EMPTY_WORDS,
  TEXTS_LINE,
  emailsLine,
  enroll,
  nextForLine,
  peopleLine,
  personStepLine,
  readyLine,
  stepLine,
  type ActionPlan,
  type SuggestPlan,
} from "@/lib/actionPlans.ts";

// Action Plans drawn natively (lib/actionPlans.ts; walker 0245, Parry: "yes"): a plan's side panel, the note on the
// Action Plans part, the line on a face round a plan, and the one-tap "Start <plan>?" after a lead is reached or sorted.
// Nothing is sent beyond the plan's own switches; texts always open on the agent's phone.

const EXAMPLE_PEOPLE: ContactHit[] = [
  { id: "example-chris", name: "Chris Allen", tier: "vip50", phone_last4: "4410" },
  { id: "example-dana", name: "Dana Whitaker", tier: "vip100", phone_last4: "0932" },
];

/** The Action Plans part: what plans do when there are none, and where the plans are when there are. */
export function PlansPartNote({ plans }: { plans: ActionPlan[] | null }) {
  if (!plans) return null;
  return (
    <section className="d-list" aria-label="Your action plans">
      <h2>Your plans</h2>
      {plans.length ? (
        <p className="hr-sub">{`${plans.length} ${plans.length === 1 ? "plan" : "plans"}, each an orb round this one with its people as faces. Tap a plan to see its steps.`}</p>
      ) : (
        <>
          <p className="hr-sub">{EMPTY_WORDS}</p>
          <p className="hr-sub">The orb round this one is a labelled example plan with two example people. Make your first plan in ONE MOVE.</p>
        </>
      )}
    </section>
  );
}

/** One plan's side panel. */
export function PlanPanel({ plan, live, onEnrolled, onOpenPlans }: { plan: ActionPlan; live: boolean; onEnrolled: (p: ActionPlan) => void; onOpenPlans: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ContactHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const example = !!plan.example || !live;

  // the agent's ONE MOVE contacts as they type (the same search "Who is this?" and Add a deal use)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setHits(null);
    if (!live) return setHits(EXAMPLE_PEOPLE.filter((p) => p.name.toLowerCase().includes(term.toLowerCase())));
    const t = setTimeout(async () => {
      try {
        const r = await fetch(contactsSearchUrl(term), { credentials: "include", cache: "no-store" });
        const j = r.ok ? await r.json() : { contacts: [] };
        setHits(Array.isArray(j.contacts) ? j.contacts : []);
      } catch {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, live]);

  const add = async (c: ContactHit) => {
    setErr(null);
    setDone(null);
    if (example) {
      setQ("");
      return setDone(`Example: signed in with a real plan, ${c.name} starts on step 1. Nothing was changed.`);
    }
    setBusy(true);
    const r = await enroll(plan.id, c.id);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setQ("");
    setHits(null);
    setDone(`${c.name} is on ${plan.name}.`);
    if (r.plan) onEnrolled(r.plan);
  };

  return (
    <section className="d-list ap" aria-label={`Action plan ${plan.name}`}>
      {plan.example ? <p className="op-ex">Example plan: not a real one. The people are examples too.</p> : null}
      {!plan.active ? <p className="ap-off" aria-label="This plan is off">Off</p> : null}
      {plan.trigger ? <p className="hr-sub">Starts when: {plan.trigger}</p> : null}
      <p className="hr-line">{peopleLine(plan.people.length)} · {readyLine(plan.readyToSend)}</p>

      <h2>Steps</h2>
      {plan.steps.length ? (
        <ol className="ap-steps" aria-label="Steps">
          {plan.steps.map((s) => {
            const next = nextForLine(plan, s.n);
            return (
              <li key={s.n} className={`ap-step ap-${s.kind}`}>
                <b>{stepLine(s)}</b>
                {next ? <small>{next}</small> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="hr-sub">No steps yet. Add them in ONE MOVE.</p>
      )}

      <h2>How it sends</h2>
      <p className="hr-sub">{emailsLine(plan.emailsAuto)}</p>
      <p className="hr-sub">{TEXTS_LINE}</p>

      <h2>Add someone to this plan</h2>
      <input className="pp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your contacts" aria-label="Search your contacts to add to this plan" disabled={busy} />
      {hits && hits.length > 0 ? (
        <ul className="pp-hits">
          {hits.slice(0, 8).map((c) => (
            <li key={c.id}>
              <button type="button" disabled={busy || plan.people.some((p) => p.contactId === c.id)} onClick={() => add(c)} aria-label={`Add ${c.name} to ${plan.name}`}>
                <b>{c.name}</b>
                <small>{plan.people.some((p) => p.contactId === c.id) ? "Already on it" : c.phone_last4 ? `phone ending ${c.phone_last4}` : "no phone"}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : hits && q.trim().length >= 2 ? (
        <small className="pm-empty">No one by that name in ONE MOVE yet. Add them there first.</small>
      ) : null}
      {done ? <p className="cc-done" role="status">{done}</p> : null}
      {err ? <p className="cc-err" role="alert">{err}</p> : null}

      <div className="op-acts">
        <button type="button" className="chip-btn" onClick={onOpenPlans} aria-label="Open Action Plans in ONE MOVE">Edit plans in ONE MOVE</button>
      </div>
    </section>
  );
}

/** A face round a plan: where they are on it (their card, when they are a real contact, shows below). */
export function PlanPersonLine({ plan, contactId }: { plan: ActionPlan; contactId: string }) {
  const line = personStepLine(plan, contactId);
  return (
    <section className="d-list" aria-label={`On ${plan.name}`}>
      <h2>{plan.name}</h2>
      {line ? <p className="hr-line">{line}</p> : null}
      {plan.example ? <p className="op-ex">Example person on the example plan.</p> : null}
    </section>
  );
}

/**
 * "Start <plan>?" after a lead is reached or sorted, when ONE MOVE suggests one. One tap puts them on it; "Not now" puts
 * it away. Nothing is sent beyond the plan's own switches.
 */
export function PlanSuggest({ suggest, contactId, firstName, live }: { suggest: SuggestPlan; contactId: string; firstName: string; live: boolean }) {
  const [state, setState] = useState<"ask" | "busy" | "done" | "gone">("ask");
  const [err, setErr] = useState<string | null>(null);
  if (state === "gone") return null;
  const start = async () => {
    setErr(null);
    if (!live) return setState("done");
    setState("busy");
    const r = await enroll(suggest.planId, contactId);
    if (!r.ok) {
      setState("ask");
      return setErr(r.error);
    }
    setState("done");
  };
  return (
    <div className="ap-suggest" role="group" aria-label={`Pulse suggests ${suggest.name}`}>
      {state === "done" ? (
        <p className="cc-done" role="status">{`${firstName} is on ${suggest.name}.${live ? "" : " (example)"} Its emails and texts follow the plan's own switches.`}</p>
      ) : (
        <>
          <p className="hr-sub">Pulse suggests a plan for {firstName}.</p>
          <div className="decide-btns">
            <button type="button" className="chip-btn primary" disabled={state === "busy"} onClick={start} aria-label={`Start ${suggest.name}`}>
              Start {suggest.name}?
            </button>
            <button type="button" className="chip-btn" disabled={state === "busy"} onClick={() => setState("gone")} aria-label="Not now">
              Not now
            </button>
          </div>
        </>
      )}
      {err ? <p className="cc-err" role="alert">{err}</p> : null}
    </div>
  );
}
