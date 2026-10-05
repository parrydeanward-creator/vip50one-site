"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ContactPanel from "./ContactPanel.tsx";
import PulseRing from "./PulseRing.tsx";
import {
  canPromote,
  faceUrl,
  initialsOf,
  lastTouchLine,
  readRoster,
  ringRows,
  ringSeats,
  shortName,
  seatAt,
  segmentPath,
  swapQuestion,
  tierQuestion,
  touchSegments,
  vipSwapUrl,
  vipTierUrl,
  vipsUrl,
  type Seat,
  type VipPerson,
  type VipRoster,
} from "@/lib/vips.ts";

// VIP-SUMMARY §3d: VIP Management drawn in ONE Brain. VIP-50 is the inner
// ring round ONE, VIP-100 the outer ring. Each face carries its monthly
// touches as a ring; overdue faces glow red. Drag a face onto one in the
// other ring (or pick one on each ring) to swap; nothing moves until the
// agent says yes. The swap, the 50 cap and "overdue" are ONE MOVE's.

const SIZE = 1300;
const C = SIZE / 2;
const INNER = 395; // outermost VIP-50 row
const OUTER = 480; // innermost VIP-100 row
// The Brain's own colours (lib/brain/theme.ts): VIP-50 in ONE's gold, VIP-100
// in ONE MOVE's teal, status dots as on every orb.
const GOLD = "#f5c542";
const TEAL = "#2fb7a3";
const RED = "#e4574a";
const AMBER = "#e5b83a";
const GREEN = "#3fbf7f";

type Pending =
  | { kind: "swap"; out: VipPerson; into: VipPerson }
  | { kind: "tier"; who: VipPerson; tier: "vip50" | "vip100" };

