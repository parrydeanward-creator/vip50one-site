"use client";

import { useEffect, useRef, useState } from "react";
import PulseMark from "./PulseMark.tsx";
import { callPrep, type CallPrep } from "@/lib/callPrep.ts";
import { personUrl, readPerson, readTimeline, timelineUrl } from "@/lib/people.ts";
import { dialable } from "@/lib/contact.ts";

// Call Prep (PULSE-ROADMAP #1): tap Call and this card comes first, ten seconds of what matters,
// then "Call now" dials. Everything on it comes from ONE MOVE (§3k.3, §3k.6); nothing is made up.
export default function CallPrepCard({ contactId, phone, onClose, onDial }: { contactId: string; phone?: string | null; onClose: () => void; onDial: () => void }) {
  const [prep, setPrep] = useState<CallPrep | null>(null);
  const [tel, setTel] = useState<string | null>(dialable(phone ?? null));
  const [err, setErr] = useState(false);
  const callRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const [pr, tr] = await Promise.all([
          fetch(personUrl(contactId), { credentials: "include", cache: "no-store" }),
          fetch(timelineUrl(contactId), { credentials: "include", cache: "no-store" }).catch(() => null),
        ]);
        const person = pr.ok ? readPerson(await pr.json().catch(() => null)) : null;
        if (!person) throw new Error("no person");
        const timeline = tr && tr.ok ? readTimeline(await tr.json().catch(() => null)) : null;
        if (dead) return;
        setPrep(callPrep(person, timeline, new Date()));
        setTel((t) => t ?? dialable(person.phone));
      } catch {
        if (!dead) setErr(true);
      }
    })();
    return () => {
      dead = true;
    };
  }, [contactId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  useEffect(() => {
    if (prep) callRef.current?.focus();
  }, [prep]);

  const block = (title: string, lines: string[]) =>
    lines.length ? (
      <div className="cp-block">
        <h3>{title}</h3>
        <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
    ) : null;

  return (
    <div className="pi-back" onClick={onClose}>
      <section className="pi cp pop" role="dialog" aria-modal="true" aria-labelledby="cp-title" onClick={(e) => e.stopPropagation()}>
        <button className="pi-close" onClick={onClose} aria-label="Close">×</button>
        <header className="pi-head">
          <PulseMark />
          <h2 id="cp-title">{prep ? `Before you call ${prep.first}` : "Call Prep"}</h2>
          {prep?.pulse && <p className="cp-pulse">{prep.pulse}</p>}
        </header>
        {!prep && !err && <p className="cp-wait">Pulse is getting {"ready"}…</p>}
        {err && <p className="cp-wait">Pulse couldn&apos;t load their details just now. You can still call.</p>}
        {prep && (
          <>
            {prep.ask.length > 0 && (
              <div className="cp-ask">
                <h3>Ask</h3>
                <ol>{prep.ask.map((a) => <li key={a}>{a}</li>)}</ol>
              </div>
            )}
            <div className="cp-grid">
              {block("Last time", prep.lastTalk ? [prep.lastTalk] : ["No calls or texts logged yet."])}
              {block("Coming up", prep.comingUp)}
              {block("Family", prep.family)}
              {block("Their favourites", prep.favourites)}
              {block("Open", prep.openItems)}
            </div>
          </>
        )}
        <div className="pi-actions">
          {tel ? (
            <a ref={callRef} className="pi-btn pi-primary" href={`tel:${tel}`} onClick={onDial}>Call {prep?.first ?? "now"}</a>
          ) : (
            <span className="pi-btn" aria-disabled="true">No phone number</span>
          )}
          <button className="pi-btn" onClick={onClose}>Not now</button>
        </div>
      </section>
    </div>
  );
}
