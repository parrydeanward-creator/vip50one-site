"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ContactPanel from "./ContactPanel.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { LOGGABLE, SHORT, audit, gridRows, hasTouch, logQuestion, pct, type TouchStat } from "@/lib/audit.ts";
import { touchUrl } from "@/lib/contact.ts";
import { faceUrl, initialsOf, readRoster, ringRows, shortName, vipsUrl, type VipPerson, type VipRoster } from "@/lib/vips.ts";

// VIP-SUMMARY §3f: Touch Audit drawn in ONE Brain, the ring of touches.
// This month's coverage fills the core; the five monthly touches are orbs
// round it, each filling with the share of the VIP-50 who have it; the three
// quarterly touches sit outside. Click a touch and the faces still missing it
// gather round it; click a face to call, text or log that touch.

const SIZE = 1200;
const C = SIZE / 2;
const CORE = 112;
const GOLD = "#f5c542";
const TEAL = "#2fb7a3";
const MONTH_R = 290;
const QUARTER_R = 470;
const FOCUS_R = 520;

export default function TouchAudit({
  onUnavailable,
  onChanged,
  onBack,
  onClassic,
}: {
  onUnavailable: () => void;
  onChanged: () => void;
  onBack: () => void;
  onClassic: () => void;
}) {
  const [roster, setRoster] = useState<VipRoster | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [touch, setTouch] = useState<string | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const cam = useSvgCamera(SIZE);
  const [view, setView] = useState<"ring" | "grid">("ring");
  useEffect(() => {
    try {
      if (localStorage.getItem("one.audit.view") === "grid") setView("grid");
    } catch {}
  }, []);
  const pickView = (v: "ring" | "grid") => {
    setView(v);
    try {
      localStorage.setItem("one.audit.view", v);
    } catch {}
  };

  const load = useCallback(async () => {
    let r: Response;
    try {
      r = await fetch(vipsUrl, { credentials: "include", cache: "no-store" });
    } catch {
      return onUnavailable();
    }
    if (r.status === 404 || r.status === 405) return onUnavailable();
    if (!r.ok) return setErr(r.status === 401 ? "Sign in again to see your touches." : "ONE couldn't load your touches just now.");
    const ro = readRoster(await r.json().catch(() => null));
    if (!ro) return onUnavailable();
    setRoster(ro);
    setErr(null);
  }, [onUnavailable]);

  useEffect(() => {
    load();
  }, [load]);

  const a = useMemo(() => (roster ? audit(roster) : null), [roster]);
  const seats = useMemo(() => {
    if (!a) return new Map<string, { x: number; y: number; r: number }>();
    const m = new Map<string, { x: number; y: number; r: number }>();
    if (touch && a.touches.some((t) => t.key === touch)) {
      // Focus (Parry, 4 Oct): the tapped touch comes to the middle, the others wait on the outer ring.
      const others = a.touches.filter((t) => t.key !== touch);
      m.set(touch, { x: C, y: C, r: 108 });
      others.forEach((t, i) => {
        const ang = -Math.PI / 2 + (2 * Math.PI * (i + 0.5)) / others.length;
        m.set(t.key, { x: C + FOCUS_R * Math.cos(ang), y: C + FOCUS_R * Math.sin(ang), r: 38 });
      });
      return m;
    }
    const month = a.touches.filter((t) => t.kind === "month");
    const quarter = a.touches.filter((t) => t.kind === "quarter");
    month.forEach((t, i) => {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / month.length;
      m.set(t.key, { x: C + MONTH_R * Math.cos(ang), y: C + MONTH_R * Math.sin(ang), r: 64 });
    });
    quarter.forEach((t, i) => {
      const ang = -Math.PI / 2 + Math.PI / quarter.length + (2 * Math.PI * i) / quarter.length;
      m.set(t.key, { x: C + QUARTER_R * Math.cos(ang), y: C + QUARTER_R * Math.sin(ang), r: 46 });
    });
    return m;
  }, [a, touch]);

  const sel = a && touch ? a.touches.find((t) => t.key === touch) ?? null : null;
  const faces = useMemo(() => {
    if (!sel) return [];
    const s = seats.get(sel.key)!;
    return ringRows(sel.missing.map((p) => p.id), s.x, s.y, [s.r + 62, s.r + 118, s.r + 174, s.r + 230, s.r + 286], 22, 10);
  }, [sel, seats]);
  const byId = useMemo(() => new Map(roster?.vip50.map((p) => [p.id, p] as const) ?? []), [roster]);
  const who: VipPerson | undefined = person ? byId.get(person) : undefined;
  const rows = useMemo(() => (roster ? gridRows(roster) : []), [roster]);
  const whoHas = !!(who && sel && hasTouch(who, sel));

  // Grid: a tap on a person's empty touch asks to log it; anything else opens them.
  const tapCell = (p: VipPerson, key: string, done: boolean) => {
    setNote(null);
    setTouch(key);
    setPerson(p.id);
    setAsking(!done && !!LOGGABLE[key]);
  };
  const tapPerson = (p: VipPerson) => {
    const first = a?.touches.find((t) => !hasTouch(p, t)) ?? a?.touches[0];
    setNote(null);
    setAsking(false);
    setTouch(first?.key ?? null);
    setPerson(p.id);
  };

  const pickTouch = (key: string) => {
    setNote(null);
    setAsking(false);
    setPerson(null);
    setTouch((t) => (t === key ? null : key));
    cam.reset();
  };
  const back = () => {
    if (asking) return setAsking(false);
    if (person) return setPerson(null);
    if (touch) return setTouch(null);
    onBack();
  };

  const log = async () => {
    if (!sel || !who) return;
    setBusy(true);
    try {
      const r = await fetch(touchUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: who.id, kind: LOGGABLE[sel.key], detail: `${sel.label} logged from ONE Brain` }),
      });
      const body = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (r.status === 400 && !body.ok) throw new Error(`Logging a ${sel.label.toLowerCase()} from ONE Brain is coming soon. Use the Classic page for now.`);
      if (!r.ok || !body.ok) throw new Error(body.error || "That didn't save. Nothing was changed.");
      setNote(`Logged: ${sel.label.toLowerCase()} with ${shortName(who)}.`);
      setAsking(false);
      setPerson(null);
      await load();
      onChanged();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That didn't save. Nothing was changed.");
      setAsking(false);
    } finally {
      setBusy(false);
    }
  };

  if (err) {
    return (
      <div className="vr-msg" role="alert">
        <p>{err}</p>
        <button className="vr-btn" onClick={onClassic}>Open the Classic page</button>
      </div>
    );
  }
  if (!roster || !a) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening your touches…
      </div>
    );
  }

  const top = C + CORE - 2 * CORE * a.coverage;
  // A touch orb is drawn at radius 100 and moved/scaled into place, so it glides and grows when
  // tapped (to the middle) and shrinks back out to the ring (Parry, 4 Oct).
  const orb = (t: TouchStat) => {
    const s = seats.get(t.key)!;
    const k = s.r / 100;
    const share = t.total ? t.done / t.total : 0;
    const color = t.kind === "month" ? GOLD : TEAL;
    const on = touch === t.key;
    const ftop = 100 - 200 * share;
    const small = s.r < 50;
    return (
      <g
        key={t.key}
        data-tap
        className={`ta-orb fx-move${on ? " on" : ""}`}
        style={{ transform: `translate(${s.x}px, ${s.y}px) scale(${k})` }}
        role="button"
        tabIndex={0}
        aria-pressed={on}
        aria-label={on ? `${t.label}: back to all touches` : `${t.label}: ${t.done} of ${t.total} VIPs this ${t.kind === "month" ? "month" : "quarter"}`}
        onClick={() => pickTouch(t.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pickTouch(t.key);
          }
        }}
      >
        <circle r={170} fill={`url(#ta-glow-${t.kind})`} opacity={0.4 + 0.6 * share} />
        <circle r={100} fill="url(#ta-glass)" />
        <clipPath id={`ta-clip-${t.key}`}>
          <circle r={97} />
        </clipPath>
        <rect x={-100} y={ftop} width={200} height={100 - ftop} fill={`url(#ta-fill-${t.kind})`} clipPath={`url(#ta-clip-${t.key})`} className="dt-fill" />
        <circle r={100} fill="none" stroke={color} strokeWidth={(on ? 4 : 2.5) / Math.max(k, 0.4)} />
        <ellipse cy={-55} rx={50} ry={17} fill="#fff" fillOpacity={0.08} />
        <text className="ta-count" y={-2} textAnchor="middle" fontSize={42}>{`${t.done}/${t.total}`}</text>
        {small ? (
          <text className="ta-label" y={100 + 18 / k} textAnchor="middle" fontSize={12 / k}>{t.label.toUpperCase()}</text>
        ) : (
          <text className="ta-label" y={36} textAnchor="middle" fontSize={Math.max(11 / k, 20)}>{t.label.toUpperCase()}</text>
        )}
        {on && <text className="rx-back" y={62} textAnchor="middle" fontSize={12 / k}>tap for all touches</text>}
      </g>
    );
  };

  return (
    <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="vr-stage">
        <div className="ta-views" role="tablist" aria-label="Touch Audit view">
          <button role="tab" aria-selected={view === "ring"} className={view === "ring" ? "on" : ""} onClick={() => pickView("ring")}>Ring</button>
          <button role="tab" aria-selected={view === "grid"} className={view === "grid" ? "on" : ""} onClick={() => pickView("grid")}>Grid</button>
        </div>
        {view === "grid" ? (
          <div className="tg" data-tap>
            <div className="tg-tiles">
              <div className="tg-tile tg-gauge">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="50" className="tg-gauge-track" />
                  {a.coverage > 0 && <circle cx="60" cy="60" r="50" className="tg-gauge-fill" strokeDasharray={`${314.16 * a.coverage} 314.16`} transform="rotate(-90 60 60)" />}
                  <text x="60" y="60" dy="0.35em" textAnchor="middle" className="tg-gauge-n">{pct(a.coverage)}</text>
                </svg>
                <div className="tg-tile-l">This month</div>
              </div>
              <div className="tg-tile tg-good"><b>{a.fully}</b><span>Fully touched</span><i>all 5 monthly</i></div>
              <div className="tg-tile tg-mid"><b>{a.people - a.fully - a.untouched}</b><span>Partly touched</span><i>1 to 4 done</i></div>
              <div className="tg-tile tg-bad"><b>{a.untouched}</b><span>Not touched</span><i>none yet</i></div>
              <div className="tg-tile tg-q"><b>{rows.filter((r) => r.quarterDone === 3).length}</b><span>Quarter done</span><i>all 3 quarterly</i></div>
            </div>
            <div className="tg-table" role="table" aria-label="VIP-50 touches this month">
              <div className="tg-row tg-head" role="row">
                <div className="tg-who" role="columnheader">{`VIP-50 · ${a.people}`}</div>
                {a.touches.map((t, i) => (
                  <div key={t.key} role="columnheader" className={`tg-h tg-${t.kind}${i === 5 ? " tg-split" : ""}${touch === t.key ? " on" : ""}`}>
                    <button onClick={() => pickTouch(t.key)} title={`${t.label}: ${t.done} of ${t.total}`}>
                      <span>{SHORT[t.key] ?? t.label}</span>
                      <em>{`${t.done}/${t.total}`}</em>
                      <i style={{ width: `${t.total ? (100 * t.done) / t.total : 0}%` }} />
                    </button>
                  </div>
                ))}
              </div>
              {rows.map((r) => {
                const p = r.person;
                const pic = broken.has(p.id) ? null : faceUrl(p.photo);
                return (
                  <div key={p.id} role="row" className={`tg-row${person === p.id ? " on" : ""}${r.monthDone === 5 ? " full" : ""}`}>
                    <div className="tg-who" role="rowheader">
                      <button className="tg-person" onClick={() => tapPerson(p)}>
                        <span className={`tg-face${r.monthDone === 5 ? " full" : ""}`}>
                          {pic ? <img src={pic} alt="" onError={() => setBroken((b) => new Set(b).add(p.id))} /> : initialsOf(p.name)}
                        </span>
                        <span className="tg-name">{p.name}</span>
                        <span className="tg-pips" aria-label={`${r.monthDone} of 5 this month`}>
                          {[0, 1, 2, 3, 4].map((k) => <i key={k} className={k < r.monthDone ? "on" : ""} />)}
                        </span>
                      </button>
                    </div>
                    {r.cells.map((c, i) => {
                      const t = a.touches.find((x) => x.key === c.key)!;
                      return (
                        <div key={c.key} role="cell" className={`tg-c tg-${c.kind}${i === 5 ? " tg-split" : ""}${touch === c.key ? " col" : ""}`}>
                          <button
                            className={`tg-dot${c.done ? " done" : ""}`}
                            onClick={() => tapCell(p, c.key, c.done)}
                            aria-label={`${p.name}: ${t.label} ${c.done ? "done" : "not done yet"}`}
                            title={`${t.label}: ${c.done ? "done" : LOGGABLE[c.key] ? "tap to log" : "ticks when you send one"}`}
                          >
                            {c.done ? "✓" : LOGGABLE[c.key] ? "+" : ""}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
        <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="This month's VIP-50 touches">
          <defs>
            <radialGradient id="ta-glass" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#070b18" />
              <stop offset="0.7" stopColor="#0b1020" />
              <stop offset="1" stopColor="#2a2a3a" />
            </radialGradient>
            <linearGradient id="ta-fill-month" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe08a" />
              <stop offset="1" stopColor="#8a6514" />
            </linearGradient>
            <linearGradient id="ta-fill-quarter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8af0de" />
              <stop offset="1" stopColor="#1f6e65" />
            </linearGradient>
            <radialGradient id="ta-glow-month">
              <stop offset="0.5" stopColor={GOLD} stopOpacity="0.25" />
              <stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ta-glow-quarter">
              <stop offset="0.5" stopColor={TEAL} stopOpacity="0.2" />
              <stop offset="1" stopColor={TEAL} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ta-core-glow">
              <stop offset="0.5" stopColor="#ffd86a" stopOpacity="0.32" />
              <stop offset="1" stopColor="#ffd86a" stopOpacity="0" />
            </radialGradient>
            <clipPath id="ta-core-clip">
              <circle cx={C} cy={C} r={CORE - 3} />
            </clipPath>
          </defs>

          {sel ? (
            <circle key="focus-track" className="vr-track fx-fade" cx={C} cy={C} r={FOCUS_R} />
          ) : (
            <g key="ring" className="fx-fade">
          <circle className="vr-track" cx={C} cy={C} r={MONTH_R} />
          <circle className="vr-track vr-track-out" cx={C} cy={C} r={QUARTER_R} />
          {[...seats.entries()].map(([k, s]) => (
            <line key={`l-${k}`} className="vr-link" x1={C} y1={C} x2={s.x} y2={s.y} />
          ))}

          <circle cx={C} cy={C} r={CORE * 1.7} fill="url(#ta-core-glow)" opacity={0.35 + 0.65 * a.coverage} />
          <circle cx={C} cy={C} r={CORE} fill="url(#ta-glass)" />
          <g clipPath="url(#ta-core-clip)">
            <rect className="dt-fill" x={C - CORE} y={top} width={CORE * 2} height={C + CORE - top} fill="url(#ta-fill-month)" />
          </g>
          <circle cx={C} cy={C} r={CORE} fill="none" stroke="#ffd86a" strokeWidth={3} />
          <text className="dt-score" x={C} y={C - 2} textAnchor="middle">{pct(a.coverage)}</text>
          <text className="dt-score-sub" x={C} y={C + 30} textAnchor="middle">THIS MONTH</text>
            </g>
          )}

          {a.touches.map(orb)}

          {sel &&
            faces.map((f, idx) => {
              const p = byId.get(f.id)!;
              const pic = broken.has(f.id) ? null : faceUrl(p.photo);
              const picked = person === f.id;
              return (
                <g
                  key={`f-${sel.key}-${f.id}`}
                  data-tap
                  className={`ta-face fx-out${picked ? " on" : ""}`}
                  style={{ "--fx": `${C}px`, "--fy": `${C}px`, "--tx": `${f.x}px`, "--ty": `${f.y}px`, animationDelay: `${Math.min(idx, 60) * 14}ms` } as React.CSSProperties}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.name}, still needs ${sel.label.toLowerCase()}`}
                  onClick={() => {
                    setNote(null);
                    setAsking(false);
                    setPerson(f.id);
                  }}
                >
                  <title>{p.name}</title>
                  <circle cx={0} cy={0} r={f.r} fill="#121a36" stroke={picked ? "#fff" : GOLD} strokeWidth={picked ? 3 : 1.6} />
                  {pic ? (
                    <>
                      <clipPath id={`ta-fc-${f.id}`}>
                        <circle cx={0} cy={0} r={f.r - 1.5} />
                      </clipPath>
                      <image href={pic} x={-f.r} y={-f.r} width={f.r * 2} height={f.r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#ta-fc-${f.id})`} pointerEvents="none" onError={() => setBroken((b) => new Set(b).add(f.id))} />
                    </>
                  ) : (
                    <text className="vr-init vr-init-50" x={0} y={0} dy="0.35em" textAnchor="middle" fontSize={f.r * 0.7}>
                      {initialsOf(p.name)}
                    </text>
                  )}
                </g>
              );
            })}
        </svg>
        )}

        {note && (
          <div className="vr-bar pop" role="status">
            <span>{note}</span>
            <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
          </div>
        )}
        <div className="controls" role="toolbar" aria-label="Map controls">
          <button onClick={back} aria-label="Back">←</button>
          {view === "ring" && (
            <>
              <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
              <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
              <button onClick={cam.reset} aria-label="Centre on your touches">◎</button>
            </>
          )}
        </div>
      </div>

      <aside className="drawer vr-drawer" aria-label="Touch Audit">
        {who && sel ? (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: whoHas ? TEAL : GOLD, borderColor: whoHas ? TEAL : GOLD }}>
                {whoHas ? `${sel.label} done this ${sel.kind === "month" ? "month" : "quarter"}` : `Needs ${sel.label.toLowerCase()}`}
              </span>
            </div>
            <h1 className="d-title">{who.name}</h1>
            {LOGGABLE[sel.key] && !whoHas && (
              <div className="ta-log">
                {asking ? (
                  <>
                    <p className="d-sum">{logQuestion(sel.label, shortName(who))}</p>
                    <button className="chip-btn primary" onClick={log} disabled={busy}>{busy ? "Logging…" : "Yes, log it"}</button>
                    <button className="chip-btn" onClick={() => setAsking(false)} disabled={busy}>Cancel</button>
                  </>
                ) : (
                  <button className="chip-btn primary" onClick={() => setAsking(true)}>{`Log ${sel.label.toLowerCase()}`}</button>
                )}
              </div>
            )}
            {!LOGGABLE[sel.key] && !whoHas && <p className="d-sum">{`${sel.label} ticks by itself the week you send one.`}</p>}
            <ContactPanel key={who.id} contactId={who.id} onLogged={() => { load(); onChanged(); }} />
          </>
        ) : sel ? (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: sel.kind === "month" ? GOLD : TEAL, borderColor: sel.kind === "month" ? GOLD : TEAL }}>
                {sel.kind === "month" ? "Monthly touch" : "Quarterly touch"}
              </span>
            </div>
            <h1 className="d-title">{sel.label}</h1>
            <p className="d-sub">{`${sel.done} of ${sel.total} done · ${sel.missing.length} still to do`}</p>
            {sel.missing.length ? (
              <>
                <h2>Still to do</h2>
                <ul className="ta-list">
                  {sel.missing.map((p) => (
                    <li key={p.id}>
                      <button className="ta-name" onClick={() => setPerson(p.id)}>{p.name}</button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="d-sum">Every VIP-50 has this one. Well done.</p>
            )}
          </>
        ) : (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: TEAL, borderColor: TEAL }}>ONE MOVE</span>
            </div>
            <h1 className="d-title">Touch Audit</h1>
            <p className="d-sub">{`${pct(a.coverage)} of this month's touches done`}</p>
            <p className="d-sum">{`${a.fully} of ${a.people} VIP-50 fully touched. ${a.untouched} not touched yet this month.`}</p>
            <h2>This month</h2>
            <ul className="ta-list">
              {a.touches.filter((t) => t.kind === "month").map((t) => (
                <li key={t.key}>
                  <button className="ta-name" onClick={() => pickTouch(t.key)}>{t.label}</button>
                  <span>{`${t.done}/${t.total}`}</span>
                </li>
              ))}
            </ul>
            <h2>This quarter</h2>
            <ul className="ta-list">
              {a.touches.filter((t) => t.kind === "quarter").map((t) => (
                <li key={t.key}>
                  <button className="ta-name" onClick={() => pickTouch(t.key)}>{t.label}</button>
                  <span>{`${t.done}/${t.total}`}</span>
                </li>
              ))}
            </ul>
            <p className="d-sum">Click a touch to see who still needs it.</p>
            <button className="vr-classic" onClick={onClassic}>Past months on the Classic page</button>
          </>
        )}
      </aside>
    </div>
  );
}