export default function VipRings({
  today,
  onUnavailable,
  onChanged,
  onBack,
  onClassic,
  celebrate = [],
}: {
  today: string;
  onUnavailable: () => void;
  onChanged: () => void;
  onBack: () => void;
  onClassic: () => void;
  celebrate?: string[]; // contact ids with a special day today (gold glow)
}) {
  const glowing = new Set(celebrate);
  const [roster, setRoster] = useState<VipRoster | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pick50, setPick50] = useState<string | null>(null);
  const [pick100, setPick100] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Faces that failed to load fall back to initials (never a broken picture).
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // The view moves like the Brain: two-finger swipe or pinch to zoom, drag
  // the background to pan, + / - / centre buttons (Parry, 4 Oct).
  const [cam, setCam] = useState({ x: C, y: C, s: 1 });
  const gest = useRef({ pointers: new Map<number, { x: number; y: number }>(), pinch: 0, pan: false, lx: 0, ly: 0 });

  const load = useCallback(async () => {
    let r: Response;
    try {
      r = await fetch(vipsUrl, { credentials: "include", cache: "no-store" });
    } catch {
      // No answer at all (the route not live yet, so no CORS headers, or the
      // network): the Brain shows the Classic page instead of an error.
      return onUnavailable();
    }
    try {
      // Until ONE MOVE's route is live the Brain shows the Classic page.
      if (r.status === 404 || r.status === 405) return onUnavailable();
      if (!r.ok) throw new Error(r.status === 401 ? "Sign in again to see your VIPs." : "ONE couldn't load your VIPs just now.");
      const ro = readRoster(await r.json());
      if (!ro) return onUnavailable();
      setRoster(ro);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ONE couldn't load your VIPs just now.");
    }
  }, [onUnavailable]);

  useEffect(() => {
    load();
  }, [load]);

  const byId = useMemo(() => {
    const m = new Map<string, { p: VipPerson; ring: "vip50" | "vip100" }>();
    roster?.vip50.forEach((p) => m.set(p.id, { p, ring: "vip50" }));
    roster?.vip100.forEach((p) => m.set(p.id, { p, ring: "vip100" }));
    return m;
  }, [roster]);

  const inner = useMemo(() => ringRows(roster?.vip50.map((p) => p.id) ?? [], C, C, [245, 320, 395], 30), [roster]);
  const outer = useMemo(() => ringRows(roster?.vip100.map((p) => p.id) ?? [], C, C, [480, 540, 600], 22), [roster]);

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };
  const clampS = (v: number) => Math.min(4, Math.max(0.6, v));
  // Zoom keeping the point under the fingers still.
  const zoomAt = (factor: number, at?: { x: number; y: number }) =>
    setCam((c) => {
      const s2 = clampS(c.s * factor);
      const k = c.s / s2;
      const p = at ?? { x: c.x, y: c.y };
      return { s: s2, x: p.x - (p.x - c.x) * k, y: p.y - (p.y - c.y) * k };
    });
  const view = `${cam.x - SIZE / (2 * cam.s)} ${cam.y - SIZE / (2 * cam.s)} ${SIZE / cam.s} ${SIZE / cam.s}`;

  const onWheel = (e: React.WheelEvent) => zoomAt(Math.exp(-e.deltaY * 0.0015), toSvg(e));
  const onBgDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest?.(".vr-face")) return;
    const g = gest.current;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      g.pan = false;
    } else {
      g.pan = true;
      g.lx = e.clientX;
      g.ly = e.clientY;
    }
  };
  const onBgMove = (e: React.PointerEvent) => {
    const g = gest.current;
    if (!g.pointers.has(e.pointerId)) return false;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.pinch > 0) zoomAt(d / g.pinch, toSvg({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }));
      g.pinch = d;
    } else if (g.pan) {
      const p0 = toSvg({ clientX: g.lx, clientY: g.ly });
      const p1 = toSvg(e);
      setCam((c) => ({ ...c, x: c.x - (p1.x - p0.x), y: c.y - (p1.y - p0.y) }));
      g.lx = e.clientX;
      g.ly = e.clientY;
    }
    return true;
  };
  const onBgUp = (e: React.PointerEvent) => {
    const g = gest.current;
    g.pointers.delete(e.pointerId);
    g.pinch = 0;
    if (!g.pointers.size) g.pan = false;
  };

  const choose = (id: string) => {
    const hit = byId.get(id);
    if (!hit) return;
    setNote(null);
    setSelected(id);
    if (hit.ring === "vip50") setPick50((v) => (v === id ? null : id));
    else setPick100((v) => (v === id ? null : id));
  };

  const onDown = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (busy || pending) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { x, y } = toSvg(e);
    setDrag({ id, x, y, moved: false });
  };
  const onMove = (e: React.PointerEvent) => {
    if (onBgMove(e)) return;
    if (!drag) return;
    const { x, y } = toSvg(e);
    const from = [...inner, ...outer].find((s) => s.id === drag.id);
    const moved = drag.moved || (from ? Math.hypot(from.x - x, from.y - y) > 8 : false);
    setDrag({ ...drag, x, y, moved });
  };
  const onUp = (e: React.PointerEvent) => {
    onBgUp(e);
    if (!drag || !roster) return setDrag(null);
    const d = drag;
    setDrag(null);
    if (!d.moved) return choose(d.id);
    const hit = byId.get(d.id);
    if (!hit) return;
    const other = hit.ring === "vip50" ? outer : inner;
    const target = seatAt(other, d.x, d.y, 10);
    if (target) {
      const t = byId.get(target.id)!.p;
      return setPending(hit.ring === "vip50" ? { kind: "swap", out: hit.p, into: t } : { kind: "swap", out: t, into: hit.p });
    }
    const dist = Math.hypot(d.x - C, d.y - C);
    if (hit.ring === "vip100" && dist < (INNER + OUTER) / 2) {
      if (canPromote(roster)) return setPending({ kind: "tier", who: hit.p, tier: "vip50" });
      return setNote("Your VIP-50 is full. Drop them onto someone in your VIP-50 to swap.");
    }
    if (hit.ring === "vip50" && dist > (INNER + OUTER) / 2) return setPending({ kind: "tier", who: hit.p, tier: "vip100" });
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    setNote(null);
    try {
      const r =
        pending.kind === "swap"
          ? await fetch(vipSwapUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ out_id: pending.out.id, in_id: pending.into.id }) })
          : await fetch(vipTierUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: pending.who.id, tier: pending.tier }) });
      const body = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !body.ok) throw new Error(body.error || "That didn't go through. Nothing was changed.");
      setNote(pending.kind === "swap" ? `Done. ${pending.into.name} is in your VIP-50.` : `Done. ${pending.who.name} is in your ${pending.tier === "vip50" ? "VIP-50" : "VIP-100"}.`);
      setPick50(null);
      setPick100(null);
      setPending(null);
      await load();
      onChanged();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That didn't go through. Nothing was changed.");
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  if (err) {
    return (
      <div className="vr-msg" role="alert">
        <p>{err}</p>
        <button className="vr-btn" onClick={onUnavailable}>Open the Classic page</button>
      </div>
    );
  }
  if (!roster) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening your VIPs…
      </div>
    );
  }

  const sel = selected ? byId.get(selected) : undefined;
  const p50 = pick50 ? byId.get(pick50)?.p : undefined;
  const p100 = pick100 ? byId.get(pick100)?.p : undefined;
  const dragging = drag?.moved ? byId.get(drag.id) : undefined;
  const dropOn = drag?.moved && dragging ? seatAt(dragging.ring === "vip50" ? outer : inner, drag.x, drag.y, 10) : null;

  // Each person is an orb, drawn the way the Brain draws its orbs: dark glass
  // lit toward the rim by the ring's colour, a highlight on top, a soft glow,
  // the month's touches as an arc outside, and a status dot top right.
  const face = (s: Seat, ring: "vip50" | "vip100") => {
    const p = byId.get(s.id)!.p;
    const segs = touchSegments(p.month);
    const done = segs.filter((x) => x.done).length;
    const full = segs.length > 0 && done === segs.length;
    const picked = s.id === pick50 || s.id === pick100;
    const urg = p.urgency === "overdue" ? "overdue" : p.urgency === "due_soon" ? "soon" : "ok";
    const lifted = drag?.moved && drag.id === s.id;
    const big = ring === "vip50";
    const labels = (big ? inner : outer).every((t) => Math.hypot(t.x - C, t.y - C) < (big ? 260 : 500));
    const pic = broken.has(s.id) ? null : faceUrl(p.photo);
    const dot = urg === "overdue" ? RED : urg === "soon" ? AMBER : full ? GREEN : null;
    const dr = Math.max(4, s.r * 0.2);
    const da = -Math.PI / 4;
    return (
      <g
        key={s.id}
        className={`vr-face ${big ? "vr-50" : "vr-100"} vr-${urg}${picked ? " vr-picked" : ""}${dropOn?.id === s.id ? " vr-drop" : ""}${lifted ? " vr-lifted" : ""}`}
        role="button"
        tabIndex={0}
        aria-pressed={picked}
        aria-label={`${p.name}, ${big ? "VIP-50" : "VIP-100"}, ${done} of ${segs.length} touches this month${urg === "overdue" ? ", overdue" : urg === "soon" ? ", due soon" : ""}`}
        onPointerDown={onDown(s.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            choose(s.id);
          }
        }}
      >
        <title>{`${p.name} · ${done}/${segs.length} this month · ${lastTouchLine(p, today)}`}</title>
        {glowing.has(s.id) && <circle cx={s.x} cy={s.y} r={s.r + (big ? 13 : 10)} fill="none" stroke="#f5c542" strokeWidth={4} className="sd-glow" pointerEvents="none" />}
        <circle className="vr-glow" cx={s.x} cy={s.y} r={s.r * (big ? 1.9 : 1.6)} fill={`url(#vr-glow-${urg === "overdue" ? "red" : big ? "gold" : "teal"})`} />
        <PulseRing x={s.x} y={s.y} r={s.r + (big ? 9 : 7)} level={urg === "overdue" ? "now" : urg === "soon" ? "today" : "good"} />
        {segs.map((seg, i) => (
          <path key={seg.key} className={seg.done ? "vr-seg vr-seg-on" : "vr-seg"} d={segmentPath(s.x, s.y, s.r + (big ? 7 : 5), i, segs.length)} strokeWidth={big ? 3.6 : 2.6} />
        ))}
        <circle className="vr-disc" cx={s.x} cy={s.y} r={s.r} fill={`url(#vr-body-${big ? "gold" : "teal"})`} stroke={big ? GOLD : TEAL} strokeWidth={Math.max(1.6, s.r * 0.07)} />
        <circle cx={s.x} cy={s.y} r={s.r - Math.max(1.6, s.r * 0.07)} fill="none" stroke="#fff" strokeOpacity={0.16} strokeWidth={1} />
        <ellipse cx={s.x} cy={s.y - s.r * 0.5} rx={s.r * 0.55} ry={s.r * 0.22} fill="#fff" fillOpacity={0.07} />
        {pic && (
          <>
            <clipPath id={`vr-clip-${s.id}`}>
              <circle cx={s.x} cy={s.y} r={s.r - Math.max(1.6, s.r * 0.07)} />
            </clipPath>
            <image
              href={pic}
              x={s.x - s.r}
              y={s.y - s.r}
              width={s.r * 2}
              height={s.r * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#vr-clip-${s.id})`}
              pointerEvents="none"
              onError={() => setBroken((b) => new Set(b).add(s.id))}
            />
            <circle cx={s.x} cy={s.y} r={s.r} fill="none" stroke={big ? GOLD : TEAL} strokeWidth={Math.max(1.6, s.r * 0.07)} pointerEvents="none" />
          </>
        )}
        {!pic && (
        <text className={big ? "vr-init vr-init-50" : "vr-init vr-init-100"} x={s.x} y={s.y} fontSize={Math.max(9, s.r * (big ? 0.6 : 0.62))} dy="0.35em" textAnchor="middle">
          {initialsOf(p.name)}
        </text>
        )}
        {dot && <circle cx={s.x + s.r * Math.cos(da)} cy={s.y + s.r * Math.sin(da)} r={dr} fill={dot} stroke="#070b18" strokeWidth={1.5} />}
        {labels && (
          <text
            className={big ? "vr-name vr-name-50" : "vr-name vr-name-100"}
            x={s.x + Math.cos(Math.atan2(s.y - C, s.x - C)) * (s.r + (big ? 26 : 20))}
            y={s.y + Math.sin(Math.atan2(s.y - C, s.x - C)) * (s.r + (big ? 26 : 20))}
            dy="0.35em"
            textAnchor={Math.abs(s.x - C) < s.r ? "middle" : s.x > C ? "start" : "end"}
          >
            {shortName(p)}
          </text>
        )}
      </g>
    );
  };

  // Back is one step up the path at the top, as everywhere (Parry, 4 Oct):
  // VIP Management -> People. An open swap question is cancelled first.
  const back = () => {
    if (pending) return setPending(null);
    onBack();
  };
  const open = Math.max(0, roster.cap - roster.vip50.length);
  const fully = roster.counts?.fully_touched ?? roster.vip50.filter((p) => touchSegments(p.month).every((x) => x.done)).length;

  return (
    // Gestures here belong to the rings, never to the Brain map underneath.
    <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="vr-stage">
        <svg
          ref={svgRef}
          className="vr-svg"
          viewBox={view}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onBgDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={(e) => {
            onBgUp(e);
            setDrag(null);
          }}
          onWheel={onWheel}
          role="group"
          aria-label="Your VIP-50 (inner ring) and VIP-100 (outer ring)"
        >
          <defs>
            <radialGradient id="vr-body-gold" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#070b18" />
              <stop offset="0.55" stopColor="#0b1020" />
              <stop offset="0.86" stopColor="#5e4d1f" />
              <stop offset="1" stopColor="#b7952f" />
            </radialGradient>
            <radialGradient id="vr-body-teal" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#070b18" />
              <stop offset="0.6" stopColor="#0b1020" />
              <stop offset="0.9" stopColor="#123c3c" />
              <stop offset="1" stopColor="#1f6e65" />
            </radialGradient>
            <radialGradient id="vr-glow-gold">
              <stop offset="0.45" stopColor={GOLD} stopOpacity="0.28" />
              <stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="vr-glow-teal">
              <stop offset="0.5" stopColor={TEAL} stopOpacity="0.16" />
              <stop offset="1" stopColor={TEAL} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="vr-glow-red">
              <stop offset="0.45" stopColor={RED} stopOpacity="0.42" />
              <stop offset="1" stopColor={RED} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="vr-core" cx="50%" cy="45%" r="50%">
              <stop offset="0" stopColor="#3a2c0a" />
              <stop offset="0.5" stopColor="#1c1608" />
              <stop offset="0.8" stopColor="#5a4312" />
              <stop offset="0.95" stopColor="#d9a72e" />
              <stop offset="1" stopColor="#ffd86a" />
            </radialGradient>
            <radialGradient id="vr-core-glow">
              <stop offset="0.5" stopColor="#ffd86a" stopOpacity="0.35" />
              <stop offset="1" stopColor="#ffd86a" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[...new Set(outer.map((t) => Math.round(Math.hypot(t.x - C, t.y - C))))].map((R) => (
            <circle key={`to-${R}`} className="vr-track vr-track-out" cx={C} cy={C} r={R} />
          ))}
          {[...new Set(inner.map((t) => Math.round(Math.hypot(t.x - C, t.y - C))))].map((R) => (
            <circle key={`ti-${R}`} className="vr-track" cx={C} cy={C} r={R} />
          ))}
          {inner.map((s) => (
            <line key={`l-${s.id}`} className="vr-link" x1={C} y1={C} x2={s.x} y2={s.y} />
          ))}
          <circle cx={C} cy={C} r={170} fill="url(#vr-core-glow)" />
          <circle className="vr-core" cx={C} cy={C} r={96} fill="url(#vr-core)" />
          <circle cx={C} cy={C} r={86} fill="none" stroke="#ffe9a8" strokeOpacity={0.35} />
          <ellipse cx={C} cy={C - 52} rx={48} ry={17} fill="#fff" fillOpacity={0.07} />
          <text className="vr-core-big" x={C} y={C - 4} textAnchor="middle">{`${roster.vip50.length}/${roster.cap}`}</text>
          <text className="vr-core-small" x={C} y={C + 28} textAnchor="middle">VIP-50</text>
          {outer.map((s) => face(s, "vip100"))}
          {inner.map((s) => face(s, "vip50"))}
          {drag?.moved && dragging && (
            <g className="vr-ghost" pointerEvents="none">
              <circle cx={drag.x} cy={drag.y} r={26} />
              <text x={drag.x} y={drag.y} dy="0.35em" textAnchor="middle">{initialsOf(dragging.p.name)}</text>
            </g>
          )}
        </svg>
        {(pending || (p50 && p100) || note) && (
          <div className="vr-bar pop" role="status">
            {pending ? (
              <>
                <span>{pending.kind === "swap" ? swapQuestion(pending.out, pending.into) : tierQuestion(pending.who, pending.tier)}</span>
                <button className="chip-btn primary" onClick={confirm} disabled={busy}>{busy ? "Moving…" : "Yes, move them"}</button>
                <button className="chip-btn" onClick={() => setPending(null)} disabled={busy}>Cancel</button>
              </>
            ) : p50 && p100 ? (
              <>
                <span>{`${shortName(p50)} ⇄ ${shortName(p100)}`}</span>
                <button className="chip-btn primary" onClick={() => setPending({ kind: "swap", out: p50, into: p100 })}>Swap</button>
                <button className="chip-btn" onClick={() => { setPick50(null); setPick100(null); }}>Clear</button>
              </>
            ) : (
              <>
                <span>{note}</span>
                <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
              </>
            )}
          </div>
        )}
        <div className="controls" role="toolbar" aria-label="Map controls">
          <button onClick={back} aria-label="Back">←</button>
          <button className="zoom-btn" onClick={() => zoomAt(1.25)} aria-label="Zoom in">+</button>
          <button className="zoom-btn" onClick={() => zoomAt(0.8)} aria-label="Zoom out">−</button>
          <button onClick={() => setCam({ x: C, y: C, s: 1 })} aria-label="Centre on your VIPs">◎</button>
        </div>
      </div>
      <aside className="drawer vr-drawer" aria-label={sel ? sel.p.name : "VIP Management"}>
        {sel ? (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: sel.ring === "vip50" ? GOLD : TEAL, borderColor: sel.ring === "vip50" ? GOLD : TEAL }}>
                {sel.ring === "vip50" ? "VIP-50" : "VIP-100"}
              </span>
              {sel.p.urgency === "overdue" && <span className="vr-flag" style={{ color: RED }}>● Overdue</span>}
            </div>
            <h1 className="d-title">{sel.p.name}</h1>
            <p className="d-sub">{lastTouchLine(sel.p, today)}</p>
            <ContactPanel key={sel.p.id} contactId={sel.p.id} onLogged={() => { load(); onChanged(); }} />
            <div className="vr-side-moves">
              {sel.ring === "vip50" ? (
                <button className="chip-btn" onClick={() => setPending({ kind: "tier", who: sel.p, tier: "vip100" })}>Move to VIP-100</button>
              ) : canPromote(roster) ? (
                <button className="chip-btn primary" onClick={() => setPending({ kind: "tier", who: sel.p, tier: "vip50" })}>Move to VIP-50</button>
              ) : (
                <p className="d-sum">Your VIP-50 is full. Drag them onto someone in it to swap.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: TEAL, borderColor: TEAL }}>ONE MOVE</span>
            </div>
            <h1 className="d-title">VIP Management</h1>
            <p className="d-sub">{`${roster.vip50.length} of ${roster.cap} in your VIP-50`}</p>
            <p className="d-sum">
              {`${fully} fully touched this month. ${roster.vip100.length} waiting in your VIP-100.`}
              {open ? ` ${open} open ${open === 1 ? "spot" : "spots"}.` : ""}
            </p>
            <h2>How it works</h2>
            <p className="d-sum">Click a face to call, text or email them and log it. Drag a face onto someone in the other ring to swap them, or pick one in each ring.</p>
            <h2>Reading the rings</h2>
            <ul className="vr-key">
              <li><span className="vr-k vr-k-orb50" /> VIP-50, your superfans (inner ring)</li>
              <li><span className="vr-k vr-k-orb100" /> VIP-100, your reserve (outer ring)</li>
              <li><span className="vr-k vr-k-on" /> Touch done this month</li>
              <li><span className="vr-k" /> Touch still to do</li>
              <li><span className="vr-k vr-k-red" /> Pulsing red: overdue (14+ days)</li>
              <li><span className="vr-k vr-k-amber" /> Pulsing yellow: due soon (7-13 days)</li>
              <li><span className="vr-k vr-k-green" /> Still green ring: up to date</li>
              <li><span className="vr-k vr-k-green" /> Green dot: every touch done this month</li>
            </ul>
            <button className="vr-classic" onClick={onClassic}>Open the Classic page</button>
          </>
        )}
      </aside>
    </div>
  );
}
