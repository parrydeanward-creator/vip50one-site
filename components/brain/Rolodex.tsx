"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { askCommunity, askExamples, type AskAnswer } from "@/lib/rolodexAsk.ts";
import { dialable, mailable } from "@/lib/contact.ts";
import { DRAFT_FIELDS, FAMILIES, FAMILY_COLOR, FAN_MAX, bizInitials, draftOf, draftProblem, familyLabel, fanOrder, groupSeats, placedLine, readRolodex, recommendedLine, rolodexUrl, saveBody, withShared, type CommunityBiz, type Draft, type FamilyKey, type MineBiz, type Rolodex as RolodexData } from "@/lib/rolodex.ts";
import { ringRows } from "@/lib/vips.ts";
import { focusFace, focusRings } from "@/lib/orbs.ts";
import { useSvgCamera } from "./useSvgCamera.ts";

// VIP-SUMMARY §3i: the Business Rolodex in ONE Brain, with its Community.
// Ten group orbs round a core (§3i.7: Pulse places every business; the agent
// may move one); each business a named orb, a gold dotted ring when it has an
// offer for clients; at most FAN_MAX per group, the rest behind "+N more". Mine: a teal dot when shared, and the
// Share switch on its card (notes stay private). Community: what agents have
// shared, merged, with how many recommend it; Add to my Rolodex copies it.

const SIZE = 1320;
const C = SIZE / 2;
const FR = 330;
const SLICE = ((2 * Math.PI) / FAMILIES.length) * 0.86;
const OR = 590;
const GOLD = "#f5c542";
const TEAL = "#2fb7a3";

type View = "mine" | "community";

