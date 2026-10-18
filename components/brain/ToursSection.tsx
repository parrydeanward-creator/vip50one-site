"use client";

import { useCallback, useEffect, useState } from "react";
import { DAY_CHIPS, TOURS_CHECK, TOURS_COPY, TOURS_FAILED, TOURS_SAVED, TOURS_SAVING, TOURS_TITLE, demoTours, readTours, toggleDay, toursBody, toursUrl, type TourHours } from "@/lib/tours.ts";

// My Profile card, in the two-column grid (PROTOCOL rule 8). Same words and routes as Classic. In the demo it saves on
// the screen only.

export default function ToursSection({ demo = false }: { demo?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [on, setOn] = useState(false);
  const [hours, setHours] = useState<TourHours>({ days: [], start: "09:00", end: "17:00" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const t = demo
      ? demoTours()
      : await fetch(toursUrl, { credentials: "include", cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then(readTours)
          .catch(() => null);
    if (!t) return;
    setOn(t.on);
    setHours(t.hours);
    setLoaded(true);
  }, [demo]);
  useEffect(() => {
    void load();
  }, [load]);

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setMsg(null);
  };

  const save = async () => {
    const body = toursBody(on, hours);
    if ("error" in body) return setMsg({ ok: false, text: body.error });
    setBusy(true);
    setMsg({ ok: true, text: TOURS_SAVING });
    if (demo) {
      setBusy(false);
      return setMsg({ ok: true, text: TOURS_SAVED });
    }
    const r = await fetch(toursUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!r || !r.ok || j?.ok === false) return setMsg({ ok: false, text: (j && typeof j.error === "string" && j.error) || TOURS_FAILED });
    setMsg({ ok: true, text: TOURS_SAVED });
  };

  if (!loaded) return null;
  return (
    <section id="tours" className="pf-card tours-card" aria-label={TOURS_TITLE}>
      <h2>{TOURS_TITLE}</h2>
      <small className="pf-sub">{TOURS_COPY}</small>
      <label className="tours-check">
        <input type="checkbox" checked={on} onChange={(e) => edit(setOn)(e.target.checked)} />
        <span>{TOURS_CHECK}</span>
      </label>
      <div className="tours-days" role="group" aria-label="Days visitors can book">
        {DAY_CHIPS.map((d) => (
          <button key={d.n} type="button" className={`chip-btn${hours.days.includes(d.n) ? " primary" : ""}`} aria-pressed={hours.days.includes(d.n)} onClick={() => edit(setHours)({ ...hours, days: toggleDay(hours.days, d.n) })}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="tours-times">
        <label>
          From <input type="time" value={hours.start} onChange={(e) => edit(setHours)({ ...hours, start: e.target.value })} />
        </label>
        <label>
          to <input type="time" value={hours.end} onChange={(e) => edit(setHours)({ ...hours, end: e.target.value })} />
        </label>
      </div>
      <div className="pf-btns">
        <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void save()}>
          Save hours
        </button>
      </div>
      {msg ? <small className={`pf-sub${msg.ok ? "" : " warn"}`} role="status">{msg.text}</small> : null}
      {demo ? <small className="pf-sub">Example agent. Nothing is saved.</small> : null}
    </section>
  );
}
