"use client";

import { useEffect, useRef } from "react";
import PulseMark from "./PulseMark.tsx";
import { COMING, LIVE, PROMISE, packageLine, todayLine } from "@/lib/pulseIntro.ts";
import type { Need } from "@/lib/needs.ts";

// Meet Pulse: opens from the centre ONE orb (and once, on a first visit).
export default function PulseIntro({ pkg, total, onClose, onAsk, onMorning, onGuide }: { pkg?: string; total?: Need; onClose: () => void; onAsk: () => void; onMorning: () => void; onGuide: () => void }) {
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
  const pkgLine = packageLine(pkg);
  return (
    <div className="pi-back" onClick={onClose}>
      <section className="pi pop" role="dialog" aria-modal="true" aria-labelledby="pi-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="pi-close" onClick={onClose} aria-label="Close">×</button>
        <header className="pi-head">
          <PulseMark />
          <h2 id="pi-title">Meet Pulse</h2>
          <p className="pi-lede">The intelligence inside ONE. It watches your whole business so you don&apos;t have to, and tells you the few things that matter most.</p>
          <p className={`pi-today ${total ? `pi-lvl-${total.level}` : ""}`}>{todayLine(total)}</p>
          <button className="pi-film" onClick={onGuide}>
            <span className="pi-play" aria-hidden="true">▶</span>
            <span>
              <b>Watch: what everything means</b>
              <span>Every light, ring and colour in ONE, in about a minute.</span>
            </span>
          </button>
        </header>
        <div className="pi-cols">
          <div>
            <h3>What Pulse does for you now</h3>
            <ul className="pi-list">
              {LIVE.map((x) => (
                <li key={x.title}>
                  <b>{x.title}.</b> {x.line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Coming next</h3>
            <ul className="pi-list pi-coming">
              {COMING.map((x) => (
                <li key={x.title}>
                  <b>{x.title}.</b> {x.line}
                </li>
              ))}
            </ul>
            {pkgLine && <p className="pi-pkg">{pkgLine}</p>}
          </div>
        </div>
        <p className="pi-promise">{PROMISE}</p>
        <div className="pi-actions">
          <button className="pi-btn pi-primary" onClick={onAsk}>
            <PulseMark label={false} /> Ask Pulse
          </button>
          <button className="pi-btn" onClick={onMorning}>Start my Morning Pulse</button>
        </div>
      </section>
    </div>
  );
}
