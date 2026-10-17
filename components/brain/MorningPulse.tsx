"use client";

import { useEffect, useRef, useState } from "react";
import { say } from "./useVoice.ts";
import { MP_PRODUCTS, type Beat, type BeatTool } from "@/lib/morningPulse.ts";

// Morning Pulse (Parry, 16 Oct 21:14 MT: "yes"): the script (lib/morningPulse.ts) played over the live graph, one beat at a
// time, in the agent's chosen Pulse voice (Man/Woman, lib/voicePick.ts via say()). The caption is exactly the words said,
// so it works with the sound off; with no voice on the device, or the voice off, each caption holds for its own time.
// The Brain moves the camera (onBeat); with reduced motion it does not, and only the captions change.

export default function MorningPulse({
  beats,
  example,
  onBeat,
  onTool,
  onFinish,
  onClose,
}: {
  beats: Beat[];
  example: boolean;
  onBeat: (b: Beat, reduced: boolean) => void;
  onTool: (t: BeatTool) => void;
  /** The last beat ended: the Brain opens the plan (Day Clock, Looks good). */
  onFinish: () => void;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [sound, setSound] = useState(true);
  const [reduced, setReduced] = useState(false);
  const run = useRef(0);
  const pauseRef = useRef<HTMLButtonElement | null>(null);
  const b = beats[Math.min(i, beats.length - 1)];
  const last = i >= beats.length - 1;

  const finish = useRef(onFinish);
  finish.current = onFinish;
  const beatCb = useRef(onBeat);
  beatCb.current = onBeat;

  useEffect(() => {
    let r = false;
    try { r = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* old browser */ }
    setReduced(r);
    // Chrome lists its voices only after a first ask.
    try { window.speechSynthesis?.getVoices(); } catch { /* no voices */ }
    pauseRef.current?.focus();
    return () => {
      run.current++;
      try { window.speechSynthesis?.cancel(); } catch { /* nothing to stop */ }
    };
  }, []);

  // The camera, once per beat.
  useEffect(() => {
    if (b) beatCb.current(b, reduced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, reduced]);

  // Say the beat (or hold its caption), then move on.
  useEffect(() => {
    if (!playing || !b) return;
    const token = ++run.current;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let safety: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      if (run.current !== token) return;
      if (i >= beats.length - 1) finish.current();
      else setI(i + 1);
    };
    const canSpeak = sound && typeof window !== "undefined" && "speechSynthesis" in window;
    if (canSpeak) {
      // A voice that fails at once (no voice, the browser refusing) still leaves the caption up for its time.
      say(b.words, () => {
        if (run.current !== token) return;
        timer = setTimeout(next, Math.max(450, b.ms - (Date.now() - started)));
      });
      safety = setTimeout(next, b.ms * 3 + 5000);
    } else {
      timer = setTimeout(next, b.ms);
    }
    return () => {
      run.current++;
      clearTimeout(timer);
      clearTimeout(safety);
      try { window.speechSynthesis?.cancel(); } catch { /* already quiet */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, playing, sound]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  if (!b) return null;
  const skip = () => {
    if (last) finish.current();
    else setI(i + 1);
  };

  return (
    <section className="mp-wrap" aria-label="Morning Pulse">
      <p className="mp-head">
        <svg className="mp-pulse" viewBox="0 0 22 10" aria-hidden="true">
          <path d="M0 5h6l2-4 3 8 2-4h9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span>{b.kicker}</span>
        {example ? <span className="mp-example">Example</span> : null}
      </p>
      <div className="mp-body" role="region" aria-label="Morning Pulse captions">
        {b.face ? (
          <span className="mp-face" aria-hidden="true">
            {b.face.photo ? <img src={b.face.photo} alt="" /> : b.face.initials}
          </span>
        ) : null}
        <div>
          <p className="mp-caption" aria-live="polite">{b.words}</p>
          {b.tool ? (
            <button
              type="button"
              className="mp-tool"
              onClick={() => {
                setPlaying(false);
                onTool(b.tool!);
              }}
            >
              {b.tool.label}
            </button>
          ) : null}
        </div>
      </div>
      <ul className="mp-products" aria-label="Products">
        {MP_PRODUCTS.map((p) => (
          <li key={p} className={b.product === p ? "mp-on" : undefined}>{p}</li>
        ))}
      </ul>
      <div className="mp-bar">
        <button ref={pauseRef} type="button" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause Morning Pulse" : "Resume Morning Pulse"}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={skip} aria-label={last ? "Finish Morning Pulse and open the plan" : "Skip to the next part"}>
          {last ? "Done" : "Skip"}
        </button>
        <button type="button" onClick={() => setSound((v) => !v)} aria-pressed={!sound} aria-label={sound ? "Turn Pulse's voice off" : "Turn Pulse's voice on"}>
          {sound ? "Voice on" : "Voice off"}
        </button>
        <span className="mp-progress" aria-hidden="true">
          <i style={{ width: `${Math.round(((i + 1) / beats.length) * 100)}%` }} />
        </span>
        <span className="mp-step">{i + 1} of {beats.length}</span>
        <button type="button" onClick={onClose} aria-label="Close Morning Pulse">
          Close
        </button>
      </div>
    </section>
  );
}
