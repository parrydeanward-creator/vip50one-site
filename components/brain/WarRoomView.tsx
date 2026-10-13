"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import PulseRing, { PULSE_COLOR, type PulseLevel } from "./PulseRing.tsx";
import { SLOW_MINUTES, TEAM_LEADS_PAGE, agentLines, leadLevel, minutesWords, totals, waited, warLine, type AgentLine, type WarLead, type WarRoom } from "@/lib/warroom.ts";

// The team war room (PULSE-ROADMAP K22). The team in the middle, each agent round it with their team leads, and the
// lead pool. Red: a lead not reached in 15 minutes. Yellow: one waiting inside the window, or in the pool. A still
// green ring: all reached. Tap an agent (or the pool) and it comes to the middle with its leads in the side panel
// (Parry, 6 Oct, every orb); the middle brings the whole team back. Read only: reassign and claim in ONE MOVE.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 330;
const GOLD = "#f5c542";
const DIM = "rgba(160,175,210,0.45)";
const POOL = "pool";
const MAX_ORBS = 24;
const initials = (n: string) => n.slice(0, 2).toUpperCase();
const leads = (n: number) => `${n} ${n === 1 ? "lead" : "leads"}`;

const agentLevel = (a: AgentLine): PulseLevel | null => (a.late ? "now" : a.waiting ? "today" : a.leads ? "good" : null);

