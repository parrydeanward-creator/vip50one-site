"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dialable } from "@/lib/contact.ts";
import { CLASSES, CLASS_OF, addBody, addProblem, blankPerson, hwcUrl, readMatches, type NewPerson, moveQuestion, noteDay, phoneLine, readHwc, reminderLine, shortDay, todayIn, trend, warmth, withMoved, type Hwc, type HwcClass } from "@/lib/hwc.ts";
import { faceUrl, initialsOf, ringRows } from "@/lib/vips.ts";
import PulseMark from "./PulseMark.tsx";
import { focusFace, focusRings } from "@/lib/orbs.ts";
import { useSvgCamera } from "./useSvgCamera.ts";

// VIP-SUMMARY §3h: Hot/Warm/Cold in ONE Brain. Three live orbs with each
// class's people round them; an orb's ring lights once today's box for that
// class is ticked. Pulse (§3h.6-8) keeps the agent on top of every person:
// faces cool as days pass without a touch and frost once overdue, a gold
// heartbeat marks Pulse's three for today, embers rise behind anyone who just
// moved up. The drawer opens on Pulse's due list; a person's card has notes,
// "Remind me on...", Ask Pulse, Call and Text (the phone opens and ONE MOVE
// ticks the day's box) and "Move to ..." which asks first. Nothing is sent
// for the agent: Pulse's draft only fills their own Text button.

const SIZE = 1700;
const ORB = 138;
const FOCUS = 190;
const C = 850;
const GOLD = "#f5c542";
const SEATS: Record<HwcClass, { x: number; y: number }> = {
  hot: { x: 850, y: 470 },
  warm: { x: 470, y: 1180 },
  cold: { x: 1230, y: 1180 },
};

