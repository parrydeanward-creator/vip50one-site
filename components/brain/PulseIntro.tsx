"use client";

import { useEffect, useRef } from "react";
import PulseMark from "./PulseMark.tsx";
import { GROWTH_ADD_URL, LEDE, LIVE, growthOffer, packageLine, todayLine } from "@/lib/pulseIntro.ts";
import type { Need } from "@/lib/needs.ts";

// Meet Pulse, short (Parry, 14 Oct: "i like it...go with it"): opens from the centre ONE orb (and once, on a first
// visit). Three lines, the live count with its key, five things Pulse does, the film, the plan line from MASTER.
export default function PulseIntro({ pkg, growth = false, total, onClose, onAsk, onMorning, onGuide }: { pkg?: string; growth?: boolean; total?: Need; onClose: () => void; onAsk: () => void; onMorning: () => void; onGuide: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // The dashboard re-renders while this is open (the clock, live signals): a new onClose each time must
  // not re-run this, or the cursor jumps to the close button mid-typing and the next key closes the view.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  const pkgLine = packageLine(pkg, growth);
  const offer = growthOffer(pkg, growth);
  return (
    <div className="pi-back" onClick={onClose}>
      <section className="pi pi-short pop" role="dialog" aria-modal="true" aria-labelledby="pi-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="pi-close" onClick={onClose} aria-label="Close">×</button>
        <header className="pi-head">
          <PulseMark />
          <h2 id="pi-title">Meet Pulse</h2>
          {LEDE.map((l) => (
            <p key={l} className="pi-lede">{l}</p>
          ))}
          <div className="pi-count">
            <p className={`pi-today ${total ? `pi-lvl-${total.level}` : ""}`}>{todayLine(total)}</p>
            <ul className="pi-key" aria-label="What the colours mean">
              <li><i className="k-now" aria-hidden="true" />Right now</li>
              <li><i className="k-today" aria-hidden="true" />Today</li>
              <li><i className="k-ok" aria-hidden="true" />All good</li>
            </ul>
          </div>
        </header>
        <ol className="pi-five">
          {LIVE.map((x, i) => (
            <li key={x.title}>
              <span className="pi-n" aria-hidden="true">{i + 1}</span>
              <b>{x.title}</b>
              <span>{x.line}</span>
            </li>
          ))}
        </ol>
        <button className="pi-film" onClick={onGuide}>
          <span className="pi-play" aria-hidden="true">▶</span>
          <span>
            <b>Watch: what everything means</b>
            <span>Every light, ring and colour in ONE, in about a minute.</span>
          </span>
        </button>
        {pkgLine && <p className="pi-pkg">{pkgLine}</p>}
        {offer ? (
          <p className="pi-pkg">
            {offer} <a href={GROWTH_ADD_URL} target="_blank" rel="noreferrer">Add ONE Growth</a>
          </p>
        ) : null}
        <div className="pi-actions">
          <button className="pi-btn pi-primary" onClick={onMorning}>Start my Morning Pulse</button>
          <button className="pi-btn" onClick={onAsk}>
            <PulseMark label={false} /> Ask Pulse
          </button>
        </div>
      </section>
    </div>
  );
}
