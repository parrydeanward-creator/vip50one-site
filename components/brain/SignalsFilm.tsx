"use client";

import { useEffect, useRef } from "react";
import PulseMark from "./PulseMark.tsx";
import { SIGNALS_FILM } from "@/lib/signalsFilm.ts";

// What everything means, as a film (Parry, 5 Oct), played over the Brain from
// the centre ONE orb, Meet Pulse and the ? control (with Parry's voice and music). The same film plays live at /watch?signals=1.
// Watch ONE Work with Parry's voice and music (the sales-page film), from the Brain's link (Parry, 5 Oct:
// "the watch one work video is the one without sound change it to the one with sound").
export const ONE_FILM = { title: "Watch ONE Work", src: "/home/one-film.mp4", poster: "/home/one-film.jpg", captions: "/home/one-film.vtt", stepHref: "/watch", note: "Example agent; people and addresses are invented." };
const SIGNALS = { title: "What everything means", src: SIGNALS_FILM.src, poster: SIGNALS_FILM.poster, captions: SIGNALS_FILM.captions, stepHref: "/watch?signals=1", note: "Example agent; people and addresses are invented." };

export default function SignalsFilm({ onClose, onMeet, film = SIGNALS }: { onClose: () => void; onMeet?: () => void; film?: typeof SIGNALS }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // The dashboard re-renders while this is open (the clock, live signals): a new onClose each time must
  // not re-run this, or the cursor jumps to the close button mid-typing and the next key closes the view.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  return (
    <div className="pi-back" onClick={onClose}>
      <section className="pi sf pop" role="dialog" aria-modal="true" aria-labelledby="sf-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="pi-close" onClick={onClose} aria-label="Close">×</button>
        <header className="pi-head">
          <PulseMark />
          <h2 id="sf-title">{film.title}</h2>
        </header>
        <video className="sf-video" src={film.src} poster={film.poster} controls autoPlay playsInline preload="metadata">
          <track kind="captions" src={film.captions} srcLang="en" label="English" />
        </video>
        <p className="sf-note">
          {film.note} <a href={film.stepHref}>Play it step by step</a>
        </p>
        {onMeet && (
          <div className="pi-actions">
            <button className="pi-btn" onClick={onMeet}>Meet Pulse: what it does for you</button>
          </div>
        )}
      </section>
    </div>
  );
}
