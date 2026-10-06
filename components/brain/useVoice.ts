"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Talk to Pulse (Parry, 6 Oct: "by talking to pulse or typing"): the browser's own speech recognition
// (Chrome, Edge, Safari), words shown as they are heard; and Pulse saying its question back when the
// agent is talking. Nothing is recorded or kept: the browser turns speech into text and the text is all
// Pulse sees. Where the browser has no speech recognition, the mic is not shown.

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function recognizer(): Rec | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return R ? new R() : null;
}

export function useVoice(onFinal: (text: string) => void) {
  const [can, setCan] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  useEffect(() => {
    setCan(!!recognizer());
    return () => rec.current?.stop();
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);
  const listen = useCallback(() => {
    const r = recognizer();
    if (!r) return;
    rec.current?.stop();
    rec.current = r;
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = true;
    let text = "";
    setHeard("");
    setError(null);
    r.onresult = (e) => {
      let all = "";
      for (let i = 0; i < e.results.length; i++) all += e.results[i][0].transcript;
      text = all;
      setHeard(all);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Allow the microphone for this site to talk to Pulse." : e.error === "no-speech" ? "Pulse didn't hear anything. Tap the mic and talk." : null);
    r.onend = () => {
      setListening(false);
      if (text.trim()) finalRef.current(text.trim());
    };
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, []);

  return { can, listening, heard, error, listen, stop };
}

/** Pulse says it out loud (the browser's own voice), then calls back so it can listen for the answer. */
export function say(text: string, then?: () => void) {
  try {
    const s = window.speechSynthesis;
    if (!s) return then?.();
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.03;
    u.onend = () => then?.();
    u.onerror = () => then?.();
    s.speak(u);
  } catch {
    then?.();
  }
}
