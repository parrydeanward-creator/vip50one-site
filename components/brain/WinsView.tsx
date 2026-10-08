"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import { GROUPS, GROUP_TITLE, groupOf, inGroup, total, winsLine, type Win, type WinGroup, type Wins } from "@/lib/wins.ts";

// Wins in ONE YOU (VIP-SUMMARY §3t; Parry approved ONE YOU's tools, 6 Oct). The year's count in the middle; round
// it one orb per kind, sized by how many. Tap a kind and it comes to the middle (Parry, 6 Oct, the rule for every orb)
// with its wins in the side panel, newest first; the middle orb brings the whole year back. A win since the agent's
// last look glows gold, never red. Read only: nothing is sent.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 315;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const DIM = "rgba(160,175,210,0.45)";
const ICON: Record<WinGroup, string> = { closing: "⌂", referral: "↻", five_star: "★", week_100: "100", badge: "✦", goal_reached: "◎" };
const HUE: Record<WinGroup, string> = { closing: GREEN, referral: GOLD, five_star: "#ffd86a", week_100: "#6fb6ff", badge: "#c9a7ff", goal_reached: GREEN };

const when = (d: string, today: string) => {
  const n = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${d}T12:00:00Z`)) / 86_400_000);
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 14) return `${n} days ago`;
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric", timeZone: "UTC" });
};

export default function WinsView({ data, fresh, today, demo, onClose, onContact }: { data: Wins; fresh: Win[]; today: string; demo: boolean; onClose: () => void; onContact?: (contactId: string) => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<WinGroup | null>(null);
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

  const isNew = new Set(fresh);
  const newIn = (g: WinGroup) => fresh.some((w) => groupOf(w.kind) === g);
  const n = total(data);
  const maxCount = Math.max(1, ...GROUPS.map((g) => data.counts[g]));
  const size = (g: WinGroup) => 46 + 30 * Math.sqrt(data.counts[g] / maxCount);
  const round = GROUPS.filter((g) => g !== pick);
  const m = round.length + (pick ? 1 : 0);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const homeSeat = pick ? seatAt(0) : null;
  const placed = round.map((g, k) => ({ g, ...seatAt(k + (pick ? 1 : 0)) }));

  const open = (g: WinGroup | null) => {
    setPick(g);
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
  const glow = (x: number, y: number, r: number) => <circle cx={x} cy={y} r={r + 10} fill="none" stroke={GOLD} strokeWidth={4} className="sd-glow" pointerEvents="none" />;

  const row = (w: Win, i: number) => (
    <li key={`${w.kind}-${w.at}-${i}`}>
      <i className="pm-dot" style={{ background: isNew.has(w) ? GOLD : HUE[groupOf(w.kind)] }} aria-hidden="true" />
      <span className="pm-body">
        <b>{w.title}</b>
        <small>
          {isNew.has(w) ? "New · " : ""}
          {when(w.at, today)}
          {w.detail ? ` · ${w.detail}` : ""}
        </small>
      </span>
      {w.contactId && onContact && !demo ? (
        <span className="pm-acts">
          <button onClick={() => onContact(w.contactId!)} aria-label={`Open the contact for ${w.title}`}>→</button>
        </span>
      ) : null}
    </li>
  );
  const list = pick ? inGroup(data, pick) : data.wins;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="wn-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Wins">
            <defs>
              <radialGradient id="wn-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {placed.map(({ g, x, y }) => (
              <line key={`l-${g}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {homeSeat && <line className="vr-link" x1={C} y1={C} x2={homeSeat.x} y2={homeSeat.y} />}

            {pick ? (
              <g className="pm-orb picked" aria-label={`${GROUP_TITLE[pick]}, in the middle`}>
                {newIn(pick) ? glow(C, C, CORE) : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#wn-glass)" stroke={HUE[pick]} strokeWidth={3} />
                <text className="pm-mark" x={C} y={C - 22} dy="0.36em" textAnchor="middle" fontSize={pick === "week_100" ? 40 : 54}>{ICON[pick]}</text>
                <text className="dt-score-sub" x={C} y={C + 30} textAnchor="middle">{GROUP_TITLE[pick].toUpperCase()}</text>
                <text className="pm-core-end" x={C} y={C + 54} textAnchor="middle">{`${data.counts[pick]} this year`}</text>
              </g>
            ) : (
              <g aria-label={`Wins: ${winsLine(data)}`}>
                {fresh.length ? glow(C, C, CORE) : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#wn-glass)" stroke="#ffd86a" strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{n}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">WINS THIS YEAR</text>
                {fresh.length ? <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">{`${fresh.length} new`}</text> : null}
              </g>
            )}

            {homeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Back to all your wins" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={homeSeat.x} cy={homeSeat.y} r={58} fill="url(#wn-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <text className="pm-mark" x={homeSeat.x} y={homeSeat.y} dy="0.36em" textAnchor="middle" fontSize={26}>{n}</text>
                <text className="pm-name-l" x={homeSeat.x} y={homeSeat.y + 58 + 24} textAnchor="middle">All wins</text>
              </g>
            )}

            {placed.map(({ g, x, y }) => {
              const r = size(g);
              const c = data.counts[g];
              return (
                <g key={g} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${GROUP_TITLE[g]}: ${c}${newIn(g) ? ", something new" : ""}`} {...tap(() => open(g))}>
                  {newIn(g) ? glow(x, y, r) : null}
                  <circle className="pm-disc" cx={x} cy={y} r={r} fill="url(#wn-glass)" stroke={c ? HUE[g] : DIM} strokeWidth={2.5} opacity={c ? 1 : 0.6} />
                  <text className="pm-mark" x={x} y={y - 8} dy="0.36em" textAnchor="middle" fontSize={g === "week_100" ? 20 : 28}>{ICON[g]}</text>
                  <text className="pm-time-l" x={x} y={y + 22} textAnchor="middle" fontSize={16}>{c}</text>
                  <text className="pm-name-l" x={x} y={y + r + 24} textAnchor="middle">{GROUP_TITLE[g]}</text>
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="Wins">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          <h1 className="d-title" id="wn-title">{pick ? GROUP_TITLE[pick] : "Wins"}</h1>
          <p className="d-sub">{pick ? `${data.counts[pick]} this year` : winsLine(data)}{fresh.length && !pick ? ` · ${fresh.length} new since you last looked` : ""}</p>
          {list.length ? (
            <ul className="pm-list pm-compact">{list.map(row)}</ul>
          ) : (
            <p className="pm-empty">
              {pick === "five_star" ? "No five-star reviews yet. Ask a happy client for one; it shows here when it comes in." : "Nothing here yet. It fills itself from your records as it happens."}
            </p>
          )}
          {pick ? <button className="vr-classic" onClick={() => open(null)}>All your wins</button> : null}
          <p className="pm-promise">{demo ? "Example agent. " : ""}From your own records only. Nothing is sent to anyone.</p>
        </aside>
      </div>
    </div>
  );
}
