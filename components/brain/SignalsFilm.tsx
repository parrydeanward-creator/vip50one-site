"use client";

import { useEffect, useRef } from "react";
import PulseMark from "./PulseMark.tsx";
import { SIGNALS_FILM } from "@/lib/signalsFilm.ts";

// What everything means, as a film (Parry, 5 Oct), played over the Brain from
// Meet Pulse and the ? control. The same film plays live at /watch?signals=1.
export default function SignalsFilm({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <div className="pi-back" onClick={onClose}>
      <section className="pi sf pop" role="dialog" aria-modal="true" aria-labelledby="sf-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="pi-close" onClick={onClose} aria-label="Close">×</button>
        <header className="pi-head">
          <PulseMark />
          <h2 id="sf-title">What everything means</h2>
        </header>
        <video className="sf-video" src={SIGNALS_FILM.src} poster={SIGNALS_FILM.poster} controls autoPlay playsInline preload="metadata">
          <track kind="captions" src={SIGNALS_FILM.captions} srcLang="en" label="English" />
        </video>
        <p className="sf-note">
          Example agent; people and addresses are invented. <a href="/watch?signals=1">Play it step by step</a>
        </p>
      </section>
    </div>
  );
}