export default function WarRoomView({ room, demo, onClose }: { room: WarRoom; demo: boolean; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // A lead turns red by itself once it passes the window, so the clock moves while the room is open.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
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

  const t = totals(room, now);
  const lines = agentLines(room, now).slice(0, MAX_ORBS);
  const poolLevel: PulseLevel | null = room.pond.length ? "today" : null;
  type Orb = { id: string; name: string; sub: string; level: PulseLevel | null };
  const orbs: Orb[] = [
    ...lines.map((a) => ({ id: a.id, name: a.name, sub: a.waiting ? `${a.waiting} waiting` : a.leads ? leads(a.leads) : "none", level: agentLevel(a) })),
    { id: POOL, name: "Lead pool", sub: room.pond.length ? leads(room.pond.length) : "empty", level: poolLevel },
  ];
  const sel = orbs.find((o) => o.id === pick) ?? null;
  const round = orbs.filter((o) => o !== sel);
  const m = round.length + (sel ? 1 : 0);
  const r = Math.max(32, Math.min(60, 520 / Math.max(m, 6)));
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const homeSeat = sel ? seatAt(0) : null;
  const placed = round.map((o, k) => ({ o, ...seatAt(k + (sel ? 1 : 0)) }));
  const coreLevel: PulseLevel = t.late ? "now" : t.waiting || t.pond ? "today" : "good";
  const stroke = (l: PulseLevel | null) => (l ? PULSE_COLOR[l] : DIM);

  const open = (id: string | null) => {
    setPick(id);
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

  const selLeads: WarLead[] = !sel ? [] : sel.id === POOL ? room.pond : room.leads.filter((l) => l.assignedTo === sel.id);
  const selLine = sel && sel.id !== POOL ? lines.find((a) => a.id === sel.id) ?? null : null;
  const waitingAll = room.leads.filter((l) => !l.contacted).sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt));

  const leadRow = (l: WarLead, showAgent: boolean) => {
    const lv = leadLevel(l, now);
    const what = [l.source, l.area, l.interest].filter(Boolean).join(" · ");
    const speed = l.status === "pond" ? `In the pool ${minutesWords(waited(l, now))}` : l.contacted ? `Reached in ${minutesWords(l.minutes)}` : `Waiting ${minutesWords(waited(l, now))}`;
    return (
      <li key={l.id}>
        <i className="pm-dot" style={{ background: lv ? PULSE_COLOR[lv] : PULSE_COLOR.good }} aria-hidden="true" />
        <span className="pm-body">
          <b>{l.name}{showAgent && l.assignedName ? ` · ${l.assignedName}` : ""}</b>
          <small>{speed}{what ? ` · ${what}` : ""}</small>
        </span>
      </li>
    );
  };

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="wr-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Team war room">
            <defs>
              <radialGradient id="wr-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {placed.map(({ o, x, y }) => (
              <line key={`l-${o.id}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {homeSeat && <line className="vr-link" x1={C} y1={C} x2={homeSeat.x} y2={homeSeat.y} />}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${sel.name}: ${sel.sub}`}>
                {sel.level ? <PulseRing r={CORE} level={sel.level} x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#wr-glass)" stroke={stroke(sel.level)} strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{selLeads.length}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{sel.name.toUpperCase()}</text>
                <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">
                  {selLine ? (selLine.median != null ? `Median ${minutesWords(selLine.median)} to reach` : selLine.waiting ? `${selLine.waiting} waiting` : "No team leads") : sel.sub}
                </text>
              </g>
            ) : (
              <g aria-label={`${room.team.name}: ${warLine(t)}`}>
                <PulseRing r={CORE} level={coreLevel} x={C} y={C} />
                <circle cx={C} cy={C} r={CORE} fill="url(#wr-glass)" stroke={PULSE_COLOR[coreLevel]} strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{t.today}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">NEW TODAY</text>
                <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">{t.median != null ? `Median ${minutesWords(t.median)} to reach` : warLine(t)}</text>
              </g>
            )}

            {homeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Back to the whole team" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={homeSeat.x} cy={homeSeat.y} r={r} fill="url(#wr-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <text className="pm-mark" x={homeSeat.x} y={homeSeat.y} dy="0.36em" textAnchor="middle" fontSize={Math.max(13, r * 0.4)}>{t.today}</text>
                <text className="pm-name-l" x={homeSeat.x} y={homeSeat.y + r + 24} textAnchor="middle">Team</text>
              </g>
            )}

            {placed.map(({ o, x, y }) => (
              <g key={o.id} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${o.name}: ${o.sub}${o.level === "now" ? ", not reached in time" : ""}`} {...tap(() => open(o.id))}>
                {o.level ? <PulseRing r={r} level={o.level} x={x} y={y} /> : null}
                <circle className="pm-disc" cx={x} cy={y} r={r} fill="url(#wr-glass)" stroke={o.id === POOL ? GOLD : stroke(o.level)} strokeWidth={2.5} />
                <text className="pm-mark" x={x} y={y - 6} dy="0.36em" textAnchor="middle" fontSize={Math.max(14, r * 0.42)}>{o.id === POOL ? "◌" : initials(o.name)}</text>
                <text className="pm-time-l" x={x} y={y + r * 0.5} textAnchor="middle" fontSize={13}>{o.sub}</text>
                <text className="pm-name-l" x={x} y={y + r + 24} textAnchor="middle">{o.name}</text>
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="War room">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          <h1 className="d-title" id="wr-title">{sel ? sel.name : "War room"}</h1>
          {sel ? (
            <>
              <p className="d-sub">
                {sel.id === POOL
                  ? `${leads(room.pond.length)} waiting for an agent to claim`
                  : selLine
                    ? `${leads(selLine.leads)} in the last 7 days · ${selLine.reached} reached${selLine.median != null ? ` · median ${minutesWords(selLine.median)}` : ""}`
                    : ""}
              </p>
              {selLeads.length ? <ul className="pm-list pm-compact">{selLeads.map((l) => leadRow(l, false))}</ul> : <p className="d-sum">No team leads in the last 7 days.</p>}
              <div className="decide-btns">
                <a className="chip-btn primary" href={TEAM_LEADS_PAGE} target="_blank" rel="noreferrer">{sel.id === POOL ? "Assign in ONE MOVE" : "Reassign in ONE MOVE"}</a>
                <button type="button" className="chip-btn" onClick={() => open(null)}>The whole team</button>
              </div>
            </>
          ) : (
            <>
              <p className="d-sub">{room.team.name} · {warLine(t)}</p>
              <ul className="wr-totals" aria-label="Last 7 days">
                <li><b>{t.today}</b> new today</li>
                <li><b style={{ color: t.late ? PULSE_COLOR.now : undefined }}>{t.late}</b> past {SLOW_MINUTES} min</li>
                <li><b>{t.waiting}</b> waiting</li>
                <li><b>{t.pond}</b> in the pool</li>
                <li><b>{t.median != null ? minutesWords(t.median) : "–"}</b> median to reach</li>
              </ul>
              {waitingAll.length ? (
                <>
                  <h2 className="wr-h">Waiting to be reached</h2>
                  <ul className="pm-list pm-compact">{waitingAll.map((l) => leadRow(l, true))}</ul>
                </>
              ) : null}
              <h2 className="wr-h">Agents</h2>
              <ol className="pm-list pm-compact">
                {lines.map((a) => (
                  <li key={a.id}>
                    <i className="pm-dot" style={{ background: stroke(agentLevel(a)) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{a.name}: {leads(a.leads)}</b>
                      <small>{a.leads ? `${a.reached} reached${a.median != null ? ` · median ${minutesWords(a.median)}` : ""}${a.waiting ? ` · ${a.waiting} waiting` : ""}` : "No team leads this week"}</small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => open(a.id)} aria-label={`Open ${a.name}`}>→</button>
                    </span>
                  </li>
                ))}
              </ol>
              {room.log.length ? (
                <>
                  <h2 className="wr-h">Latest moves</h2>
                  <ul className="wr-log">
                    {room.log.slice(0, 10).map((l) => (
                      <li key={l.id}>
                        <time dateTime={l.at}>{new Date(l.at).toLocaleTimeString("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit" })}</time> {l.words}
                        {l.from ? ` from ${l.from}` : ""}{l.to ? ` to ${l.to}` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <div className="decide-btns">
                <a className="chip-btn primary" href={TEAM_LEADS_PAGE} target="_blank" rel="noreferrer">Team leads in ONE MOVE</a>
              </div>
            </>
          )}
          <p className="pm-promise">{demo ? "Example team. " : ""}Team leads only, never an agent's own leads. Seen by the team lead and admins. Nothing is sent to a lead from here.</p>
        </aside>
      </div>
    </div>
  );
}
