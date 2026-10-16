"use client";

import { useEffect, useState } from "react";
import { say } from "./useVoice.ts";
import { spokenMorning } from "@/lib/spoken.ts";

/** Listen to the Morning Pulse (§3o.13): about a minute, in the browser's own voice. Hidden where it cannot speak. */
export default function ListenNote({ greeting, firstName, note }: { greeting: string; firstName: string; note: string }) {
  const [can, setCan] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    setCan(typeof window !== "undefined" && "speechSynthesis" in window);
    // Chrome lists its voices only after a first ask; asking now means the natural voice is ready on the first Listen.
    try { window.speechSynthesis?.getVoices(); } catch { /* no voices */ }
    return () => {
      try { window.speechSynthesis?.cancel(); } catch { /* nothing to stop */ }
    };
  }, []);
  if (!can) return null;
  const toggle = () => {
    if (on) {
      try { window.speechSynthesis.cancel(); } catch { /* already quiet */ }
      return setOn(false);
    }
    setOn(true);
    say(spokenMorning(greeting, firstName, note), () => setOn(false));
  };
  return (
    <button type="button" className="ln-btn" onClick={toggle} aria-pressed={on}>
      <span aria-hidden="true">{on ? "■" : "▶"}</span> {on ? "Stop" : "Listen (1 min)"}
    </button>
  );
}
