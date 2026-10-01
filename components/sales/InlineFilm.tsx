"use client";

import { useRef, useState } from "react";

// A product's voiced tour, played right here on the sales page: the button
// opens the player in place and starts it; nothing loads until pressed.
export default function InlineFilm({ film, name }: { film: { src: string; poster?: string; captions?: string }; name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  if (!open)
    return (
      <button
        className="sp-play"
        onClick={() => {
          setOpen(true);
          setTimeout(() => ref.current?.play().catch(() => {}), 50);
        }}
      >
        ▶ Watch the {name} tour
      </button>
    );
  return (
    <figure className="sp-inline-film">
      <video ref={ref} controls playsInline preload="auto" poster={film.poster} aria-label={`${name} tour`}>
        <source src={film.src} type="video/mp4" />
        {film.captions && <track kind="captions" src={film.captions} srcLang="en" label="English" />}
      </video>
      <button className="sp-close-film" onClick={() => setOpen(false)}>
        Close
      </button>
    </figure>
  );
}
