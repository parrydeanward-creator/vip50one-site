"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dialable } from "@/lib/contact.ts";
import { CLASSES, CLASS_OF, hwcUrl, moveQuestion, noteDay, phoneLine, readHwc, withMoved, type Hwc, type HwcClass } from "@/lib/hwc.ts";
import { faceUrl, initialsOf, ringRows } from "@/lib/vips.ts";
import { useSvgCamera } from "./useSvgCamera.ts";

// VIP-SUMMARY §3h: Hot/Warm/Cold in ONE Brain. Three orbs with each class's
// people round them; an orb's ring lights once today's box for that class is
// ticked. Tap a face: the person, their last note, Call and Text (the phone
// opens and ONE MOVE ticks the day's box, as Classic and ONE GO do), and
// "Move to ..." which asks first.

const SIZE = 1700;
const ORB = 78;
const SEATS: Record<HwcClass, { x: number; y: number }> = {
  hot: { x: 850, y: 470 },
  warm: { x: 470, y: 1180 },
  cold: { x: 1230, y: 1180 },
};

export default function HotWarmCold({
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
  const [data, setData] = useState<Hwc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [only, setOnly] = useState<HwcClass | null>(null);
  const [asking, setAsking] = useState<HwcClass | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const cam = useSvgCamera(SIZE);

  const load = useCallback(async () => {
    let r: Response;
    try {
      r = await fetch(hwcUrl, { credentials: "include", cache: "no-store" });
    } catch {
      return onUnavailable();
    }
    if (r.status === 404 || r.status === 405) return onUnavailable();
    if (!r.ok) return setErr(r.status === 401 ? "Sign in again to see your Hot, Warm and Cold." : "ONE couldn't load Hot, Warm and Cold just now.");
    const d = readHwc(await r.json().catch(() => null));
    if (!d) return onUnavailable();
    setData(d);
    setErr(null);
  }, [onUnavailable]);

  useEffect(() => {
    load();
  }, [load]);

  const seats = useMemo(() => {
    if (!data) return [];
    return CLASSES.flatMap((c) => {
      const ids = data.people.filter((p) => p.cls === c.key).map((p) => p.id);
      const s = SEATS[c.key];
      return ringRows(ids, s.x, s.y, [ORB + 50, ORB + 92, ORB + 134, ORB + 176, ORB + 218, ORB + 260], 17, 6).map((x) => ({ ...x, cls: c.key }));
    });
  }, [data]);
  const byId = useMemo(() => new Map(data?.people.map((p) => [p.id, p] as const) ?? []), [data]);
  const who = pick ? byId.get(pick) : undefined;
  const first = who ? who.name.split(/\s+/)[0] : "";

  const post = async (path: string, body: unknown) => {
    const r = await fetch(`${hwcUrl}/${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    const next = r.ok ? readHwc(j) : null;
    if (!next) throw new Error((j as { error?: string } | null)?.error || "That didn't save. Nothing was changed.");
    return next;
  };

  const credit = (kind: "call" | "text") => {
    if (!who) return;
    // the phone opens straight away (the link); the day's box is ticked alongside
    post("credit", { id: who.id, kind })
      .then((next) => {
        setData(next);
        onChanged();
      })
      .catch(() => setNote("The call opened, but today's box didn't tick. Tick it on the Daily Tracker."));
  };

  const move = async (to: HwcClass) => {
    if (!who || !data || busy) return;
    setBusy(true);
    setNote(null);
    setData(withMoved(data, who.id, to));
    try {
      setData(await post("move", { id: who.id, class: to }));
      setNote(`${first} is ${CLASS_OF[to].label} now.`);
      onChanged();
    } catch (e) {
      await load();
      setNote(e instanceof Error ? e.message : "That didn't save. Nothing was changed.");
    } finally {
      setBusy(false);
      setAsking(null);
    }
  };

  const back = () => {
    if (asking) return setAsking(null);
    if (pick) return setPick(null);
    if (only) return setOnly(null);
    onBack();
  };

  if (err) {
    return (
      <div className="vr-msg" role="alert">
        <p>{err}</p>
        <button className="vr-btn" onClick={onClassic}>Open the Classic page</button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening Hot, Warm and Cold…
      </div>
    );
  }

  const tel = who ? dialable(who.phone) : null;
  const shownClass = who?.cls ?? only;

  return (
    <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="vr-stage">
        <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Hot, Warm and Cold">
          <defs>
            <radialGradient id="hw-glass" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#070b18" />
              <stop offset="0.7" stopColor="#0b1020" />
              <stop offset="1" stopColor="#2a2a3a" />
            </radialGradient>
            {CLASSES.map((c) => (
              <radialGradient key={c.key} id={`hw-glow-${c.key}`}>
                <stop offset="0.4" stopColor={c.color} stopOpacity="0.4" />
                <stop offset="1" stopColor={c.color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>
          <line className="vr-link" x1={SEATS.hot.x} y1={SEATS.hot.y} x2={SEATS.warm.x} y2={SEATS.warm.y} />
          <line className="vr-link" x1={SEATS.warm.x} y1={SEATS.warm.y} x2={SEATS.cold.x} y2={SEATS.cold.y} />
          <line className="vr-link" x1={SEATS.cold.x} y1={SEATS.cold.y} x2={SEATS.hot.x} y2={SEATS.hot.y} />

          {CLASSES.map((c) => {
            const s = SEATS[c.key];
            const n = data.people.filter((p) => p.cls === c.key).length;
            const lit = data.today[c.key];
            const dim = shownClass && shownClass !== c.key;
            return (
              <g
                key={c.key}
                data-tap
                className={`hw-orb${dim ? " dim" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={only === c.key}
                aria-label={`${c.label}: ${n} people${lit ? ", today's box ticked" : ""}`}
                onClick={() => {
                  setPick(null);
                  setAsking(null);
                  setOnly((o) => (o === c.key ? null : c.key));
                }}
              >
                <circle cx={s.x} cy={s.y} r={ORB * 2.1} fill={`url(#hw-glow-${c.key})`} opacity={lit ? 1 : 0.55} />
                <circle cx={s.x} cy={s.y} r={ORB} fill="url(#hw-glass)" stroke={c.color} strokeWidth={lit ? 5 : 2.5} />
                {lit && <circle cx={s.x} cy={s.y} r={ORB + 12} fill="none" stroke={c.color} strokeWidth={2} strokeDasharray="4 6" className="hw-lit" />}
                <text className="hw-n" x={s.x} y={s.y - 6} textAnchor="middle">{n}</text>
                <text className="hw-label" x={s.x} y={s.y + 26} textAnchor="middle" style={{ fill: c.color }}>{c.label.toUpperCase()}</text>
              </g>
            );
          })}

          {seats.map((f) => {
            const p = byId.get(f.id)!;
            const c = CLASS_OF[f.cls];
            const pic = broken.has(p.id) ? null : faceUrl(p.photo);
            const on = pick === p.id;
            const dim = shownClass && shownClass !== f.cls;
            return (
              <g
                key={p.id}
                data-tap
                className={`hw-face${dim ? " dim" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}, ${c.label}`}
                onClick={() => {
                  setNote(null);
                  setAsking(null);
                  setPick(on ? null : p.id);
                }}
              >
                <title>{p.name}</title>
                <circle cx={f.x} cy={f.y} r={f.r} fill="#121a36" stroke={on ? "#fff" : c.color} strokeWidth={on ? 3 : 1.6} />
                {pic ? (
                  <>
                    <clipPath id={`hw-fc-${p.id}`}>
                      <circle cx={f.x} cy={f.y} r={f.r - 1.5} />
                    </clipPath>
                    <image href={pic} x={f.x - f.r} y={f.y - f.r} width={f.r * 2} height={f.r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#hw-fc-${p.id})`} pointerEvents="none" onError={() => setBroken((b) => new Set(b).add(p.id))} />
                  </>
                ) : (
                  <text x={f.x} y={f.y} dy="0.35em" textAnchor="middle" style={{ fill: c.color, fontSize: f.r * 0.72, fontWeight: 700 }} pointerEvents="none">{initialsOf(p.name)}</text>
                )}
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
          <button onClick={back} aria-label="Back">←</button>
          <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
          <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
          <button onClick={cam.reset} aria-label="Centre on Hot, Warm and Cold">◎</button>
        </div>
      </div>

      <aside className="drawer vr-drawer" aria-label="Hot, Warm and Cold">
        {who ? (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: CLASS_OF[who.cls].color, borderColor: CLASS_OF[who.cls].color }}>{CLASS_OF[who.cls].label}</span>
            </div>
            <h1 className="d-title">{who.name}</h1>
            {who.phone && <p className="d-sub">{phoneLine(who.phone)}</p>}
            {who.lastNote && (
              <>
                <h2>Last note{noteDay(who.lastNoteAt) ? ` · ${noteDay(who.lastNoteAt)}` : ""}</h2>
                <p className="d-sum">{who.lastNote}</p>
              </>
            )}
            <div className="ta-log">
              {tel ? (
                <>
                  <a className="chip-btn primary" href={`tel:${tel}`} onClick={() => credit("call")}>Call</a>
                  <a className="chip-btn" href={`sms:${tel}`} onClick={() => credit("text")}>Text</a>
                </>
              ) : (
                <p className="d-sum">No phone number yet. Add one on the Classic page.</p>
              )}
            </div>
            {tel && <p className="d-sum rx-small">{`Call or Text ticks today's ${CLASS_OF[who.cls].box} box.`}</p>}
            <h2>Move</h2>
            {asking ? (
              <div className="ta-log">
                <p className="d-sum">{moveQuestion(first, asking)}</p>
                <button className="chip-btn primary" onClick={() => move(asking)} disabled={busy}>{busy ? "Moving…" : "Yes, move"}</button>
                <button className="chip-btn" onClick={() => setAsking(null)} disabled={busy}>Cancel</button>
              </div>
            ) : (
              <div className="ta-log">
                {CLASSES.filter((c) => c.key !== who.cls).map((c) => (
                  <button key={c.key} className="chip-btn" style={{ color: c.color, borderColor: c.color }} onClick={() => setAsking(c.key)}>{`To ${c.label}`}</button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: "#2fb7a3", borderColor: "#2fb7a3" }}>ONE MOVE</span>
            </div>
            <h1 className="d-title">{only ? CLASS_OF[only].label : "Hot / Warm / Cold"}</h1>
            <p className="d-sub">
              {CLASSES.map((c) => `${data.people.filter((p) => p.cls === c.key).length} ${c.label.toLowerCase()}`).join(" · ")}
            </p>
            <p className="d-sum">{`Today: ${CLASSES.filter((c) => data.today[c.key]).map((c) => c.label).join(", ") || "no"} box${CLASSES.filter((c) => data.today[c.key]).length === 1 ? "" : "es"} ticked. Call or text someone to tick theirs.`}</p>
            {CLASSES.filter((c) => !only || c.key === only).map((c) => {
              const list = data.people.filter((p) => p.cls === c.key);
              if (!list.length) return null;
              return (
                <section key={c.key}>
                  <h2 style={{ color: c.color }}>{`${c.label} · ${list.length}`}</h2>
                  <ul className="ta-list">
                    {list.slice(0, only ? list.length : 8).map((p) => (
                      <li key={p.id}>
                        <button className="ta-name" onClick={() => setPick(p.id)}>{p.name}</button>
                      </li>
                    ))}
                  </ul>
                  {!only && list.length > 8 && <button className="ta-name" onClick={() => setOnly(c.key)}>{`All ${list.length} ${c.label.toLowerCase()}…`}</button>}
                </section>
              );
            })}
            <button className="vr-classic" onClick={onClassic}>Add, notes and delete on the Classic page</button>
          </>
        )}
      </aside>
    </div>
  );
}
