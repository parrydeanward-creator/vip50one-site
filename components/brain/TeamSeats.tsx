"use client";

import { useEffect, useState } from "react";
import { addSeatResult, readSeats, seatsLine, seatsUrl, type Seats } from "@/lib/teamSeats.ts";

// Team screen: Seats, beside Add a member and the invite link (TEAM-ONBOARDING §2; vip50-web-crm#259). Paid teams
// only; Add seat asks first with ONE MOVE's own words and charges only on Yes.
export default function TeamSeats({ live }: { live: boolean }) {
  const [seats, setSeats] = useState<Seats | null | undefined>(undefined);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    fetch(seatsUrl, { credentials: "include", cache: "no-store" })
      .then(async (r) => setSeats(readSeats(r.ok, await r.json().catch(() => null))))
      .catch(() => setSeats(undefined));
  useEffect(() => {
    if (live) void load();
  }, [live]);

  const add = async () => {
    setBusy(true);
    setNote(null);
    const r = await fetch(seatsUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) }).catch(() => null);
    const res = addSeatResult(r?.status ?? 0, r ? await r.json().catch(() => null) : null);
    setNote(res.line);
    setAsking(false);
    setBusy(false);
    if (res.ok) void load();
  };

  if (!seats) return null;
  return (
    <section className="tm-add" aria-label="Seats">
      <h3>Seats</h3>
      <small className="pf-sub">{seatsLine(seats)}</small>
      {asking ? (
        <div className="tm-confirm">
          <p>{seats.confirm}</p>
          <div className="decide-btns">
            <button type="button" className="chip-btn" disabled={busy} onClick={() => void add()}>{busy ? "Adding..." : "Yes, add the seat"}</button>
            <button type="button" className="chip-btn" disabled={busy} onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="decide-btns">
          <button type="button" className="chip-btn" onClick={() => { setNote(null); setAsking(true); }}>Add seat</button>
        </div>
      )}
      {note ? <small className="pf-sub" role="status">{note}</small> : null}
    </section>
  );
}
