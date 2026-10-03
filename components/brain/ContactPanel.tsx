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

// VIP-SUMMARY §3c: the person in the right panel, with Call / Text / Email.
// Tapping one opens the phone, messages or mail; the panel then asks once
// whether to log it (as ONE MOVE's action bar does, so a misdial never
// counts). Logging runs ONE MOVE's own logTouchEverywhere.
export default function ContactPanel({ contactId, onLogged }: { contactId: string; onLogged: () => void }) {
  const [card, setCard] = useState<ContactCard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<TouchKind | null>(null);
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

  const log = async (kind: TouchKind) => {
    setBusy(true);
    try {
      const r = await fetch(touchUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId, kind, detail: `${kind === "call" ? "Called" : kind === "text" ? "Texted" : "Emailed"} from ONE Brain` }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error ?? "ONE MOVE didn't take that. Try again.");
      setDone(kind === "email" ? "Email logged." : `${kind === "call" ? "Call" : "Text"} logged${j.completed_task ? ", task done" : ""}. Boxes ticked.`);
      setAsk(null);
      await load();
      onLogged();
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
          <a className="cc-btn" href={`tel:${tel}`} onClick={() => setAsk("call")}>Call</a>
        ) : (
          <span className="cc-btn off" aria-disabled="true">Call</span>
        )}
        {tel ? (
          <a className="cc-btn" href={`sms:${tel}`} onClick={() => setAsk("text")}>Text</a>
        ) : (
          <span className="cc-btn off" aria-disabled="true">Text</span>
        )}
        {mail ? (
          <a className="cc-btn" href={`mailto:${mail}`} onClick={() => setAsk("email")}>Email</a>
        ) : (
          <span className="cc-btn off" aria-disabled="true">Email</span>
        )}
      </div>

      {ask && (
        <div className="cc-ask pop" role="status">
          <p>
            {LOG_QUESTION[ask]} with {first}?
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
            <li key={k} className={card.month?.[k] ? "on" : ""}>
              <i aria-hidden="true">{card.month?.[k] ? "✓" : ""}</i>
              {label}
            </li>
          ))}
        </ul>
        <h2>This quarter</h2>
        <ul>
          {QUARTER_BOXES.map(([k, label]) => (
            <li key={k} className={card.quarter?.[k] ? "on" : ""}>
              <i aria-hidden="true">{card.quarter?.[k] ? "✓" : ""}</i>
              {label}
            </li>
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
