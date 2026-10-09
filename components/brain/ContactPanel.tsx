"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LOG_QUESTION,
  MONTH_BOXES,
  QUARTER_BOXES,
  TIER_LABEL,
  contactUrl,
  dialable,
  mailable,
  touchUrl,
  type ContactCard,
  type TouchKind,
} from "@/lib/contact.ts";
import { LOGGABLE } from "@/lib/audit.ts";
import CallPrepCard from "./CallPrepCard.tsx";
import PanelBoundary from "./PanelBoundary.tsx";
import SendsSection from "./SendsSection.tsx";
import DraftsSection from "./DraftsSection.tsx";

// A box the agent ticks by hand asks first, like Call and Text (Parry, 5 Oct:
// "the checkbox is not checking when clicked"). Newsletter and mixer invite
// tick themselves when one is actually sent; a ticked box is not unticked here.
type Ask = { kind: string; question: string; label: string; box?: boolean };
const askFor = (kind: TouchKind): Ask => ({ kind, question: LOG_QUESTION[kind], label: kind });

// VIP-SUMMARY §3c: the person in the right panel, with Call / Text / Email.
// Tapping one opens the phone, messages or mail; the panel then asks once
// whether to log it (as ONE MOVE's action bar does, so a misdial never
// counts). Logging runs ONE MOVE's own logTouchEverywhere.
// The contact card, inside a boundary: if one value is ever wrong, this card says so and the page stays up.
export default function ContactPanel(props: { contactId: string; taskId?: string; onLogged: () => void }) {
  return (
    <PanelBoundary key={props.contactId} label="This contact">
      <ContactCard {...props} />
    </PanelBoundary>
  );
}

