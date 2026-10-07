"use client";

import { useEffect, useRef, useState } from "react";
import PulseRing, { PULSE_COLOR } from "./PulseRing.tsx";
import CallPrepCard from "./CallPrepCard.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { touchUrl } from "@/lib/contact.ts";
import { chimeOn, playChime } from "@/lib/chime.ts";
import { LENGTHS, LOGGED, OUTCOME_WORD, bringUp, current, mmss, remaining, wrap, type Call, type Outcome, type Session } from "@/lib/powerHour.ts";

// Power Hour in ONE YOU (PULSE-ROADMAP "ONE YOU"; Parry approved, 6 Oct). The call now sits in the middle with
// the countdown round it; the rest of the line-up goes round them. Tap anyone and they come to the middle with
// their call in the side panel (Parry, 6 Oct, the rule for every orb). Call Prep comes first, then the agent
// says how it went. Only "Talked" and "Left a message" are logged, in ONE MOVE; nothing is sent to anyone.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 140;
const RING = 330;
const R = 54;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

function arc(cx: number, cy: number, r: number, share: number): string {
  const a = Math.max(0.001, Math.min(0.9999, share)) * Math.PI * 2;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}`;
}

export default function PowerHourView({
  calls,
  session,
  live,
  onSession,
  onTick,
  onClose,
}: {
  calls: Call[];
  session: Session;
  live: boolean;
  onSession: (s: Session) => void;
  onTick: (ref: string, done: boolean) => void;
  onClose: () => void;
}) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [now, setNow] = useState(() => Date.now());
  const [pick, setPick] = useState<string | null>(null);
  const [prep, setPrep] = useState<Call | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const rang = useRef(false);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      clearInterval(t);
    };
  }, []);

  const left = remaining(session, now);
  const timeUp = left === 0;
  // one chime when the hour is up, if the agent keeps chimes on (the Day Clock's switch)
  useEffect(() => {
    if (timeUp && !rang.current) {
      rang.current = true;
      if (chimeOn()) playChime(true);
    }
  }, [timeUp]);

  const nowCall = current(calls, session);
  const sel = calls.find((c) => c.id === pick) ?? nowCall;
  const w = wrap(calls, session);
  const finished = timeUp || !nowCall;
  const others = calls.filter((c) => c.id !== sel?.id);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(others.length, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const seats = others.map((c, k) => ({ c, ...seatAt(k) }));

  const choose = (c: Call) => {
    if (sel?.id === c.id && pick) {
      setPick(null);
      return cam.reset();
    }
    setPick(c.id);
    if (!session.results[c.id]) onSession(bringUp(session, c.id));
    cam.reset();
    setTimeout(() => document.getElementById(`ph-row-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });

  const start = (minutes: number) => onSession({ ...session, minutes, startedAt: Date.now() });
  const outcome = async (c: Call, o: Outcome) => {
    setBusy(true);
    let msg: string | null = null;
    if (LOGGED.includes(o)) {
      if (!live) msg = `${OUTCOME_WORD[o]}: in your account this logs the call in ONE MOVE and ticks the box.`;
      else if (!c.contactId) msg = `${OUTCOME_WORD[o]}. ${c.name} isn't linked to a contact, so log it in ONE MOVE.`;
      else {
        try {
          const r = await fetch(touchUrl, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact_id: c.contactId, kind: "call", detail: o === "talked" ? "Power Hour: talked" : "Power Hour: left a message", ...(o === "talked" && c.taskId ? { task_id: c.taskId } : {}) }),
          });
          const j = await r.json().catch(() => ({}));
          msg = r.ok && j.ok ? `Call logged for ${c.name}.` : `Not logged: ${j.error ?? "ONE MOVE didn't take it"}. Try again from their card.`;
          if (!(r.ok && j.ok)) {
            setNote(msg);
            setBusy(false);
            return;
          }
        } catch {
          setNote("Not logged: ONE couldn't reach ONE MOVE. Try again.");
          setBusy(false);
          return;
        }
      }
      if (c.ref) onTick(c.ref, true);
    }
    onSession({ ...session, results: { ...session.results, [c.id]: o } });
    setPick(null);
    setNote(msg);
    setBusy(false);
    cam.reset();
  };
  const undo = (c: Call) => {
    const results = { ...session.results };
    delete results[c.id];
    onSession(bringUp({ ...session, results }, c.id));
    setPick(null);
  };

  const ringFor = (c: Call) => {
    const r = session.results[c.id];
    if (r) return LOGGED.includes(r) ? GREEN : "rgba(160,175,210,0.45)";
    return c.level === "now" ? PULSE_COLOR.now : c.level === "today" ? PULSE_COLOR.today : GOLD;
  };
  const share = left == null ? 1 : left / (session.minutes * 60_000);

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="ph-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Power Hour">
            <defs>
              <radialGradient id="ph-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ c, x, y }) => (
              <line key={`l-${c.id}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${sel.name}, in the middle. ${sel.why}`}>
                {!session.results[sel.id] && sel.level ? <PulseRing r={CORE} level={sel.level} x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#ph-glass)" stroke={ringFor(sel)} strokeWidth={3} />
                <path d={arc(C, C, CORE + 14, share)} fill="none" stroke={timeUp ? PULSE_COLOR.now : GOLD} strokeWidth={8} strokeLinecap="round" />
                <text className="dt-score" x={C} y={C - 14} textAnchor="middle" fontSize={56}>{initials(sel.name)}</text>
                <text className="dt-score-sub" x={C} y={C + 22} textAnchor="middle">{sel.name.toUpperCase().slice(0, 22)}</text>
                <text className="dt-score-sub" x={C} y={C + 56} textAnchor="middle" fontSize={22}>{left == null ? `${session.minutes}:00` : mmss(left)}</text>
              </g>
            ) : (
              <g aria-label="No calls lined up">
                <circle cx={C} cy={C} r={CORE} fill="url(#ph-glass)" stroke="#ffd86a" strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">☎</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">NO CALLS TODAY</text>
              </g>
            )}

            {seats.map(({ c, x, y }) => {
              const res = session.results[c.id];
              return (
                <g key={c.id} data-tap className={`pm-orb pm-plan${res ? " is-done" : ""}`} role="button" tabIndex={0} aria-label={`${c.name}: ${res ? OUTCOME_WORD[res] : c.why}`} {...tap(() => choose(c))}>
                  {!res && c.level ? <PulseRing r={R} level={c.level} x={x} y={y} /> : null}
                  <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#ph-glass)" stroke={ringFor(c)} strokeWidth={2.5} opacity={res ? 0.75 : 1} />
                  <text className="pm-mark" x={x} y={y} dy="0.36em" textAnchor="middle" fontSize={22}>{res ? (LOGGED.includes(res) ? "✓" : "–") : initials(c.name)}</text>
                  <text className="pm-name-l" x={x} y={y + R + 22} textAnchor="middle">{c.name.split(/\s+/)[0]}</text>
                </g>
              );
            })}
          </svg>
          {note && (
            <div className="vr-bar pop" role="status">
              <span>{note}</span>
              <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
            </div>
          )}
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={cam.reset} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Power Hour">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          <h1 className="d-title" id="ph-title">Power Hour</h1>
          <p className="d-sub">
            {session.startedAt == null ? `${calls.length} ${calls.length === 1 ? "call" : "calls"} lined up, most urgent first` : timeUp ? "Time is up" : `${mmss(left!)} left · ${w.left} to call`}
          </p>

          {session.startedAt == null && calls.length > 0 && (
            <div className="ph-start">
              <span>How long?</span>
              {LENGTHS.map((m) => (
                <button key={m} className={`vr-btn${session.minutes === m ? " on" : ""}`} aria-pressed={session.minutes === m} onClick={() => onSession({ ...session, minutes: m })}>
                  {m} min
                </button>
              ))}
              <button className="pi-btn pm-send" onClick={() => start(session.minutes)}>Start Power Hour</button>
            </div>
          )}

          {sel && !finished && (
            <div className="ph-call">
              <h2>{session.results[sel.id] ? sel.name : sel.id === nowCall?.id ? `Now: ${sel.name}` : sel.name}</h2>
              <p className="d-sum">{sel.why}</p>
              {session.results[sel.id] ? (
                <p>
                  {OUTCOME_WORD[session.results[sel.id]!]}.{" "}
                  <button className="vr-btn" onClick={() => undo(sel)}>Call again</button>
                </p>
              ) : (
                <>
                  {live && sel.contactId ? (
                    <button className="pi-btn" onClick={() => setPrep(sel)}>Call Prep, then call</button>
                  ) : (
                    <p className="pm-empty">{live ? "Not linked to a contact yet: call from your phone, then say how it went." : "Example agent: Call Prep opens here, then the call."}</p>
                  )}
                  <div className="ph-outcomes" role="group" aria-label={`How the call with ${sel.name} went`}>
                    {(Object.keys(OUTCOME_WORD) as Outcome[]).map((o) => (
                      <button key={o} className={`chip-btn${o === "talked" ? " primary" : ""}`} disabled={busy} onClick={() => outcome(sel, o)}>
                        {OUTCOME_WORD[o]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {(finished || Object.keys(session.results).length > 0) && (
            <>
              <h2>{finished ? "What got done" : "So far"}</h2>
              <p className="pi-today pi-lvl-today dc-next">{w.line}</p>
              {finished && w.talked > 0 && <p className="d-sum">Each conversation counts toward this week on your Income Map.</p>}
            </>
          )}

          <h2>The line-up</h2>
          {calls.length ? (
            <ol className="pm-list pm-compact">
              {calls.map((c) => {
                const res = session.results[c.id];
                return (
                  <li key={c.id} id={`ph-row-${c.id}`} className={`${res ? "is-done" : ""}${sel?.id === c.id ? " picked" : ""}`}>
                    <i className="pm-dot" style={{ background: ringFor(c) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{c.name}</b>
                      <small>{res ? OUTCOME_WORD[res] : c.why}</small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => choose(c)} aria-label={`Open ${c.name}`}>→</button>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="pm-empty">No calls due and every VIP-50 has had a call this month.</p>
          )}
          <p className="pm-promise">{live ? "" : "Example agent. "}You make every call. Pulse never dials, texts or sends anything for you.</p>
        </aside>
      </div>
      {prep && prep.contactId && (
        <CallPrepCard
          contactId={prep.contactId}
          onClose={() => setPrep(null)}
          onDial={() => setPrep(null)}
        />
      )}
    </div>
  );
}
