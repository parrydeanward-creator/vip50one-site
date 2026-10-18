"use client";

import { useEffect, useState } from "react";
import { DEMO_NOTE, actionBody, closingsFoundUrl, demoFound, foundNote, offerLine, readActionResult, readFound, type FoundState } from "@/lib/closingsFound.ts";

// K19 "Closings that log themselves": the agent's own closed MLS listings, offered once. Nothing is logged unless the
// agent taps "Log this toward my goal"; "Not mine" removes it for good. ?demo=1 keeps both actions local.

export default function ClosingsFoundCard({ demo, onLogged }: { demo: boolean; onLogged: () => Promise<unknown> | void }) {
  const [state, setState] = useState<FoundState | null>(null);
  const [busy, setBusy] = useState<Record<string, "saving" | "logged">>({});
  const [msg, setMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    if (demo) return setState(demoFound());
    let off = false;
    fetch(closingsFoundUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j) => !off && setState(readFound(j)));
    return () => {
      off = true;
    };
  }, [demo]);

  const drop = (id: string) => setState((s) => (s ? { ...s, offers: s.offers.filter((o) => o.listingId !== id) } : s));

  async function act(id: string, action: "log" | "dismiss") {
    const body = actionBody(id, action);
    if (!body) return;
    setMsg((m) => ({ ...m, [id]: "" }));
    if (action === "log") setBusy((b) => ({ ...b, [id]: "saving" }));
    if (demo) {
      if (action === "log") {
        setBusy((b) => ({ ...b, [id]: "logged" }));
      } else {
        drop(id);
      }
      return;
    }
    let res = readActionResult(null);
    try {
      const r = await fetch(closingsFoundUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      res = readActionResult(await r.json().catch(() => null));
    } catch {
      res = { ok: false, error: "That didn't save. Check your connection and try again." };
    }
    if (!res.ok) {
      setBusy((b) => {
        const n = { ...b };
        delete n[id];
        return n;
      });
      return setMsg((m) => ({ ...m, [id]: res.error }));
    }
    if (action === "log") {
      setBusy((b) => ({ ...b, [id]: "logged" }));
      await Promise.resolve(onLogged()).catch(() => {});
    } else drop(id);
  }

  if (!state) return null;
  const note = foundNote(state);
  if (!note && state.offers.length === 0) return null;
  return (
    <section className="cf-card" aria-labelledby="cf-h">
      <h3 className="cf-h" id="cf-h">Found in the MLS</h3>
      {note ? (
        <p className="pm-empty">{note}</p>
      ) : (
        <ul className="pm-list pm-compact">
          {state.offers.map((o) => (
            <li key={o.listingId} className="cf-row">
              <span className="pm-body">
                <b>{offerLine(o)}</b>
                {msg[o.listingId] ? <small role="status">{msg[o.listingId]}</small> : null}
              </span>
              <span className="cf-acts">
                {busy[o.listingId] === "logged" ? (
                  <span className="cf-done" role="status">{`Logged.${demo ? " " + DEMO_NOTE : ""}`}</span>
                ) : (
                  <>
                    <button className="cf-log" disabled={busy[o.listingId] === "saving"} onClick={() => void act(o.listingId, "log")}>
                      {busy[o.listingId] === "saving" ? "Saving..." : "Log this toward my goal"}
                    </button>
                    <button className="link cf-no" disabled={busy[o.listingId] === "saving"} onClick={() => void act(o.listingId, "dismiss")}>
                      Not mine
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