function ContactCard({ contactId, taskId, onLogged }: { contactId: string; taskId?: string; onLogged: () => void }) {
  const [card, setCard] = useState<ContactCard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [prep, setPrep] = useState(false); // Call Prep before the call (PULSE-ROADMAP #1)

  const load = useCallback(async () => {
    try {
      const r = await fetch(contactUrl(contactId), { credentials: "include", cache: "no-store" });
      if (!r.ok) throw new Error(r.status === 401 ? "Sign in again to see this contact." : "ONE couldn't load this contact just now.");
      setCard((await r.json()) as ContactCard);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ONE couldn't load this contact just now.");
    }
  }, [contactId]);

  useEffect(() => {
    setCard(null);
    setAsk(null);
    setDone(null);
    load();
  }, [load]);

  const log = async ({ kind, label }: Ask) => {
    setBusy(true);
    try {
      const r = await fetch(touchUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          kind,
          detail: kind === "call" ? "Called from ONE Brain" : kind === "text" ? "Texted from ONE Brain" : kind === "email" ? "Emailed from ONE Brain" : `${label} logged from ONE Brain`,
          // §3c.3 (v1.5): close the follow-up this came from (vip50-web-crm#40, live).
          ...(taskId ? { task_id: taskId } : {}),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error ?? "ONE MOVE didn't take that. Try again.");
      setDone(kind === "email" ? "Email logged." : kind === "call" || kind === "text" ? `${kind === "call" ? "Call" : "Text"} logged${j.completed_task ? ", task done" : ""}. Boxes ticked.` : `${label} logged. Box ticked.`);
      setAsk(null);
      await load();
      // Let "logged" show for a moment; then the Brain reloads and a closed
      // follow-up leaves the list.
      setTimeout(onLogged, 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ONE MOVE didn't take that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (err && !card) return <p className="cc-err">{err}</p>;
  if (!card) return <p className="cc-loading">Loading contact…</p>;

  const tel = dialable(card.phone);
  const mail = mailable(card.email);
  const first = card.first_name || (card.name ?? "").split(" ")[0] || "them";

  return (
    <div className="cc">
      <div className="cc-meta">
        {card.tier && TIER_LABEL[card.tier] && <span className="cc-tier">{TIER_LABEL[card.tier]}</span>}
        {card.last_touch ? (
          <span>
            Last touch: {(card.last_touch.kind ?? "touch").replace(/_/g, " ")}, {new Date(card.last_touch.on + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        ) : (
          <span>No touches yet</span>
        )}
      </div>
      {(card.phone || card.email) && (
        <p className="cc-lines">
          {card.phone && <span>{card.phone}</span>}
          {card.email && <span>{card.email}</span>}
        </p>
      )}

      <div className="cc-actions">
        {tel ? (
          <button type="button" className="cc-btn" onClick={() => setPrep(true)}>Call</button>
        ) : (
          <span className="cc-btn off" aria-disabled="true">Call</span>
        )}
        {tel ? (
          <a className="cc-btn" href={`sms:${tel}`} onClick={() => setAsk(askFor("text"))}>Text</a>
        ) : (
          <span className="cc-btn off" aria-disabled="true">Text</span>
        )}
        {mail ? (
          <a className="cc-btn" href={`mailto:${mail}`} onClick={() => setAsk(askFor("email"))}>Email</a>
        ) : (
          <span className="cc-btn off" aria-disabled="true">Email</span>
        )}
      </div>

      {prep && (
        <CallPrepCard
          contactId={contactId}
          phone={card.phone}
          onClose={() => setPrep(false)}
          onDial={() => {
            setPrep(false);
            setAsk(askFor("call"));
          }}
        />
      )}
      {ask && !ask.box && (
        <div className="cc-ask pop" role="status">
          <p>
            {ask.question} with {first}?
          </p>
          <div>
            <button className="btn" disabled={busy} onClick={() => log(ask)}>Yes, log it</button>
            <button className="btn ghost-btn" disabled={busy} onClick={() => setAsk(null)}>Not now</button>
          </div>
        </div>
      )}
      {done && <p className="cc-done" role="status">{done}</p>}
      {err && card && <p className="cc-err">{err}</p>}

      <div className="cc-boxes">
        <h2>This month</h2>
        <ul>
          {MONTH_BOXES.map(([k, label]) => (
            <Box key={k} on={!!card.month?.[k]} label={label} kind={LOGGABLE[k]} busy={busy} ask={ask} first={first} onAsk={setAsk} onYes={log} />
          ))}
        </ul>
        <h2>This quarter</h2>
        <ul>
          {QUARTER_BOXES.map(([k, label]) => (
            <Box key={k} on={!!card.quarter?.[k]} label={label} kind={LOGGABLE[k]} busy={busy} ask={ask} first={first} onAsk={setAsk} onYes={log} />
          ))}
        </ul>
      </div>

      {card.open_tasks && card.open_tasks.length > 0 && (
        <div className="cc-tasks">
          <h2>Open tasks</h2>
          <ul>
            {card.open_tasks.map((t) => (
              <li key={t.id}>
                {t.title}
                {t.due && <small> · due {new Date(t.due + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <DraftsSection contactId={contactId} phone={tel} email={mail} onSent={(k) => setAsk(askFor(k))} />
      <SendsSection contactId={contactId} />
      {card.source_label && <p className="cc-source">{card.source_label}</p>}
    </div>
  );
}

// A box asks right where it was clicked (Parry, 8 Oct: on Jen Wright the question showed at the top of the panel,
// far from the box, so the box seemed not to tick). The box shows ticked while it asks; Yes logs it, Not now clears.
function Box({ on, label, kind, busy, ask, first, onAsk, onYes }: { on: boolean; label: string; kind?: string; busy: boolean; ask: Ask | null; first: string; onAsk: (a: Ask | null) => void; onYes: (a: Ask) => void }) {
  if (on || !kind) {
    return (
      <li className={on ? "on" : "auto"}>
        <i aria-hidden="true">{on ? "✓" : ""}</i>
        {label}
        {!on && <small> · ticks when sent</small>}
      </li>
    );
  }
  const asking = !!ask?.box && ask.label === label;
  return (
    <li className={asking ? "on asking" : undefined}>
      <button type="button" className="cc-box" disabled={busy} aria-pressed={asking} onClick={() => onAsk(asking ? null : { kind, label, box: true, question: `Log a ${label.toLowerCase()}` })} aria-label={`Log a ${label.toLowerCase()}`}>
        <i aria-hidden="true">{asking ? "✓" : ""}</i>
        {label}
      </button>
      {asking && (
        <div className="cc-ask cc-ask-here pop" role="status">
          <p>
            {ask!.question} with {first}?
          </p>
          <div>
            <button className="btn" disabled={busy} onClick={() => onYes(ask!)}>Yes, log it</button>
            <button className="btn ghost-btn" disabled={busy} onClick={() => onAsk(null)}>Not now</button>
          </div>
        </div>
      )}
    </li>
  );
}
