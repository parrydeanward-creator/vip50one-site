"use client";

import { useEffect, useRef, useState } from "react";
import PulseRing, { PULSE_COLOR } from "./PulseRing.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { attention, coachOrder, lastWeekShare, teamKeepRate, type Coached } from "@/lib/coach.ts";
import { KIND_LABEL, progressWords, reached, resultWord, type Item, type Result } from "@/lib/commitments.ts";

// The Coach view (VIP-SUMMARY §3n.4, §3n.7): the agents you coach round you, each orb's gold ring their keep
// rate (8 weeks), pulsing red when they are late setting or checking in, yellow when it is due today. Tap an
// agent for their week, weekend, results and notes. Read only: a coach never sets or marks for them.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 300;
const GOLD = "#f5c542";
const RES_COLOR: Record<Result, string> = { kept: "#3fbf7f", partly: "#e5b83a", missed: "#e4574a" };
const pct = (r: number | null) => (r == null ? "No history yet" : `${Math.round(r * 100)}%`);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

function arc(cx: number, cy: number, r: number, share: number): string {
  const a = Math.max(0.001, Math.min(0.9999, share)) * Math.PI * 2;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}`;
}

function ItemRow({ i }: { i: Item }) {
  const on = i.result === "kept" || reached(i);
  return (
    <li className={i.result ? "is-done" : ""}>
      <i className="pm-dot" style={{ background: i.result ? RES_COLOR[i.result] : on ? GOLD : "rgba(255,255,255,0.35)" }} aria-hidden="true" />
      <span className="pm-body">
        <b>{i.text}</b>
        <small>
          {i.kind === "yes_no" ? "Yes or no" : `${progressWords(i)} (${KIND_LABEL[i.kind].toLowerCase()})`}
          {i.result ? ` · ${resultWord(i.result)}` : ""}
          {i.note ? ` · "${i.note}"` : ""}
        </small>
      </span>
    </li>
  );
}

export default function CoachView({ agents, hour, demo, onClose }: { agents: Coached[]; hour: number; demo: boolean; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<string | null>(null);
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

  const order = coachOrder(agents, hour);
  const team = teamKeepRate(agents);
  const late = order.filter((a) => attention(a, hour).level === "now").length;
  const n = order.length;
  const r = Math.max(34, Math.min(62, 420 / Math.max(n, 4)));
  const seats = order.map((a, k) => {
    const ang = (k / n) * Math.PI * 2;
    return { a, x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  });
  const sel = order.find((a) => a.id === pick);

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="cv-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="The agents you coach">
            <defs>
              <radialGradient id="cv-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ a, x, y }) => (
              <line key={`l-${a.id}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            <circle cx={C} cy={C} r={CORE} fill="url(#cv-glass)" stroke="#ffd86a" strokeWidth={3} />
            <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{team == null ? n : `${Math.round(team * 100)}%`}</text>
            <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">{team == null ? (n === 1 ? "AGENT" : "AGENTS") : "TEAM KEEP RATE"}</text>
            {late > 0 && <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">{`${late} late`}</text>}

            {seats.map(({ a, x, y }) => {
              const at = attention(a, hour);
              const rate = a.c.keepRate8w;
              const allOn = !at.level && (a.c.week?.items.length ?? 0) > 0 && a.c.week!.items.every((i) => i.result === "kept" || reached(i));
              return (
                <g
                  key={a.id}
                  data-tap
                  className={`pm-orb pm-plan${pick === a.id ? " picked" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${a.name}: ${at.words}. Keeps ${pct(rate)}.`}
                  onClick={() => setPick((p) => (p === a.id ? null : a.id))}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    setPick((p) => (p === a.id ? null : a.id));
                  }}
                >
                  {at.level ? <PulseRing r={r} level={at.level} x={x} y={y} /> : null}
                  <circle className="pm-disc" cx={x} cy={y} r={r} fill="url(#cv-glass)" stroke={at.level === "now" ? PULSE_COLOR.now : at.level === "today" ? PULSE_COLOR.today : allOn ? "#3fbf7f" : "rgba(160,175,210,0.45)"} strokeWidth={2.5} />
                  {rate != null && <path d={arc(x, y, r + 7, rate)} fill="none" stroke={GOLD} strokeWidth={4} strokeLinecap="round" />}
                  <text className="pm-mark" x={x} y={y} dy="0.36em" textAnchor="middle" fontSize={Math.max(14, r * 0.55)}>{initials(a.name)}</text>
                  <text className="pm-name-l" x={x} y={y + r + 24} textAnchor="middle">{a.name.split(/\s+/)[0]}</text>
                  <text className="pm-time-l" x={x} y={y + r + 42} textAnchor="middle">{rate == null ? "" : `${Math.round(rate * 100)}% kept`}</text>
                </g>
              );
            })}
          </svg>
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={cam.reset} aria-label="Centre on your team">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Coaching">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          {sel ? (
            <>
              <h1 className="d-title" id="cv-title">{sel.name}</h1>
              <p className="d-sub">{attention(sel, hour).words}</p>
              <p className="d-sum">
                Keeps {pct(sel.c.keepRate8w)} of commitments over 8 weeks{sel.c.streak ? ` · ${sel.c.streak}-week streak` : ""}.
                {lastWeekShare(sel) != null ? ` Last week: ${sel.c.lastWeek!.kept} kept, ${sel.c.lastWeek!.partly} partly, ${sel.c.lastWeek!.missed} missed.` : ""}
              </p>
              <h2>This week</h2>
              {sel.c.week?.items.length ? (
                <ul className="pm-list pm-compact">{sel.c.week.items.map((i) => <ItemRow key={i.id} i={i} />)}</ul>
              ) : (
                <p className="pm-empty">Not set yet.</p>
              )}
              {sel.c.weekend?.items.length ? (
                <>
                  <h2>Weekend</h2>
                  <ul className="pm-list pm-compact">{sel.c.weekend.items.map((i) => <ItemRow key={i.id} i={i} />)}</ul>
                </>
              ) : null}
              <button className="vr-classic" onClick={() => setPick(null)}>All agents</button>
            </>
          ) : (
            <>
              <h1 className="d-title" id="cv-title">Coaching</h1>
              <p className="d-sub">
                {n} {n === 1 ? "agent" : "agents"} · team keep rate {pct(team)}
              </p>
              <p className="d-sum">The ones who need a word from you come first. Their gold ring is how many commitments they keep.</p>
              <ul className="pm-list pm-compact">
                {order.map((a) => {
                  const at = attention(a, hour);
                  return (
                    <li key={a.id}>
                      <i className="pm-dot" style={{ background: at.level === "now" ? PULSE_COLOR.now : at.level === "today" ? PULSE_COLOR.today : "rgba(255,255,255,0.35)" }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>{a.name}</b>
                        <small>{at.words} · keeps {pct(a.c.keepRate8w)}</small>
                      </span>
                      <span className="pm-acts">
                        <button onClick={() => setPick(a.id)} aria-label={`Open ${a.name}`}>→</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <p className="pm-promise">
            {demo ? "Example agents. " : ""}Read only: only the agent sets and marks their commitments. Nobody but the agent and their coach sees them.
          </p>
        </aside>
      </div>
    </div>
  );
}
