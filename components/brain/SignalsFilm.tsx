"use client";

import { useEffect, useRef, useState } from "react";
import PulseMark from "./PulseMark.tsx";
import { SIGNALS_FILM } from "@/lib/signalsFilm.ts";
import { SIGNALS_KEY } from "@/lib/signalsKey.ts";

// What everything means, as a film (Parry, 5 Oct), played over the Brain from
// the centre ONE orb, Meet Pulse and the ? control (with Parry's voice and music). The same film plays live at /watch?signals=1.
// Watch ONE Work with Parry's voice and music (the sales-page film), from the Brain's link (Parry, 5 Oct:
// "the watch one work video is the one without sound change it to the one with sound").
export const ONE_FILM = { title: "Watch ONE Work", src: "/home/one-film.mp4", poster: "/home/one-film.jpg", captions: "/home/one-film.vtt", stepHref: "/watch", note: "Example agent; people and addresses are invented." };
// The ONE GO phone tour (Film B, made by GO/MOVE, voiced by the walker; vip50one-site#231), from the menu.
export const GO_TOUR_FILM = { title: "The ONE GO tour", src: "/home/films/one-go-tour-wide.mp4", poster: "/home/films/one-go-tour-wide.jpg", captions: "/home/films/one-go-tour.vtt", note: "Example agent; people and addresses are invented.", tallSrc: "/home/films/one-go-tour.mp4", tallPoster: "/home/films/one-go-tour.jpg" };
// Film A (approved by Parry 18 Oct 13:54 MT: "ok ship film A to eco"): ONE on the desktop, 25 min 26 s, 17 chapters (vip50-ecosystem research/films/film-a/README.md), from the menu.
export const ONE_TOUR_FILM = { title: "The ONE tour on the desktop", src: "/home/films/film-a.mp4", poster: "/home/films/film-a.jpg", captions: "/home/films/film-a.vtt", note: "Example agent; people and addresses are invented." };
// Film C (approved by Parry 21 Oct 14:43 MT: "yes for now"): the website film, 23 min, voiced; the phone cut for narrow screens. File names stay stable so an update is a straight replacement.
export const WEBSITE_FILM = { title: "The ONE website film", src: "/home/films/film-c.mp4", poster: "/home/films/film-c.jpg", captions: "/home/films/film-c.vtt", note: "Example agent; people and addresses are invented.", tallSrc: "/home/films/film-c-tall.mp4", tallPoster: "/home/films/film-c.jpg", tallCaptions: "/home/films/film-c-tall.vtt", captionsOn: true };
const SIGNALS = { title: "What everything means", src: SIGNALS_FILM.src, poster: SIGNALS_FILM.poster, captions: SIGNALS_FILM.captions, stepHref: "/watch?signals=1", note: "Example agent; people and addresses are invented.", tallSrc: SIGNALS_FILM.tallSrc, tallPoster: SIGNALS_FILM.tallPoster };

type Film = { title: string; src: string; poster: string; captions: string; stepHref?: string; note: string; tallSrc?: string; tallPoster?: string; tallCaptions?: string; captionsOn?: boolean };

/** `onEnded` runs when the film plays to the end (Getting started step 11 records it; GETTING-STARTED §5). */
export default function SignalsFilm({ onClose, onMeet, onEnded, onNext, film = SIGNALS }: { onClose: () => void; onMeet?: () => void; onEnded?: () => void; onNext?: { label: string; open: () => void }; film?: Film }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [ended, setEnded] = useState(false); // Film A ends on "See the website film"
  // What everything means opens on the written key; its film waits, paused and silent, until pressed (walker audit 02).
  const keyFirst = film === SIGNALS;
  const [showFilm, setShowFilm] = useState(!keyFirst);
  // Phones get the tall cut, so the orb labels can be read at 390px (walker audit 02).
  const [tall, setTall] = useState(false);
  useEffect(() => {
    if (film.tallSrc) setTall(window.matchMedia("(max-width: 719px)").matches);
  }, [film.tallSrc]);
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
        {keyFirst && (
          <ul className="sf-key" aria-label="What the map shows">
            {SIGNALS_KEY.map((k) => (
              <li key={k.mark}>
                <i className={`sf-mark sf-${k.mark}`} aria-hidden="true">{k.mark === "count" ? "3" : k.mark === "click" ? "→" : ""}</i>
                <span>
                  <b>{k.name}</b> {k.means}
                </span>
              </li>
            ))}
          </ul>
        )}
        {showFilm ? (
          <video className={`sf-video${tall ? " tall" : ""}`} src={tall ? film.tallSrc : film.src} poster={tall ? film.tallPoster : film.poster} controls autoPlay={!keyFirst} playsInline preload="metadata" onEnded={() => { setEnded(true); onEnded?.(); }}>
            <track kind="captions" src={tall && film.tallCaptions ? film.tallCaptions : film.captions} srcLang="en" label="English" default={film.captionsOn} />
          </video>
        ) : (
          <button className="pi-btn sf-watch" onClick={() => setShowFilm(true)}>
            ▶ Watch the film (1 min 35 s)
          </button>
        )}
        <p className="sf-note">
          {film.note} {film.stepHref && <a href={film.stepHref}>Play it step by step</a>}
        </p>
        {onNext && ended && (
          <div className="pi-actions">
            <button className="pi-btn" onClick={onNext.open}>{onNext.label}</button>
          </div>
        )}
        {onMeet && (
          <div className="pi-actions">
            <button className="pi-btn" onClick={onMeet}>Meet Pulse: what it does for you</button>
          </div>
        )}
      </section>
    </div>
  );
}
