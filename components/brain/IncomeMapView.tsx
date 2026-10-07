"use client";

import { useEffect, useRef, useState } from "react";
import PulseRing from "./PulseRing.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { START, money, type Assume, type IncomeKey, type IncomeMap } from "@/lib/goals.ts";

// The Income Map in ONE YOU (PULSE-ROADMAP "ONE YOU"; Parry approved, 6 Oct): the income goal in the middle,
// worked back round it to closings, referrals, conversations and touches a week. Tap a part and it comes to
// the middle with its working in the side panel, where the agent changes the number behind it; the Income orb
// brings the goal back (Parry, 6 Oct, the rule for every orb). Facts and the agent's own numbers only.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 310;
const R = 66;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const ICON: Record<IncomeKey, string> = { income: "$", closings: "⌂", referrals: "♥", conversations: "☎", touches: "✦" };
// What each part's number rests on, and how the agent changes it.
const KNOB: Partial<Record<IncomeKey, { key: keyof Assume; label: string; min: number; max: number; step: number; pct?: boolean; dollars?: boolean }>> = {
  closings: { key: "avgGci", label: "GCI per closing", min: 500, max: 1_000_000, step: 500, dollars: true },
  referrals: { key: "referralShare", label: "Share of closings from referrals", min: 0, max: 100, step: 5, pct: true },
  conversations: { key: "convosPerClosing", label: "Conversations that find one closing", min: 1, max: 500, step: 1 },
  touches: { key: "touchesPerConvo", label: "Touches that start one conversation", min: 1, max: 50, step: 1 },
};

