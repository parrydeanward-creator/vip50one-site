"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dailyLayout } from "@/lib/daily.ts";
import { localDay } from "@/lib/morning.ts";
import { asSections, dayName, readWeekly, tickable, weeklyFill, weeklyLine, weeklyUrl, withWeeklyTick, type WeeklyWeek } from "@/lib/weekly.ts";
import { useSvgCamera } from "./useSvgCamera.ts";

// VIP-SUMMARY §3g: the Weekly Tracker drawn in ONE Brain. The week's score
// (daily points + weekly bonus) is a gold core filling toward the 100-point
// minimum; the seven days sit inside the ring, each showing its points; the
// weekly boxes are an arc of orbs round it, lit when done. A tap ticks or
// unticks through ONE MOVE's own scoring. Custom activities are edited on
// the Classic page; "sent" boxes tick themselves the week one is sent.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 108;
const RING = 330;
const DAYS_R = 178;
const GOLD = "#f5c542";
const TEAL = "#2fb7a3";

export default function WeeklyTracker({
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
  const [day, setDay] = useState<WeeklyWeek | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const cam = useSvgCamera(SIZE);

  const load = useCallback(async () => {
    let r: Response;
    try {
      r = await fetch(weeklyUrl, { credentials: "include", cache: "no-store" });
    } catch {
      return onUnavailable(); // the route is not live yet: show Classic
    }
    if (r.status === 404 || r.status === 405) return onUnavailable();
    if (!r.ok) return setErr(r.status === 401 ? "Sign in again to see your week." : "ONE couldn't load your week just now.");
    const d = readWeekly(await r.json().catch(() => null));
    if (!d) return onUnavailable();
    setDay(d);
    setErr(null);
  }, [onUnavailable]);

  useEffect(() => {
    load();
  }, [load]);

  const sectionOf = useMemo(() => new Map(day?.sections.flatMap((s) => s.boxes.map((b) => [b.key, s.key] as const)) ?? []), [day]);
  const tick = async (key: string, done: boolean) => {
    if (!day || busy) return;
    if (!tickable(sectionOf.get(key) ?? "")) return setNote("Custom activities are edited on the Weekly Tracker page in ONE MOVE (Classic).");
    const before = day;
    setBusy(key);
    setNote(null);
    setDay(withWeeklyTick(day, key, done)); // the box lights at once; ONE MOVE's answer settles it
    try {
      const r = await fetch(weeklyUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, done }),
      });
      const body = await r.json().catch(() => null);
      const next = r.ok ? readWeekly(body) : null;
      if (!next) throw new Error((body as { error?: string } | null)?.error || "That didn't save. Nothing was changed.");
      setDay(next);
      onChanged();
    } catch (e) {
      setDay(before);
      setNote(e instanceof Error ? e.message : "That didn't save. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  };

  const layout = useMemo(() => (day ? dailyLayout(asSections(day), C, C, RING) : null), [day]);
  const boxes = useMemo(() => new Map(day?.sections.flatMap((s) => s.boxes.map((b) => [b.key, b] as const)) ?? []), [day]);

  if (err) {
    return (
      <div className="vr-msg" role="alert">
        <p>{err}</p>
        <button className="vr-btn" onClick={onClassic}>Open the Classic page</button>
      </div>
    );
  }
  if (!day || !layout) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening your week…
      </div>
    );
  }

  const fill = weeklyFill(day);
  const today = localDay(new Date());
  const top = C + CORE - 2 * CORE * fill;
  const hb = hover ? boxes.get(hover) : undefined;

  return (
    <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="vr-stage">
        <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="This week's tracker">
          <defs>
            <radialGradient id="dt-core-glow">
              <stop offset="0.5" stopColor="#ffd86a" stopOpacity="0.32" />
              <stop offset="1" stopColor="#ffd86a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="dt-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe08a" />
              <stop offset="0.5" stopColor="#e7b43a" />
              <stop offset="1" stopColor="#8a6514" />
            </linearGradient>
            <radialGradient id="dt-glass" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#070b18" />
              <stop offset="0.7" stopColor="#0b1020" />
              <stop offset="1" stopColor="#3a3013" />
            </radialGradient>
            <radialGradient id="dt-box-on" cx="50%" cy="45%" r="50%">
              <stop offset="0" stopColor="#3a2c0a" />
              <stop offset="0.6" stopColor="#6b4f14" />
              <stop offset="1" stopColor="#f5c542" />
            </radialGradient>
            <radialGradient id="dt-box-glow">
              <stop offset="0.45" stopColor={GOLD} stopOpacity="0.32" />
              <stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>
            <clipPath id="dt-core-clip">
              <circle cx={C} cy={C} r={CORE - 3} />
            </clipPath>
          </defs>

          <circle className="vr-track" cx={C} cy={C} r={RING} />
          {layout.seats.map((s) => (
            <line key={`l-${s.key}`} className="vr-link" x1={C} y1={C} x2={s.x} y2={s.y} />
          ))}

          {/* the score: a gold core filling from the bottom */}
          <circle cx={C} cy={C} r={CORE * 1.7} fill="url(#dt-core-glow)" opacity={0.35 + 0.65 * fill} />
          <circle cx={C} cy={C} r={CORE} fill="url(#dt-glass)" />
          <g clipPath="url(#dt-core-clip)">
            <rect className="dt-fill" x={C - CORE} y={top} width={CORE * 2} height={C + CORE - top} fill="url(#dt-fill)" />
            <ellipse cx={C} cy={top} rx={CORE} ry={7} fill="#fff3c4" opacity={fill > 0 && fill < 1 ? 0.5 : 0} />
          </g>
          <circle cx={C} cy={C} r={CORE} fill="none" stroke="#ffd86a" strokeWidth={3} />
          <ellipse cx={C} cy={C - CORE * 0.55} rx={CORE * 0.5} ry={CORE * 0.17} fill="#fff" fillOpacity={0.08} />
          <text className="dt-score" x={C} y={C - 2} textAnchor="middle">{`${day.score}/${day.minimum}`}</text>
          <text className="dt-score-sub" x={C} y={C + 30} textAnchor="middle">{day.met ? "MINIMUM MET" : "THIS WEEK"}</text>

          {/* the seven days, Monday to Sunday, in an arc under the score */}
          {day.days.map((d, i) => {
            const ang = Math.PI * (0.92 - (0.84 * i) / 6);
            const x = C + DAYS_R * Math.cos(ang);
            const y = C + DAYS_R * Math.sin(ang);
            const isToday = d.date === today;
            return (
              <g key={d.date} className={`wk-day${d.points > 0 ? " on" : ""}${isToday ? " today" : ""}`}>
                <title>{`${dayName(d.date)} ${d.date}: ${d.points} points`}</title>
                <circle cx={x} cy={y} r={24} fill={d.points > 0 ? "url(#dt-box-on)" : "url(#dt-glass)"} stroke={isToday ? "#fff" : d.points > 0 ? GOLD : "rgba(160,175,210,0.3)"} strokeWidth={isToday ? 2.5 : 1.5} />
                <text className="wk-day-n" x={x} y={y + 1} dy="0.35em" textAnchor="middle">{d.points}</text>
                <text className="wk-day-l" x={x} y={y + 40} textAnchor="middle">{dayName(d.date).toUpperCase()}</text>
              </g>
            );
          })}

          {layout.arcs.map((a) => (
            <text key={`a-${a.key}`} className="dt-sec" x={a.lx} y={a.ly} dy="0.35em" textAnchor={Math.abs(Math.cos(a.mid)) < 0.3 ? "middle" : Math.cos(a.mid) > 0 ? "start" : "end"}>
              {a.label.toUpperCase()}
            </text>
          ))}

          {layout.seats.map((s) => {
            const b = boxes.get(s.key)!;
            return (
              <g
                key={s.key}
                data-tap
                className={`dt-box${b.done ? " on" : ""}${busy === s.key ? " busy" : ""}`}
                role="checkbox"
                aria-checked={b.done}
                aria-label={`${b.label}, ${b.points} ${b.points === 1 ? "point" : "points"}`}
                tabIndex={0}
                onClick={() => tick(s.key, !b.done)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    tick(s.key, !b.done);
                  }
                }}
                onPointerEnter={() => setHover(s.key)}
                onPointerLeave={() => setHover((h) => (h === s.key ? null : h))}
              >
                <title>{`${b.label} · ${b.points} ${b.points === 1 ? "pt" : "pts"}${b.auto ? " · ticks itself when you send one" : ""}`}</title>
                {b.auto && <circle cx={s.x} cy={s.y} r={s.r + 6} fill="none" stroke={TEAL} strokeWidth={1.5} strokeDasharray="3 4" />}
                {b.done && <circle cx={s.x} cy={s.y} r={s.r * 1.8} fill="url(#dt-box-glow)" />}
                <circle className="dt-box-disc" cx={s.x} cy={s.y} r={s.r} fill={b.done ? "url(#dt-box-on)" : "url(#dt-glass)"} stroke={b.done ? GOLD : "rgba(160,175,210,0.35)"} strokeWidth={2} />
                <ellipse cx={s.x} cy={s.y - s.r * 0.5} rx={s.r * 0.55} ry={s.r * 0.22} fill="#fff" fillOpacity={0.07} />
                {b.done ? (
                  <path d={`M ${s.x - s.r * 0.35} ${s.y} l ${s.r * 0.25} ${s.r * 0.27} l ${s.r * 0.47} ${-s.r * 0.52}`} fill="none" stroke="#fff6d6" strokeWidth={Math.max(2, s.r * 0.13)} strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <text className="dt-pts" x={s.x} y={s.y} dy="0.35em" textAnchor="middle" fontSize={Math.max(9, s.r * 0.6)}>{b.points}</text>
                )}
              </g>
            );
          })}
        </svg>

        {(note || hb) && (
          <div className="vr-bar pop" role="status">
            {note ? (
              <>
                <span>{note}</span>
                <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
              </>
            ) : (
              <span>{`${hb!.label} · ${hb!.points} ${hb!.points === 1 ? "point" : "points"} · ${!tickable(sectionOf.get(hb!.key) ?? "") ? "edit on the Classic page" : hb!.auto ? `ticks itself when you send one, or tap to ${hb!.done ? "untick" : "tick"}` : `tap to ${hb!.done ? "untick" : "tick"}`}`}</span>
            )}
          </div>
        )}
        <div className="controls" role="toolbar" aria-label="Map controls">
          <button onClick={onBack} aria-label="Back">←</button>
          <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
          <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
          <button onClick={cam.reset} aria-label="Centre on this week">◎</button>
        </div>
      </div>

      <aside className="drawer vr-drawer" aria-label="Weekly Tracker">
        <div className="d-head">
          <span className="chip" style={{ color: TEAL, borderColor: TEAL }}>ONE MOVE</span>
        </div>
        <h1 className="d-title">Weekly Tracker</h1>
        <p className="d-sub">{weeklyLine(day)}</p>
        <p className="d-sum">{`${day.dailyPoints} from the Daily Tracker, ${day.bonusPoints} from weekly activities.`}</p>
        {day.sections.map((s) => {
          const got = s.boxes.filter((b) => b.done).reduce((n, b) => n + b.points, 0);
          const all = s.boxes.reduce((n, b) => n + b.points, 0);
          return (
            <section key={s.key} className="dt-list">
              <h2>
                {s.label} <span className="dt-list-pts">{`${got}/${all}`}</span>
              </h2>
              {s.boxes.map((b) => (
                <label key={b.key} className={`dt-row${b.done ? " on" : ""}`}>
                  <input type="checkbox" checked={b.done} disabled={busy !== null || !tickable(s.key)} onChange={() => tick(b.key, !b.done)} />
                  <span>{b.label}{b.auto && <em className="wk-auto"> · ticks itself when sent</em>}</span>
                  <small>{b.points === 1 ? "1 pt" : `${b.points} pts`}</small>
                </label>
              ))}
            </section>
          );
        })}
        <button className="vr-classic" onClick={onClassic}>Open the Classic page</button>
      </aside>
    </div>
  );
}
