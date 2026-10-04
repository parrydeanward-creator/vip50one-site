"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ContactPanel from "./ContactPanel.tsx";
import {
  canPromote,
  initialsOf,
  lastTouchLine,
  readRoster,
  ringSeats,
  rosterLine,
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

const SIZE = 1000;
const C = SIZE / 2;
const INNER = 280;
const OUTER = 430;

type Pending =
  | { kind: "swap"; out: VipPerson; into: VipPerson }
  | { kind: "tier"; who: VipPerson; tier: "vip50" | "vip100" };

export default function VipRings({ today, onUnavailable, onChanged }: { today: string; onUnavailable: () => void; onChanged: () => void }) {
  const [roster, setRoster] = useState<VipRoster | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pick50, setPick50] = useState<string | null>(null);
  const [pick100, setPick100] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const inner = useMemo(() => ringSeats(roster?.vip50.map((p) => p.id) ?? [], C, C, INNER, 34), [roster]);
  const outer = useMemo(() => ringSeats(roster?.vip100.map((p) => p.id) ?? [], C, C, OUTER, 28), [roster]);

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const b = svg.getBoundingClientRect();
    const s = Math.min(b.width, b.height) / SIZE;
    const ox = b.left + (b.width - SIZE * s) / 2;
    const oy = b.top + (b.height - SIZE * s) / 2;
    return { x: (e.clientX - ox) / s, y: (e.clientY - oy) / s };
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
    if (busy || pending) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { x, y } = toSvg(e);
    setDrag({ id, x, y, moved: false });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const { x, y } = toSvg(e);
    const from = [...inner, ...outer].find((s) => s.id === drag.id);
    const moved = drag.moved || (from ? Math.hypot(from.x - x, from.y - y) > 8 : false);
    setDrag({ ...drag, x, y, moved });
  };
  const onUp = () => {
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

  const face = (s: Seat, ring: "vip50" | "vip100") => {
    const p = byId.get(s.id)!.p;
    const segs = touchSegments(p.month);
    const done = segs.filter((x) => x.done).length;
    const picked = s.id === pick50 || s.id === pick100;
    const urg = p.urgency === "overdue" ? "overdue" : p.urgency === "due_soon" ? "soon" : "ok";
    const lifted = drag?.moved && drag.id === s.id;
    return (
      <g
        key={s.id}
        className={`vr-face vr-${urg}${picked ? " vr-picked" : ""}${dropOn?.id === s.id ? " vr-drop" : ""}${lifted ? " vr-lifted" : ""}`}
        role="button"
        tabIndex={0}
        aria-pressed={picked}
        aria-label={`${p.name}, ${ring === "vip50" ? "VIP-50" : "VIP-100"}, ${done} of ${segs.length} touches this month${urg === "overdue" ? ", overdue" : urg === "soon" ? ", due soon" : ""}`}
        onPointerDown={onDown(s.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            choose(s.id);
          }
        }}
      >
        <title>{`${p.name} · ${done}/${segs.length} this month · ${lastTouchLine(p, today)}`}</title>
        <circle className="vr-halo" cx={s.x} cy={s.y} r={s.r + 9} />
        {segs.map((seg, i) => (
          <path key={seg.key} className={seg.done ? "vr-seg vr-seg-on" : "vr-seg"} d={segmentPath(s.x, s.y, s.r + 4.5, i, segs.length)} />
        ))}
        <circle className="vr-disc" cx={s.x} cy={s.y} r={s.r} />
        <text className="vr-init" x={s.x} y={s.y} fontSize={Math.max(9, s.r * 0.62)} dy="0.35em" textAnchor="middle">
          {initialsOf(p.name)}
        </text>
      </g>
    );
  };

  return (
    <div className="vr">
      <div className="vr-stage">
        <p className="vr-line">{rosterLine(roster)}</p>
        <svg
          ref={svgRef}
          className="vr-svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setDrag(null)}
          role="group"
          aria-label="Your VIP-50 (inner ring) and VIP-100 (outer ring)"
        >
          <circle className="vr-track" cx={C} cy={C} r={INNER} />
          <circle className="vr-track vr-track-out" cx={C} cy={C} r={OUTER} />
          <circle className="vr-core" cx={C} cy={C} r={92} />
          <text className="vr-core-big" x={C} y={C - 8} textAnchor="middle">{`${roster.vip50.length}/${roster.cap}`}</text>
          <text className="vr-core-small" x={C} y={C + 24} textAnchor="middle">VIP-50</text>
          <text className="vr-ring-label" x={C} y={C - OUTER - 40} textAnchor="middle">VIP-100</text>
          {outer.map((s) => face(s, "vip100"))}
          {inner.map((s) => face(s, "vip50"))}
          {drag?.moved && dragging && (
            <g className="vr-ghost" pointerEvents="none">
              <circle cx={drag.x} cy={drag.y} r={26} />
              <text x={drag.x} y={drag.y} dy="0.35em" textAnchor="middle">{initialsOf(dragging.p.name)}</text>
            </g>
          )}
        </svg>
        <div className="vr-bar" role="status">
          {pending ? (
            <>
              <span>{pending.kind === "swap" ? swapQuestion(pending.out, pending.into) : tierQuestion(pending.who, pending.tier)}</span>
              <button className="vr-btn vr-gold" onClick={confirm} disabled={busy}>{busy ? "Moving…" : "Yes, move them"}</button>
              <button className="vr-btn" onClick={() => setPending(null)} disabled={busy}>Cancel</button>
            </>
          ) : p50 && p100 ? (
            <>
              <span>{`${p50.name} ⇄ ${p100.name}`}</span>
              <button className="vr-btn vr-gold" onClick={() => setPending({ kind: "swap", out: p50, into: p100 })}>Swap</button>
              <button className="vr-btn" onClick={() => { setPick50(null); setPick100(null); }}>Clear</button>
            </>
          ) : (
            <span className="vr-hint">{note ?? "Drag a face onto someone in the other ring to swap, or pick one on each ring. Red means overdue."}</span>
          )}
        </div>
      </div>
      <aside className="vr-side" aria-label="Selected VIP">
        {sel ? (
          <>
            <h3 className="vr-side-name">{sel.p.name}</h3>
            <p className="vr-side-tier">{sel.ring === "vip50" ? "VIP-50" : "VIP-100"} · {lastTouchLine(sel.p, today)}</p>
            <ContactPanel key={sel.p.id} contactId={sel.p.id} onLogged={() => { load(); onChanged(); }} />
            <div className="vr-side-moves">
              {sel.ring === "vip50" ? (
                <button className="vr-btn" onClick={() => setPending({ kind: "tier", who: sel.p, tier: "vip100" })}>Move to VIP-100</button>
              ) : canPromote(roster) ? (
                <button className="vr-btn vr-gold" onClick={() => setPending({ kind: "tier", who: sel.p, tier: "vip50" })}>Move to VIP-50</button>
              ) : (
                <p className="vr-hint">Your VIP-50 is full. Pick someone in it to swap with.</p>
              )}
            </div>
          </>
        ) : (
          <div className="vr-side-empty">
            <p>Click a face to see the person, call, text or email them, and log it.</p>
            <ul className="vr-key">
              <li><span className="vr-k vr-k-on" /> Touch done this month</li>
              <li><span className="vr-k" /> Touch still to do</li>
              <li><span className="vr-k vr-k-red" /> Overdue (14+ days)</li>
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