export default function IncomeMapView({ map, assume, demo, onAssume, onClose }: { map: IncomeMap; assume: Assume; demo: boolean; onAssume: (a: Assume) => void; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<IncomeKey | null>(null);
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

  const open = (k: IncomeKey | null) => {
    setPick(k === "income" ? null : k);
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

  const income = map.parts[0];
  const sel = map.parts.find((p) => p.key === pick) ?? null;
  // The goal is the middle (or the Income orb when a part is picked); the rest go round it in order.
  const round = map.parts.filter((p) => p.key !== "income" && p.key !== sel?.key);
  const m = round.length + (sel ? 1 : 0);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const incomeSeat = sel ? seatAt(0) : null;
  const seats = round.map((p, k) => ({ p, ...seatAt(k + (sel ? 1 : 0)) }));
  const ring = (lvl: "today" | null) => (lvl ? "#f5c542" : GREEN);
  const knob = sel ? KNOB[sel.key] : undefined;
  const current = (k: keyof Assume): number => {
    if (k === "avgGci") return map.avgGci.value;
    if (k === "referralShare") return Math.round(map.referralShare.value * 100);
    return assume[k] as number;
  };
  const setKnob = (k: keyof Assume, raw: string) => {
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    const kn = Object.values(KNOB).find((x) => x!.key === k)!;
    if (!Number.isFinite(n) || n < kn.min || n > kn.max) return;
    onAssume({ ...assume, [k]: kn.pct ? n / 100 : n });
  };
  const resetKnob = (k: keyof Assume) => onAssume({ ...assume, [k]: k === "avgGci" || k === "referralShare" ? null : START[k] });
  const fromWord = (k: keyof Assume) =>
    k === "avgGci"
      ? map.avgGci.from === "you" ? "Your number." : map.avgGci.from === "closings" ? "Your average so far: GCI logged ÷ closings." : "A starting number. Change it to yours."
      : k === "referralShare"
        ? map.referralShare.from === "you" ? "Your number." : map.referralShare.from === "goals" ? "From your referrals and closings goals." : "A starting number. Change it to yours."
        : assume[k] === START[k] ? "A starting number. Change it to yours." : "Your number.";

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="im-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Your income goal worked back to the week">
            <defs>
              <radialGradient id="im-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ p, x, y }) => (
              <line key={`l-${p.key}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {incomeSeat && <line className="vr-link" x1={C} y1={C} x2={incomeSeat.x} y2={incomeSeat.y} />}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${sel.title}: ${sel.big} ${sel.unit.toLowerCase()}, in the middle`}>
                {sel.level ? <PulseRing r={CORE} level={sel.level} x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#im-glass)" stroke={ring(sel.level)} strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{sel.big}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{`${sel.title.toUpperCase()} ${sel.unit}`}</text>
              </g>
            ) : (
              <g aria-label={`Income goal ${income.big}`}>
                {income.level ? <PulseRing r={CORE} level={income.level} x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#im-glass)" stroke="#ffd86a" strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle" fontSize={income.big.length > 8 ? 44 : undefined}>{income.big}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">INCOME GOAL</text>
              </g>
            )}

            {incomeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`Income goal ${income.big}: back to the goal`} {...tap(() => open(null))}>
                <circle className="pm-disc" cx={incomeSeat.x} cy={incomeSeat.y} r={R} fill="url(#im-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <text className="pm-mark" x={incomeSeat.x} y={incomeSeat.y} dy="0.36em" textAnchor="middle" fontSize={income.big.length > 7 ? 16 : 22}>{income.big}</text>
                <text className="pm-name-l" x={incomeSeat.x} y={incomeSeat.y + R + 24} textAnchor="middle">Income</text>
              </g>
            )}

            {seats.map(({ p, x, y }) => (
              <g key={p.key} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${p.title}: ${p.big} ${p.unit.toLowerCase()}. ${p.line}`} {...tap(() => open(p.key))}>
                {p.level ? <PulseRing r={R} level={p.level} x={x} y={y} /> : null}
                <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#im-glass)" stroke={ring(p.level)} strokeWidth={2.5} />
                <text className="pm-mark" x={x} y={y - 10} dy="0.36em" textAnchor="middle" fontSize={p.big.length > 4 ? 20 : 26}>{p.big}</text>
                <text className="pm-time-l" x={x} y={y + 22} textAnchor="middle" fontSize={12} aria-hidden="true">{p.unit}</text>
                <text className="pm-time-l" x={x} y={y + 40} textAnchor="middle" fontSize={15} aria-hidden="true">{ICON[p.key]}</text>
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="Income Map">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          {sel ? (
            <>
              <h1 className="d-title" id="im-title">{sel.title}</h1>
              <p className="d-sub">{sel.line}</p>
              <ul className="pm-list pm-compact">
                {sel.rows.map((r, k) => (
                  <li key={k}>
                    <i className="pm-dot" style={{ background: ring(sel.level) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{r.text}</b>
                      {r.sub ? <small>{r.sub}</small> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {knob && (
                <div className="im-knob">
                  <label>
                    <span>{knob.label}</span>
                    <span className="im-in">
                      {knob.dollars ? <i>$</i> : null}
                      <input
                        key={`${knob.key}-${current(knob.key)}`}
                        inputMode="numeric"
                        defaultValue={String(current(knob.key))}
                        onBlur={(e) => setKnob(knob.key, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && setKnob(knob.key, (e.target as HTMLInputElement).value)}
                        aria-label={knob.label}
                      />
                      {knob.pct ? <i>%</i> : null}
                    </span>
                  </label>
                  <small>{fromWord(knob.key)}</small>
                  <button className="vr-btn" onClick={() => resetKnob(knob.key)}>Use the starting number</button>
                </div>
              )}
              <button className="vr-classic" onClick={() => open(null)}>Whole map</button>
            </>
          ) : (
            <>
              <h1 className="d-title" id="im-title">Income Map</h1>
              <p className="d-sub">{map.basis}: {money(map.goal)}</p>
              <p className="pi-today pi-lvl-today dc-next">
                {map.closingsLeft
                  ? `${map.perWeek.conversations} conversations and ${map.perWeek.touches} VIP touches a week reach it.`
                  : "Income goal reached. Everything from here is extra."}
              </p>
              <h2>Worked back to the week</h2>
              <ol className="pm-list pm-compact">
                {map.parts.map((p) => (
                  <li key={p.key}>
                    <span className="pm-time">{ICON[p.key]}</span>
                    <span className="pm-body">
                      <b>
                        {p.title}: {p.big} {p.unit.toLowerCase()}
                      </b>
                      <small>{p.line}</small>
                    </span>
                    {p.key !== "income" && (
                      <span className="pm-acts">
                        <button onClick={() => open(p.key)} aria-label={`Open ${p.title}`}>→</button>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <p className="d-sum">Tap a part to see the working and change the number behind it. Goals are set in ONE GO.</p>
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}Your goals and your own numbers. Your numbers stay on this computer.</p>
        </aside>
      </div>
    </div>
  );
}
