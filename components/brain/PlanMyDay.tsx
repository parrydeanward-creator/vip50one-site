"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PulseRing from "./PulseRing.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { PULSE_COLOR } from "./PulseRing.tsx";
import { clock, duration, type DayItem } from "@/lib/day.ts";
import { todayIn } from "@/lib/hwc.ts";
import { dropIndex, firstPlan, orbMark, placeAt, planKey, planSeats, planUrl, pointsLeft, poolSeats, putBody, readPlan, shift, suggest, timed, totalMinutes, PLAN_MAX, type Plan, type PlanItem } from "@/lib/plan.ts";

// Plan My Day (Parry, 5 Oct; VIP-SUMMARY §3l): plan on the desktop, do on the phone. Pulse lays
// out what is pulsing today; the agent orders it, cuts what will not happen and sends it to ONE GO.
// Until ONE MOVE's route answers, the plan is kept in this browser and the button says so.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 112;
const RING = 290;
const OUT = 420;
const PHONE = { x: 912, y: 92, r: 38 };
const GOLD = "#f5c542";

const NAMES: Record<string, string> = { go: "ONE GO", move: "ONE MOVE", marquee: "Marquee", open: "ONE Open", showly: "Showly", one: "ONE" };
const SENT_LIVE = "Sent. ONE GO opens to this list, in this order.";
const SAVED_HERE = "Saved on this computer. Your phone gets it as soon as ONE GO's update is live.";
const EXAMPLE = "Example agent: in your account this goes to ONE GO on your phone.";

function dot(p: PlanItem): string {
  if (p.special) return "pm-dot pm-special";
  return "pm-dot";
}
function dotColor(p: PlanItem): string | undefined {
  if (p.special) return undefined;
  return p.urgency === "alert" ? PULSE_COLOR.now : p.urgency === "today" ? PULSE_COLOR.today : "rgba(255,255,255,0.35)";
}
function why(p: PlanItem): string {
  return p.special ? "Special day · " : p.urgency === "alert" ? "Overdue · " : p.urgency === "today" ? "Today · " : "";
}

