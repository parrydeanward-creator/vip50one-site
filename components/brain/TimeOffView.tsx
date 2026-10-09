"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import {
  DUE_KINDS, DUE_TITLE, NEEDS_COVER, addDays, backOn, coverNeeded, dueIn, firstDayBack, focusOff, planProblem, short, type DueKind, type TimeOffState,
} from "@/lib/timeOff.ts";

// Time off in ONE YOU (VIP-SUMMARY §3x). The time off in the middle; round it what comes due then, one orb per kind.
// Tap a kind and it comes to the middle (Parry, 6 Oct, the rule for every orb) with its list in the side panel; the
// middle brings the plan back. The side panel plans the dates, says what pauses, and shows the first day back.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 300;
const GOLD = "#f5c542";
const TEAL = "#4fc3c7";
const DIM = "rgba(160,175,210,0.45)";
const ICON: Record<DueKind, string> = { closing: "⌂", appointment: "◷", task: "✓", birthday: "✦", anniversary: "♥", home_anniversary: "⌂", quarterly_touch: "↻" };

export default function TimeOffView({ data, demo, onSave, onCancel, onClose }: {
  data: TimeOffState;
  demo: boolean;
  onSave: (starts: string, ends: string, note: string) => Promise<string | null>;
  onCancel: (id: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<DueKind | null>(null);
  const [starts, setStarts] = useState(addDays(data.today, 7));
  const [ends, setEnds] = useState(addDays(data.today, 9));
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const off = focusOff(data);
  const kinds = DUE_KINDS.filter((k) => dueIn(data, k).length);
  const cover = coverNeeded(data);
  const back = firstDayBack(data);
  const problem = planProblem(data, starts, ends);

  const open = (k: DueKind | null) => {
    setPick(k);
    cam.reset();
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });
  const save = async () => {
    if (problem || busy) return;
    setBusy(true);
    const err = await onSave(starts, ends, note);
    setBusy(false);
    setMsg(err ?? `Saved: ${short(starts)} to ${short(ends)}. You are back ${short(addDays(ends, 1))}.`);
    if (!err) setNote("");
  };
  const cancel = async (id: string) => {
    setBusy(true);
    const err = await onCancel(id);
    setBusy(false);
    setMsg(err ?? (data.current?.id === id ? "Welcome back. Your time off ended today." : "Cancelled."));
  };

  const round = kinds.filter((k) => k !== pick);
  const m = round.length + (pick ? 1 : 0);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const homeSeat = pick ? seatAt(0) : null;
  const placed = round.map((k, i) => ({ k, ...seatAt(i + (pick ? 1 : 0)) }));
  const count = (k: DueKind) => dueIn(data, k).length;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="to-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Time off">
            <defs>
              <radialGradient id="to-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#123236" />
              </radialGradient>
            </defs>
            {kinds.length ? <circle className="vr-track" cx={C} cy={C} r={RING} /> : null}
            {placed.map(({ k, x, y }) => (
              <line key={`l-${k}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {homeSeat && <line className="vr-link" x1={C} y1={C} x2={homeSeat.x} y2={homeSeat.y} />}

            {pick ? (
              <g aria-label={`${DUE_TITLE[pick]}, in the middle`}>
                <circle cx={C} cy={C} r={CORE} fill="url(#to-glass)" stroke={NEEDS_COVER.includes(pick) ? GOLD : TEAL} strokeWidth={3} />
                <text className="pm-mark" x={C} y={C - 22} dy="0.36em" textAnchor="middle" fontSize={50}>{ICON[pick]}</text>
                <text className="dt-score-sub" x={C} y={C + 30} textAnchor="middle">{DUE_TITLE[pick].toUpperCase()}</text>
                <text className="pm-core-end" x={C} y={C + 54} textAnchor="middle">{`${count(pick)} while you are away`}</text>
              </g>
            ) : (
              <g aria-label={off ? `Time off ${short(off.starts)} to ${short(off.ends)}` : "No time off planned"}>
                <circle cx={C} cy={C} r={CORE} fill="url(#to-glass)" stroke={TEAL} strokeWidth={3} />
                {off ? (
                  <>
                    <text className="dt-score-sub" x={C} y={C - 26} textAnchor="middle">{data.current ? "AWAY UNTIL" : "TIME OFF"}</text>
                    <text className="dt-score" x={C} y={C + 14} textAnchor="middle" fontSize={40}>{data.current ? short(off.ends).split(", ")[1] : short(off.starts).split(", ")[1]}</text>
                    <text className="pm-core-end" x={C} y={C + 46} textAnchor="middle">{data.current ? `back ${short(backOn(off))}` : `to ${short(off.ends)}`}</text>
                  </>
                ) : (
                  <>
                    <text className="dt-score-sub" x={C} y={C - 6} textAnchor="middle">PLAN</text>
                    <text className="dt-score-sub" x={C} y={C + 22} textAnchor="middle">TIME OFF</text>
                  </>
                )}
              </g>
            )}

            {homeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Back to your time off" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={homeSeat.x} cy={homeSeat.y} r={56} fill="url(#to-glass)" stroke={TEAL} strokeWidth={2.5} />
                <text className="pm-mark" x={homeSeat.x} y={homeSeat.y} dy="0.36em" textAnchor="middle" fontSize={24}>◎</text>
                <text className="pm-name-l" x={homeSeat.x} y={homeSeat.y + 56 + 24} textAnchor="middle">Time off</text>
              </g>
            )}

            {placed.map(({ k, x, y }) => {
              const c = count(k);
              const r = 48 + Math.min(20, c * 5);
              const needs = NEEDS_COVER.includes(k);
              return (
                <g key={k} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${DUE_TITLE[k]}: ${c}${needs ? ", needs cover" : ""}`} {...tap(() => open(k))}>
                  {needs ? <circle cx={x} cy={y} r={r + 10} fill="none" stroke={GOLD} strokeWidth={4} className="sd-glow" pointerEvents="none" /> : null}
                  <circle className="pm-disc" cx={x} cy={y} r={r} fill="url(#to-glass)" stroke={needs ? GOLD : c ? TEAL : DIM} strokeWidth={2.5} />
                  <text className="pm-mark" x={x} y={y - 8} dy="0.36em" textAnchor="middle" fontSize={26}>{ICON[k]}</text>
                  <text className="pm-time-l" x={x} y={y + 22} textAnchor="middle" fontSize={16}>{c}</text>
                  <text className="pm-name-l" x={x} y={y + r + 24} textAnchor="middle">{DUE_TITLE[k]}</text>
                </g>
              );
            })}
          </svg>
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={cam.reset} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Time off">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          <h1 className="d-title" id="to-title">{pick ? DUE_TITLE[pick] : "Time off"}</h1>
          {pick ? (
            <>
              <p className="d-sub">{NEEDS_COVER.includes(pick) ? "Someone is counting on you that day. Ask a teammate to cover, or move it before you go." : "These wait for your first day back."}</p>
              <ul className="pm-list pm-compact">
                {dueIn(data, pick).map((d, i) => (
                  <li key={`${d.date}-${i}`}>
                    <i className="pm-dot" style={{ background: NEEDS_COVER.includes(d.kind) ? GOLD : TEAL }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{d.title}</b>
                      <small>{short(d.date)}</small>
                    </span>
                  </li>
                ))}
              </ul>
              <button className="vr-classic" onClick={() => open(null)}>Back to your time off</button>
            </>
          ) : (
            <>
              <p className="d-sub">{off ? (data.current ? `Away until ${short(off.ends)}. Back ${short(backOn(off))}.` : `${short(off.starts)} to ${short(off.ends)}${off.note ? ` · ${off.note}` : ""}`) : "Pick your days away. ONE quiets down while you are gone."}</p>
              {msg ? <p className="pm-note" role="status">{msg}</p> : null}

              {cover.length && !data.current ? (
                <div className="en-rest" role="note">
                  <b>{cover.length} {cover.length === 1 ? "thing needs" : "things need"} cover.</b>
                  <span> {cover.map((d) => `${d.title} (${short(d.date)})`).join("; ")}.</span>
                </div>
              ) : null}

              <h2 className="pm-h">While you are away</h2>
              <ul className="to-rules">
                <li>Nothing pulses for you, and ONE GO sends no reminders.</li>
                <li>Autopilot waits; anything Pulse would send goes out from your first day back.</li>
                <li>A week away does not count against 100 and does not break your streak.</li>
                <li>Touches due while you are away are due on your first day back.</li>
                <li>Nothing is sent to your clients about it.</li>
              </ul>

              {back.length ? (
                <>
                  <h2 className="pm-h">First day back{off ? `, ${short(backOn(off))}` : ""}</h2>
                  <ol className="to-back">{back.map((l, i) => <li key={i}>{l}</li>)}</ol>
                </>
              ) : null}

              {[data.current, ...data.upcoming].filter(Boolean).length ? (
                <>
                  <h2 className="pm-h">Planned</h2>
                  <ul className="pm-list pm-compact">
                    {[data.current, ...data.upcoming].filter((o): o is NonNullable<typeof o> => !!o).map((o) => (
                      <li key={o.id}>
                        <i className="pm-dot" style={{ background: TEAL }} aria-hidden="true" />
                        <span className="pm-body">
                          <b>{`${short(o.starts)} to ${short(o.ends)}`}</b>
                          <small>{o.note ?? (data.current?.id === o.id ? "Now" : "Coming up")}</small>
                        </span>
                        <span className="pm-acts">
                          <button disabled={busy} onClick={() => void cancel(o.id)} aria-label={data.current?.id === o.id ? "End my time off today" : `Cancel time off ${short(o.starts)}`}>{data.current?.id === o.id ? "End" : "×"}</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <h2 className="pm-h">Plan time off</h2>
              <div className="to-form">
                <label>First day <input type="date" value={starts} min={data.today} onChange={(e) => setStarts(e.target.value)} /></label>
                <label>Last day <input type="date" value={ends} min={starts} onChange={(e) => setEnds(e.target.value)} /></label>
                <label className="to-note">Note, for you <input type="text" value={note} maxLength={140} placeholder="Family trip" onChange={(e) => setNote(e.target.value)} /></label>
                {problem ? <p className="cc-err">{problem}</p> : null}
                <button className="cc-btn" disabled={!!problem || busy} onClick={() => void save()}>Save time off</button>
              </div>
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}Your coach sees only the dates. Nothing is sent to anyone.</p>
        </aside>
      </div>
    </div>
  );
}
