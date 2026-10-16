"use client";

import { useState } from "react";
import { IN_BRAIN } from "@/lib/moveMenu.ts";
import { productLink } from "@/lib/productSignIn.ts";
import { heatUrl, priceWords, readHeatAnswer, type HeatSuggestion } from "@/lib/heat.ts";

// Looks Hot (CONNECTIONS §5.1) in the side panel of a suggestion's orb: why, the homes they liked, and two buttons.
export default function HeatPanel({ s, live, onDone, onOpenPage }: { s: HeatSuggestion; live: boolean; onDone: (id: string, line: string) => void; onOpenPage: (path: string, query: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needUrl, setNeedUrl] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const decide = async (accept: boolean) => {
    if (!live) return setErr("Example agent: Looks Hot works on your own contacts.");
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(heatUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, accept }) });
      const a = readHeatAnswer(r.ok, await r.json().catch(() => null));
      if (!a.ok) return setErr(a.error);
      const line = a.accepted ? `${s.name} is now Hot.` : "Dismissed. Pulse won't suggest them again for 30 days.";
      setDone(line);
      setNeedUrl(a.needUrl);
      onDone(s.id, line);
    } catch {
      setErr("ONE MOVE didn't take that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const openNeed = (url: string) => {
    const u = new URL(url);
    if (u.host === "move.vip50one.com" && IN_BRAIN.has(u.pathname)) return onOpenPage(u.pathname, u.search.replace(/^\?/, ""));
    window.open(productLink(url), "_blank", "noopener");
  };

  return (
    <div className="heat">
      <h2 className="wr-h">Looks Hot</h2>
      {s.why && <p className="heat-why">{s.why}</p>}
      {s.homes.length > 0 && (
        <ul className="heat-homes">
          {s.homes.map((h) => (
            <li key={h.propertyKey}>
              {h.photo ? <img src={h.photo} alt="" loading="lazy" /> : <span className="heat-nophoto" aria-hidden="true">⌂</span>}
              <span>
                <b>{h.address ?? "A home"}</b>
                <small>{[h.city, priceWords(h.price), h.beds ? `${h.beds} beds` : null].filter(Boolean).join(" · ")}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
      {done ? (
        <>
          <p className="decide-done" role="status">{done}</p>
          {needUrl && (
            <button className="btn ghost-btn" onClick={() => openNeed(needUrl)}>
              Post a Buyer Need from the homes they liked
            </button>
          )}
        </>
      ) : (
        <div className="decide-btns">
          <button className="btn" disabled={busy} onClick={() => decide(true)}>Move to Hot</button>
          <button className="btn ghost-btn" disabled={busy} onClick={() => decide(false)}>Dismiss</button>
        </div>
      )}
      {err && <p className="decide-err" role="alert">{err}</p>}
      <small className="heat-note">Moving them to Hot sends nothing to them. You decide what happens next.</small>
    </div>
  );
}
