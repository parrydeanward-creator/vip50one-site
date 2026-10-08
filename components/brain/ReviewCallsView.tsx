"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import { GUIDES, KINDS, callsUrl, clock, itemKey, readCalls, saveBody, saveUrl, stepDone, totalItems, type CallKind, type ReviewAgent, type SavedCall } from "@/lib/reviewCalls.ts";

// Review calls in ONE YOU (VIP-SUMMARY §3v): the call guide for the done-for-you add-ons, the same steps and the same
// saved record as Classic ONE MOVE's Coach > Review calls. The call in the middle, its steps round it; tap a step and it
// comes to the middle with its checklist, the line to say and any rule in the side panel (Parry, 6 Oct, the rule for
// every orb). A timer runs while the call is on. Admins only; nothing is sent to anyone.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 320;
const R = 58;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const DIM = "rgba(160,175,210,0.45)";
const KIND_WORD: Record<CallKind, string> = { site: "Website", soi: "SOI setup" };

export default function ReviewCallsView({ agents, demo, onClose, onSearch }: { agents: ReviewAgent[]; demo: boolean; onClose: () => void; onSearch?: (q: string) => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [agent, setAgent] = useState<ReviewAgent | null>(null);
  const [kind, setKind] = useState<CallKind>("site");
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [pick, setPick] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [past, setPast] = useState<SavedCall[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [q, setQ] = useState("");

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
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  useEffect(() => {
    if (!agent || demo) return setPast([]);
    fetch(callsUrl(agent.id), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPast((j && readCalls(j)) || []))
      .catch(() => {});
  }, [agent, demo]);

  const guide = GUIDES[kind];
  const n = guide.steps.length;
  const seats = guide.steps.map((_, s) => {
    const ang = (s / n) * Math.PI * 2;
    return { s, x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  });
  const done = [...ticks].length;
  const all = totalItems(kind);
  const secs = startedAt ? (now - startedAt) / 1000 : 0;
  const step = pick != null ? guide.steps[pick] : null;

  const reset = (k: CallKind) => {
    setKind(k);
    setTicks(new Set());
    setNotes({});
    setPick(null);
    setStartedAt(null);
    cam.reset();
  };
  const tickItem = (s: number, i: number) => {
    if (!startedAt) setStartedAt(Date.now());
    setTicks((t) => {
      const next = new Set(t);
      const k = itemKey(s, i);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };
  const openStep = (s: number | null, x?: number, y?: number) => {
    if (s == null || pick === s) {
      setPick(null);
      return cam.reset();
    }
    setPick(s);
    if (x != null && y != null) cam.centreOn(x, y);
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });
  const save = async () => {
    if (!agent) return;
    const body = saveBody(agent.id, kind, ticks, notes, secs);
    if (demo) {
      setPast((p) => [{ id: `local-${Date.now()}`, kind, at: new Date().toISOString(), durationSec: body.duration_sec, ticked: body.ticks.length, total: all, notes: {} }, ...p]);
      setNote("Example: in your account this is saved on the agent's record, the same as Classic ONE MOVE.");
      return reset(kind);
    }
    setBusy(true);
    try {
      const r = await fetch(saveUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; error?: string; call?: unknown } | null;
      if (r.ok && j?.ok) {
        const saved = readCalls({ calls: [j.call] });
        if (saved?.length) setPast((p) => [saved[0], ...p]);
        setNote("Saved on the agent's record. It shows in Classic ONE MOVE too.");
        reset(kind);
      } else if (r.status === 404 || r.status === 405) setNote("Review calls arrive in the new ONE with ONE MOVE's next update. Use Classic ONE MOVE for today's call. Nothing was saved.");
      else setNote(j?.error || "Could not save the call. Nothing was saved.");
    } catch {
      setNote("Could not save the call. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="rc-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label={guide.title}>
            <defs>
              <radialGradient id="rc-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ s, x, y }) => (
              <line key={`l-${s}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            <g data-tap className="pm-orb" role="button" tabIndex={0} aria-label={`${guide.title}: ${done} of ${all} ticked`} {...tap(() => openStep(null))}>
              <circle cx={C} cy={C} r={CORE} fill="url(#rc-glass)" stroke={done === all && all ? GREEN : "#ffd86a"} strokeWidth={3} />
              <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{`${done}/${all}`}</text>
              <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{KIND_WORD[kind].toUpperCase()} CALL</text>
              <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">{startedAt ? clock(secs) : agent ? agent.name : "Pick the agent"}</text>
            </g>
            {seats.map(({ s, x, y }) => {
              const st = guide.steps[s];
              const d = stepDone(kind, s, ticks);
              const full = d === st.items.length;
              return (
                <g key={s} data-tap className={`pm-orb pm-plan${pick === s ? " picked" : ""}`} role="button" tabIndex={0} aria-label={`Step ${s + 1}, ${st.t}: ${d} of ${st.items.length}`} {...tap(() => openStep(s, x, y))}>
                  <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#rc-glass)" stroke={full ? GREEN : d ? GOLD : DIM} strokeWidth={pick === s ? 4 : 2.5} />
                  <text className="pm-mark" x={x} y={y - 8} dy="0.36em" textAnchor="middle" fontSize={26}>{s + 1}</text>
                  <text className="pm-time-l" x={x} y={y + 22} textAnchor="middle" fontSize={13}>{`${d}/${st.items.length}`}</text>
                  <text className="pm-name-l" x={x} y={y + R + 24} textAnchor="middle">{st.t.length > 24 ? `${st.t.slice(0, 23)}…` : st.t}</text>
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
            <button onClick={cam.reset} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Review call">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>Admins</span>
            {startedAt ? <span className="chip">{clock(secs)}</span> : null}
          </div>
          {!agent ? (
            <>
              <h1 className="d-title" id="rc-title">Review calls</h1>
              <p className="d-sub">Pick the agent for this call</p>
              <input
                className="rx-search"
                type="search"
                placeholder="Search agents by name or email"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  onSearch?.(e.target.value);
                }}
                aria-label="Search agents"
              />
              <ul className="pm-list pm-compact">
                {agents.map((a) => (
                  <li key={a.id}>
                    <i className="pm-dot" style={{ background: a.addons.length ? GOLD : DIM }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{a.name}</b>
                      <small>{a.addons.length ? a.addons.map((x) => x.replace(/_/g, " ")).join(", ") : "No done-for-you purchase"}</small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => { setAgent(a); reset(a.addons.includes("soi_setup") && !a.addons.includes("site_build") ? "soi" : "site"); }} aria-label={`Start a call with ${a.name}`}>→</button>
                    </span>
                  </li>
                ))}
                {!agents.length && <li><span className="pm-body"><small>{q ? "No agents found." : "The agent list arrives with ONE MOVE's next update. For a call today, use Coach > Review calls in the ONE MOVE menu."}</small></span></li>}
              </ul>
            </>
          ) : step && pick != null ? (
            <>
              <h1 className="d-title" id="rc-title">{`${pick + 1}. ${step.t}`}</h1>
              <p className="d-sub">{step.min}</p>
              {step.say ? <p className="rc-say">“{step.say}”</p> : null}
              <ul className="pm-list pm-compact">
                {step.items.map((item, i) => {
                  const on = ticks.has(itemKey(pick, i));
                  return (
                    <li key={i} className={on ? "is-done" : ""}>
                      <i className="pm-dot" style={{ background: on ? GREEN : DIM }} aria-hidden="true" />
                      <span className="pm-body"><b>{item}</b></span>
                      <span className="pm-acts">
                        <button onClick={() => tickItem(pick, i)} aria-pressed={on} aria-label={on ? `Untick: ${item}` : `Tick: ${item}`}>{on ? "✓" : "○"}</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {step.rule ? <p className="rc-rule">{step.rule}</p> : null}
              <label className="pf-field">
                <span>Notes for this step</span>
                <textarea rows={3} value={notes[pick] ?? ""} onChange={(e) => setNotes((x) => ({ ...x, [pick]: e.target.value }))} />
              </label>
              <div className="decide-btns">
                {pick < n - 1 ? <button type="button" className="chip-btn primary" onClick={() => openStep(pick + 1, seats[pick + 1].x, seats[pick + 1].y)}>Next step</button> : <button type="button" className="chip-btn primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save the call"}</button>}
              </div>
              <button className="vr-classic" onClick={() => openStep(null)}>The whole call</button>
            </>
          ) : (
            <>
              <h1 className="d-title" id="rc-title">{agent.name}</h1>
              <p className="d-sub">{`${guide.title} · ${done} of ${all} ticked`}</p>
              <div className="decide-btns" role="group" aria-label="Which call">
                {KINDS.map((k) => (
                  <button key={k} type="button" className={`chip-btn${kind === k ? " primary" : ""}`} aria-pressed={kind === k} onClick={() => reset(k)}>{KIND_WORD[k]}</button>
                ))}
              </div>
              <ol className="pm-list pm-compact">
                {guide.steps.map((st, s) => (
                  <li key={s}>
                    <i className="pm-dot" style={{ background: stepDone(kind, s, ticks) === st.items.length ? GREEN : stepDone(kind, s, ticks) ? GOLD : DIM }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{`${s + 1}. ${st.t}`}</b>
                      <small>{`${st.min} · ${stepDone(kind, s, ticks)} of ${st.items.length}`}</small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => openStep(s, seats[s].x, seats[s].y)} aria-label={`Open step ${s + 1}`}>→</button>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="decide-btns">
                <button type="button" className="chip-btn primary" onClick={() => openStep(0, seats[0].x, seats[0].y)}>{startedAt ? "Carry on" : "Start the call"}</button>
                <button type="button" className="chip-btn" disabled={busy || !done} onClick={save}>Save the call</button>
              </div>
              {past.length ? (
                <>
                  <h2>Past calls</h2>
                  <ul className="pm-list pm-compact">
                    {past.map((c) => (
                      <li key={c.id}>
                        <i className="pm-dot" style={{ background: c.ticked === c.total ? GREEN : GOLD }} aria-hidden="true" />
                        <span className="pm-body">
                          <b>{`${KIND_WORD[c.kind]} call · ${c.at.slice(0, 10)}`}</b>
                          <small>{`${c.ticked} of ${c.total} ticked${c.durationSec ? ` · ${clock(c.durationSec)}` : ""}`}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <button className="vr-classic" onClick={() => { setAgent(null); reset("site"); }}>Pick another agent</button>
            </>
          )}
          <p className="pm-promise">{demo ? "Example agents. " : ""}Admins only. The same guide and record as Classic ONE MOVE's Review calls. Nothing is sent to anyone.</p>
        </aside>
      </div>
    </div>
  );
}
