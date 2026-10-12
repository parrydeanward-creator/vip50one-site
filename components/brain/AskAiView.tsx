"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import { ENGINES, WHAT_HELPS, engineUrl, questions, resultKey, tallyLine, type Answer, type Engine, type Question, type Results } from "@/lib/aiCheck.ts";

// Ask AI about you (PULSE-ROADMAP; Scout 54). Three questions round a centre that counts how often the agent was
// named this month. Tap a question: it comes to the middle (the orb rule) and the panel opens ChatGPT, Perplexity or
// Google with it filled in; the agent marks what each one said. Nothing is automated and nothing is sent.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 300;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const GREY = "#8089a2";

export default function AskAiView({ name, area, results, demo, onArea, onMark, onClose }: {
  name: string;
  area: string;
  results: Results;
  demo: boolean;
  onArea: (a: string) => void;
  onMark: (q: string, e: Engine, a: Answer | null) => void;
  onClose: () => void;
}) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [sel, setSel] = useState<string | null>(null);
  const [draftArea, setDraftArea] = useState(area);
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

  const qs = questions(name, area);
  const picked = qs.find((q) => q.id === sel) ?? null;
  const seats = qs.map((q, k) => {
    const a = (k / qs.length) * 2 * Math.PI;
    return { q, x: C + RING * Math.sin(a), y: C - RING * Math.cos(a) };
  });
  const named = (q: Question) => ENGINES.filter((e) => results[resultKey(q.id, e.key)] === "named").length;
  const asked = (q: Question) => ENGINES.filter((e) => results[resultKey(q.id, e.key)]).length;
  const pick = (q: Question, x: number, y: number) => {
    if (sel === q.id) {
      setSel(null);
      return cam.reset();
    }
    setSel(q.id);
    cam.centreOn(x, y);
  };
  const back = () => {
    setSel(null);
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
  const total = Object.values(results).filter((v) => v === "named").length;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="ai-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Questions to ask AI about you">
            <defs>
              <radialGradient id="ai-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#2b2a3f" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ q, x, y }) => <line key={`l-${q.id}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />)}
            <g aria-label={`Named ${total} times`} {...(picked ? { "data-tap": true, role: "button", tabIndex: 0, ...tap(back) } : {})}>
              <circle cx={C} cy={C} r={CORE} fill="url(#ai-glass)" stroke={GOLD} strokeWidth={3} />
              <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{total}</text>
              <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">TIMES NAMED</text>
              <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">this month</text>
            </g>
            {seats.map(({ q, x, y }, k) => {
              const on = sel === q.id;
              const hue = asked(q) === 0 ? GREY : named(q) ? GREEN : GOLD;
              return (
                <g key={q.id} data-tap className={`cm-orb${on ? " picked" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={q.text} {...tap(() => pick(q, x, y))}>
                  <circle cx={x} cy={y} r={56} fill="url(#ai-glass)" stroke={hue} strokeWidth={on ? 4 : 2.5} />
                  <text className="pm-mark" x={x} y={y - 6} textAnchor="middle" fontSize={22} fill={hue}>{asked(q) ? `${named(q)}/${asked(q)}` : "?"}</text>
                  <text className="cm-orb-k" x={x} y={y + 20} textAnchor="middle">{`QUESTION ${k + 1}`}</text>
                </g>
              );
            })}
          </svg>
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={back} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Ask AI about you">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          <h1 className="d-title" id="ai-title">{picked ? "Ask this question" : "Ask AI about you"}</h1>
          {picked ? (
            <section className="cm-form">
              <p className="d-sub">&ldquo;{picked.text}&rdquo;</p>
              <ul className="pm-list pm-compact">
                {ENGINES.map((e) => {
                  const k = resultKey(picked.id, e.key);
                  const v = results[k];
                  return (
                    <li key={e.key}>
                      <span className="pm-body">
                        <a className="chip-btn" href={engineUrl(e.key, picked.text)} target="_blank" rel="noopener noreferrer">Ask {e.label}</a>
                        <span className="decide-btns">
                          <button type="button" className={`chip-btn${v === "named" ? " primary" : ""}`} aria-pressed={v === "named"} onClick={() => onMark(picked.id, e.key, v === "named" ? null : "named")}>Named me</button>
                          <button type="button" className={`chip-btn${v === "not_named" ? " primary" : ""}`} aria-pressed={v === "not_named"} onClick={() => onMark(picked.id, e.key, v === "not_named" ? null : "not_named")}>Didn&apos;t</button>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <button className="vr-classic" onClick={back}>All questions</button>
            </section>
          ) : (
            <>
              <p className="d-sub">{tallyLine(results)}</p>
              <p className="d-sum">Once a month, ask the AI engines your clients use whether they know you. Tap a question, open each engine, and mark whether it named you.</p>
              <label className="pm-field">
                <span>Your area, as clients would say it</span>
                <input value={draftArea} maxLength={80} onChange={(e) => setDraftArea(e.target.value)} onBlur={() => draftArea.trim() !== area && onArea(draftArea.trim())} placeholder="Draper, Utah" />
              </label>
              <h2 className="pm-h">What helps</h2>
              <ul className="pm-list pm-compact">{WHAT_HELPS.map((w) => <li key={w}><span className="pm-body">{w}</span></li>)}</ul>
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}ONE never asks these for you: each button opens the engine with the question filled in, and only you press Enter. Your marks stay in this browser.</p>
        </aside>
      </div>
    </div>
  );
}
