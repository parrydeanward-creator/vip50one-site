"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import { TV_SECONDS, atMinimum, mostImproved, ranks, teamLine, type Mate, type Scope, type Team } from "@/lib/team.ts";

// The Team screen in ONE YOU (VIP-SUMMARY §3u). The week's leaderboard as a ring of agents round the week, the top
// three with gold, silver and bronze rings. Tap an agent and they come to the middle (Parry, 6 Oct, the rule for every
// orb); the middle brings the whole team back. Full screen is for the office TV: big type, no side panel, and every
// few seconds the next agent in rank order comes to the middle; any key or tap leaves it. Read only, nothing sent.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 330;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const MEDAL = ["#f5c542", "#c9d2e3", "#cd8a52"];
const DIM = "rgba(160,175,210,0.45)";
const initials = (n: string) => n.slice(0, 2).toUpperCase();
const weeks = (n: number) => `${n} ${n === 1 ? "week" : "weeks"}`;

export default function TeamView({ team, demo, scope, onScope, onClose }: { team: Team; demo: boolean; scope: Scope; onScope?: (s: Scope) => void; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<string | null>(null);
  const [tv, setTv] = useState(false);
  const tvRef = useRef(false);
  tvRef.current = tv;

  const rank = ranks(team);
  const agents = team.agents;
  const sel = agents.find((a) => a.id === pick) ?? null;
  const round = agents.filter((a) => a !== sel);
  const m = round.length + (sel ? 1 : 0);
  const r = Math.max(34, Math.min(62, 520 / Math.max(m, 6)));
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const homeSeat = sel ? seatAt(0) : null;
  const placed = round.map((a, k) => ({ a, ...seatAt(k + (sel ? 1 : 0)) }));
  const top = agents.slice(0, 3);
  const improved = mostImproved(team);
  const medal = (a: Mate) => {
    const n = rank.get(a.id) ?? 99;
    return n <= 3 ? MEDAL[n - 1] : null;
  };
  const ring = (a: Mate) => medal(a) ?? (a.score >= team.minimum ? GREEN : DIM);

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

  // Escape closes; on the TV any key leaves full screen first.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (tvRef.current) {
        e.stopPropagation();
        return leaveTv();
      }
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The office TV: the next agent in rank order every few seconds, round and round.
  useEffect(() => {
    if (!tv || !agents.length) return;
    let i = -1;
    const step = () => {
      i = (i + 1) % agents.length;
      setPick(agents[i].id);
    };
    step();
    const t = setInterval(step, TV_SECONDS * 1000);
    return () => clearInterval(t);
  }, [tv, agents]);

  // Leaving full screen by the browser's own way (Escape there) also leaves TV mode.
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && tvRef.current) setTv(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const goTv = async () => {
    setTv(true);
    try {
      await rootRef.current?.requestFullscreen?.();
    } catch {}
  };
  function leaveTv() {
    setTv(false);
    setPick(null);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  const middleWeek = (a: Mate) => (a.last4.length ? `Last weeks: ${a.last4.join(" · ")}` : "First week on the board");

  return (
    <div ref={rootRef} className={`pm-full pop${tv ? " tm-tv" : ""}`} role="dialog" aria-modal="true" aria-labelledby="tm-title" onClick={tv ? leaveTv : undefined}>
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Team leaderboard">
            <defs>
              <radialGradient id="tm-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {placed.map(({ a, x, y }) => (
              <line key={`l-${a.id}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {homeSeat && <line className="vr-link" x1={C} y1={C} x2={homeSeat.x} y2={homeSeat.y} />}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${sel.name}, number ${rank.get(sel.id)}, ${sel.score} this week`}>
                <circle cx={C} cy={C} r={CORE} fill="url(#tm-glass)" stroke={ring(sel)} strokeWidth={medal(sel) ? 6 : 3} />
                <text className="pm-mark" x={C} y={C - 46} dy="0.36em" textAnchor="middle" fontSize={30}>{`#${rank.get(sel.id)}`}</text>
                <text className="dt-score" x={C} y={C + 14} textAnchor="middle">{sel.score}</text>
                <text className="dt-score-sub" x={C} y={C + 44} textAnchor="middle">{(sel.me ? "YOU" : sel.name).toUpperCase()}</text>
                <text className="pm-core-end" x={C} y={C + 68} textAnchor="middle">{sel.streak ? `${weeks(sel.streak)} at ${team.minimum}` : sel.score >= team.minimum ? `At ${team.minimum}` : `${team.minimum - sel.score} to ${team.minimum}`}</text>
              </g>
            ) : (
              <g aria-label={`Team: ${teamLine(team)}`}>
                <circle cx={C} cy={C} r={CORE} fill="url(#tm-glass)" stroke="#ffd86a" strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{`${atMinimum(team)}/${agents.length}`}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{`AT ${team.minimum} THIS WEEK`}</text>
                {top[0] ? <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">{`Leading: ${top[0].me ? "you" : top[0].name}`}</text> : null}
              </g>
            )}

            {homeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Back to the whole team" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={homeSeat.x} cy={homeSeat.y} r={r} fill="url(#tm-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <text className="pm-mark" x={homeSeat.x} y={homeSeat.y} dy="0.36em" textAnchor="middle" fontSize={Math.max(13, r * 0.4)}>{`${atMinimum(team)}/${agents.length}`}</text>
                <text className="pm-name-l" x={homeSeat.x} y={homeSeat.y + r + 24} textAnchor="middle">Team</text>
              </g>
            )}

            {placed.map(({ a, x, y }) => (
              <g key={a.id} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${a.me ? "You" : a.name}: number ${rank.get(a.id)}, ${a.score} this week`} {...tap(() => open(a.id))}>
                <circle className="pm-disc" cx={x} cy={y} r={r} fill="url(#tm-glass)" stroke={ring(a)} strokeWidth={medal(a) ? 5 : 2.5} />
                <text className="pm-mark" x={x} y={y - 6} dy="0.36em" textAnchor="middle" fontSize={Math.max(14, r * 0.42)}>{initials(a.name)}</text>
                <text className="pm-time-l" x={x} y={y + r * 0.5} textAnchor="middle" fontSize={14}>{a.score}</text>
                <text className="pm-name-l" x={x} y={y + r + 24} textAnchor="middle">{`#${rank.get(a.id)} ${a.me ? "You" : a.name}`}</text>
              </g>
            ))}
          </svg>
          {tv ? (
            <div className="tm-tv-bar" aria-live="polite">
              <b>ONE · Team this week</b>
              {improved ? <span>Most improved: {improved.me ? "you" : improved.name}</span> : null}
              <span>Press any key to leave</span>
            </div>
          ) : (
            <div className="controls" role="toolbar" aria-label="Map controls">
              <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
              <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
              <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
              <button onClick={cam.reset} aria-label="Back to the middle">◎</button>
            </div>
          )}
        </div>

        {!tv && (
          <aside className="drawer vr-drawer pm-drawer" aria-label="Team">
            <div className="d-head">
              <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
            </div>
            <h1 className="d-title" id="tm-title">{sel ? (sel.me ? "You" : sel.name) : "Team"}</h1>
            {sel ? (
              <>
                <p className="d-sub">#{rank.get(sel.id)} of {agents.length} · {sel.score} this week{sel.tickedToday ? " · ticked today" : ""}</p>
                <p className="d-sum">{middleWeek(sel)}{sel.streak ? `. ${weeks(sel.streak)} in a row at ${team.minimum}.` : "."}</p>
                <button className="vr-classic" onClick={() => open(null)}>The whole team</button>
              </>
            ) : (
              <>
                <p className="d-sub">{teamLine(team)}</p>
                <div className="decide-btns">
                  <button type="button" className="chip-btn primary" onClick={goTv}>Show on the office TV</button>
                </div>
                {onScope ? (
                  <div className="decide-btns" role="group" aria-label="Who to show">
                    <button type="button" className={`chip-btn${scope === "all" ? " primary" : ""}`} aria-pressed={scope === "all"} onClick={() => onScope("all")}>All VIP-50 agents</button>
                    <button type="button" className={`chip-btn${scope === "office" ? " primary" : ""}`} aria-pressed={scope === "office"} onClick={() => onScope("office")}>My office</button>
                  </div>
                ) : null}
                <ol className="pm-list pm-compact tm-list">
                  {agents.map((a) => (
                    <li key={a.id} className={a.me ? "is-me" : undefined}>
                      <i className="pm-dot" style={{ background: ring(a) }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>{`#${rank.get(a.id)} ${a.me ? "You" : a.name}: ${a.score}`}</b>
                        <small>{a.streak ? `${weeks(a.streak)} at ${team.minimum}` : a.score >= team.minimum ? `At ${team.minimum}` : `${team.minimum - a.score} to ${team.minimum}`}</small>
                      </span>
                      <span className="pm-acts">
                        <button onClick={() => open(a.id)} aria-label={`Open ${a.me ? "you" : a.name}`}>→</button>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <p className="pm-promise">{demo ? "Example team. " : ""}Names, photos and weekly scores only, the same members who see each other on the ONE MOVE leaderboard.</p>
          </aside>
        )}
      </div>
    </div>
  );
}
