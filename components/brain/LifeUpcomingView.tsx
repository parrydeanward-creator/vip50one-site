"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import { EMPTY_LINE, EXAMPLE_ROW, GENTLE_NOTE, TASK_ADDED, exampleLine, type Upcoming, type UpcomingKind, type UpcomingList } from "@/lib/lifeUpcoming.ts";

// Life events, one list (vip50-web-crm#294; lib/lifeUpcoming.ts). The people with a special day or news coming up,
// round a centre that counts them, soonest first as ONE MOVE orders them. Tap one: it comes to the middle (Parry, 6 Oct,
// the rule for every orb) with its line, Pulse's touch and "Add the task"; tap it again, or "All of them", to go back.
// Gentle rows are a caring touch only. Nothing is sent.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 300;
const GOLD = "#f5c542";
const SOFT = "#b7a4e8";
const MARK: Record<UpcomingKind, string> = { birthday: "✦", anniversary: "◇", home_anniversary: "⌂", note_event: "♡" };
const SHORT: Record<UpcomingKind, string> = { birthday: "BIRTHDAY", anniversary: "ANNIVERSARY", home_anniversary: "HOME", note_event: "FROM A NOTE" };
const key = (p: Upcoming) => `${p.contactId}|${p.kind}|${p.on}`;

export default function LifeUpcomingView({ data, demo, onTask, onClose }: { data: UpcomingList; demo: boolean; onTask: (p: Upcoming) => Promise<boolean>; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, "busy" | "done">>({});
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
  const picked = list.find((p) => key(p) === sel) ?? null;
  const seats = list.map((p, k) => {
    const a = (k / Math.max(list.length, 1)) * 2 * Math.PI;
    return { p, x: C + RING * Math.sin(a), y: C - RING * Math.cos(a) };
  });
  const pick = (p: Upcoming, x: number, y: number) => {
    if (sel === key(p)) {
      setSel(null);
      return cam.reset();
    }
    setSel(key(p));
    cam.centreOn(x, y);
  };
  const back = () => {
    setSel(null);
    cam.reset();
  };
  const addTask = async (p: Upcoming) => {
    if (p.example) return setNote("This is an example. Your own people show here once they have a birthday, anniversary or closing date.");
    const k = key(p);
    if (added[k]) return;
    setAdded((a) => ({ ...a, [k]: "busy" }));
    const ok = await onTask(p).catch(() => false);
    setAdded((a) => {
      const next = { ...a };
      if (ok) next[k] = "done";
      else delete next[k];
      return next;
    });
    if (!ok) setNote("That didn't save just now. Nothing was added.");
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });
  const row = (p: Upcoming) => {
    const k = key(p);
    return (
      <div key={k} className={`ml-example${p.example ? "" : " lu-row"}`} role="group" aria-label={p.example ? "Example life event" : `${p.firstName}: ${p.line}`}>
        <b>{p.example ? exampleLine(p) : p.firstName}</b>
        {!p.example && <small>{p.line}</small>}
        {!p.example && <p className="le-touch">Pulse suggests: {p.touch}</p>}
        {p.gentle && <small className="lu-gentle">{GENTLE_NOTE}</small>}
        <div className="decide-btns">
          {added[k] === "done" ? (
            <span className="chip" role="status">{TASK_ADDED}</span>
          ) : (
            <button type="button" className="chip-btn" disabled={added[k] === "busy"} aria-label={p.example ? "Add the task (example)" : `Add the task: ${p.firstName}`} onClick={() => void addTask(p)}>
              Add the task
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="lu-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Life events coming up">
            <defs>
              <radialGradient id="lu-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#2b2a3f" />
              </radialGradient>
              <radialGradient id="lu-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0.6" stopColor={GOLD} stopOpacity="0.35" />
                <stop offset="1" stopColor={GOLD} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ p, x, y }) => (
              <line key={`l-${key(p)}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            <g aria-label={`Life events: ${data.count} coming up`} {...(picked ? { "data-tap": true, role: "button", tabIndex: 0, ...tap(back) } : {})}>
              {data.count > 0 && <circle cx={C} cy={C} r={CORE * 1.5} fill="url(#lu-glow)" pointerEvents="none" />}
              <circle cx={C} cy={C} r={CORE} fill="url(#lu-glass)" stroke={data.count ? GOLD : "#3fbf7f"} strokeWidth={3} />
              <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{data.count}</text>
              <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">COMING UP</text>
              <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">life events</text>
            </g>
            {seats.map(({ p, x, y }) => {
              const hue = p.gentle ? SOFT : GOLD;
              const on = sel === key(p);
              return (
                <g key={key(p)} data-tap className={`cm-orb${on ? " picked" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${p.firstName}: ${p.line}`} {...tap(() => pick(p, x, y))}>
                  {!p.gentle && <circle cx={x} cy={y} r={78} fill="url(#lu-glow)" pointerEvents="none" />}
                  <circle cx={x} cy={y} r={56} fill="url(#lu-glass)" stroke={hue} strokeWidth={on ? 4 : 2.5} />
                  <text className="pm-mark" x={x} y={y - 6} textAnchor="middle" fontSize={22} fill={hue}>{MARK[p.kind]}</text>
                  <text className="cm-orb-k" x={x} y={y + 20} textAnchor="middle">{SHORT[p.kind]}</text>
                  <text className="pm-name-l" x={x} y={y + 56 + 24} textAnchor="middle">{p.firstName}</text>
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="Life events">
          <div className="d-head">
            <span className="chip" style={{ color: "#3fbf7f", borderColor: "#3fbf7f" }}>ONE MOVE</span>
          </div>
          <h1 className="d-title" id="lu-title">{picked ? picked.firstName : "Life events"}</h1>
          {picked ? (
            <section className="ml-reason">
              {row(picked)}
              <button className="vr-classic" onClick={back}>All of them</button>
            </section>
          ) : data.people.length ? (
            <section className="ml-reason">
              <p className="d-sub">{data.count} coming up, soonest first</p>
              {data.people.map(row)}
            </section>
          ) : (
            <section className="ml-reason">
              <p className="d-sum">{EMPTY_LINE}.</p>
              {row(EXAMPLE_ROW)}
            </section>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}Only you see this; nothing is sent. Add the task and make the touch yourself.</p>
        </aside>
      </div>
    </div>
  );
}
