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

// A box the agent ticks by hand asks first, like Call and Text (Parry, 5 Oct:
// "the checkbox is not checking when clicked"). Newsletter and mixer invite
// tick themselves when one is actually sent; a ticked box is not unticked here.
type Ask = { kind: string; question: string; label: string };
const askFor = (kind: TouchKind): Ask => ({ kind, question: LOG_QUESTION[kind], label: kind });

// VIP-SUMMARY §3c: the person in the right panel, with Call / Text / Email.
// Tapping one opens the phone, messages or mail; the panel then asks once
// whether to log it (as ONE MOVE's action bar does, so a misdial never
// counts). Logging runs ONE MOVE's own logTouchEverywhere.
export default function ContactPanel({ contactId, taskId, onLogged }: { contactId: string; taskId?: string; onLogged: () => void }) {
  const [card, setCard] = useState<ContactCard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

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
  const first = card.first_name || card.name.split(" ")[0];

  return (
    <div className="cc">
      <div className="cc-meta">
        {card.tier && TIER_LABEL[card.tier] && <span className="cc-tier">{TIER_LABEL[card.tier]}</span>}
        {card.last_touch ? (
          <span>
            Last touch: {card.last_touch.kind.replace(/_/g, " ")}, {new Date(card.last_touch.on + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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
          <a className="cc-btn" href={`tel:${tel}`} onClick={() => setAsk(askFor("call"))}>Call</a>
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

      {ask && (
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
            <Box key={k} on={!!card.month?.[k]} label={label} kind={LOGGABLE[k]} busy={busy} onAsk={setAsk} />
          ))}
        </ul>
        <h2>This quarter</h2>
        <ul>
          {QUARTER_BOXES.map(([k, label]) => (
            <Box key={k} on={!!card.quarter?.[k]} label={label} kind={LOGGABLE[k]} busy={busy} onAsk={setAsk} />
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
      {card.source_label && <p className="cc-source">{card.source_label}</p>}
    </div>
  );
}

function Box({ on, label, kind, busy, onAsk }: { on: boolean; label: string; kind?: string; busy: boolean; onAsk: (a: Ask) => void }) {
  if (on || !kind) {
    return (
      <li className={on ? "on" : "auto"} title={on ? undefined : "Ticks itself when you send one"}>
        <i aria-hidden="true">{on ? "✓" : ""}</i>
        {label}
        {!on && <small> · ticks when sent</small>}
      </li>
    );
  }
  return (
    <li>
      <button type="button" className="cc-box" disabled={busy} onClick={() => onAsk({ kind, label, question: `Log a ${label.toLowerCase()}` })} aria-label={`Log a ${label.toLowerCase()}`}>
        <i aria-hidden="true" />
        {label}
      </button>
    </li>
  );
}
