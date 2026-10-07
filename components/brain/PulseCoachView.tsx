"use client";

import { useEffect, useRef, useState } from "react";
import PulseRing, { PULSE_COLOR } from "./PulseRing.tsx";
import PulseMark from "./PulseMark.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { nextCommitKey, type Part, type Read, type ReadKey } from "@/lib/pulseCoach.ts";

// Pulse Coach in ONE YOU (VIP-SUMMARY §3q; Parry, 7 Oct). The week's read in the middle, its parts round it:
// score, touches, the week's shape, habits, commitments, and one focus. Tap a part and it comes to the middle with
// its detail in the side panel (Parry, 6 Oct, the rule for every orb); Pulse brings the read back. The focus can
// become next week's commitment: it goes first in Monday's starters, and the agent still sets it.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 310;
const R = 64;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const ICON: Record<ReadKey, string> = { trend: "★", touches: "✆", days: "◷", habits: "♥", keep: "✓", focus: "◎" };
const ringColor = (p: Pick<Part, "level" | "good">) => (p.level === "today" ? PULSE_COLOR.today : p.good ? GREEN : "rgba(160,175,210,0.45)");

export default function PulseCoachView({ read, who, demo, onClose, onCommit }: { read: Read; who?: string; demo: boolean; onClose: () => void; onCommit?: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<ReadKey | null>(null);
  const [chosen, setChosen] = useState(false);
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

  const open = (k: ReadKey | null) => {
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
  const commit = () => {
    if (!read.focus) return;
    try {
      localStorage.setItem(nextCommitKey, JSON.stringify({ text: read.focus.text, kind: read.focus.kind, target: read.focus.target }));
    } catch {}
    setChosen(true);
    onCommit?.();
  };

  const sel = read.parts.find((p) => p.key === pick) ?? null;
  const round = read.parts.filter((p) => p.key !== sel?.key);
  const m = round.length + (sel ? 1 : 0);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const homeSeat = sel ? seatAt(0) : null;
  const seats = round.map((p, k) => ({ p, ...seatAt(k + (sel ? 1 : 0)) }));
  const need = read.parts.filter((p) => p.level).length;
  const focusPart = (
    <>
      {read.focus && (
        <div className="as-card pc-focus">
          <b>
            <PulseMark label={false} /> One focus for next week
          </b>
          <span>{read.focus.text}</span>
          <small>{read.focus.why}</small>
          {who ? (
            <small>Suggest it to {who} when you talk; they set their own commitments.</small>
          ) : chosen ? (
            <small>It goes first in Pulse&apos;s suggestions on Monday. You still choose your commitments.</small>
          ) : (
            <div className="decide-btns">
              <button type="button" className="chip-btn primary" onClick={commit}>Make it next week&apos;s commitment</button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="pc-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Pulse Coach">
            <defs>
              <radialGradient id="pc-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ p, x, y }) => (
              <line key={`l-${p.key}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {homeSeat && <line className="vr-link" x1={C} y1={C} x2={homeSeat.x} y2={homeSeat.y} />}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${sel.title}, in the middle`}>
                {sel.level ? <PulseRing r={CORE} level={sel.level} x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#pc-glass)" stroke={ringColor(sel)} strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{sel.big}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{sel.title.toUpperCase()}</text>
              </g>
            ) : (
              <g aria-label={`Pulse Coach: ${read.headline}`}>
                {need ? <PulseRing r={CORE} level="today" x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#pc-glass)" stroke="#ffd86a" strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle" fontSize={44}>PULSE</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{who ? who.toUpperCase().slice(0, 20) : "YOUR WEEK, READ"}</text>
              </g>
            )}

            {homeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Pulse: back to the whole read" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={homeSeat.x} cy={homeSeat.y} r={R} fill="url(#pc-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <text className="pm-mark" x={homeSeat.x} y={homeSeat.y} dy="0.36em" textAnchor="middle" fontSize={18}>PULSE</text>
                <text className="pm-name-l" x={homeSeat.x} y={homeSeat.y + R + 24} textAnchor="middle">The read</text>
              </g>
            )}

            {seats.map(({ p, x, y }) => (
              <g key={p.key} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${p.title}: ${p.big}. ${p.line}`} {...tap(() => open(p.key))}>
                {p.level ? <PulseRing r={R} level={p.level} x={x} y={y} /> : null}
                <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#pc-glass)" stroke={ringColor(p)} strokeWidth={2.5} />
                <text className="pm-mark" x={x} y={y - 8} dy="0.36em" textAnchor="middle" fontSize={p.big.length > 4 ? 18 : 24}>{p.big}</text>
                <text className="pm-time-l" x={x} y={y + 24} textAnchor="middle" fontSize={16} aria-hidden="true">{ICON[p.key]}</text>
                <text className="pm-name-l" x={x} y={y + R + 24} textAnchor="middle">{p.title}</text>
              </g>
            ))}
          </svg>
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={cam.reset} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Pulse Coach">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          {sel ? (
            <>
              <h1 className="d-title" id="pc-title">{sel.title}</h1>
              <p className="d-sub">{sel.line}</p>
              {sel.key === "focus" ? (
                focusPart
              ) : (
                <ul className="pm-list pm-compact">
                  {sel.rows.map((r, k) => (
                    <li key={k}>
                      <i className="pm-dot" style={{ background: ringColor(sel) }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>{r.text}</b>
                        {r.sub ? <small>{r.sub}</small> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button className="vr-classic" onClick={() => open(null)}>The whole read</button>
            </>
          ) : (
            <>
              <h1 className="d-title" id="pc-title">{who ? `Pulse Coach: ${who}` : "Pulse Coach"}</h1>
              <p className="d-sub">{read.headline}</p>
              {focusPart}
              <h2>The last eight weeks</h2>
              <ul className="pm-list pm-compact">
                {read.parts.filter((p) => p.key !== "focus").map((p) => (
                  <li key={p.key}>
                    <i className="pm-dot" style={{ background: ringColor(p) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>
                        {p.title}: {p.big}
                      </b>
                      <small>{p.line}</small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => open(p.key)} aria-label={`Open ${p.title}`}>→</button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}From {who ? "their" : "your"} own numbers only. Pulse never sends anything or sets a commitment for {who ? "them" : "you"}.</p>
        </aside>
      </div>
    </div>
  );
}
