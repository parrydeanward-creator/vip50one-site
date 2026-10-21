"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import PulseRing, { PULSE_COLOR } from "./PulseRing.tsx";
import { agentName, helpAgents, inactiveAgents, nudgeNote, officeAgents, topOffice, type Broker, type BrokerAgent, type BrokerOffice } from "@/lib/broker.ts";
import { productLink } from "@/lib/productSignIn.ts";

// The broker's view (VIP-SUMMARY §3ao). The brokerage in the middle, its offices round it; tap an office and it comes
// to the middle with its agents round it (Parry, 6 Oct, the rule for every orb) and its side panel. The counts "quiet
// 14 days" and "need help" open the people behind them; every agent has a Nudge (copies a short note: ONE sends nothing)
// and every team opens its war room. Scores and counts only, never a contact, note, goal or commitment.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 320;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const DIM = "rgba(160,175,210,0.45)";
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const MAX_ORBS = 24;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Seat = { id: string; label: string; sub: string; mark: string; help: boolean; kind: "office" | "agent" };
type Mode = { office: string | null; list: "help" | "inactive" | null; agent: string | null };

function NudgeButton({ a }: { a: BrokerAgent }) {
  const [copied, setCopied] = useState(false);
  const note = nudgeNote(a.first);
  return (
    <button
      type="button"
      className="chip-btn primary"
      aria-label={`Nudge ${agentName(a)}`}
      title={note}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(note);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
    >
      {copied ? "Copied" : "Nudge"}
    </button>
  );
}

