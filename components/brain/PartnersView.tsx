"use client";

import { useEffect, useRef, useState } from "react";
import PulseRing from "./PulseRing.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { NUDGES, nudgedToday, partnerLine, waiting, type NudgeKind, type Partner, type PartnersState } from "@/lib/partners.ts";

// Accountability partners in ONE YOU (VIP-SUMMARY §3s; Parry, 7 Oct). You in the middle with your week; the partners
// you chose round you, their week's score as a ring (green at 100). An invite waiting is a dashed orb. Tap anyone and
// they come to the middle (Parry, 6 Oct, the rule for every orb): their last 4 weeks and the nudge buttons, or
// accept / decline. Nothing but the score is shared, and a nudge is one of four preset lines, one a day.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 300;
const R = 70;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const DIM = "rgba(160,175,210,0.45)";

type Seat = { kind: "partner"; p: Partner } | { kind: "invite"; pairId: string; name: string };
const sid = (s: Seat) => (s.kind === "partner" ? s.p.pairId : `i:${s.pairId}`);
const sname = (s: Seat) => (s.kind === "partner" ? s.p.name : s.name);
function arc(cx: number, cy: number, r: number, share: number): string {
  const a = Math.max(0.001, Math.min(0.9999, share)) * Math.PI * 2;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}`;
}
type Act = { action: "respond"; pairId: string; accept: boolean } | { action: "end"; pairId: string } | { action: "nudge"; pairId: string; kind: NudgeKind };

export default function PartnersView({ state, me, today, demo, onClose, onAct }: { state: PartnersState; me: { score: number; minimum: number } | null; today: string; demo: boolean; onClose: () => void; onAct: (a: Act) => Promise<string | null> }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
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

  const seats: Seat[] = [...state.partners.map((p) => ({ kind: "partner" as const, p })), ...state.invitesIn.map((i) => ({ kind: "invite" as const, pairId: i.pairId, name: i.name }))];
  const sel = seats.find((s) => sid(s) === pick) ?? null;
  const round = seats.filter((s) => s !== sel);
  const m = round.length + (sel ? 1 : 0);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const homeSeat = sel ? seatAt(0) : null;
  const placed = round.map((s, k) => ({ s, ...seatAt(k + (sel ? 1 : 0)) }));
  const todayNudges = state.nudges.filter((n) => n.at.slice(0, 10) === today);
  const w = waiting(state, today);

  const open = (k: string | null) => {
    setPick(k);
    setNote(null);
    setEnding(false);
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
  const act = async (a: Act, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const err = await onAct(a);
    setBusy(false);
    if (err) return setNote(err);
    after?.();
  };
  const ringOf = (p: Partner) => (p.score != null && p.score >= p.minimum ? GREEN : GOLD);
  const share = (p: Partner) => (p.score == null ? 0 : p.score / p.minimum);
  const initial = (name: string) => name.slice(0, 1).toUpperCase();

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="ap-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Accountability partners">
            <defs>
              <radialGradient id="ap-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {placed.map(({ s, x, y }) => (
              <line key={`l-${sid(s)}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {homeSeat && <line className="vr-link" x1={C} y1={C} x2={homeSeat.x} y2={homeSeat.y} />}

            {sel && sel.kind === "partner" ? (
              <g className="pm-orb picked" aria-label={`${sel.p.name}, in the middle`}>
                <circle cx={C} cy={C} r={CORE} fill="url(#ap-glass)" stroke={ringOf(sel.p)} strokeWidth={3} />
                <path d={arc(C, C, CORE + 9, share(sel.p))} fill="none" stroke={ringOf(sel.p)} strokeWidth={6} strokeLinecap="round" />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{sel.p.score ?? "–"}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{sel.p.name.toUpperCase()}</text>
                <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">{sel.p.streak ? `${sel.p.streak} weeks at ${sel.p.minimum}+` : "this week"}</text>
              </g>
            ) : sel && sel.kind === "invite" ? (
              <g className="pm-orb picked" aria-label={`${sel.name}'s invite, in the middle`}>
                <PulseRing r={CORE} level="today" x={C} y={C} />
                <circle cx={C} cy={C} r={CORE} fill="url(#ap-glass)" stroke={GOLD} strokeWidth={3} strokeDasharray="10 8" />
                <text className="pm-mark" x={C} y={C - 16} dy="0.36em" textAnchor="middle" fontSize={56}>{initial(sel.name)}</text>
                <text className="dt-score-sub" x={C} y={C + 34} textAnchor="middle">{sel.name.toUpperCase()}</text>
                <text className="pm-core-end" x={C} y={C + 56} textAnchor="middle">wants to partner</text>
              </g>
            ) : (
              <g aria-label="You">
                {w ? <PulseRing r={CORE} level="today" x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#ap-glass)" stroke="#ffd86a" strokeWidth={3} />
                {me ? <path d={arc(C, C, CORE + 9, me.score / me.minimum)} fill="none" stroke={me.score >= me.minimum ? GREEN : GOLD} strokeWidth={6} strokeLinecap="round" /> : null}
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{me ? me.score : "YOU"}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{me ? "YOUR WEEK" : ""}</text>
                {me ? <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">{me.score >= me.minimum ? `At ${me.minimum}` : `${me.minimum - me.score} to ${me.minimum}`}</text> : null}
              </g>
            )}

            {homeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Back to you and your partners" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={homeSeat.x} cy={homeSeat.y} r={R} fill="url(#ap-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <text className="pm-mark" x={homeSeat.x} y={homeSeat.y} dy="0.36em" textAnchor="middle" fontSize={24}>{me ? me.score : "You"}</text>
                <text className="pm-name-l" x={homeSeat.x} y={homeSeat.y + R + 24} textAnchor="middle">You</text>
              </g>
            )}

            {placed.map(({ s, x, y }) =>
              s.kind === "partner" ? (
                <g key={sid(s)} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${s.p.name}: ${partnerLine(s.p)}`} {...tap(() => open(sid(s)))}>
                  <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#ap-glass)" stroke={ringOf(s.p)} strokeWidth={2.5} />
                  <path d={arc(x, y, R + 7, share(s.p))} fill="none" stroke={ringOf(s.p)} strokeWidth={4} strokeLinecap="round" />
                  <text className="pm-mark" x={x} y={y - 6} dy="0.36em" textAnchor="middle" fontSize={30}>{s.p.score ?? "–"}</text>
                  <text className="pm-time-l" x={x} y={y + 26} textAnchor="middle" fontSize={13}>{s.p.tickedToday ? "✓ today" : ""}</text>
                  <text className="pm-name-l" x={x} y={y + R + 24} textAnchor="middle">{s.p.name}</text>
                </g>
              ) : (
                <g key={sid(s)} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${s.name} invited you to be partners`} {...tap(() => open(sid(s)))}>
                  <PulseRing r={R} level="today" x={x} y={y} />
                  <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#ap-glass)" stroke={GOLD} strokeWidth={2.5} strokeDasharray="6 6" />
                  <text className="pm-mark" x={x} y={y} dy="0.36em" textAnchor="middle" fontSize={32}>{initial(s.name)}</text>
                  <text className="pm-name-l" x={x} y={y + R + 24} textAnchor="middle">{s.name}</text>
                  <text className="pm-time-l" x={x} y={y + R + 42} textAnchor="middle">Invite</text>
                </g>
              ),
            )}
          </svg>
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={cam.reset} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Accountability partners">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          {sel && sel.kind === "partner" ? (
            <>
              <h1 className="d-title" id="ap-title">{sel.p.name}</h1>
              <p className="d-sub">{partnerLine(sel.p)}{sel.p.tickedToday ? " · ticked today" : " · nothing ticked yet today"}</p>
              {sel.p.last4.length ? (
                <ul className="pm-list pm-compact">
                  {sel.p.last4.map((v, i) => (
                    <li key={i}>
                      <i className="pm-dot" style={{ background: v >= sel.p.minimum ? GREEN : DIM }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>{sel.p.last4.length - i === 1 ? "Last week" : `${sel.p.last4.length - i} weeks ago`}: {v}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <h2>Nudge {sel.p.name}</h2>
              {nudgedToday(sel.p, today) ? (
                <p className="pm-empty">You nudged {sel.p.name} today. One a day.</p>
              ) : (
                <div className="decide-btns" style={{ flexWrap: "wrap" }}>
                  {(Object.keys(NUDGES) as NudgeKind[]).map((k) => (
                    <button key={k} type="button" className="chip-btn" disabled={busy} onClick={() => act({ action: "nudge", pairId: sel.p.pairId, kind: k }, () => setNote(`Sent to ${sel.p.name}: "${NUDGES[k]}"`))}>
                      {NUDGES[k]}
                    </button>
                  ))}
                </div>
              )}
              {note ? <p className="pm-empty">{note}</p> : null}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, marginTop: 14 }}>
                {ending ? (
                  <div className="decide-btns">
                    <button type="button" className="chip-btn" disabled={busy} onClick={() => act({ action: "end", pairId: sel.p.pairId }, () => open(null))}>Yes, end it</button>
                    <button type="button" className="chip-btn" onClick={() => setEnding(false)}>Keep</button>
                  </div>
                ) : (
                  <button className="vr-classic" onClick={() => setEnding(true)}>End this partnership</button>
                )}
                <button className="vr-classic" onClick={() => open(null)}>Back to you</button>
              </div>
            </>
          ) : sel && sel.kind === "invite" ? (
            <>
              <h1 className="d-title" id="ap-title">{sel.name}</h1>
              <p className="d-sub">wants to be your accountability partner</p>
              <p className="d-sum">You'd each see the other's weekly score against the 100, the last 4 weeks, and whether today was ticked, and could send a one-tap nudge. Nothing else is shared. Either of you can end it any time.</p>
              <div className="decide-btns">
                <button type="button" className="chip-btn primary" disabled={busy} onClick={() => act({ action: "respond", pairId: sel.pairId, accept: true }, () => open(null))}>Accept</button>
                <button type="button" className="chip-btn" disabled={busy} onClick={() => act({ action: "respond", pairId: sel.pairId, accept: false }, () => open(null))}>Decline</button>
              </div>
              {note ? <p className="pm-empty">{note}</p> : null}
            </>
          ) : (
            <>
              <h1 className="d-title" id="ap-title">Partners</h1>
              <p className="d-sub">{state.partners.length ? `${state.partners.length} of ${3} partners` : "No partner yet"}</p>
              {todayNudges.length ? (
                <ul className="pm-list pm-compact">
                  {todayNudges.map((n, i) => (
                    <li key={i}>
                      <i className="pm-dot" style={{ background: GOLD }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>{n.from}: &ldquo;{NUDGES[n.kind]}&rdquo;</b>
                        <small>Today</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <ul className="pm-list pm-compact">
                {seats.map((s) => (
                  <li key={sid(s)}>
                    <i className="pm-dot" style={{ background: s.kind === "invite" ? GOLD : ringOf(s.p) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{sname(s)}</b>
                      <small>{s.kind === "invite" ? "Invited you" : partnerLine(s.p)}</small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => open(sid(s))} aria-label={`Open ${sname(s)}`}>→</button>
                    </span>
                  </li>
                ))}
                {state.invitesOut.map((i) => (
                  <li key={i.pairId}>
                    <i className="pm-dot" style={{ background: DIM }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{i.name}</b>
                      <small>Invite sent{i.expires ? `, open until ${i.expires}` : ""}</small>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="d-sum">Invite a partner from their member card in the Lounge. Up to 3.</p>
            </>
          )}
          <p className="pm-promise">{demo ? "Example agents. " : ""}Only the weekly score is shared, never commitments, contacts or clients. Either of you can end it any time.</p>
        </aside>
      </div>
    </div>
  );
}
