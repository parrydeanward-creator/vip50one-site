"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import { KEEP_GOING, LEVELS, LEVEL_HUE, LEVEL_NAME, bestWeeksLine, needsRest, strip, todayCheck, type Energy, type Level } from "@/lib/energy.ts";

// Energy check in ONE YOU (VIP-SUMMARY §3w). Today's energy in the middle; round it the five levels. Tap a level and
// it is saved as today's and comes to the middle (Parry, 6 Oct, the rule for every orb) with the reading in the side
// panel; the middle (or "Back") brings the five round again. Yours only: no coach sees it, nothing is sent.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 300;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";

const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export default function EnergyView({ data, demo, onSave, onClose }: { data: Energy; demo: boolean; onSave: (level: Level) => Promise<boolean>; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<Level | null>(null);
  const [note, setNote] = useState<string | null>(null);
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

  const today = todayCheck(data);
  const rest = needsRest(data);
  const best = bestWeeksLine(data);
  const days = strip(data, 14);

  const choose = async (l: Level) => {
    setPick(l);
    cam.reset();
    if (busy) return;
    setBusy(true);
    const ok = await onSave(l);
    setBusy(false);
    setNote(ok ? `Saved: ${LEVEL_NAME[l]} today.` : "Could not save just now. Tap it again in a moment.");
  };
  const back = () => {
    setPick(null);
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

  const round = LEVELS.filter((l) => l !== pick);
  const m = round.length + (pick ? 1 : 0);
  // low on the left, high on the right, along the top of the ring
  const seatAt = (k: number) => {
    const ang = -Math.PI * 0.8 + (k / Math.max(m - 1, 1)) * Math.PI * 1.6;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const placed = round.map((l, k) => ({ l, ...seatAt(k) }));
  const homeSeat = pick ? { x: C, y: C + RING } : null;
  const mid: Level | null = pick ?? today?.level ?? null;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="en-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Energy check">
            <defs>
              <radialGradient id="en-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#2a3320" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {placed.map(({ l, x, y }) => (
              <line key={`l-${l}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {homeSeat && <line className="vr-link" x1={C} y1={C} x2={homeSeat.x} y2={homeSeat.y} />}

            <g aria-label={mid ? `Today: ${LEVEL_NAME[mid]}` : "How's your energy today?"} {...(pick ? { "data-tap": true, role: "button", tabIndex: 0, ...tap(back) } : {})}>
              {!mid ? <circle cx={C} cy={C} r={CORE + 10} fill="none" stroke={GOLD} strokeWidth={4} className="sd-glow" pointerEvents="none" /> : null}
              <circle cx={C} cy={C} r={CORE} fill="url(#en-glass)" stroke={mid ? LEVEL_HUE[mid] : GOLD} strokeWidth={3} />
              {mid ? (
                <>
                  <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{mid}</text>
                  <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{LEVEL_NAME[mid].toUpperCase()}</text>
                  <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">today</text>
                </>
              ) : (
                <>
                  <text className="dt-score-sub" x={C} y={C - 8} textAnchor="middle">HOW&apos;S YOUR</text>
                  <text className="dt-score-sub" x={C} y={C + 20} textAnchor="middle">ENERGY?</text>
                  <text className="pm-core-end" x={C} y={C + 48} textAnchor="middle">one tap</text>
                </>
              )}
            </g>

            {homeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Back to all five" {...tap(back)}>
                <circle className="pm-disc" cx={homeSeat.x} cy={homeSeat.y} r={52} fill="url(#en-glass)" stroke={GREEN} strokeWidth={2.5} />
                <text className="pm-mark" x={homeSeat.x} y={homeSeat.y} dy="0.36em" textAnchor="middle" fontSize={22}>↺</text>
                <text className="pm-name-l" x={homeSeat.x} y={homeSeat.y + 52 + 24} textAnchor="middle">Change it</text>
              </g>
            )}

            {placed.map(({ l, x, y }) => {
              const on = today?.level === l;
              return (
                <g key={l} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${LEVEL_NAME[l]}${on ? ", today's" : ""}`} {...tap(() => void choose(l))}>
                  <circle className="pm-disc" cx={x} cy={y} r={on ? 64 : 56} fill="url(#en-glass)" stroke={LEVEL_HUE[l]} strokeWidth={on ? 4 : 2.5} />
                  <text className="pm-mark" x={x} y={y} dy="0.36em" textAnchor="middle" fontSize={30}>{l}</text>
                  <text className="pm-name-l" x={x} y={y + 56 + 24} textAnchor="middle">{LEVEL_NAME[l]}</text>
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="Energy">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          <h1 className="d-title" id="en-title">Energy</h1>
          <p className="d-sub">{mid ? `${LEVEL_NAME[mid]} today` : "One tap a morning: how is your energy today?"}</p>
          {note ? <p className="pm-note" role="status">{note}</p> : null}

          {rest ? (
            <div className="en-rest" role="note">
              <b>Pulse suggests a lighter day.</b>
              <span> Your last few mornings have been low. Keep today to the few things that matter, and think about a day off soon. Rest now beats burning out later.</span>
            </div>
          ) : null}

          <h2 className="pm-h">Last two weeks</h2>
          <ol className="en-strip" aria-label="Your energy, the last 14 days">
            {days.map((d) => (
              <li key={d.day} title={`${short(d.day)}: ${d.level ? LEVEL_NAME[d.level] : "no check"}`}>
                <i style={{ height: d.level ? 8 + d.level * 9 : 4, background: d.level ? LEVEL_HUE[d.level] : "rgba(160,175,210,0.25)" }} aria-hidden="true" />
                <span className="sr-only">{`${short(d.day)}: ${d.level ? LEVEL_NAME[d.level] : "no check"}`}</span>
              </li>
            ))}
          </ol>

          <h2 className="pm-h">Your best weeks</h2>
          <p className="pm-empty">{best ?? KEEP_GOING}</p>

          <p className="pm-promise">{demo ? "Example agent. " : ""}Yours only. Your coach does not see it, it earns no points, and nothing is sent to anyone.</p>
        </aside>
      </div>
    </div>
  );
}