export default function BrokerView({ broker, demo, now, onClose }: { broker: Broker; demo: boolean; now: number; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mode, setMode] = useState<Mode>({ office: null, list: null, agent: null });
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

  const s = broker.summary;
  const office = broker.offices.find((o) => o.id === mode.office) ?? null;
  const agent = broker.agents.find((a) => a.id === mode.agent) ?? null;
  const quiet = inactiveAgents(broker, now);
  const help = helpAgents(broker);
  const listed = mode.list === "help" ? help : mode.list === "inactive" ? quiet : null;
  const scope = listed ?? (office ? officeAgents(broker, office.id) : null);
  const top = topOffice(broker);

  const go = (m: Partial<Mode>) => {
    setMode((p) => ({ ...p, ...m }));
    cam.reset();
  };
  const home = () => {
    setMode({ office: null, list: null, agent: null });
    cam.reset();
  };

  const toSeat = (a: BrokerAgent): Seat => ({ id: a.id, label: a.first, sub: `${a.score}`, mark: initials(agentName(a)), help: a.needsHelp, kind: "agent" });
  const officeSeat = (o: BrokerOffice): Seat => ({ id: o.id, label: o.name, sub: `${o.avgScore} avg`, mark: String(o.agents), help: false, kind: "office" });
  const all: Seat[] = scope ? scope.map(toSeat) : broker.offices.map(officeSeat);
  const seats = all.filter((x) => x.id !== agent?.id).slice(0, MAX_ORBS);
  const hidden = all.length - seats.length - (agent && all.some((x) => x.id === agent.id) ? 1 : 0);
  const m = seats.length + (agent || office ? 1 : 0);
  const r = Math.max(34, Math.min(66, 440 / Math.max(m, 5)));
  const at = (k: number, n: number) => {
    const ang = (k / Math.max(n, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const backSeat = agent || office ? at(0, m) : null;
  const placed = seats.map((x, k) => ({ x, p: at(k + (backSeat ? 1 : 0), m) }));
  const tap = (fn: () => void) => ({
    onClick: fn,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      fn();
    },
  });
  const pick = (x: Seat) => (x.kind === "office" ? go({ office: x.id, list: null, agent: null }) : go({ agent: x.id }));
  const back = () => (agent ? go({ agent: null }) : home());

  const row = (a: BrokerAgent) => (
    <li key={a.id}>
      <i className="pm-dot" style={{ background: a.needsHelp ? PULSE_COLOR.today : "rgba(255,255,255,0.35)" }} aria-hidden="true" />
      <span className="pm-body">
        <b>{agentName(a)}</b>
        <small>
          Score {a.score}
          {a.needsHelp ? " · needs a word" : ""}
          {a.lastActive ? ` · last in ${a.lastActive.slice(0, 10)}` : " · never signed in"}
        </small>
      </span>
      <span className="pm-acts">
        <NudgeButton a={a} />
        <button onClick={() => go({ agent: a.id })} aria-label={`Open ${agentName(a)}`}>→</button>
      </span>
    </li>
  );

  const centre = agent ? { mark: initials(agentName(agent)), top: agent.first.toUpperCase(), sub: `Score ${agent.score}` } : office ? { mark: String(office.agents), top: office.name.toUpperCase(), sub: `${office.avgScore} avg` } : { mark: `${broker.brokerage.seatsUsed}`, top: "SEATS USED", sub: `of ${broker.brokerage.seatsIncluded}` };
  const title = agent ? agentName(agent) : listed ? (mode.list === "help" ? "Agents who need a word" : "Quiet for 14 days") : office ? office.name : broker.brokerage.name;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="bk-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Your offices and agents">
            <defs>
              <radialGradient id="bk-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {placed.map(({ x, p }) => (
              <line key={`l-${x.id}`} className="vr-link" x1={C} y1={C} x2={p.x} y2={p.y} />
            ))}
            <g className="pm-orb picked" aria-label={`${title}, in the middle`}>
              <circle cx={C} cy={C} r={CORE} fill="url(#bk-glass)" stroke="#ffd86a" strokeWidth={3} />
              <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{centre.mark}</text>
              <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">{centre.top}</text>
              <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">{centre.sub}</text>
            </g>
            {backSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Back" {...tap(back)}>
                <circle className="pm-disc" cx={backSeat.x} cy={backSeat.y} r={r} fill="url(#bk-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <text className="pm-mark" x={backSeat.x} y={backSeat.y} dy="0.36em" textAnchor="middle" fontSize={Math.max(16, r * 0.5)}>←</text>
                <text className="pm-name-l" x={backSeat.x} y={backSeat.y + r + 24} textAnchor="middle">{agent ? (office?.name ?? "Back") : "All offices"}</text>
              </g>
            )}
            {placed.map(({ x, p }) => {
              const px = p.x, py = p.y;
              return (
                <g key={x.id} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${x.label}: ${x.sub}${x.help ? ", needs a word" : ""}`} {...tap(() => pick(x))}>
                  {x.help ? <PulseRing r={r} level="today" x={px} y={py} /> : null}
                  <circle className="pm-disc" cx={px} cy={py} r={r} fill="url(#bk-glass)" stroke={x.help ? PULSE_COLOR.today : x.kind === "office" && x.id === top?.id ? GOLD : x.kind === "agent" ? GREEN : DIM} strokeWidth={2.5} />
                  <text className="pm-mark" x={px} y={py} dy="0.36em" textAnchor="middle" fontSize={Math.max(14, r * 0.5)}>{x.mark}</text>
                  <text className="pm-name-l" x={px} y={py + r + 24} textAnchor="middle">{x.label}</text>
                  <text className="pm-time-l" x={px} y={py + r + 42} textAnchor="middle">{x.sub}</text>
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="Broker">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE MOVE</span>
          </div>
          <h1 className="d-title" id="bk-title">{title}</h1>
          {agent ? (
            <>
              <p className="d-sub">{office ? `${office.name} · ` : ""}Score {agent.score}{agent.needsHelp ? " · needs a word" : ""}</p>
              <dl className="th-figs">
                <div><dt>This week</dt><dd>{agent.score}</dd></div>
                {agent.last4.length ? <div><dt>Last {agent.last4.length} weeks</dt><dd>{agent.last4.join(" · ")}</dd></div> : null}
                <div><dt>Last in</dt><dd>{agent.lastActive ? agent.lastActive.slice(0, 10) : "Never"}</dd></div>
              </dl>
              <div className="decide-btns">
                <NudgeButton a={agent} />
              </div>
              <p className="ta-note">{nudgeNote(agent.first)}</p>
              <p className="pf-sub">ONE sends nothing. Paste it into your own messages, or don&apos;t.</p>
              <button className="vr-classic" onClick={back}>{office ? `Back to ${office.name}` : "Back"}</button>
            </>
          ) : (
            <>
              <p className="d-sub">
                {listed ? plural(listed.length, "agent", "agents") : office ? `${plural(office.agents, "agent", "agents")} · ${office.active7d} active this week · average ${office.avgScore}` : `${plural(broker.offices.length, "office", "offices")} · ${s.active7d} active in 7 days`}
              </p>
              {!office && !listed ? (
                <>
                  <p className="d-sum">
                    Seats: <b>{broker.brokerage.seatsUsed}</b> of {broker.brokerage.seatsIncluded} used.
                    {top ? ` ${top.name} leads the week (average ${top.avgScore}).` : ""}
                  </p>
                  <div className="decide-btns">
                    <button type="button" className="chip-btn" onClick={() => go({ list: "inactive" })} disabled={!s.inactive14d && !quiet.length}>
                      {s.inactive14d} quiet 14 days
                    </button>
                    <button type="button" className="chip-btn primary" onClick={() => go({ list: "help" })} disabled={!s.needsHelp && !help.length}>
                      {s.needsHelp} {s.needsHelp === 1 ? "needs" : "need"} a word
                    </button>
                  </div>
                  <ul className="pm-list pm-compact">
                    {broker.offices.map((o) => (
                      <li key={o.id}>
                        <i className="pm-dot" style={{ background: o.id === top?.id ? GOLD : "rgba(255,255,255,0.35)" }} aria-hidden="true" />
                        <span className="pm-body">
                          <b>{o.name}</b>
                          <small>{plural(o.agents, "agent", "agents")} · {o.active7d} active · average {o.avgScore}</small>
                        </span>
                        <span className="pm-acts">
                          <button onClick={() => go({ office: o.id })} aria-label={`Open ${o.name}`}>→</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {office && !listed ? (
                <>
                  {office.teams.length ? (
                    <section aria-label="Teams">
                      <h2>Teams</h2>
                      <ul className="pm-list pm-compact">
                        {office.teams.map((t) => (
                          <li key={t.id}>
                            <i className="pm-dot" style={{ background: GREEN }} aria-hidden="true" />
                            <span className="pm-body">
                              <b>{t.name}</b>
                              <small>{plural(t.agents, "agent", "agents")} · average {t.avgScore}</small>
                            </span>
                            {t.warRoomUrl ? (
                              <span className="pm-acts">
                                <a className="chip-btn" href={productLink(t.warRoomUrl)} target="_blank" rel="noopener noreferrer" aria-label={`Open the ${t.name} war room`}>War room</a>
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  <h2>Agents</h2>
                </>
              ) : null}
              {scope ? (
                scope.length ? (
                  <ul className="pm-list pm-compact">{scope.map(row)}</ul>
                ) : (
                  <p className="pm-empty">{listed ? "No one on this list." : "No agents in this office yet."}</p>
                )
              ) : null}
              {hidden > 0 ? <p className="pf-sub">{hidden} more in the list; the map shows the first {MAX_ORBS}.</p> : null}
              {office || listed ? <button className="vr-classic" onClick={home}>All offices</button> : null}
            </>
          )}
          <p className="pm-promise">
            {demo ? "Example brokerage. " : ""}Scores and counts only: never a contact, a note, a goal or a commitment. Read only; the Nudge copies a note and sends nothing.
          </p>
        </aside>
      </div>
    </div>
  );
}
