"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dialable, mailable } from "@/lib/contact.ts";
import { FAMILIES, FAMILY_COLOR, bizInitials, fanSeats, readRolodex, recommendedLine, rolodexUrl, withShared, type CommunityBiz, type MineBiz, type Rolodex as RolodexData } from "@/lib/rolodex.ts";
import { useSvgCamera } from "./useSvgCamera.ts";

// VIP-SUMMARY §3i: the Business Rolodex in ONE Brain, with its Community.
// Family orbs round a core; each business a named orb, a gold dotted ring
// when it has an offer for clients. Mine: a teal dot when shared, and the
// Share switch on its card (notes stay private). Community: what agents have
// shared, merged, with how many recommend it; Add to my Rolodex copies it.

const SIZE = 1200;
const C = SIZE / 2;
const FR = 270;
const GOLD = "#f5c542";
const TEAL = "#2fb7a3";

type View = "mine" | "community";
type Biz = (MineBiz & { kind: "mine" }) | (CommunityBiz & { kind: "community" });

export default function Rolodex({
  onUnavailable,
  onBack,
  onClassic,
}: {
  onUnavailable: () => void;
  onBack: () => void;
  onClassic: () => void;
}) {
  const [data, setData] = useState<RolodexData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>("mine");
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const cam = useSvgCamera(SIZE);

  const load = useCallback(async () => {
    let r: Response;
    try {
      r = await fetch(rolodexUrl, { credentials: "include", cache: "no-store" });
    } catch {
      return onUnavailable();
    }
    if (r.status === 404 || r.status === 405) return onUnavailable();
    if (!r.ok) return setErr(r.status === 401 ? "Sign in again to see your Rolodex." : "ONE couldn't load your Rolodex just now.");
    const d = readRolodex(await r.json().catch(() => null));
    if (!d) return onUnavailable();
    setData(d);
    setErr(null);
  }, [onUnavailable]);

  useEffect(() => {
    load();
  }, [load]);

  const list: Biz[] = useMemo(() => {
    if (!data) return [];
    return view === "mine" ? data.mine.map((b) => ({ ...b, kind: "mine" as const })) : data.community.map((b) => ({ ...b, kind: "community" as const }));
  }, [data, view]);
  const idOf = (b: Biz) => (b.kind === "mine" ? b.id : b.key);
  const sel = pick ? list.find((b) => idOf(b) === pick) ?? null : null;

  const layout = useMemo(() => {
    const fams = FAMILIES.map((f, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / FAMILIES.length;
      return { ...f, a, x: C + FR * Math.cos(a), y: C + FR * Math.sin(a) };
    });
    const seats = fams.flatMap((f) => {
      const items = list.filter((b) => b.family === f.key);
      const sizes = items.map((b) => (b.kind === "community" ? 17 + Math.min(4, b.recommended_by.length) * 2.5 : 21));
      return fanSeats(items.map(idOf), f.x, f.y, C, C, sizes).map((s) => ({ ...s, fam: f }));
    });
    return { fams, seats };
  }, [list]);
  const byId = useMemo(() => new Map(list.map((b) => [idOf(b), b] as const)), [list]);

  const switchView = (v: View) => {
    setView(v);
    setPick(null);
    setNote(null);
  };
  const back = () => {
    if (pick) return setPick(null);
    onBack();
  };

  const post = async (path: string, body: unknown, ok: string) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch(`${rolodexUrl}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => null);
      const next = r.ok ? readRolodex(j) : null;
      if (!next) throw new Error((j as { error?: string } | null)?.error || "That didn't save. Nothing was changed.");
      setData(next);
      setNote(ok);
    } catch (e) {
      await load();
      setNote(e instanceof Error ? e.message : "That didn't save. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };
  const share = (b: MineBiz, shared: boolean) => {
    if (!data || busy) return;
    setData(withShared(data, b.id, shared)); // the switch moves at once; ONE MOVE's answer settles it
    post("share", { id: b.id, shared }, shared ? `${b.name} is shared with the VIP-50 community.` : `${b.name} is no longer shared.`);
  };
  const addToMine = (b: CommunityBiz) => {
    if (busy) return;
    post("add", { key: b.key }, `${b.name} is in your Rolodex now.`);
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
        Opening your Rolodex…
      </div>
    );
  }

  const coreColor = view === "mine" ? GOLD : TEAL;
  const fc = sel ? FAMILY_COLOR[sel.family] : TEAL;
  const tel = sel ? dialable(sel.phone) : null;
  const mail = sel ? mailable(sel.email) : null;

  return (
    <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="vr-stage">
        <div className="ta-views" role="tablist" aria-label="Rolodex view">
          <button role="tab" aria-selected={view === "mine"} className={view === "mine" ? "on" : ""} onClick={() => switchView("mine")}>My Rolodex</button>
          <button role="tab" aria-selected={view === "community"} className={view === "community" ? "on" : ""} onClick={() => switchView("community")}>Community</button>
        </div>
        <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label={view === "mine" ? "My Rolodex" : "Community Rolodex"}>
          <defs>
            <radialGradient id="rx-glass" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#070b18" />
              <stop offset="0.7" stopColor="#0b1020" />
              <stop offset="1" stopColor="#2a2a3a" />
            </radialGradient>
            {FAMILIES.map((f) => (
              <radialGradient key={f.key} id={`rx-glow-${f.key}`}>
                <stop offset="0.45" stopColor={FAMILY_COLOR[f.key]} stopOpacity="0.35" />
                <stop offset="1" stopColor={FAMILY_COLOR[f.key]} stopOpacity="0" />
              </radialGradient>
            ))}
            <radialGradient id="rx-core-glow">
              <stop offset="0.45" stopColor={coreColor} stopOpacity="0.3" />
              <stop offset="1" stopColor={coreColor} stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle className="vr-track" cx={C} cy={C} r={FR} />
          {layout.fams.map((f) => {
            const n = list.filter((b) => b.family === f.key).length;
            const col = FAMILY_COLOR[f.key];
            return (
              <g key={f.key}>
                <line className="vr-link" x1={C} y1={C} x2={f.x} y2={f.y} />
                <circle cx={f.x} cy={f.y} r={100} fill={`url(#rx-glow-${f.key})`} opacity={n ? 1 : 0.35} />
                <circle cx={f.x} cy={f.y} r={54} fill="url(#rx-glass)" stroke={col} strokeWidth={2.5} opacity={n ? 1 : 0.5} />
                <text className="rx-n" x={f.x} y={f.y} dy="0.35em" textAnchor="middle">{n}</text>
                <text className="rx-fam" x={C + (FR - 80) * Math.cos(f.a)} y={C + (FR - 80) * Math.sin(f.a)} dy="0.35em" textAnchor="middle" style={{ fill: col }}>{f.label.toUpperCase()}</text>
              </g>
            );
          })}
          {layout.seats.map((s) => {
            const b = byId.get(s.id)!;
            const col = FAMILY_COLOR[s.fam.key];
            const on = pick === s.id;
            const count = b.kind === "community" ? b.recommended_by.length : 0;
            return (
              <g
                key={s.id}
                data-tap
                className="rx-biz"
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${b.name}${b.offer ? ", has an offer for clients" : ""}${b.kind === "mine" && b.shared ? ", shared" : ""}${count ? `, recommended by ${count}` : ""}`}
                onClick={() => {
                  setNote(null);
                  setPick(on ? null : s.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPick(on ? null : s.id);
                  }
                }}
              >
                <title>{b.name}</title>
                <line x1={s.fam.x} y1={s.fam.y} x2={s.x} y2={s.y} stroke={col} strokeOpacity={0.18} />
                {b.offer && <circle cx={s.x} cy={s.y} r={s.r + 6} fill="none" stroke={GOLD} strokeWidth={2} strokeDasharray="2 3" />}
                <circle cx={s.x} cy={s.y} r={s.r} fill="url(#rx-glass)" stroke={on ? "#fff" : col} strokeWidth={on ? 3 : 1.6} />
                <text x={s.x} y={s.y} dy="0.35em" textAnchor="middle" style={{ fill: col, fontSize: s.r * 0.62, fontWeight: 700 }} pointerEvents="none">{bizInitials(b.name)}</text>
                <text className={`rx-name${on ? " on" : ""}`} x={s.x} y={s.y + s.r + 14} textAnchor="middle">{b.name.length > 20 ? `${b.name.slice(0, 19)}…` : b.name}</text>
                {b.kind === "mine" && b.shared && <circle cx={s.x + s.r * 0.75} cy={s.y - s.r * 0.75} r={6} fill={TEAL} stroke="#070b18" strokeWidth={2} />}
                {count > 1 && (
                  <g pointerEvents="none">
                    <circle cx={s.x + s.r * 0.75} cy={s.y - s.r * 0.75} r={9} fill={TEAL} stroke="#070b18" strokeWidth={2} />
                    <text x={s.x + s.r * 0.75} y={s.y - s.r * 0.75} dy="0.35em" textAnchor="middle" className="rx-count">{count}</text>
                  </g>
                )}
              </g>
            );
          })}
          <circle cx={C} cy={C} r={135} fill="url(#rx-core-glow)" />
          <circle cx={C} cy={C} r={96} fill="url(#rx-glass)" stroke={coreColor} strokeWidth={3} />
          <text className="dt-score" x={C} y={C - 6} textAnchor="middle">{list.length}</text>
          <text className="dt-score-sub" x={C} y={C + 24} textAnchor="middle" style={{ fill: view === "mine" ? "#ffe08a" : "#8af0de" }}>{view === "mine" ? "MY ROLODEX" : "COMMUNITY"}</text>
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
          <button onClick={cam.reset} aria-label="Centre on your Rolodex">◎</button>
        </div>
      </div>

      <aside className="drawer vr-drawer" aria-label={view === "mine" ? "My Rolodex" : "Community"}>
        {sel ? (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: fc, borderColor: fc }}>{FAMILIES.find((f) => f.key === sel.family)!.label}</span>
              {sel.offer && <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>Client offer</span>}
            </div>
            <h1 className="d-title">{sel.name}</h1>
            {(sel.contact_name || sel.phone) && <p className="d-sub">{[sel.contact_name, sel.phone].filter(Boolean).join(" · ")}</p>}
            {(sel.category || sel.city) && <p className="d-sum">{[sel.category, sel.city].filter(Boolean).join(" · ")}</p>}
            {sel.kind === "community" && <p className="d-sum">{recommendedLine(sel)}</p>}
            {sel.offer && (
              <>
                <h2>Offer for your clients</h2>
                <p className="d-sum">{sel.offer}</p>
              </>
            )}
            <div className="ta-log">
              {tel && <a className="chip-btn primary" href={`tel:${tel}`}>Call</a>}
              {tel && <a className="chip-btn" href={`sms:${tel}`}>Text</a>}
              {mail && <a className="chip-btn" href={`mailto:${mail}`}>Email</a>}
              {sel.website && <a className="chip-btn" href={sel.website} target="_blank" rel="noopener noreferrer">Website</a>}
            </div>
            {sel.kind === "mine" ? (
              <>
                {sel.notes && (
                  <>
                    <h2>Your notes (private)</h2>
                    <p className="d-sum">{sel.notes}</p>
                  </>
                )}
                <label className={`dt-row${sel.shared ? " on" : ""}`} style={{ marginTop: 14 }}>
                  <input type="checkbox" checked={sel.shared} disabled={busy} onChange={() => share(sel, !sel.shared)} />
                  <span>Share with the VIP-50 community</span>
                </label>
                <p className="d-sum rx-small">Other agents see the business, the contact and the offer, with your name as the one recommending it. Your notes stay private. Turn it off any time.</p>
              </>
            ) : (
              <>
                <div className="ta-log">
                  {sel.in_mine ? <span className="chip" style={{ color: TEAL, borderColor: TEAL }}>In your Rolodex</span> : <button className="chip-btn primary" disabled={busy} onClick={() => addToMine(sel)}>{busy ? "Adding…" : "Add to my Rolodex"}</button>}
                </div>
                {sel.recommended_by.length > 0 && (
                  <>
                    <h2>Who recommends them</h2>
                    <ul className="ta-list">
                      {sel.recommended_by.map((r, i) => (
                        <li key={`${r.name}-${i}`}><span>{r.me ? "You" : r.name}</span>{r.since && <span>{`since ${r.since}`}</span>}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: TEAL, borderColor: TEAL }}>ONE MOVE</span>
            </div>
            <h1 className="d-title">{view === "mine" ? "Business Rolodex" : "Community"}</h1>
            <p className="d-sub">
              {view === "mine"
                ? `${data.mine.length} businesses · ${data.mine.filter((b) => b.shared).length} shared with the community`
                : `${data.community.length} businesses VIP-50 agents recommend${data.myCity ? `, ${data.myCity} first` : ""}`}
            </p>
            {list.length === 0 && (
              <p className="d-sum">{view === "mine" ? "Add businesses on the Classic page; they show here." : "Nothing shared yet. Share a business from My Rolodex and it shows here for every VIP-50 agent."}</p>
            )}
            {FAMILIES.map((f) => {
              const items = list.filter((b) => b.family === f.key);
              if (!items.length) return null;
              return (
                <section key={f.key}>
                  <h2 style={{ color: FAMILY_COLOR[f.key] }}>{f.label}</h2>
                  <ul className="ta-list">
                    {items.map((b) => (
                      <li key={idOf(b)}>
                        <button className="ta-name" onClick={() => setPick(idOf(b))}>{b.name}</button>
                        <span>{b.kind === "community" && b.recommended_by.length > 1 ? `${b.recommended_by.length} agents` : b.offer ? "offer" : ""}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            <button className="vr-classic" onClick={onClassic}>Add or edit on the Classic page</button>
          </>
        )}
      </aside>
    </div>
  );
}