export default function PlanMyDay({
  today,
  week,
  live,
  onClose,
  onGo,
  onSaved,
  onTick,
}: {
  today: DayItem[];
  week?: { score: number; minimum: number };
  live: boolean;
  onClose: () => void;
  onGo: (nodeId: string) => void;
  onSaved: (plan: Plan) => void;
  onTick?: (ref: string, done: boolean) => void;
}) {
  const date = useMemo(() => todayIn(), []);
  const pool = useMemo(() => suggest(today), [today]);
  const [items, setItems] = useState<PlanItem[]>(() => firstPlan(pool));
  const [start, setStart] = useState("08:00");
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const cam = useSvgCamera(SIZE);
  const [pick, setPick] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ ref: string; from: "plan" | "pool"; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [flights, setFlights] = useState(0);

  // What the agent already planned today: ONE GO's copy first, else this browser's. Once, on
  // opening: the minute's fresh numbers must not undo the agent's edits.
  const poolRef = useRef(pool);
  useEffect(() => {
    const pool = poolRef.current;
    let gone = false;
    let local: Plan | null = null;
    try {
      local = readPlan(JSON.parse(localStorage.getItem(planKey(date)) ?? "null"), pool);
    } catch {}
    if (local && local.date === date) {
      setItems(local.items);
      setStart(local.start);
    }
    if (live) {
      fetch(planUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const p = readPlan(j, pool);
          if (gone || !p || p.date !== date || !p.sentAt) return;
          setItems(p.items);
          setStart(p.start);
          setSentAt(p.sentAt);
        })
        .catch(() => {});
    }
    return () => {
      gone = true;
    };
  }, [date, live]);

  // The dashboard re-renders while this is open (the clock, live signals): a new onClose each time must
  // not re-run this, or the cursor jumps to the close button mid-typing and the next key closes the view.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
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

  const inPlan = new Set(items.map((p) => p.ref));
  const rest = pool.filter((p) => !inPlan.has(p.ref));
  const slots = timed(items, start);
  const minutes = totalMinutes(items);
  const left = pointsLeft(week);
  const edit = (next: PlanItem[]) => {
    setItems(next);
    setNote(null);
  };

  const send = async () => {
    const plan: Plan = { date, sentAt: new Date().toISOString(), start, items };
    try {
      localStorage.setItem(planKey(date), JSON.stringify({ date, sent_at: plan.sentAt, start, items: putBody(plan).items.map((x, i) => ({ ...x, done: items[i].done })) }));
    } catch {}
    onSaved(plan);
    setFlights((n) => n + 1);
    if (!live) return setNote(EXAMPLE);
    setBusy(true);
    try {
      const r = await fetch(planUrl, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(putBody(plan)) });
      const j = await r.json().catch(() => null);
      const back = r.ok ? readPlan(j, pool) : null;
      if (back) {
        setSentAt(back.sentAt);
        onSaved(back);
        setNote(SENT_LIVE);
      } else if (r.status === 404 || r.status === 405) setNote(SAVED_HERE);
      else setNote((j as { error?: string } | null)?.error || "That didn't send. Your plan is kept on this computer.");
    } catch {
      // a route ONE MOVE hasn't shipped answers without CORS, so the fetch itself fails
      setNote(SAVED_HERE);
    } finally {
      setBusy(false);
    }
  };

  const seats = planSeats(items, C, C, RING);
  const outside = poolSeats(rest, C, C, OUT);
  const byRef = new Map([...items, ...pool].map((p) => [p.ref, p]));
  const timeOf = new Map(slots.map((x) => [x.ref, x]));
  const doneN = items.filter((p) => p.done).length;
  const fill = items.length ? doneN / items.length : 0;
  const top = C + CORE - 2 * CORE * fill;
  const lastEnd = slots.length ? clock(slots[slots.length - 1].end) : null;
  const focusRef = hover ?? pick;
  const focusItem = focusRef ? byRef.get(focusRef) : undefined;

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const m = cam.svgRef.current?.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };
  const grab = (e: React.PointerEvent, ref: string, from: "plan" | "pool") => {
    e.stopPropagation();
    const p = toSvg(e);
    cam.svgRef.current?.setPointerCapture?.(e.pointerId);
    setDrag({ ref, from, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false });
  };
  const add = (ref: string) => {
    const p = byRef.get(ref);
    if (p && items.length < PLAN_MAX && !inPlan.has(ref)) edit([...items, p]);
  };
  const remove = (ref: string) => {
    edit(items.filter((p) => p.ref !== ref));
    setPick((x) => (x === ref ? null : x));
  };
  const move = (ref: string, dir: -1 | 1) => edit(shift(items, items.findIndex((p) => p.ref === ref), dir));
  const drop = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) {
      if (d.from === "pool") add(d.ref);
      else setPick((x) => (x === d.ref ? null : d.ref));
      return;
    }
    const item = byRef.get(d.ref);
    if (!item) return;
    const dist = Math.hypot(d.x - C, d.y - C);
    const at = dropIndex(d.x, d.y, C, C, RING, items.length, CORE);
    if (at == null) {
      if (d.from === "plan" && dist > CORE) remove(d.ref); // dragged off the ring: off the plan
      return;
    }
    if (d.from === "pool" && items.length >= PLAN_MAX) return;
    edit(placeAt(items, item, at));
  };
  const svgHandlers = {
    ...cam.handlers,
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag) return cam.handlers.onPointerMove(e);
      const p = toSvg(e);
      setDrag((g) => g && { ...g, x: p.x, y: p.y, moved: g.moved || Math.hypot(p.x - g.sx, p.y - g.sy) > 8 });
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (drag) return drop();
      cam.handlers.onPointerUp?.(e);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      if (drag) return setDrag(null);
      cam.handlers.onPointerCancel?.(e);
    },
  };
  const overRing = drag?.moved ? (() => { const dd = Math.hypot(drag.x - C, drag.y - C); return dd > CORE && dd < RING * 1.22; })() : false;
  const offRing = drag?.moved && drag.from === "plan" && !overRing && Math.hypot(drag.x - C, drag.y - C) > CORE;

  const orb = (p: PlanItem, s: { x: number; y: number; r: number }, kind: "plan" | "pool") => {
    const lifted = drag?.moved && drag.ref === p.ref;
    const level = p.urgency === "alert" ? "now" : p.urgency === "today" ? "today" : null;
    const t = timeOf.get(p.ref);
    const name = p.title.replace(/[.].*$/, "");
    return (
      <g
        key={`${kind}-${p.ref}`}
        data-tap
        className={`pm-orb pm-${kind}${pick === p.ref ? " picked" : ""}${p.done ? " done" : ""}${lifted ? " lifted" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={kind === "pool" ? `Add to the plan: ${p.title}` : `${t ? clock(t.start) : ""} ${p.title}${p.done ? ", done" : ""}. Drag round the ring to move it, off the ring to take it off.`}
        onPointerDown={(e) => grab(e, p.ref, kind)}
        onPointerEnter={() => setHover(p.ref)}
        onPointerLeave={() => setHover((h) => (h === p.ref ? null : h))}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          if (kind === "pool") add(p.ref);
          else setPick((x) => (x === p.ref ? null : p.ref));
        }}
      >
        {p.special ? <circle className="pm-gold-glow" cx={s.x} cy={s.y} r={s.r * 1.9} fill="url(#pm-special)" /> : level && !p.done && kind === "plan" ? <PulseRing r={s.r} level={level} x={s.x} y={s.y} /> : null}
        <circle className="pm-disc" cx={s.x} cy={s.y} r={s.r} fill={p.done ? "url(#pm-on)" : kind === "pool" ? "url(#pm-glass-dim)" : "url(#pm-glass)"} stroke={p.done ? GOLD : p.special ? GOLD : level === "now" ? PULSE_COLOR.now : level === "today" ? PULSE_COLOR.today : "rgba(160,175,210,0.45)"} strokeWidth={kind === "pool" ? 1.5 : 2.5} />
        <ellipse cx={s.x} cy={s.y - s.r * 0.5} rx={s.r * 0.55} ry={s.r * 0.2} fill="#fff" fillOpacity={0.08} pointerEvents="none" />
        <text className="pm-mark" x={s.x} y={s.y} dy="0.36em" textAnchor="middle" fontSize={Math.max(11, s.r * 0.62)}>
          {p.done ? "✓" : orbMark(p)}
        </text>
        {kind === "pool" && (
          <g className="pm-plus" pointerEvents="none">
            <circle cx={s.x + s.r * 0.75} cy={s.y - s.r * 0.75} r={9} />
            <text x={s.x + s.r * 0.75} y={s.y - s.r * 0.75} dy="0.36em" textAnchor="middle">+</text>
          </g>
        )}
        {kind === "plan" && t && (() => {
          // labels outside the orb: time then name, stacked, leaning away from the centre
          const ux = (s.x - C) / RING, uy = (s.y - C) / RING;
          const lx = s.x + ux * (s.r + 16), ly = s.y + uy * (s.r + 16);
          const anchor = ux > 0.35 ? "start" : ux < -0.35 ? "end" : "middle";
          const y0 = uy < -0.35 ? ly - 18 : uy > 0.35 ? ly + 4 : ly - 7;
          return (
            <>
              <text className="pm-time-l" x={lx} y={y0} dy="0.35em" textAnchor={anchor}>{clock(t.start)}</text>
              <text className="pm-name-l" x={lx} y={y0 + 16} dy="0.35em" textAnchor={anchor}>{name.length > 22 ? `${name.slice(0, 21)}…` : name}</text>
            </>
          );
        })()}
      </g>
    );
  };

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="pm-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className={`vr-svg${drag?.moved ? " pm-dragging" : ""}`} viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...svgHandlers} role="group" aria-label="Your day, as a ring">
            <defs>
              <radialGradient id="pm-core-glow">
                <stop offset="0.5" stopColor="#ffd86a" stopOpacity="0.34" />
                <stop offset="1" stopColor="#ffd86a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="pm-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffe08a" />
                <stop offset="0.5" stopColor="#e7b43a" />
                <stop offset="1" stopColor="#8a6514" />
              </linearGradient>
              <radialGradient id="pm-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
              <radialGradient id="pm-glass-dim" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#070b18" />
                <stop offset="1" stopColor="#1a2238" />
              </radialGradient>
              <radialGradient id="pm-on" cx="50%" cy="45%" r="50%">
                <stop offset="0" stopColor="#3a2c0a" />
                <stop offset="0.6" stopColor="#6b4f14" />
                <stop offset="1" stopColor={GOLD} />
              </radialGradient>
              <radialGradient id="pm-special">
                <stop offset="0.4" stopColor={GOLD} stopOpacity="0.55" />
                <stop offset="1" stopColor={GOLD} stopOpacity="0" />
              </radialGradient>
              <clipPath id="pm-core-clip">
                <circle cx={C} cy={C} r={CORE - 3} />
              </clipPath>
            </defs>

            <circle className={`vr-track pm-ring${overRing ? " pm-ring-hot" : ""}`} cx={C} cy={C} r={RING} />
            <circle className="vr-track vr-track-out" cx={C} cy={C} r={OUT} />
            <text className="vr-ring-label pm-out-label" x={C} y={C + OUT + 34} textAnchor="middle">PULSE SUGGESTS · DRAG IN OR TAP +</text>
            {seats.map((s) => (
              <line key={`l-${s.ref}`} className="vr-link" x1={C} y1={C} x2={s.x} y2={s.y} />
            ))}
            {seats.length > 1 && (
              <path
                className="pm-path"
                d={seats.map((s, i) => `${i ? "L" : "M"} ${s.x} ${s.y}`).join(" ")}
              />
            )}

            {/* the phone: Send to my phone flies the plan here */}
            <line className="pm-phone-line" x1={C} y1={C} x2={PHONE.x} y2={PHONE.y} />
            <g className={`pm-phone${sentAt || flights ? " on" : ""}`}>
              <circle cx={PHONE.x} cy={PHONE.y} r={PHONE.r * 1.6} fill="url(#pm-core-glow)" />
              <circle cx={PHONE.x} cy={PHONE.y} r={PHONE.r} fill="url(#pm-glass)" stroke={GOLD} strokeWidth={2} />
              <rect x={PHONE.x - 9} y={PHONE.y - 16} width={18} height={30} rx={4} fill="none" stroke="#ffe9a8" strokeWidth={2} />
              <circle cx={PHONE.x} cy={PHONE.y + 9} r={1.8} fill="#ffe9a8" />
              <text className="pm-phone-label" x={PHONE.x} y={PHONE.y + PHONE.r + 22} textAnchor="middle">ONE GO</text>
            </g>
            {flights > 0 &&
              Array.from({ length: Math.min(items.length, 6) }, (_, k) => (
                <circle key={`f-${flights}-${k}`} r={7} fill="#ffe08a" className="pm-flight">
                  <animateMotion dur="0.9s" begin={`${k * 0.12}s`} fill="freeze" path={`M ${C} ${C} L ${PHONE.x} ${PHONE.y}`} />
                  <animate attributeName="opacity" values="0;1;1;0" dur="0.9s" begin={`${k * 0.12}s`} fill="freeze" />
                </circle>
              ))}

            {/* the core: your day, filling as it gets done */}
            <circle cx={C} cy={C} r={CORE * 1.75} fill="url(#pm-core-glow)" opacity={0.4 + 0.6 * fill} />
            <circle cx={C} cy={C} r={CORE} fill="url(#pm-glass)" />
            <g clipPath="url(#pm-core-clip)">
              <rect className="dt-fill" x={C - CORE} y={top} width={CORE * 2} height={C + CORE - top} fill="url(#pm-fill)" />
            </g>
            <circle cx={C} cy={C} r={CORE} fill="none" stroke="#ffd86a" strokeWidth={3} />
            <text className="dt-score" x={C} y={C - 6} textAnchor="middle">{items.length ? `${doneN}/${items.length}` : "0"}</text>
            <text className="dt-score-sub" x={C} y={C + 24} textAnchor="middle">YOUR DAY</text>
            {lastEnd && <text className="pm-core-end" x={C} y={C + 48} textAnchor="middle">{`done by ${lastEnd}`}</text>}

            {rest.map((p, i) => orb(p, outside[i], "pool"))}
            {items.map((p, i) => orb(p, seats[i], "plan"))}

            {drag?.moved && (() => {
              const p = byRef.get(drag.ref);
              return p ? (
                <g className={`pm-ghost${offRing ? " off" : ""}`} pointerEvents="none">
                  <circle cx={drag.x} cy={drag.y} r={28} />
                  <text x={drag.x} y={drag.y} dy="0.36em" textAnchor="middle">{offRing ? "×" : orbMark(p)}</text>
                </g>
              ) : null;
            })()}
          </svg>

          {(focusItem || note) && (
            <div className="vr-bar pop" role="status">
              {note ? (
                <>
                  <span>{note}</span>
                  <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
                </>
              ) : (
                <span>
                  {why(focusItem!)}
                  {focusItem!.title} · {NAMES[focusItem!.product] ?? focusItem!.product} · {duration(focusItem!.minutes)}
                  {inPlan.has(focusItem!.ref) ? "" : " · tap to add"}
                </span>
              )}
            </div>
          )}
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={cam.reset} aria-label="Centre on your day">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Plan my day">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          <h1 className="d-title" id="pm-title">Plan my day</h1>
          <p className="d-sub">
            {items.length} {items.length === 1 ? "thing" : "things"} · about {duration(minutes)}
            {lastEnd ? ` · done by ${lastEnd}` : ""}
          </p>
          <p className="d-sum">Drag the orbs round the ring into your order. Drag one off to take it off. Pull one in from Pulse suggests, then send it to your phone.</p>
          {left != null && <p className={`pi-today ${left > 0 ? "pi-lvl-today" : ""}`}>{left > 0 ? `${left} points still needed for 100 this week` : "100 points reached this week"}</p>}

          <label className="pm-start">
            Start at <input type="time" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
          </label>
          <button className="pi-btn pm-send" onClick={send} disabled={busy || !items.length}>
            {busy ? "Sending…" : sentAt ? "Send the changes to my phone" : "Send to my phone"}
          </button>

          <h2>Your plan</h2>
          {slots.length ? (
            <ol className="pm-list pm-compact">
              {slots.map((x, i) => (
                <li key={x.ref} className={`${x.done ? "is-done" : ""}${pick === x.ref ? " picked" : ""}`}>
                  <span className="pm-time">{clock(x.start)}</span>
                  <i className={dot(x)} style={{ background: dotColor(x) }} aria-hidden="true" />
                  <span className="pm-body">
                    <b>{x.title}</b>
                    <small>
                      {why(x)}
                      {NAMES[x.product] ?? x.product} · {duration(x.minutes)}
                      {x.at ? ` · fixed at ${clock(x.at)}` : ""}
                    </small>
                  </span>
                  <span className="pm-acts">
                    {sentAt || onTick ? (
                      <button
                        className={`pm-tick${x.done ? " on" : ""}`}
                        aria-pressed={x.done}
                        onClick={() => {
                          setItems((all) => all.map((p) => (p.ref === x.ref ? { ...p, done: !x.done } : p)));
                          onTick?.(x.ref, !x.done);
                        }}
                        aria-label={x.done ? `Done: ${x.title}. Tap to undo.` : `Mark done: ${x.title}`}
                      >
                        ✓
                      </button>
                    ) : null}
                    <button onClick={() => move(x.ref, -1)} disabled={i === 0} aria-label={`Move up: ${x.title}`}>↑</button>
                    <button onClick={() => move(x.ref, 1)} disabled={i === slots.length - 1} aria-label={`Move down: ${x.title}`}>↓</button>
                    {x.nodeId && <button onClick={() => onGo(x.nodeId!)} aria-label={`Show on the map: ${x.title}`}>→</button>}
                    <button onClick={() => remove(x.ref)} aria-label={`Take off the plan: ${x.title}`}>×</button>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="pm-empty">Nothing planned yet. Pull an orb in from Pulse suggests.</p>
          )}

          <h2>Pulse suggests</h2>
          {rest.length ? (
            <ul className="pm-list pm-compact pm-pool">
              {rest.map((x) => (
                <li key={x.ref}>
                  <i className={dot(x)} style={{ background: dotColor(x) }} aria-hidden="true" />
                  <span className="pm-body">
                    <b>{x.title}</b>
                    <small>
                      {why(x)}
                      {NAMES[x.product] ?? x.product} · {duration(x.minutes)}
                    </small>
                  </span>
                  <span className="pm-acts">
                    <button onClick={() => add(x.ref)} disabled={items.length >= PLAN_MAX} aria-label={`Add to the plan: ${x.title}`}>+</button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pm-empty">{pool.length ? "Everything Pulse found is on your plan." : "Nothing is pulsing today. A good day to call a VIP you haven't talked to in a while."}</p>
          )}
          <p className="pm-promise">Ticking a plan item is your check mark only. Nothing is texted, emailed or logged for you.</p>
        </aside>
      </div>
    </div>
  );
}
