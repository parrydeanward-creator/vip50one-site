"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import PulseRing from "./PulseRing.tsx";
import DraftsSection from "./DraftsSection.tsx";
import { EVENT_TITLE, TONE, firstName, open, touchFor, type Found, type LifeEvent, type Radar, type Tone } from "@/lib/lifeEvents.ts";

// The Life-event radar (VIP-SUMMARY §3y). The people whose news the agent wrote down, round a centre that counts
// them. Tap one: it comes to the middle (Parry, 6 Oct, the rule for every orb) with what the agent wrote and the touch
// Pulse suggests; tap it again, or "All of them", to go back. Only the agent sees this; nothing is sent.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 300;
const HUE: Record<Tone, string> = { celebrate: "#f5c542", care: "#7fb6ff", sympathy: "#b7a4e8" };
const MARK: Record<LifeEvent, string> = { baby: "♡", wedding: "◇", new_job: "↗", retirement: "☀", empty_nest: "⌂", new_home: "⌂", loss: "✿", hard_time: "♡" };
const SHORT: Record<LifeEvent, string> = { baby: "NEW BABY", wedding: "WEDDING", new_job: "NEW JOB", retirement: "RETIRING", empty_nest: "KIDS LEFT", new_home: "NEW HOME", loss: "A LOSS", hard_time: "HARD TIME" };
const when = (at: string) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const age = (at: string, today: string) => Math.round((Date.parse(today) - Date.parse(at.slice(0, 10))) / 86_400_000);

export default function LifeEventsView({ data, demo, onKeep, onClose }: { data: Radar; demo: boolean; onKeep: (f: Found, state: "done" | "not_this") => Promise<boolean>; onClose: () => void }) {
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

  const list = open(data).slice(0, 12);
  const key = (f: Found) => `${f.contactId}|${f.event}`;
  const picked = list.find((f) => key(f) === sel) ?? null;
  const seats = list.map((f, k) => {
    const a = (k / Math.max(list.length, 1)) * 2 * Math.PI;
    return { f, x: C + RING * Math.sin(a), y: C - RING * Math.cos(a) };
  });
  const pick = (f: Found, x: number, y: number) => {
    if (sel === key(f)) {
      setSel(null);
      return cam.reset();
    }
    setSel(key(f));
    cam.centreOn(x, y);
  };
  const back = () => {
    setSel(null);
    cam.reset();
  };
  const keep = async (f: Found, state: "done" | "not_this") => {
    const ok = await onKeep(f, state);
    setNote(ok ? (state === "done" ? `Done. ${firstName(f.name)} is off the radar for this news.` : "Put away. Pulse won't show that one again.") : "That didn't save just now. Nothing was changed.");
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
  const fresh = list.filter((f) => age(f.at, data.today) <= 14).length;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="le-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Life events">
            <defs>
              <radialGradient id="le-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#2b2a3f" />
              </radialGradient>
              <radialGradient id="le-hi" cx="40%" cy="30%" r="60%">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ f, x, y }) => (
              <line key={`l-${key(f)}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            <g aria-label={`${list.length} to touch`} {...(picked ? { "data-tap": true, role: "button", tabIndex: 0, ...tap(back) } : {})}>
              <circle cx={C} cy={C} r={CORE} fill="url(#le-glass)" stroke="#f5c542" strokeWidth={3} />
              <circle cx={C} cy={C} r={CORE} fill="url(#le-hi)" pointerEvents="none" />
              <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{list.length}</text>
              <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">LIFE EVENTS</text>
              <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">{fresh ? `${fresh} new` : "from your notes"}</text>
            </g>
            {seats.map(({ f, x, y }) => {
              const hue = HUE[TONE[f.event]];
              const isNew = age(f.at, data.today) <= 14;
              const on = sel === key(f);
              return (
                <g key={key(f)} data-tap className={`cm-orb${on ? " picked" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${f.name}: ${EVENT_TITLE[f.event]}${isNew ? ", new" : ""}`} {...tap(() => pick(f, x, y))}>
                  {isNew && <PulseRing r={56} level="today" x={x} y={y} />}
                  <circle cx={x} cy={y} r={56} fill="url(#le-glass)" stroke={hue} strokeWidth={on ? 4 : 2.5} />
                  <circle cx={x} cy={y} r={56} fill="url(#le-hi)" pointerEvents="none" />
                  <circle cx={x} cy={y} r={56} fill="none" stroke="#ffffff" strokeOpacity={0.16} strokeWidth={1} pointerEvents="none" />
                  <text className="pm-mark" x={x} y={y - 6} textAnchor="middle" fontSize={26} fill={hue}>{MARK[f.event]}</text>
                  <text className="cm-orb-k" x={x} y={y + 20} textAnchor="middle">{SHORT[f.event]}</text>
                  <text className="pm-name-l" x={x} y={y + 56 + 24} textAnchor="middle">{f.name}</text>
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
          <h1 className="d-title" id="le-title">{picked ? picked.name : "Life events"}</h1>
          {picked ? (
            <section className="cm-form">
              <p className="d-sub">{EVENT_TITLE[picked.event]} · you wrote {when(picked.at)}</p>
              <blockquote className="le-quote">&ldquo;{picked.quote}&rdquo;</blockquote>
              <h2 className="pm-h">Pulse suggests</h2>
              <p className="le-touch">{touchFor(picked.event, firstName(picked.name)).line}</p>
              {(() => {
                const t = touchFor(picked.event, firstName(picked.name));
                if (!t.draft || !t.ask) return null;
                return demo ? (
                  <p className="pm-empty">In your account, Pulse drafts it here from what you know about {firstName(picked.name)}; you change anything and send it yourself.</p>
                ) : (
                  <DraftsSection key={key(picked)} contactId={picked.contactId} phone={null} email={null} onSent={() => {}} preset={{ kind: t.draft, ask: t.ask, event: picked.event, label: "Draft it" }} />
                );
              })()}
              <div className="decide-btns">
                <button type="button" className="chip-btn primary" onClick={() => void keep(picked, "done")}>I did it</button>
                <button type="button" className="chip-btn" onClick={() => void keep(picked, "not_this")}>Not this</button>
              </div>
              <button className="vr-classic" onClick={back}>All of them</button>
            </section>
          ) : (
            <>
              <p className="d-sub">{list.length ? `${list.length} to touch${fresh ? ` · ${fresh} new` : ""}` : "Nothing new"}</p>
              <p className="d-sum">New babies, weddings, new jobs, retirements, kids leaving home, and harder news, found in what you wrote about your own people. Tap one to see what you wrote and the touch Pulse suggests.</p>
              {list.length ? (
                <ul className="pm-list pm-compact">
                  {list.map((f) => (
                    <li key={key(f)}>
                      <i className="pm-dot" style={{ background: HUE[TONE[f.event]] }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>{f.name}</b>
                        <small>{EVENT_TITLE[f.event]} · {when(f.at)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pm-empty">When you note a new baby, a wedding or a new job on a contact, it shows here with the touch to make.</p>
              )}
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}Only from your own notes, never guessed. Only you see it; nothing is sent, and the contact never sees it.</p>
        </aside>
      </div>
    </div>
  );
}
