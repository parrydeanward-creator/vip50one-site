"use client";

import { useEffect, useState } from "react";
import {
  ADDED_WORDS,
  CALL_BUTTON,
  DEMO_SUFFIX,
  FITS_TITLE,
  FROM_WORDS,
  NOTHING_SENT_LINE,
  SAVING,
  canMakeCalls,
  demoFits,
  fitsCallBody,
  fitsCallUrl,
  fitsLine,
  fitsUrl,
  readCallAnswer,
  readFits,
  NOT_LINKED,
  type Fits,
} from "@/lib/listingFits.ts";

// "Who of mine fits this home" (VIP-SUMMARY §3aj) in a listing orb's side panel. The agent's own people, from their
// own Buyer Needs and their site visitors' saved searches. The button adds calls to today's tasks; nothing is sent.
export default function ListingFitsSection({ listingId, live, address = null }: { listingId: string; live: boolean; address?: string | null }) {
  const [fits, setFits] = useState<Fits | null>(null);
  const [off, setOff] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<"idle" | "saving" | "done" | "failed">("idle");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setFits(null);
    setOff({});
    setState("idle");
    setNote(null);
    if (!live) {
      setFits(demoFits(listingId));
      return;
    }
    fetch(fitsUrl(listingId), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setFits(readFits(j)))
      .catch(() => alive && setFits(NOT_LINKED));
    return () => {
      alive = false;
    };
  }, [listingId, live]);

  if (!fits) return null;
  const ticked = fits.people.filter((p) => !off[p.contactId]);

  const make = async () => {
    if (!ticked.length) return;
    setState("saving");
    setNote(null);
    if (!live) {
      setState("done");
      return setNote(`${ADDED_WORDS} ${DEMO_SUFFIX}`);
    }
    const r = await fetch(fitsCallUrl, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fitsCallBody(listingId, ticked.map((p) => p.contactId), address)),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    const a = readCallAnswer(j, !!r?.ok);
    if (a.ok) {
      setState("done");
      setNote(ADDED_WORDS);
    } else {
      setState("failed");
      setNote(a.words);
    }
  };

  return (
    <div className="decide fits-card" aria-label={FITS_TITLE}>
      <h3 className="fits-title">{FITS_TITLE}</h3>
      <p className="fits-line" role="status">{fitsLine(fits)}</p>
      {fits.people.length && !fits.reason ? (
        <ul className="fits-list">
          {fits.people.map((p) => (
            <li key={p.contactId}>
              <label>
                <input
                  type="checkbox"
                  className="fits-tick"
                  checked={!off[p.contactId]}
                  disabled={state === "saving" || state === "done"}
                  onChange={(e) => setOff((o) => ({ ...o, [p.contactId]: !e.target.checked }))}
                />
                <span>
                  <b>{p.firstName}</b>: {p.why}
                  <small className="fits-from"> ({FROM_WORDS[p.from]})</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      {canMakeCalls(fits) ? (
        <>
          <div className="decide-btns">
            <button type="button" className="btn fits-call" disabled={state === "saving" || state === "done" || !ticked.length} onClick={() => void make()}>
              {state === "saving" ? SAVING : CALL_BUTTON}
            </button>
          </div>
          <p className="fits-sent">{NOTHING_SENT_LINE}</p>
        </>
      ) : null}
      {state === "saving" ? <p className="fits-note" role="status">{SAVING}</p> : null}
      {note ? <p className={state === "failed" ? "decide-err fits-note" : "fits-note"} role={state === "failed" ? "alert" : "status"}>{note}</p> : null}
    </div>
  );
}