/** A group's name on the core side of its orb, never across it. */
function labelAt(a: number): { dx: number; dy: number; anchor: "start" | "middle" | "end" } {
  const c = Math.cos(a), s = Math.sin(a);
  if (c > 0.75) return { dx: -58, dy: -s * 20, anchor: "end" };
  if (c < -0.75) return { dx: 58, dy: -s * 20, anchor: "start" };
  return { dx: 0, dy: s > 0 ? -64 : 64, anchor: "middle" };
}
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
  const [group, setGroup] = useState<FamilyKey | null>(null);
  const [edit, setEdit] = useState<{ was: MineBiz | null; draft: Draft } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [q, setQ] = useState("");
  const [askQ, setAskQ] = useState("");
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [classicOnly, setClassicOnly] = useState(false);
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

  // One set of group orbs that move between two arrangements: all groups round the core, or one
  // group in the middle with the rest on the outer ring. Business orbs fly out of their group orb.
  const layout = useMemo(() => {
    const orbs = new Map<FamilyKey, { x: number; y: number; k: number; lx: number; ly: number; anchor: "start" | "middle" | "end" }>();
    const seats: { id: string; more: number; x: number; y: number; r: number; fam: FamilyKey; fx: number; fy: number; delay: number }[] = [];
    const order = (items: Biz[]) => fanOrder(items, (b) => (b.kind === "mine" ? b.shared : b.recommended_by.length > 1));
    if (group) {
      const others = FAMILIES.filter((x) => x.key !== group);
      orbs.set(group, { x: C, y: C, k: 1, lx: C, ly: C + 24, anchor: "middle" });
      others.forEach((o, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * (i + 0.5)) / others.length;
        const x = C + OR * Math.cos(a);
        const y = C + OR * Math.sin(a);
        orbs.set(o.key, { x, y, k: 0.3, lx: x, ly: y + 46, anchor: "middle" });
      });
      const items = order(list.filter((b) => b.family === group));
      const fr = focusFace(items.length);
      ringRows(items.map(idOf), C, C, focusRings(100, fr), fr, 26).forEach((r, j) => seats.push({ id: r.id, more: 0, x: r.x, y: r.y, r: fr, fam: group, fx: C, fy: C, delay: Math.min(j, 40) * 22 }));
    } else {
      FAMILIES.forEach((f, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / FAMILIES.length;
        const x = C + FR * Math.cos(a);
        const y = C + FR * Math.sin(a);
        const l = labelAt(a);
        orbs.set(f.key, { x, y, k: 0.48, lx: x + l.dx, ly: y + l.dy, anchor: l.anchor });
        const items = order(list.filter((b) => b.family === f.key));
        const shown = items.length > FAN_MAX ? items.slice(0, FAN_MAX - 1) : items;
        const more = items.length - shown.length;
        const pos = groupSeats(shown.length + (more ? 1 : 0), x, y, C, C, SLICE, FR);
        shown.forEach((b, j) => seats.push({ id: idOf(b), more: 0, ...pos[j], r: b.kind === "community" ? 17 + Math.min(4, b.recommended_by.length) * 2.5 : 21, fam: f.key, fx: x, fy: y, delay: j * 30 }));
        if (more) seats.push({ id: `more:${f.key}`, more, ...pos[shown.length], r: 24, fam: f.key, fx: x, fy: y, delay: shown.length * 30 });
      });
    }
    return { orbs, seats };
  }, [list, group]);
  const byId = useMemo(() => new Map(list.map((b) => [idOf(b), b] as const)), [list]);

  const switchView = (v: View) => {
    setView(v);
    setPick(null);
    setGroup(null);
    setEdit(null);
    setNote(null);
  };
  const openGroup = (k: FamilyKey) => {
    setPick(null);
    setEdit(null);
    setNote(null);
    setQ("");
    setGroup(group === k ? null : k);
    cam.reset();
  };
  const back = () => {
    if (edit) return setEdit(null);
    if (pick) return setPick(null);
    if (group) return setGroup(null);
    onBack();
  };

  const post = async (path: string, body: unknown, ok: string): Promise<boolean> => {
    setBusy(true);
    setNote(null);
    try {
      let r: Response;
      try {
        r = await fetch(`${rolodexUrl}/${path}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        // a route ONE MOVE hasn't shipped answers without CORS, so the fetch itself fails
        throw new Error(path === "save" || path === "delete" ? "NOT_YET" : "ONE couldn't reach ONE MOVE just now. Nothing was changed.");
      }
      const j = await r.json().catch(() => null);
      if ((r.status === 404 || r.status === 405) && !(j as { error?: string } | null)?.error) throw new Error("NOT_YET");
      const next = r.ok ? readRolodex(j) : null;
      if (!next) throw new Error((j as { error?: string } | null)?.error || "That didn't save. Nothing was changed.");
      setData(next);
      setNote(ok);
      return true;
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_YET") {
        setClassicOnly(true);
        setNote("Adding and editing here arrives with ONE MOVE's next update. Use the Classic page for now; nothing was changed.");
        return false;
      }
      await load();
      setNote(e instanceof Error ? e.message : "That didn't save. Nothing was changed.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const startEdit = (b: MineBiz | null) => {
    setConfirmDel(false);
    setNote(null);
    setEdit({ was: b, draft: draftOf(b) });
  };
  const saveEdit = async () => {
    if (!edit || busy) return;
    const p = draftProblem(edit.draft);
    if (p) return setNote(p);
    const body = saveBody(edit.draft, edit.was);
    if (edit.was && Object.keys(body).length === 1) return setEdit(null);
    const name = edit.draft.name.trim();
    if (await post("save", body, edit.was ? `${name} is saved.` : `${name} is in your Rolodex. Pulse is placing it.`)) {
      setEdit(null);
      if (!edit.was) setPick(null);
    }
  };
  const remove = async (b: MineBiz) => {
    if (busy) return;
    if (await post("delete", { id: b.id }, `${b.name} is out of your Rolodex.`)) {
      setEdit(null);
      setPick(null);
      setConfirmDel(false);
    }
  };
  const moveTo = (b: MineBiz, k: string) => {
    if (busy) return;
    post("save", { id: b.id, group: k === "pulse" ? null : k }, k === "pulse" ? `Pulse will place ${b.name}.` : `${b.name} is in ${familyLabel(k as FamilyKey)} now.`);
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

  const bizOrb = (b: Biz, s: { r: number; x?: number; y?: number }, col: string, style: React.CSSProperties, cut: number, key: string) => {
    const id = idOf(b);
    const on = pick === id;
    const count = b.kind === "community" ? b.recommended_by.length : 0;
    return (
      <g
        key={key}
        data-tap
        className="rx-biz fx-out"
        style={style}
        role="button"
        tabIndex={0}
        aria-pressed={on}
        aria-label={`${b.name}${b.offer ? ", has an offer for clients" : ""}${b.kind === "mine" && b.shared ? ", shared" : ""}${count ? `, recommended by ${count}` : ""}`}
        onClick={() => {
          setNote(null);
          setEdit(null);
          setPick(on ? null : id);
          if (on) cam.reset();
          else if (s.x != null && s.y != null) cam.centreOn(s.x, s.y);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEdit(null);
            setPick(on ? null : id);
            if (on) cam.reset();
            else if (s.x != null && s.y != null) cam.centreOn(s.x, s.y);
          }
        }}
      >
        <desc>{b.name}</desc>
        {b.offer && <circle r={s.r + 6} fill="none" stroke={GOLD} strokeWidth={2} strokeDasharray="2 3" />}
        <circle r={s.r} fill="url(#rx-glass)" stroke={on ? "#fff" : col} strokeWidth={on ? 3 : 1.6} />
        <text dy="0.35em" textAnchor="middle" style={{ fill: col, fontSize: s.r * 0.62, fontWeight: 700 }} pointerEvents="none">{bizInitials(b.name)}</text>
        <text className={`rx-name${on ? " on" : ""}`} y={s.r + Math.max(14, s.r * 0.34) + 2} textAnchor="middle" style={s.r > 30 ? { fontSize: Math.max(13, s.r * 0.3) } : undefined}>{b.name.length > cut ? `${b.name.slice(0, cut - 1)}…` : b.name}</text>
        {b.kind === "mine" && b.shared && <circle cx={s.r * 0.75} cy={-s.r * 0.75} r={6} fill={TEAL} stroke="#070b18" strokeWidth={2} />}
        {count > 1 && (
          <g pointerEvents="none">
            <circle cx={s.r * 0.75} cy={-s.r * 0.75} r={9} fill={TEAL} stroke="#070b18" strokeWidth={2} />
            <text x={s.r * 0.75} y={-s.r * 0.75} dy="0.35em" textAnchor="middle" className="rx-count">{count}</text>
          </g>
        )}
      </g>
    );
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

          <circle key={`track-${group ?? "all"}`} className="vr-track fx-fade" cx={C} cy={C} r={group ? OR : FR} />
          {!group &&
            [...layout.orbs.entries()].map(([k, o]) => <line key={`l-${k}-${view}`} className="vr-link fx-fade" x1={C} y1={C} x2={o.x} y2={o.y} pointerEvents="none" />)}

          {/* the core: My Rolodex / Community; it steps back while a group is open */}
          <g className={`fx-move${group ? " fx-gone" : ""}`} style={{ transform: `translate(${C}px, ${C}px) scale(${group ? 0.3 : 1})` }} pointerEvents="none">
            <circle r={135} fill="url(#rx-core-glow)" />
            <circle r={96} fill="url(#rx-glass)" stroke={coreColor} strokeWidth={3} />
            <text className="dt-score" y={-6} textAnchor="middle">{list.length}</text>
            <text className="dt-score-sub" y={24} textAnchor="middle" style={{ fill: view === "mine" ? "#ffe08a" : "#8af0de" }}>{view === "mine" ? "MY ROLODEX" : "COMMUNITY"}</text>
          </g>

          {layout.seats.map((s) => {
            const col = FAMILY_COLOR[s.fam];
            const vars = { "--fx": `${s.fx}px`, "--fy": `${s.fy}px`, "--tx": `${s.x}px`, "--ty": `${s.y}px`, animationDelay: `${s.delay}ms` } as React.CSSProperties;
            const line = <line key={`ln-${group ?? "all"}-${view}-${s.id}`} className="fx-fade" x1={s.fx} y1={s.fy} x2={s.x} y2={s.y} stroke={col} strokeOpacity={0.16} pointerEvents="none" style={{ animationDelay: `${s.delay + 200}ms` }} />;
            if (s.more) {
              return [
                line,
                <g
                  key={`${group ?? "all"}-${view}-${s.id}`}
                  data-tap
                  className="rx-biz fx-out"
                  style={vars}
                  role="button"
                  tabIndex={0}
                  aria-label={`${s.more} more in ${familyLabel(s.fam)}`}
                  onClick={() => openGroup(s.fam)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openGroup(s.fam);
                    }
                  }}
                >
                  <circle r={s.r} fill="url(#rx-glass)" stroke={col} strokeWidth={1.6} strokeDasharray="4 4" />
                  <text dy="0.35em" textAnchor="middle" style={{ fill: col, fontSize: 15, fontWeight: 700 }} pointerEvents="none">{`+${s.more}`}</text>
                  <text className="rx-name" y={s.r + 14} textAnchor="middle">more</text>
                </g>,
              ];
            }
            return [line, bizOrb(byId.get(s.id)!, s, col, vars, group ? (s.r >= 44 ? 20 : 15) : 16, `${group ?? "all"}-${view}-${s.id}`)];
          })}

          {/* group orbs: drawn at radius 100 and scaled, so they glide and grow between places */}
          {FAMILIES.map((f) => {
            const o = layout.orbs.get(f.key)!;
            const n = list.filter((b) => b.family === f.key).length;
            const col = FAMILY_COLOR[f.key];
            const centre = group === f.key;
            const act = () => openGroup(f.key);
            return (
              <g key={f.key}>
                <g
                  data-tap
                  className="rx-group fx-move"
                  style={{ transform: `translate(${o.x}px, ${o.y}px) scale(${o.k})` }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={centre}
                  aria-label={centre ? `${f.label}: back to all groups` : `${f.label}, ${n} ${n === 1 ? "business" : "businesses"}`}
                  onClick={act}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      act();
                    }
                  }}
                >
                  <circle r={190} fill={`url(#rx-glow-${f.key})`} opacity={n ? 1 : 0.35} />
                  <circle r={100} fill="url(#rx-glass)" stroke={col} strokeWidth={centre ? 4 : 5} opacity={n ? 1 : 0.5} />
                  <text className="rx-n-big" y={centre ? -6 : 0} dy={centre ? 0 : "0.35em"} textAnchor="middle">{n}</text>
                </g>
                <g className="fx-move" style={{ transform: `translate(${o.lx}px, ${o.ly}px)` }} pointerEvents="none">
                  <text className="rx-fam" dy="0.35em" textAnchor={o.anchor} style={{ fill: col, fontSize: centre && f.label.length > 12 ? 11 : undefined }}>{f.label.toUpperCase()}</text>
                  {centre && <text key={`back-${f.key}`} className="rx-back fx-fade" y={26} textAnchor="middle" style={{ animationDelay: "500ms" }}>tap for all groups</text>}
                </g>
              </g>
            );
          })}
          {group && list.filter((b) => b.family === group).length === 0 && (
            <text key={`empty-${group}`} x={C} y={C + 170} textAnchor="middle" className="rx-name fx-fade">{view === "mine" ? "Nothing in this group yet" : "No one has shared one of these yet"}</text>
          )}
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
        {edit ? (
          <form
            className="rx-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit();
            }}
          >
            <div className="d-head">
              <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>{edit.was ? "Edit" : "New business"}</span>
            </div>
            <h1 className="d-title">{edit.was ? edit.was.name : "Add a business"}</h1>
            <p className="d-sum rx-small">Pulse reads what they do and the name, and puts the business in its group for you.</p>
            {DRAFT_FIELDS.map((f) => (
              <label key={f.key} className="pf-field">
                <span>{f.label}</span>
                {f.long ? (
                  <textarea value={edit.draft[f.key]} maxLength={f.max} rows={f.key === "notes" ? 4 : 2} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, [f.key]: e.target.value } })} />
                ) : (
                  <input value={edit.draft[f.key]} maxLength={f.max} type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"} inputMode={f.type === "url" ? "url" : undefined} autoFocus={f.key === "name" && !edit.was} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, [f.key]: e.target.value } })} />
                )}
                {f.hint && <small>{f.hint}</small>}
              </label>
            ))}
            <div className="pf-actions">
              <button type="submit" className="chip-btn primary" disabled={busy}>{busy ? "Saving…" : edit.was ? "Save" : "Add to my Rolodex"}</button>
              <button type="button" className="chip-btn" onClick={() => setEdit(null)}>Cancel</button>
            </div>
            {edit.was && (
              <div className="rx-danger">
                {confirmDel ? (
                  <>
                    <span>{`Remove ${edit.was.name} from your Rolodex? ${edit.was.shared ? "It leaves the Community too. " : ""}This can't be undone.`}</span>
                    <button type="button" className="chip-btn rx-del" disabled={busy} onClick={() => remove(edit.was!)}>Yes, remove</button>
                    <button type="button" className="chip-btn" onClick={() => setConfirmDel(false)}>Keep it</button>
                  </>
                ) : (
                  <button type="button" className="vr-classic" onClick={() => setConfirmDel(true)}>Remove this business</button>
                )}
              </div>
            )}
          </form>
        ) : sel ? (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: fc, borderColor: fc }}>{familyLabel(sel.family)}</span>
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
                <p className="d-sum rx-small">{placedLine(sel)}</p>
                <div className="ta-log">
                  <button className="chip-btn" onClick={() => startEdit(sel)}>Edit</button>
                  <label className="rx-move">
                    <span>Move to</span>
                    <select value={sel.groupBy === "agent" ? sel.family : "pulse"} disabled={busy} onChange={(e) => moveTo(sel, e.target.value)}>
                      <option value="pulse">{`Pulse's pick${sel.groupBy !== "agent" ? ` (${familyLabel(sel.family)})` : ""}`}</option>
                      {FAMILIES.filter((f) => f.key !== "other").map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </label>
                </div>
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
              {group && <span className="chip" style={{ color: FAMILY_COLOR[group], borderColor: FAMILY_COLOR[group] }}>{familyLabel(group)}</span>}
            </div>
            <h1 className="d-title">{group ? familyLabel(group) : view === "mine" ? "Business Rolodex" : "Community"}</h1>
            <p className="d-sub">
              {group
                ? `${list.filter((b) => b.family === group).length} in this group`
                : view === "mine"
                  ? `${data.mine.length} businesses · ${data.mine.filter((b) => b.shared).length} shared with the community`
                  : `${data.community.length} businesses VIP-50 agents recommend${data.myCity ? `, ${data.myCity} first` : ""}`}
            </p>
            {view === "community" && !group && data.community.length > 0 && (
              <form
                className="rx-ask"
                onSubmit={(e) => {
                  e.preventDefault();
                  setAnswer(askQ.trim() ? askCommunity(askQ, data.community, data.myCity) : null);
                }}
              >
                <label htmlFor="rx-ask-q">Ask Pulse who agents trust</label>
                <div className="rx-ask-row">
                  <input id="rx-ask-q" type="search" placeholder={`e.g. ${askExamples(data.community, data.myCity)[0] ?? "roofer in Draper"}`} value={askQ} maxLength={120} onChange={(e) => { setAskQ(e.target.value); if (!e.target.value.trim()) setAnswer(null); }} />
                  <button className="chip-btn primary" type="submit">Ask</button>
                </div>
                {answer && (
                  <div aria-live="polite">
                    <p className="d-sum"><b>Pulse:</b> {answer.line}</p>
                    {answer.hits.length > 0 && (
                      <ul className="ta-list">
                        {answer.hits.map((h) => (
                          <li key={h.biz.key}>
                            <button className="ta-name" onClick={() => setPick(h.biz.key)}>{h.biz.name}</button>
                            <span>{[h.biz.city, h.trust > 1 ? `${h.trust} agents` : null, h.biz.in_mine ? "in yours" : null].filter(Boolean).join(" · ")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </form>
            )}
            {view === "mine" && !group && (
              <div className="ta-log">
                <button className="chip-btn primary" onClick={() => startEdit(null)}>+ Add a business</button>
              </div>
            )}
            {list.length > 6 && (
              <input className="rx-search" type="search" placeholder="Search by name, what they do, contact…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the Rolodex" />
            )}
            {list.length === 0 && (
              <p className="d-sum">{view === "mine" ? "Nothing here yet. Add a business and Pulse puts it in its group." : "Nothing shared yet. Share a business from My Rolodex and it shows here for every VIP-50 agent."}</p>
            )}
            {(group ? FAMILIES.filter((f) => f.key === group) : FAMILIES).map((f) => {
              const needle = q.trim().toLowerCase();
              const items = list
                .filter((b) => b.family === f.key)
                .filter((b) => !needle || [b.name, b.category, b.contact_name, b.city, b.offer].some((x) => x?.toLowerCase().includes(needle)))
                .sort((a, b) => a.name.localeCompare(b.name));
              if (!items.length) return null;
              return (
                <section key={f.key}>
                  {!group ? (
                    <h2>
                      <button className="rx-h" style={{ color: FAMILY_COLOR[f.key] }} onClick={() => openGroup(f.key)}>{`${f.label} · ${items.length}`}</button>
                    </h2>
                  ) : null}
                  <ul className="ta-list">
                    {items.map((b) => (
                      <li key={idOf(b)}>
                        <button className="ta-name" onClick={() => setPick(idOf(b))}>{b.name}</button>
                        <span>{b.kind === "community" && b.recommended_by.length > 1 ? `${b.recommended_by.length} agents` : b.category ?? (b.offer ? "offer" : "")}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {group && <button className="vr-classic" onClick={() => setGroup(null)}>All groups</button>}
            {classicOnly && <button className="vr-classic" onClick={onClassic}>Add or edit on the Classic page</button>}
          </>
        )}
      </aside>
    </div>
  );
}
