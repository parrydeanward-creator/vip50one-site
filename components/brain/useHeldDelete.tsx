"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteRequest, failWords, heldWords, holdDelete, readDeleted } from "@/lib/deleteContact.ts";

// The held delete (lib/deleteContact.ts): the person leaves the screen at once, a toast says "Deleted Rosa. Undo" for
// 6 seconds, Undo puts them back and nothing is sent; when the time is up ONE MOVE's route is called, and if it does
// not take it the person comes back and the toast says so. A second delete, or the page closing, sends the first one
// straight away (keepalive), so a delete the agent saw happen is never silently dropped. The demo saves nothing.

type Start = {
  ids: string[];
  first: string;
  /** Put the person back on screen (Undo, or ONE MOVE did not take it). */
  restore: () => void;
  /** After ONE MOVE took it (reload counts and lists). */
  onDone?: () => void;
};

export function useHeldDelete({ demo }: { demo: boolean }) {
  const [toast, setToast] = useState<{ k: number; words: string; undo: boolean } | null>(null);
  const cur = useRef<{ h: ReturnType<typeof holdDelete>; s: Start } | null>(null);
  const kRef = useRef(0);

  const send = useCallback(
    async (s: Start, keepalive: boolean) => {
      if (demo) return s.onDone?.();
      const req = deleteRequest(s.ids);
      if (!req) return;
      let ok = false;
      try {
        const r = await fetch(req.url, { ...req.init, keepalive });
        ok = readDeleted(r.status, await r.json().catch(() => null)).ok;
      } catch {
        ok = false;
      }
      if (ok) return s.onDone?.();
      s.restore();
      setToast({ k: ++kRef.current, words: failWords(s.first, s.ids.length), undo: false });
    },
    [demo],
  );

  const start = useCallback(
    (s: Start) => {
      // One held at a time: the one before goes now.
      cur.current?.h.flush();
      const k = ++kRef.current;
      const h = holdDelete({
        run: () => {
          if (cur.current?.h === h) cur.current = null;
          setToast((t) => (t?.k === k ? null : t));
          void send(s, false);
        },
      });
      cur.current = { h, s };
      setToast({ k, words: heldWords(s.first, s.ids.length), undo: true });
    },
    [send],
  );

  const undo = useCallback(() => {
    const c = cur.current;
    if (!c || !c.h.undo()) return;
    cur.current = null;
    c.s.restore();
    setToast(null);
  }, []);

  // Closing the page, or leaving this view, sends what is held (the agent saw it go).
  useEffect(() => {
    const out = () => {
      const c = cur.current;
      if (!c || !c.h.held()) return;
      c.h.undo();
      cur.current = null;
      void send(c.s, true);
    };
    window.addEventListener("pagehide", out);
    return () => {
      window.removeEventListener("pagehide", out);
      out();
    };
  }, [send]);

  // A failure note stays a little longer, then goes by itself.
  useEffect(() => {
    if (!toast || toast.undo) return;
    const t = setTimeout(() => setToast((x) => (x?.k === toast.k ? null : x)), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const node = toast ? (
    <div className="del-toast pop" role="status" key={toast.k}>
      <span>{toast.words}</span>
      {toast.undo ? (
        <button className="chip-btn primary" onClick={undo}>
          Undo
        </button>
      ) : (
        <button className="chip-btn" onClick={() => setToast(null)}>
          OK
        </button>
      )}
    </div>
  ) : null;

  return { start, undo, toast: node };
}
