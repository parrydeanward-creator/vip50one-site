"use client";

import { useEffect, useRef, useState } from "react";
import PulseRing from "./PulseRing.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { doneCount, habitsLine, OWN_HABITS_MAX, type HabitToday } from "@/lib/habits.ts";

// The Habits ring in ONE YOU (Parry, 7 Oct: "love the habits ring"). The morning's "you" boxes as one ring in the
// middle, a segment per habit, filling as each is ticked; each habit an orb round it. Tap a habit and it comes to
// the middle (Parry, 6 Oct, the rule for every orb) with Done today and this week's days; the ring brings the whole
// morning back. A tick is the same Daily Tracker box as in ONE MOVE and ONE GO, and earns the same point.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 310;
const R = 62;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const DIM = "rgba(160,175,210,0.35)";
const ICON: Record<string, string> = { made_bed: "▭", affirmations: "✦", gratitudes: "♥", exercise: "⚑", tracked_macros: "◔", positive_reading: "❡" };

function seg(cx: number, cy: number, r: number, from: number, to: number): string {
  const p = (a: number) => `${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)}`;
  return `M ${p(from)} A ${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${p(to)}`;
}

type OwnEdit = { add?: string; key?: string; name?: string; remove?: boolean };

export default function HabitsView({ habits, demo, onClose, onTick, onOwn }: {
  habits: HabitToday[]; demo: boolean; onClose: () => void; onTick: (key: string, done: boolean) => Promise<string | null>;
  /** Add, rename or remove one of the agent's own habits (no points); answers an error line or null. */
  onOwn: (edit: OwnEdit) => Promise<string | null>;
}) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const ownCount = habits.filter((h) => h.own).length;
  const own = async (edit: OwnEdit, after?: () => void) => {
    if (busy) return;
    setBusy("own");
    setNote(null);
    const err = await onOwn(edit);
    setBusy(null);
    if (err) setNote(err);
    else after?.();
  };
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

  const n = habits.length;
  const done = doneCount(habits);
  const all = done === n;
  const sel = habits.find((h) => h.key === pick) ?? null;
  const round = habits.filter((h) => h !== sel);
  const m = round.length + (sel ? 1 : 0);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const homeSeat = sel ? seatAt(0) : null;
  const placed = round.map((h, k) => ({ h, ...seatAt(k + (sel ? 1 : 0)) }));
  const gap = 0.06;

  const open = (k: string | null) => {
    setPick(k);
    setNote(null);
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
  const toggle = async (h: HabitToday) => {
    if (busy) return;
    setBusy(h.key);
    setNote(null);
    const err = await onTick(h.key, !h.done);
    setBusy(null);
    if (err) setNote(err);
  };

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="hb-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Habits">
            <defs>
              <radialGradient id="hb-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {placed.map(({ h, x, y }) => (
              <line key={`l-${h.key}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {homeSeat && <line className="vr-link" x1={C} y1={C} x2={homeSeat.x} y2={homeSeat.y} />}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${sel.label}, in the middle`}>
                {!sel.done ? <PulseRing r={CORE} level="today" x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#hb-glass)" stroke={sel.done ? GREEN : GOLD} strokeWidth={3} />
                <text className="pm-mark" x={C} y={C - 20} dy="0.36em" textAnchor="middle" fontSize={54}>{ICON[sel.key] ?? "●"}</text>
                <text className="dt-score-sub" x={C} y={C + 30} textAnchor="middle">{sel.label.toUpperCase()}</text>
                <text className="pm-core-end" x={C} y={C + 54} textAnchor="middle">{sel.done ? "Done today" : "Not yet today"}</text>
              </g>
            ) : (
              <g aria-label={`Habits: ${habitsLine(habits)}`}>
                {!all ? <PulseRing r={CORE} level="today" x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#hb-glass)" stroke={all ? GREEN : "#ffd86a"} strokeWidth={3} />
                {habits.map((h, i) => {
                  const a = (i / n) * Math.PI * 2 + gap / 2;
                  const b = ((i + 1) / n) * Math.PI * 2 - gap / 2;
                  return <path key={h.key} d={seg(C, C, CORE + 12, a, b)} fill="none" stroke={h.done ? GREEN : DIM} strokeWidth={9} strokeLinecap="round" />;
                })}
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{`${done}/${n}`}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">HABITS TODAY</text>
                {all ? <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">All done</text> : null}
              </g>
            )}

            {homeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Back to all your habits" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={homeSeat.x} cy={homeSeat.y} r={R} fill="url(#hb-glass)" stroke={all ? GREEN : "#ffd86a"} strokeWidth={2.5} />
                <text className="pm-mark" x={homeSeat.x} y={homeSeat.y} dy="0.36em" textAnchor="middle" fontSize={24}>{`${done}/${n}`}</text>
                <text className="pm-name-l" x={homeSeat.x} y={homeSeat.y + R + 24} textAnchor="middle">Today</text>
              </g>
            )}

            {placed.map(({ h, x, y }) => (
              <g key={h.key} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${h.label}: ${h.done ? "done today" : "not yet today"}`} {...tap(() => open(h.key))}>
                {!h.done ? <PulseRing r={R} level="today" x={x} y={y} /> : null}
                <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#hb-glass)" stroke={h.done ? GREEN : GOLD} strokeWidth={2.5} />
                <text className="pm-mark" x={x} y={y - 6} dy="0.36em" textAnchor="middle" fontSize={28}>{ICON[h.key] ?? "●"}</text>
                <text className="pm-time-l" x={x} y={y + 26} textAnchor="middle" fontSize={14}>{h.done ? "✓" : ""}</text>
                <text className="pm-name-l" x={x} y={y + R + 24} textAnchor="middle">{h.label}</text>
                {h.week != null ? <text className="pm-time-l" x={x} y={y + R + 42} textAnchor="middle">{`${h.week} of 7 this week`}</text> : null}
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="Habits">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          {sel ? (
            <>
              <h1 className="d-title" id="hb-title">{sel.label}</h1>
              <p className="d-sub">{sel.done ? "Done today" : "Not yet today"}{sel.week != null ? ` · ${sel.week} of 7 days this week` : ""}{sel.own ? " · Your own habit, no points" : ""}</p>
              <div className="decide-btns">
                <button type="button" className={`chip-btn${sel.done ? "" : " primary"}`} disabled={busy === sel.key} onClick={() => toggle(sel)}>
                  {busy === sel.key ? "Saving…" : sel.done ? "Untick" : "Done today"}
                </button>
                {sel.own && renaming == null ? (
                  <>
                    <button type="button" className="chip-btn" disabled={!!busy} onClick={() => setRenaming(sel.label)}>Rename</button>
                    <button type="button" className="chip-btn" disabled={!!busy} onClick={() => own({ key: sel.key, remove: true }, () => open(null))}>Remove</button>
                  </>
                ) : null}
              </div>
              {sel.own && renaming != null ? (
                <form className="hb-add" onSubmit={(e) => { e.preventDefault(); void own({ key: sel.key, name: renaming }, () => setRenaming(null)); }}>
                  <input autoFocus value={renaming} maxLength={40} aria-label="New name for this habit" onChange={(e) => setRenaming(e.target.value)} />
                  <button type="submit" className="chip-btn primary" disabled={!!busy || !renaming.trim()}>{busy === "own" ? "Saving…" : "Save"}</button>
                  <button type="button" className="chip-btn" onClick={() => setRenaming(null)}>Cancel</button>
                </form>
              ) : null}
              {note ? <p className="pm-empty">{note}</p> : null}
              <button className="vr-classic" onClick={() => open(null)}>All your habits</button>
            </>
          ) : (
            <>
              <h1 className="d-title" id="hb-title">Habits</h1>
              <p className="d-sub">{habitsLine(habits)}</p>
              <ul className="pm-list pm-compact">
                {habits.map((h) => (
                  <li key={h.key} className={h.done ? "is-done" : ""}>
                    <i className="pm-dot" style={{ background: h.done ? GREEN : GOLD }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{h.label}</b>
                      <small>{h.done ? "Done today" : "Not yet today"}{h.week != null ? ` · ${h.week} of 7 this week` : ""}{h.own ? " · no points" : ""}</small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => toggle(h)} disabled={busy === h.key} aria-label={h.done ? `Untick ${h.label}` : `${h.label} done today`}>
                        {h.done ? "✓" : "○"}
                      </button>
                      <button onClick={() => open(h.key)} aria-label={`Open ${h.label}`}>→</button>
                    </span>
                  </li>
                ))}
              </ul>
              {/* Your own habits (Parry, 19-20 Oct): up to 4 beside the six, no points; the six always stay. */}
              {ownCount < OWN_HABITS_MAX ? (
                <form className="hb-add" onSubmit={(e) => { e.preventDefault(); void own({ add: adding }, () => setAdding("")); }}>
                  <input value={adding} maxLength={40} placeholder="Add a habit of your own" aria-label="Add a habit of your own" onChange={(e) => setAdding(e.target.value)} />
                  <button type="submit" className="chip-btn primary" disabled={!!busy || !adding.trim()}>{busy === "own" ? "Adding…" : "Add"}</button>
                </form>
              ) : <p className="pm-empty">You have {OWN_HABITS_MAX} habits of your own. Open one to rename or remove it.</p>}
              <p className="pm-empty">Your own habits count their days but earn no points. The six VIP-50 habits always stay.</p>
              {note ? <p className="pm-empty">{note}</p> : null}
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}The same boxes as your Daily Tracker in ONE MOVE and ONE GO: tick here and they tick there.</p>
        </aside>
      </div>
    </div>
  );
}
