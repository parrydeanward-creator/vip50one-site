"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TimeOffView from "./TimeOffView.tsx";
import { addDays, backOn, coverNeeded, demoTimeOff, firstDayBack, planProblem, readTimeOff, saveBody, short, timeOffLine, timeOffUrl, type TimeOffState } from "@/lib/timeOff.ts";

// Time off on My Profile (Parry, 16 Oct 13:25 MT: "can we add time off somehow to profile page...get rid of that orb under
// one you?"). A card in the two-column grid (PROTOCOL rule 8), with the same function the ONE YOU view had: the dates
// away, what needs cover while the agent is gone, the first day back, plan and cancel. The full view (orbs round the
// time off) is one tap away. Same MASTER data and routes as before (VIP-SUMMARY §3x); Pulse still plans round it.
// In the demo it runs on the example agent's long weekend and nothing is saved.

export default function TimeOffSection({ demo = false }: { demo?: boolean }) {
  const [s, setS] = useState<TimeOffState | null>(null);
  const [full, setFull] = useState(false);
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    if (demo) return setS((x) => x ?? demoTimeOff(today));
    const j = await fetch(timeOffUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    setS(j ? readTimeOff(j, today) : null);
  }, [demo]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!s || starts) return;
    setStarts(addDays(s.today, 7));
    setEnds(addDays(s.today, 9));
  }, [s, starts]);
  // ONE YOU's "Away until <date>" line opens My Profile at this card (#time-off).
  useEffect(() => {
    if (!s || typeof window === "undefined" || window.location.hash !== "#time-off") return;
    cardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [s]);

  const save = useCallback(
    async (a: string, b: string, n: string): Promise<string | null> => {
      if (demo) {
        setS((x) => (x ? { ...x, upcoming: [...x.upcoming, { id: `demo-${a}`, starts: a, ends: b, note: n.trim() || null }].sort((p, q) => p.starts.localeCompare(q.starts)) } : x));
        return null;
      }
      const r = await fetch(timeOffUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(saveBody(a, b, n)) }).catch(() => null);
      if (!r || !r.ok) return (r && ((await r.json().catch(() => null)) as { error?: string } | null)?.error) || "Could not save that just now.";
      await load();
      return null;
    },
    [demo, load],
  );
  const cancel = useCallback(
    async (id: string): Promise<string | null> => {
      if (demo) {
        setS((x) => (x ? { ...x, current: x.current?.id === id ? null : x.current, upcoming: x.upcoming.filter((o) => o.id !== id) } : x));
        return null;
      }
      const r = await fetch(`${timeOffUrl}?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" }).catch(() => null);
      if (!r || !r.ok) return "Could not change that just now.";
      await load();
      return null;
    },
    [demo, load],
  );

  if (!s) return null;
  const problem = planProblem(s, starts, ends);
  const cover = coverNeeded(s);
  const back = firstDayBack(s);
  const planned = [s.current, ...s.upcoming].filter((o): o is NonNullable<typeof o> => !!o);
  const doSave = async () => {
    if (problem || busy) return;
    setBusy(true);
    const err = await save(starts, ends, note);
    setBusy(false);
    setMsg(err ?? `Saved: ${short(starts)} to ${short(ends)}. You are back ${short(addDays(ends, 1))}.`);
    if (!err) setNote("");
  };
  const doCancel = async (id: string) => {
    setBusy(true);
    const err = await cancel(id);
    setBusy(false);
    setMsg(err ?? (s.current?.id === id ? "Welcome back. Your time off ended today." : "Cancelled."));
  };

  return (
    <section ref={cardRef} id="time-off" className="pf-card" aria-label="Time off">
      <h2>Time off</h2>
      <small className="pf-sub">{s.current ? `Away until ${short(s.current.ends)}. Back ${short(backOn(s.current))}.` : timeOffLine(s)}</small>
      <small className="pf-sub">While you are away nothing pulses, Autopilot waits, the week does not count against 100, and Pulse plans your first day back. Nothing is sent to your clients; your coach sees only the dates.</small>
      {cover.length && !s.current ? (
        <small className="pf-sub warn">{`${cover.length} ${cover.length === 1 ? "thing needs" : "things need"} cover: ${cover.map((d) => `${d.title} (${short(d.date)})`).join("; ")}.`}</small>
      ) : null}
      {planned.length ? (
        <ul className="pm-list pm-compact">
          {planned.map((o) => (
            <li key={o.id}>
              <span className="pm-body">
                <b>{`${short(o.starts)} to ${short(o.ends)}`}</b>
                <small>{o.note ?? (s.current?.id === o.id ? "Now" : "Coming up")}</small>
              </span>
              <span className="pm-acts">
                <button disabled={busy} onClick={() => void doCancel(o.id)} aria-label={s.current?.id === o.id ? "End my time off today" : `Cancel time off ${short(o.starts)}`}>
                  {s.current?.id === o.id ? "End" : "×"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {back.length ? <small className="pf-sub">{`First day back: ${back.join("; ")}.`}</small> : null}
      <div className="to-form">
        <label>
          First day <input type="date" value={starts} min={s.today} onChange={(e) => setStarts(e.target.value)} />
        </label>
        <label>
          Last day <input type="date" value={ends} min={starts} onChange={(e) => setEnds(e.target.value)} />
        </label>
        <label className="to-note">
          Note, for you <input type="text" value={note} maxLength={140} placeholder="Family trip" onChange={(e) => setNote(e.target.value)} />
        </label>
        {problem ? <small className="pf-sub warn">{problem}</small> : null}
      </div>
      <div className="pf-btns">
        <button type="button" className="chip-btn primary" disabled={!!problem || busy} onClick={() => void doSave()}>
          Save time off
        </button>
        <button type="button" className="chip-btn" onClick={() => setFull(true)}>
          What comes due
        </button>
      </div>
      {msg ? <small className="pf-sub" role="status">{msg}</small> : null}
      {demo ? <small className="pf-sub">Example agent. Nothing is saved.</small> : null}
      {full && typeof document !== "undefined" ? createPortal(<TimeOffView data={s} demo={demo} onSave={save} onCancel={cancel} onClose={() => setFull(false)} />, document.body) : null}
    </section>
  );
}
