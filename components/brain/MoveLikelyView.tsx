"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import { levelWord, notedLine, touchLine, type Level, type MoveLikely, type Person } from "@/lib/moveLikely.ts";

// Likely to move (VIP-SUMMARY §3ab). Past clients round a centre that counts the High ones. Tap one: it comes to the
// middle (Parry, 6 Oct, the rule for every orb) with the level, ONE Property's reasons (property facts only, labelled
// "Suggested"), what the agent noted beside it, and a check-in touch; tap it again, or "All of them", to go back.
// No pulses: a nudge, not a deadline. Only the agent sees it; nothing is sent.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 300;
const HUE: Record<Level | "none", string> = { high: "#f5c542", medium: "#7fb6ff", low: "#8089a2", none: "#8089a2" };
const SHORT: Record<Level | "none", string> = { high: "HIGH", medium: "MEDIUM", low: "LOW", none: "NO HISTORY" };

export default function MoveLikelyView({ data, demo, onNotUseful, onClose }: { data: MoveLikely; demo: boolean; onNotUseful: (p: Person) => Promise<boolean>; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
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

  const list = data.people.slice(0, 12);
  const picked = list.find((p) => p.contactId === sel) ?? null;
  const high = data.people.filter((p) => p.level === "high").length;
  const seats = list.map((p, k) => {
    const a = (k / Math.max(list.length, 1)) * 2 * Math.PI;
    return { p, x: C + RING * Math.sin(a), y: C - RING * Math.cos(a) };
  });
  const pick = (p: Person, x: number, y: number) => {
    if (sel === p.contactId) {
      setSel(null);
      return cam.reset();
    }
    setSel(p.contactId);
    cam.centreOn(x, y);
  };
  const back = () => {
    setSel(null);
    cam.reset();
  };
  const notUseful = async (p: Person) => {
    const ok = await onNotUseful(p);
    setNote(ok ? `${p.name} is hidden for 90 days. Pulse learns from the count, never from who.` : "That didn't save just now. Nothing was changed.");
    if (ok) back();
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="ml-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Past clients likely to move">
            <defs>
              <radialGradient id="ml-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#2b2a3f" />
              </radialGradient>
              <radialGradient id="ml-hi" cx="40%" cy="30%" r="60%">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ p, x, y }) => (
              <line key={`l-${p.contactId}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            <g aria-label={`${high} high`} {...(picked ? { "data-tap": true, role: "button", tabIndex: 0, ...tap(back) } : {})}>
              <circle cx={C} cy={C} r={CORE} fill="url(#ml-glass)" stroke="#f5c542" strokeWidth={3} />
              <circle cx={C} cy={C} r={CORE} fill="url(#ml-hi)" pointerEvents="none" />
              <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{data.ready ? high : "–"}</text>
              <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">LIKELY TO MOVE</text>
              <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">past clients</text>
            </g>
            {seats.map(({ p, x, y }) => {
              const k = p.level ?? "none";
              const hue = HUE[k];
              const on = sel === p.contactId;
              return (
                <g key={p.contactId} data-tap className={`cm-orb${on ? " picked" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${p.name}: ${levelWord(p.level)}`} {...tap(() => pick(p, x, y))}>
                  <circle cx={x} cy={y} r={56} fill="url(#ml-glass)" stroke={hue} strokeWidth={on ? 4 : 2.5} />
                  <circle cx={x} cy={y} r={56} fill="url(#ml-hi)" pointerEvents="none" />
                  {p.level === "high" && <circle cx={x + 40} cy={y - 40} r={7} fill="#f5c542" aria-hidden="true" />}
                  <text className="pm-mark" x={x} y={y - 6} textAnchor="middle" fontSize={22} fill={hue}>⌂</text>
                  <text className="cm-orb-k" x={x} y={y + 20} textAnchor="middle">{SHORT[k]}</text>
                  <text className="pm-name-l" x={x} y={y + 56 + 24} textAnchor="middle">{p.name}</text>
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
            <button onClick={back} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Likely to move">
          <div className="d-head">
            <span className="chip" style={{ color: "#3fbf7f", borderColor: "#3fbf7f" }}>ONE MOVE</span>
          </div>
          <h1 className="d-title" id="ml-title">{picked ? picked.name : "Likely to move"}</h1>
          {!data.ready ? (
            <p className="d-sum">This starts when the MLS feed is live. Then, once a week, ONE looks at your past clients&apos; homes (how long they have owned, whether the home was listed, how fast the area turns over) and shows who may be getting ready to move.</p>
          ) : picked ? (
            <section className="cm-form">
              <p className="d-sub">{levelWord(picked.level)}{picked.level ? ` · ${picked.label}` : ""}</p>
              {picked.reasons.length > 0 && (
                <ul className="pm-list pm-compact">
                  {picked.reasons.map((r) => (
                    <li key={r}>
                      <i className="pm-dot" style={{ background: HUE[picked.level ?? "none"] }} aria-hidden="true" />
                      <span className="pm-body"><b>{r}</b></span>
                    </li>
                  ))}
                </ul>
              )}
              {notedLine(picked) && <p className="d-sum"><i>{notedLine(picked)}</i> (your own note; it never changes the level)</p>}
              <h2 className="pm-h">Pulse suggests</h2>
              <p className="le-touch">{touchLine(picked)}</p>
              <div className="decide-btns">
                <button type="button" className="chip-btn" onClick={() => void notUseful(picked)}>Not useful</button>
              </div>
              <button className="vr-classic" onClick={back}>All of them</button>
            </section>
          ) : (
            <>
              <p className="d-sub">{data.people.filter((p) => p.level === "high").length} high · {data.people.filter((p) => p.level === "medium").length} medium{data.lowCount ? ` · ${data.lowCount} low` : ""}</p>
              <p className="d-sum">Past clients whose homes suggest a move may be coming, from the home&apos;s facts only: years owned, whether it was listed, and how fast the area turns over. Tap one for the reasons and a check-in to make.</p>
              {data.missingHome.length > 0 && <p className="pm-empty">No home on file for {data.missingHome.map((m) => m.name).join(", ")}. Add their address in ONE MOVE and confirm the house.</p>}
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}Suggested from property facts only, never from who lives there. Only you see it; nothing is sent to anyone.</p>
        </aside>
      </div>
    </div>
  );
}
