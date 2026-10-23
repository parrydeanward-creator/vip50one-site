"use client";

import { useState } from "react";
import { priceWords } from "@/lib/heat.ts";
import { EMPTY_LINE, KIND_WORDS, actLooks, type LooksAction, type LooksPerson } from "@/lib/looksHot.ts";

// Looks Hot in the side panel (lib/looksHot.ts): the orb lists everyone with the three buttons per row; a person's own
// orb shows the reason in plain words, the homes they liked and the same buttons. Nothing is sent to anyone.
export default function LooksHotPanel({
  list,
  person,
  live,
  onOpen,
  onDone,
}: {
  list: LooksPerson[] | null;
  person?: LooksPerson | null;
  live: boolean;
  onOpen: (p: LooksPerson) => void;
  onDone: (p: LooksPerson, action: LooksAction, local: boolean) => void;
  /** Unused since Buyer Needs retired (23 Oct); kept so callers need not change. */
  onOpenPage?: (path: string, query: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; line: string } | null>(null);

  const act = async (p: LooksPerson, action: LooksAction) => {
    if (busy) return;
    setNote(null);
    if (!live) {
      // the example agent: the row leaves as it would, nothing goes anywhere
      const first = p.name.split(/\s+/)[0];
      setNote({ ok: true, line: action === "move_hot" ? `${first} is Hot now (example).` : action === "call" ? `A task to call ${first} is on your list (example).` : `Not yet. Back in 14 days if it still shows (example).` });
      return onDone(p, action, true);
    }
    setBusy(p.id);
    try {
      const r = await actLooks(p, action);
      setNote({ ok: r.ok, line: r.line });
      if (r.ok) onDone(p, action, !!r.local);
    } finally {
      setBusy(null);
    }
  };

  const buttons = (p: LooksPerson) => (
    <div className="decide-btns">
      <button className="btn" disabled={!!busy} onClick={() => act(p, "move_hot")}>Move to Hot</button>
      <button className="btn ghost-btn" disabled={!!busy} onClick={() => act(p, "call")}>Call them</button>
      <button className="btn ghost-btn" disabled={!!busy} onClick={() => act(p, "not_yet")}>Not yet</button>
    </div>
  );

  const after = (
    <>
      {note && <p className={note.ok ? "decide-done" : "decide-err"} role={note.ok ? "status" : "alert"}>{note.line}</p>}
    </>
  );

  if (person) {
    return (
      <div className="heat">
        <h2 className="wr-h">Looks Hot · {KIND_WORDS[person.kind]}</h2>
        <p className="heat-why">{person.reason}</p>
        {person.also.length > 0 && (
          <ul className="lh-also" aria-label="Also">
            {person.also.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
        {person.homes.length > 0 && (
          <ul className="heat-homes">
            {person.homes.map((h) => (
              <li key={h.propertyKey}>
                {h.photo ? <img src={h.photo} alt="" loading="lazy" /> : <span className="heat-nophoto" aria-hidden="true">⌂</span>}
                <span>
                  <b>{h.address ?? "A home"}</b>
                  <small>{[h.city, priceWords(h.price), h.beds ? `${h.beds} beds` : null].filter(Boolean).join(" · ")}</small>
                </span>
              </li>
            ))}
          </ul>
        )}
        {buttons(person)}
        {after}
        <small className="heat-note">Moving them to Hot sends nothing to them. You decide what happens next.</small>
      </div>
    );
  }

  return (
    <div className="heat">
      <h2 className="wr-h">Looks Hot</h2>
      {list && !list.length ? <p className="heat-why">{EMPTY_LINE}</p> : null}
      {!list && <p className="heat-why">Checking ONE MOVE…</p>}
      {list && list.length > 0 && (
        <ul className="ta-list lh-list">
          {list.map((p) => (
            <li key={p.id} className="lh-row">
              <button className="ta-name" onClick={() => onOpen(p)}>
                <b>{p.name}</b> <small>{KIND_WORDS[p.kind]}</small>
              </button>
              <p className="d-sum rx-small">{p.reason}{p.also.length ? ` · also: ${p.also.join("; ")}` : ""}</p>
              {buttons(p)}
            </li>
          ))}
        </ul>
      )}
      {after}
      <small className="heat-note">Nothing is sent to anyone from here.</small>
    </div>
  );
}