const NOT_YET = "This arrives with ONE MOVE's next update. Nothing was changed; Classic has notes for now.";
const NOT_YET_ADD = "Adding here arrives with ONE MOVE's next update. Nothing was saved; Classic can add for now.";

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
  const [draft, setDraft] = useState("");
  const [ask, setAsk] = useState<{ id: string; summary: string; actions: string[]; text: string | null } | null>(null);
  const [asking2, setAsking2] = useState(false);
  const [remindOn, setRemindOn] = useState("");
  const [flare, setFlare] = useState(false);
  const [adding, setAdding] = useState<NewPerson | null>(null);
  const [matches, setMatches] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);
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

  // Focus (Parry, 4 Oct): a tapped class comes to the middle with all its people round it;
  // the other two wait at the top, a tap away. Tap the middle again for all three.
  const pos = useMemo((): Record<HwcClass, { x: number; y: number; r: number }> => {
    if (!only) return { hot: { ...SEATS.hot, r: ORB }, warm: { ...SEATS.warm, r: ORB }, cold: { ...SEATS.cold, r: ORB } };
    const rest = CLASSES.filter((c) => c.key !== only);
    const out = { [only]: { x: C, y: C + 90, r: FOCUS } } as Record<HwcClass, { x: number; y: number; r: number }>;
    rest.forEach((c, i) => (out[c.key] = { x: C + (i ? 1 : -1) * 620, y: 200, r: 96 }));
    return out;
  }, [only]);
  const seats = useMemo(() => {
    if (!data) return [];
    return CLASSES.filter((c) => !only || c.key === only).flatMap((c) => {
      const ids = data.people.filter((p) => p.cls === c.key).map((p) => p.id);
      const s = pos[c.key];
      if (only) {
        const r = focusFace(ids.length);
        return ringRows(ids, s.x, s.y, focusRings(FOCUS, r), r, 18).map((x) => ({ ...x, cls: c.key }));
      }
      return ringRows(ids, s.x, s.y, [ORB + 60, ORB + 112, ORB + 164, ORB + 216, ORB + 268], 24, 8).map((x) => ({ ...x, cls: c.key }));
    });
  }, [data, only, pos]);
  const byId = useMemo(() => new Map(data?.people.map((p) => [p.id, p] as const) ?? []), [data]);
  const today = data?.date || todayIn();
  const due = useMemo(() => new Set(data?.reminders.map((r) => r.id) ?? []), [data]);
  const picked = useMemo(() => new Set(data?.picks.map((r) => r.id) ?? []), [data]);
  const allDone = !!data && data.today.hot && data.today.warm && data.today.cold;
  useEffect(() => {
    if (!allDone) return;
    setFlare(true);
    const t = setTimeout(() => setFlare(false), 2400);
    return () => clearTimeout(t);
  }, [allDone]);
  useEffect(() => {
    setDraft("");
    setAsk(null);
    setRemindOn("");
    setConfirmRemove(false);
  }, [pick]);
  // contact search for "Add a person" (as Classic's: the agent's own ONE MOVE contacts)
  const addName = adding && !adding.contactId ? adding.name.trim() : "";
  useEffect(() => {
    if (addName.length < 2) return setMatches([]);
    let gone = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${hwcUrl}/contacts?q=${encodeURIComponent(addName)}`, { credentials: "include", cache: "no-store" });
        const list = r.ok ? readMatches(await r.json().catch(() => null)) : [];
        if (!gone) setMatches(list);
      } catch {
        if (!gone) setMatches([]);
      }
    }, 250);
    return () => {
      gone = true;
      clearTimeout(t);
    };
  }, [addName]);
  const who = pick ? byId.get(pick) : undefined;
  const first = who ? who.name.split(/\s+/)[0] : "";

  const post = async (path: string, body: unknown) => {
    let r: Response;
    try {
      r = await fetch(`${hwcUrl}/${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch {
      // a route ONE MOVE hasn't shipped answers without CORS, so the fetch itself fails
      throw new Error(path === "move" || path === "credit" ? "ONE couldn't reach ONE MOVE just now. Nothing was changed." : NOT_YET);
    }
    const j = await r.json().catch(() => null);
    if ((r.status === 404 || r.status === 405) && !(j as { error?: string } | null)?.error) throw new Error(NOT_YET);
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

  const act = async (path: string, body: unknown, ok: string): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setNote(null);
    try {
      setData(await post(path, body));
      setNote(ok);
      onChanged();
      return true;
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That didn't save. Nothing was changed.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const addNote = async () => {
    const text = draft.trim();
    if (!who || !text) return;
    if (text.length > 2000) return setNote("A note can be at most 2000 characters.");
    if (await act("note", { id: who.id, note: text }, "Note saved. Pulse reads it for a follow-up date.")) setDraft("");
  };
  const askPulse = async () => {
    if (!who || asking2) return;
    setAsking2(true);
    setNote(null);
    try {
      let r: Response;
      try {
        r = await fetch(`${hwcUrl}/pulse`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: who.id }) });
      } catch {
        throw new Error(NOT_YET);
      }
      const j = (await r.json().catch(() => null)) as { summary?: unknown; actions?: unknown; text_draft?: unknown; error?: string } | null;
      if ((r.status === 404 || r.status === 405) && !j?.error) throw new Error(NOT_YET);
      if (!r.ok || typeof j?.summary !== "string") throw new Error(j?.error || "Pulse couldn't answer just now. Try again in a minute.");
      setAsk({
        id: who.id,
        summary: j.summary.slice(0, 400),
        actions: Array.isArray(j.actions) ? (j.actions as unknown[]).filter((a): a is string => typeof a === "string").slice(0, 5).map((a) => a.slice(0, 200)) : [],
        text: typeof j.text_draft === "string" && j.text_draft.trim() ? j.text_draft.trim().slice(0, 600) : null,
      });
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Pulse couldn't answer just now.");
    } finally {
      setAsking2(false);
    }
  };

  const addPerson = async () => {
    if (!adding || busy) return;
    const problem = addProblem(adding);
    if (problem) return setNote(problem);
    setBusy(true);
    setNote(null);
    try {
      let r: Response;
      try {
        r = await fetch(`${hwcUrl}/add`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addBody(adding)) });
      } catch {
        throw new Error(NOT_YET_ADD);
      }
      const j = await r.json().catch(() => null);
      if ((r.status === 404 || r.status === 405) && !(j as { error?: string } | null)?.error) throw new Error(NOT_YET_ADD);
      const next = r.ok ? readHwc(j) : null;
      if (!next) throw new Error((j as { error?: string } | null)?.error || "That didn't save. Nothing was changed.");
      setData(next);
      const id = (j as { added_id?: unknown }).added_id;
      setNote(`${adding.name.trim()} is in ${CLASS_OF[adding.cls].label}.`);
      setAdding(null);
      setOnly(null);
      setPick(typeof id === "string" && next.people.some((p) => p.id === id) ? id : null);
      onChanged();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That didn't save. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!who) return;
    const name = who.name;
    if (await act("remove", { id: who.id }, `${name} is out of Hot/Warm/Cold.`)) {
      setPick(null);
      setConfirmRemove(false);
    }
  };

  const back = () => {
    if (adding) return setAdding(null);
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
          {!only && (
            <>
              <line className="vr-link" x1={SEATS.hot.x} y1={SEATS.hot.y} x2={SEATS.warm.x} y2={SEATS.warm.y} />
              <line className="vr-link" x1={SEATS.warm.x} y1={SEATS.warm.y} x2={SEATS.cold.x} y2={SEATS.cold.y} />
              <line className="vr-link" x1={SEATS.cold.x} y1={SEATS.cold.y} x2={SEATS.hot.x} y2={SEATS.hot.y} />
            </>
          )}

          {CLASSES.map((c) => {
            const s = pos[c.key];
            const n = data.people.filter((p) => p.cls === c.key).length;
            const lit = data.today[c.key];
            const dim = !only && shownClass && shownClass !== c.key;
            const dueN = data.reminders.filter((r) => r.cls === c.key).length;
            return (
              <g
                key={c.key}
                data-tap
                className={`hw-orb fx-move${dim ? " dim" : ""}`}
                style={{ transform: `translate(${s.x}px, ${s.y}px) scale(${s.r / ORB})` }}
                role="button"
                tabIndex={0}
                aria-pressed={only === c.key}
                aria-label={`${c.label}: ${n} people${dueN ? `, ${dueN} due` : ""}${lit ? ", today's box ticked" : ""}`}
                onClick={() => {
                  setPick(null);
                  setAsking(null);
                  setOnly((o) => (o === c.key ? null : c.key));
                  cam.reset();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPick(null);
                    setAsking(null);
                    setOnly((o) => (o === c.key ? null : c.key));
                    cam.reset();
                  }
                }}
              >
                <circle cx={0} cy={0} r={ORB * 2.1} fill={`url(#hw-glow-${c.key})`} opacity={lit ? 1 : 0.55} className={`hw-breath hw-breath-${c.key}`} />
                {c.key === "hot" && (
                  <g className="hw-sparks" pointerEvents="none">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <circle key={i} cx={Math.cos(i * 1.05) * ORB * 0.8} cy={-ORB * 0.6 + (i % 2) * 20} r={3} fill="#ffb27a" style={{ animationDelay: `${i * 0.55}s` }} />
                    ))}
                  </g>
                )}
                {c.key === "warm" && <circle cx={0} cy={0} r={ORB + 26} fill="none" stroke="#ffd08a" strokeWidth={10} className="hw-shimmer" pointerEvents="none" />}
                {c.key === "cold" && <circle cx={0} cy={0} r={ORB + 24} fill="none" stroke="#cfe6ff" strokeWidth={1.5} strokeDasharray="1 14 6 9" className="hw-frost" pointerEvents="none" />}
                <circle cx={0} cy={0} r={ORB} fill="url(#hw-glass)" stroke={c.color} strokeWidth={lit ? 5 : 2.5} className={flare ? "hw-flare" : undefined} />
                {lit && <circle cx={0} cy={0} r={ORB + 12} fill="none" stroke={c.color} strokeWidth={2} strokeDasharray="4 6" className="hw-lit" />}
                <text className="hw-n" x={0} y={-8} textAnchor="middle" style={undefined}>{n}</text>
                <text className="hw-label" x={0} y={30} textAnchor="middle" style={{ fill: c.color }}>{c.label.toUpperCase()}</text>
                {only === c.key && <text className="rx-back" x={0} y={56} textAnchor="middle">tap for all three</text>}
                {dueN > 0 && (
                  <g pointerEvents="none">
                    <circle cx={ORB * 0.74} cy={-ORB * 0.74} r={22} fill={GOLD} stroke="#070b18" strokeWidth={3} />
                    <text x={ORB * 0.74} y={-ORB * 0.74} dy="0.35em" textAnchor="middle" className="hw-due">{dueN}</text>
                  </g>
                )}
              </g>
            );
          })}

          {seats.map((f, idx) => {
            const p = byId.get(f.id)!;
            const c = CLASS_OF[f.cls];
            const pic = broken.has(p.id) ? null : faceUrl(p.photo);
            const on = pick === p.id;
            const dim = !only && shownClass && shownClass !== f.cls;
            const heat = warmth(p, today);
            const over = due.has(p.id);
            const isPick = picked.has(p.id);
            const tr = trend(p, today);
            const out = Math.atan2(f.y - pos[f.cls].y, f.x - pos[f.cls].x);
            return (
              <g
                key={`${only ?? "all"}-${p.id}`}
                data-tap
                className={`hw-face fx-out${dim ? " dim" : ""}`}
                style={{ "--fx": `${pos[f.cls].x}px`, "--fy": `${pos[f.cls].y}px`, "--tx": `${f.x}px`, "--ty": `${f.y}px`, animationDelay: `${Math.min(idx, 60) * 14}ms` } as React.CSSProperties}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}, ${c.label}${isPick ? ", Pulse's pick for today" : over ? ", due" : ""}`}
                onClick={() => {
                  setNote(null);
                  setAsking(null);
                  setPick(on ? null : p.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setAsking(null);
                    setPick(on ? null : p.id);
                  }
                }}
              >
                <title>{p.name}</title>
                {tr && (
                  <g className={`hw-trail hw-trail-${tr}`} pointerEvents="none">
                    {[1, 2, 3].map((k) => (
                      <circle key={k} cx={-Math.cos(out) * (f.r + k * 9)} cy={-Math.sin(out) * (f.r + k * 9)} r={4.5 - k} fill={tr === "up" ? "#ff9a4f" : "#8fc8ff"} style={{ animationDelay: `${k * 0.25}s` }} />
                    ))}
                  </g>
                )}
                <circle cx={0} cy={0} r={f.r + 7} fill={c.color} opacity={0.08 + heat * 0.32} pointerEvents="none" />
                {isPick && <circle cx={0} cy={0} r={f.r + 6} fill="none" stroke={GOLD} strokeWidth={3} className="hw-beat" pointerEvents="none" />}
                <circle cx={0} cy={0} r={f.r} fill="#121a36" stroke={on ? "#fff" : c.color} strokeWidth={on ? 3 : 1.6} opacity={0.55 + heat * 0.45} />
                {pic ? (
                  <>
                    <clipPath id={`hw-fc-${p.id}`}>
                      <circle cx={0} cy={0} r={f.r - 1.5} />
                    </clipPath>
                    <image href={pic} x={-f.r} y={-f.r} width={f.r * 2} height={f.r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#hw-fc-${p.id})`} pointerEvents="none" opacity={0.55 + heat * 0.45} onError={() => setBroken((b) => new Set(b).add(p.id))} />
                  </>
                ) : (
                  <text x={0} y={0} dy="0.35em" textAnchor="middle" style={{ fill: c.color, fontSize: f.r * 0.72, fontWeight: 700 }} pointerEvents="none" opacity={0.55 + heat * 0.45}>{initialsOf(p.name)}</text>
                )}
                {only && <text className="hw-face-name" y={f.r + Math.max(14, f.r * 0.36) + 4} textAnchor="middle" style={{ fontSize: Math.max(14, f.r * 0.36) }}>{p.name.split(/\s+/)[0]}</text>}
                {over && <circle cx={0} cy={0} r={f.r + 1.5} fill="none" stroke="#dff0ff" strokeWidth={2} strokeDasharray="2 4" opacity={0.85} pointerEvents="none" />}
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
        {adding ? (
          <form
            className="rx-form"
            onSubmit={(e) => {
              e.preventDefault();
              addPerson();
            }}
          >
            <div className="d-head">
              <span className="chip" style={{ color: CLASS_OF[adding.cls].color, borderColor: CLASS_OF[adding.cls].color }}>New person</span>
            </div>
            <h1 className="d-title">Add a person</h1>
            <p className="d-sum rx-small">Pulse starts watching them today and reminds you when they need a touch.</p>
            <label className="pf-field">
              <span>Name</span>
              <input value={adding.name} maxLength={120} autoFocus autoComplete="off" onChange={(e) => setAdding({ ...adding, name: e.target.value, contactId: null })} />
              {adding.contactId ? <small>Linked to your ONE MOVE contact.</small> : <small>Start typing to find someone already in your contacts.</small>}
            </label>
            {matches.length > 0 && !adding.contactId && (
              <ul className="ta-list hw-matches">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button type="button" className="ta-name" onClick={() => { setAdding({ ...adding, name: m.name, phone: m.phone ?? adding.phone, contactId: m.id }); setMatches([]); }}>{m.name}</button>
                    <span>{phoneLine(m.phone) ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
            <label className="pf-field">
              <span>Phone</span>
              <input type="tel" value={adding.phone} maxLength={40} autoComplete="off" onChange={(e) => setAdding({ ...adding, phone: e.target.value })} />
            </label>
            <div className="pf-field">
              <span>How warm are they?</span>
              <div className="ta-log">
                {CLASSES.map((c) => (
                  <button key={c.key} type="button" className={`chip-btn${adding.cls === c.key ? " primary" : ""}`} style={adding.cls === c.key ? undefined : { color: c.color, borderColor: c.color }} aria-pressed={adding.cls === c.key} onClick={() => setAdding({ ...adding, cls: c.key })}>{c.label}</button>
                ))}
              </div>
            </div>
            <label className="pf-field">
              <span>First note (optional)</span>
              <textarea rows={3} maxLength={2000} placeholder="e.g. Wants to list in spring. Call after the 15th." value={adding.note} onChange={(e) => setAdding({ ...adding, note: e.target.value })} />
              <small>Pulse reads it for a follow-up date.</small>
            </label>
            <div className="pf-actions">
              <button type="submit" className="chip-btn primary" disabled={busy}>{busy ? "Adding…" : `Add to ${CLASS_OF[adding.cls].label}`}</button>
              <button type="button" className="chip-btn" onClick={() => setAdding(null)}>Cancel</button>
            </div>
          </form>
        ) : who ? (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: CLASS_OF[who.cls].color, borderColor: CLASS_OF[who.cls].color }}>{CLASS_OF[who.cls].label}</span>
            </div>
            <h1 className="d-title">{who.name}</h1>
            {who.phone && <p className="d-sub">{phoneLine(who.phone)}</p>}
            {(() => {
              const r = data.reminders.find((x) => x.id === who.id);
              const line = r ? `Pulse: ${r.why}` : reminderLine(who, today);
              return line ? (
                <p className="hw-pulse-line">
                  <PulseMark label={false} />
                  <span>{line}</span>
                </p>
              ) : null;
            })()}
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
            <div className="ta-log">
              {due.has(who.id) && <button className="chip-btn" disabled={busy} onClick={() => act("remind", { id: who.id, action: "done" }, `${first} is marked touched. Pulse moves on.`)}>Done</button>}
              {due.has(who.id) && <button className="chip-btn" disabled={busy} onClick={() => act("remind", { id: who.id, action: "snooze", days: 3 }, `Pulse reminds you about ${first} in 3 days.`)}>Snooze 3 days</button>}
              <label className="rx-move">
                <span>Remind me on</span>
                <input type="date" value={remindOn || who.followUpOn || ""} min={today} onChange={(e) => setRemindOn(e.target.value)} />
              </label>
              {remindOn && remindOn !== who.followUpOn && <button className="chip-btn primary" disabled={busy} onClick={() => act("remind", { id: who.id, action: "set", on: remindOn }, `Pulse reminds you about ${first} on ${shortDay(remindOn)}.`)}>Set</button>}
              {who.followUpOn && !remindOn && <button className="chip-btn" disabled={busy} onClick={() => act("remind", { id: who.id, action: "set", on: null }, "Reminder removed.")}>Remove reminder</button>}
            </div>

            <h2 className="hw-pulse-h"><PulseMark label={false} beating={asking2} /> Ask Pulse</h2>
            {ask && ask.id === who.id ? (
              <div className="hw-ask">
                <p className="d-sum">{ask.summary}</p>
                {ask.actions.length > 0 && (
                  <ul className="hw-actions">
                    {ask.actions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                )}
                {ask.text && (
                  <>
                    <p className="d-sum rx-small">A text you could send (nothing goes until you press Send in your messages):</p>
                    <blockquote className="hw-draft">{ask.text}</blockquote>
                    {tel && <a className="chip-btn primary" href={`sms:${tel}?&body=${encodeURIComponent(ask.text)}`} onClick={() => credit("text")}>Text this to {first}</a>}
                  </>
                )}
              </div>
            ) : (
              <button className="chip-btn" disabled={asking2} onClick={askPulse}>{asking2 ? "Pulse is reading…" : `What should I do with ${first}?`}</button>
            )}

            <h2>Notes</h2>
            <div className="hw-note-add">
              <textarea rows={2} maxLength={2000} placeholder={`What's new with ${first}? Pulse reads notes for follow-up dates.`} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button className="chip-btn primary" disabled={busy || !draft.trim()} onClick={addNote}>Add note</button>
            </div>
            {who.notes.length > 0 ? (
              <ul className="hw-notes">
                {who.notes.map((n) => (
                  <li key={n.id}>
                    <span className="hw-note-day">{noteDay(n.at) ?? ""}</span>
                    <span className="hw-note-text">{n.note}</span>
                    <button className="hw-note-x" aria-label="Delete this note" disabled={busy} onClick={() => act("note/delete", { id: who.id, note_id: n.id }, "Note deleted.")}>×</button>
                  </li>
                ))}
              </ul>
            ) : who.lastNote ? (
              <ul className="hw-notes">
                <li>
                  <span className="hw-note-day">{noteDay(who.lastNoteAt) ?? ""}</span>
                  <span className="hw-note-text">{who.lastNote}</span>
                </li>
              </ul>
            ) : (
              <p className="d-sum rx-small">No notes yet.</p>
            )}
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
            <div className="rx-danger">
              {confirmRemove ? (
                <>
                  <span>{`Remove ${who.name} and their notes from Hot/Warm/Cold? Your ONE MOVE contact stays.`}</span>
                  <button className="chip-btn rx-del" disabled={busy} onClick={remove}>Yes, remove</button>
                  <button className="chip-btn" onClick={() => setConfirmRemove(false)}>Keep</button>
                </>
              ) : (
                <button className="vr-classic" onClick={() => setConfirmRemove(true)}>Remove from Hot/Warm/Cold</button>
              )}
            </div>
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
            <div className="ta-log">
              <button className="chip-btn primary" onClick={() => { setNote(null); setPick(null); setAdding(blankPerson(only ?? "hot")); }}>+ Add a person</button>
            </div>
            <p className="d-sum">{`Today: ${CLASSES.filter((c) => data.today[c.key]).map((c) => c.label).join(", ") || "no"} box${CLASSES.filter((c) => data.today[c.key]).length === 1 ? "" : "es"} ticked. Call or text someone to tick theirs.`}</p>
            {!only && (
              <section className="hw-pulse">
                <h2 className="hw-pulse-h"><PulseMark label={false} beating={asking2} /> {data.reminders.length ? `Pulse: ${data.reminders.length} ${data.reminders.length === 1 ? "person needs" : "people need"} you` : "Pulse: everyone is up to date"}</h2>
                {data.reminders.length === 0 && <p className="d-sum rx-small">No one is due. Pulse tells you here, and in ONE GO, when someone is.</p>}
                <ul className="ta-list">
                  {data.reminders.slice(0, 12).map((r) => {
                    const p = byId.get(r.id)!;
                    return (
                      <li key={r.id} className="hw-due-row">
                        <button className="ta-name" onClick={() => setPick(r.id)}>
                          {picked.has(r.id) && <span className="hw-dot" style={{ background: GOLD }} aria-label="Pulse's pick" />}
                          {p.name}
                        </button>
                        <span style={{ color: CLASS_OF[r.cls].color }}>{r.daysOver > 0 ? `${r.daysOver}d over` : "today"}</span>
                      </li>
                    );
                  })}
                </ul>
                {data.reminders.length > 12 && <p className="d-sum rx-small">{`and ${data.reminders.length - 12} more`}</p>}
              </section>
            )}
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
          </>
        )}
      </aside>
    </div>
  );
}
