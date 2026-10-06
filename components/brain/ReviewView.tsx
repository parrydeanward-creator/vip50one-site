"use client";

import { useEffect, useRef, useState } from "react";
import PulseRing, { PULSE_COLOR } from "./PulseRing.tsx";
import PulseMark from "./PulseMark.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import type { Card, Review, ReviewKey } from "@/lib/review.ts";

// Weekly Review in ONE YOU: the week's score in the middle, its parts round it (VIP touches, who you haven't
// reached, commitments, goals). Tap one and it comes to the middle with its detail in the side panel; the
// Week orb brings the score back (Parry, 6 Oct, the rule for every orb). The side panel opens on Pulse's
// three things for next week. Facts only: nothing is sent and nothing is marked done from here.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 310;
const R = 64;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const ICON: Record<ReviewKey, string> = { score: "★", touches: "✆", untouched: "○", commitments: "✓", goals: "◎" };

function arc(cx: number, cy: number, r: number, share: number): string {
  const a = Math.max(0.001, Math.min(0.9999, share)) * Math.PI * 2;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}`;
}
const ringColor = (c: { level: Card["level"]; good: boolean }) => (c.level === "now" ? PULSE_COLOR.now : c.level === "today" ? PULSE_COLOR.today : c.good ? GREEN : "rgba(160,175,210,0.45)");

export default function ReviewView({ review, week, demo, onClose }: { review: Review; week: { score: number; minimum: number } | null; demo: boolean; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<ReviewKey | null>(null);
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

  const open = (k: ReviewKey | null) => {
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

  const sel = review.cards.find((c) => c.key === pick) ?? null;
  // The one picked sits in the middle; the rest, and the Week orb, go round it.
  // The score is the middle (or the Week orb when a part is picked), so it is never a ring orb as well.
  const round = review.cards.filter((c) => c.key !== "score" && c.key !== sel?.key);
  const m = round.length + (sel ? 1 : 0);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const weekSeat = sel ? seatAt(0) : null;
  const seats = round.map((c, k) => ({ c, ...seatAt(k + (sel ? 1 : 0)) }));
  const fill = week ? Math.min(1, week.score / Math.max(1, week.minimum)) : null;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="rv-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Your week">
            <defs>
              <radialGradient id="rv-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ c, x, y }) => (
              <line key={`l-${c.key}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {weekSeat && <line className="vr-link" x1={C} y1={C} x2={weekSeat.x} y2={weekSeat.y} />}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${sel.title}, in the middle`}>
                {sel.level ? <PulseRing r={CORE} level={sel.level} x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#rv-glass)" stroke={ringColor(sel)} strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{sel.big}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{sel.title.toUpperCase()}</text>
              </g>
            ) : (
              <g aria-label={week ? `Weekly score ${week.score} of ${week.minimum}` : "Your week"}>
                <circle cx={C} cy={C} r={CORE} fill="url(#rv-glass)" stroke="#ffd86a" strokeWidth={3} />
                {fill != null && <path d={arc(C, C, CORE + 10, fill)} fill="none" stroke={fill >= 1 ? GREEN : GOLD} strokeWidth={8} strokeLinecap="round" />}
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{week ? week.score : "–"}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{week ? `OF ${week.minimum} THIS WEEK` : "THIS WEEK"}</text>
              </g>
            )}

            {weekSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Your week: back to the score" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={weekSeat.x} cy={weekSeat.y} r={R} fill="url(#rv-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <text className="pm-mark" x={weekSeat.x} y={weekSeat.y} dy="0.36em" textAnchor="middle" fontSize={26}>{week ? week.score : "★"}</text>
                <text className="pm-name-l" x={weekSeat.x} y={weekSeat.y + R + 24} textAnchor="middle">Week</text>
              </g>
            )}

            {seats.map(({ c, x, y }) => (
              <g key={c.key} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${c.title}: ${c.big}. ${c.line}`} {...tap(() => open(c.key))}>
                {c.level ? <PulseRing r={R} level={c.level} x={x} y={y} /> : null}
                <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#rv-glass)" stroke={ringColor(c)} strokeWidth={2.5} />
                <text className="pm-mark" x={x} y={y - 8} dy="0.36em" textAnchor="middle" fontSize={c.big.length > 5 ? 17 : 24}>{c.big}</text>
                <text className="pm-time-l" x={x} y={y + 24} textAnchor="middle" fontSize={16} aria-hidden="true">{ICON[c.key]}</text>
                <text className="pm-name-l" x={x} y={y + R + 24} textAnchor="middle">{c.title}</text>
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="Weekly Review">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          {sel ? (
            <>
              <h1 className="d-title" id="rv-title">{sel.title}</h1>
              <p className="d-sub">{sel.line}</p>
              {sel.rows.length ? (
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
              ) : (
                <p className="pm-empty">Nothing here this week.</p>
              )}
              <button className="vr-classic" onClick={() => open(null)}>Whole week</button>
            </>
          ) : (
            <>
              <h1 className="d-title" id="rv-title">Weekly Review</h1>
              <p className="d-sub">{week ? `${week.score} of ${week.minimum} this week` : "Your week"}</p>
              <h2>
                <PulseMark label={false} /> Three things for next week
              </h2>
              <ol className="pm-list pm-compact rv-next">
                {review.next.map((t, k) => (
                  <li key={k}>
                    <span className="pm-time">{k + 1}</span>
                    <span className="pm-body">
                      <b>{t}</b>
                    </span>
                  </li>
                ))}
              </ol>
              <h2>The week</h2>
              <ul className="pm-list pm-compact">
                {review.cards.map((c) => (
                  <li key={c.key}>
                    <i className="pm-dot" style={{ background: ringColor(c) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>
                        {c.title}: {c.big}
                      </b>
                      <small>{c.line}</small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => open(c.key)} aria-label={`Open ${c.title}`}>→</button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}Facts from your week only. Pulse never sends anything or marks anything done.</p>
        </aside>
      </div>
    </div>
  );
}
