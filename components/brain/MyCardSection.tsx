"use client";

import { useEffect, useState } from "react";
import { cardUrl, placeChips, readCard, type CardState } from "@/lib/myCard.ts";

// My Profile: My card (QR-CARD.md §2.1). The QR a person scans to swap contact info; "Where are you?" tags everyone who
// scans. ONE MOVE makes the QR and the link (vip50-web-crm#352, #356). The example agent shows example data and calls nothing.
const DEMO: Extract<CardState, { ready: true }> = {
  ready: true,
  name: "Jordan Example",
  photo: null,
  brokerage: "Real Broker, LLC",
  team: "The Luxury Agency",
  title: "Realtor",
  url: "https://move.vip50one.com/card/jordan-example",
  qr: "",
  events: ["Coffee mixer"],
};

export default function MyCardSection({ demo = false }: { demo?: boolean }) {
  const [where, setWhere] = useState<string | null>(null);
  const [card, setCard] = useState<CardState | null>(demo ? DEMO : null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    if (demo) return;
    let off = false;
    fetch(cardUrl(where), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(readCard)
      .then((c) => {
        if (off) return;
        setFailed(!c);
        if (c) {
          setCard(c);
          if (c.ready) setEvents((e) => (where ? e : c.events));
        }
      })
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, [where, demo]);

  const shown = demo ? DEMO : card;
  const chips = placeChips(demo ? DEMO.events : events);
  const link = shown?.ready ? (demo && where ? `${shown.url}?e=${encodeURIComponent(where)}` : shown.url) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="pf-card mc" aria-label="My card">
      <h2>My card</h2>
      {!shown ? (
        <small className="pf-sub">{failed ? "Your card didn't load just now. Try again in a moment." : "Getting your card…"}</small>
      ) : !shown.ready ? (
        <>
          <small className="pf-sub">{shown.why}</small>
          {shown.setAt && <a className="chip-btn" href={shown.setAt} target="_blank" rel="noopener noreferrer">Set it up ↗</a>}
        </>
      ) : (
        <>
          <small className="pf-sub">Show this to someone and they scan it with their phone camera to save you and swap their info. They land in ONE under New to sort, never in your VIP-50.</small>
          <div className="mc-body">
            <div className="mc-qr" aria-label="Your QR code">
              {shown.qr ? <img src={shown.qr} alt={`QR code for ${shown.name}'s card${where ? `, tagged ${where}` : ""}`} width={176} height={176} /> : <span>QR code</span>}
            </div>
            <div className="mc-who">
              <b>{shown.name}</b>
              {[shown.title, shown.brokerage, shown.team].filter(Boolean).map((t) => <span key={t}>{t}</span>)}
            </div>
          </div>
          <div className="mc-where" role="group" aria-label="Where are you?">
            <span className="pf-sub">Where are you?</span>
            {chips.map((c) => (
              <button key={c} type="button" className={`chip-btn${where === c ? " primary" : ""}`} aria-pressed={where === c} onClick={() => setWhere(where === c ? null : c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="pf-btns">
            <button type="button" className="chip-btn primary" onClick={() => void copy()}>{copied ? "Copied" : "Copy link"}</button>
          </div>
          <small className="pf-sub mc-link">{link}</small>
        </>
      )}
    </section>
  );
}
