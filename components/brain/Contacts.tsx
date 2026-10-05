"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dialable, mailable } from "@/lib/contact.ts";
import { editText, editValue, gapsIn, groupColor, listUrl, peopleUrl, personTag, personUrl, readGroups, readPage, readPerson, readTimeline, sectionColor, showValue, timelineUrl, type Field, type Groups, type Person, type PersonItem, type Section, type Timeline } from "@/lib/people.ts";
import { initialsOf, ringRows } from "@/lib/vips.ts";
import { focusFace, focusRings } from "@/lib/orbs.ts";
import { useSvgCamera } from "./useSvgCamera.ts";
import PulseRing, { PULSE_COLOR, levelOf } from "./PulseRing.tsx";

// VIP-SUMMARY §3k (Parry, 4 Oct, option C): Contacts in ONE Brain. A map of
// groups round "My Contacts" (tiers warm, where they came from cool), a gold
// badge where Pulse says someone needs the agent. Tap a group: it comes to the
// middle and its people fly out of it. Tap a person: their face comes to the
// middle and their sections (how to reach them, family, home...) ring round
// them as orbs; every field opens and edits in the card. Search is always on
// top. ONE MOVE sends the groups, Pulse's lines and the field catalogue; a new
// section shows here with no Brain change.

const SIZE = 1320;
const C = SIZE / 2;
const FR = 340;
const OR = 590;
const SR = 300;
const GOLD = "#f5c542";
const TEAL = "#2fb7a3";
const PAGE = 40;

function labelAt(a: number): { dx: number; dy: number; anchor: "start" | "middle" | "end" } {
  const c = Math.cos(a), s = Math.sin(a);
  if (c > 0.75) return { dx: -54, dy: -s * 20, anchor: "end" };
  if (c < -0.75) return { dx: 54, dy: -s * 20, anchor: "start" };
  return { dx: 0, dy: s > 0 ? -60 : 60, anchor: "middle" };
}

async function getJson(url: string): Promise<{ status: number; body: unknown } | null> {
  try {
    const r = await fetch(url, { credentials: "include", cache: "no-store" });
    return { status: r.status, body: await r.json().catch(() => null) };
  } catch {
    return null;
  }
}

export default function Contacts({
  onUnavailable,
  onChanged,
  onBack,
  onClassic,
  celebrate = [],
}: {
  onUnavailable: () => void;
  onChanged: () => void;
  onBack: () => void;
  onClassic: () => void;
  celebrate?: string[];
}) {
  const glowing = useMemo(() => new Set(celebrate), [celebrate]);
  const [groups, setGroups] = useState<Groups | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [more, setMore] = useState<{ total: number; next: string | null }>({ total: 0, next: null });
  const [due, setDue] = useState<PersonItem[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<PersonItem[] | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [openSec, setOpenSec] = useState<string | null>(null);
  // The drill on the map: a person, then one of their sections in the middle, then one field.
  const [focusSec, setFocusSec] = useState<string | null>(null);
  const [focusFld, setFocusFld] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ key: string; text: string } | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [adding, setAdding] = useState<{ first_name: string; last_name: string; phone: string; email: string; tier: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const cam = useSvgCamera(SIZE);
  const drawerRef = useRef<HTMLElement | null>(null);

  // ---- loading -----------------------------------------------------------------------------
  const loadGroups = useCallback(async () => {
    const r = await getJson(`${peopleUrl}/groups`);
    if (!r || r.status === 404 || r.status === 405) return onUnavailable();
    if (r.status !== 200) return setErr(r.status === 401 ? "Sign in again to see your contacts." : "ONE couldn't load your contacts just now.");
    const g = readGroups(r.body);
    if (!g) return onUnavailable();
    setGroups(g);
    setErr(null);
  }, [onUnavailable]);

  useEffect(() => {
    loadGroups();
    // Pulse's due list: who needs the agent first, across every group.
    getJson(listUrl({ sort: "pulse", limit: 30 })).then((r) => {
      const p = r?.status === 200 ? readPage(r.body) : null;
      if (p) setDue(p.items.filter((i) => i.pulse));
    });
  }, [loadGroups]);

  const loadGroup = useCallback(async (key: string, cursor: string | null = null) => {
    const r = await getJson(listUrl({ group: key, sort: "pulse", cursor, limit: PAGE }));
    const p = r?.status === 200 ? readPage(r.body) : null;
    if (!p) return setNote("ONE couldn't load that group just now.");
    setPeople((was) => (cursor ? [...was, ...p.items.filter((i) => !was.some((w) => w.id === i.id))] : p.items));
    setMore({ total: p.total, next: p.next });
  }, []);

  // Search as the agent types (a short pause, then ONE MOVE searches name, phone, email, address, notes).
  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) return setFound(null);
    const t = setTimeout(async () => {
      const r = await getJson(listUrl({ q: needle, sort: "name", limit: 50 }));
      const p = r?.status === 200 ? readPage(r.body) : null;
      setFound(p ? p.items : []);
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const openPerson = useCallback(async (id: string) => {
    setOpening(id);
    setNote(null);
    setEdit(null);
    setAdding(null);
    setTimeline(null);
    const r = await getJson(personUrl(id));
    setOpening(null);
    const p = r?.status === 200 ? readPerson(r.body) : null;
    if (!p) return setNote(r?.status === 404 ? "That contact isn't there any more." : "ONE couldn't open that contact just now.");
    setPerson(p);
    setFocusSec(null);
    setFocusFld(null);
    setOpenSec(p.sections[0]?.key ?? null);
    cam.reset();
    drawerRef.current?.scrollTo({ top: 0 });
  }, [cam]);

  const openGroup = (key: string) => {
    setPerson(null);
    setNote(null);
    setAdding(null);
    if (group === key) {
      setGroup(null);
      setPeople([]);
    } else {
      setGroup(key);
      setPeople([]);
      loadGroup(key);
    }
    cam.reset();
  };
  const back = () => {
    if (edit) return setEdit(null);
    if (adding) return setAdding(null);
    if (focusFld) return setFocusFld(null);
    if (focusSec) return setFocusSec(null);
    if (person) return setPerson(null);
    if (group) return openGroup(group);
    onBack();
  };

  // ---- writing -----------------------------------------------------------------------------
  const post = async (url: string, body: unknown): Promise<{ ok: boolean; body: unknown; status: number }> => {
    try {
      const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) };
    } catch {
      return { ok: false, status: 0, body: null };
    }
  };
  const errorOf = (b: unknown, fallback: string) => (b && typeof b === "object" && typeof (b as { error?: unknown }).error === "string" ? (b as { error: string }).error : fallback);

  const saveField = async (f: Field) => {
    if (!person || !edit || busy) return;
    const v = editValue(f, edit.text);
    if ("error" in v) return setNote(v.error);
    setBusy(true);
    const r = await post(personUrl(person.id), { fields: { [f.key]: v.value } });
    setBusy(false);
    const next = r.ok ? readPerson(r.body) : null;
    if (!r.ok) return setNote(errorOf(r.body, "That didn't save. Nothing was changed."));
    setEdit(null);
    if (next) setPerson(next);
    else openPerson(person.id);
    setNote(`${f.label} saved.`);
    loadGroups();
    onChanged();
  };

  const addPerson = async () => {
    if (!adding || busy) return;
    if (!adding.first_name.trim()) return setNote("The first name is required.");
    setBusy(true);
    const body: Record<string, string> = { first_name: adding.first_name.trim(), tier: adding.tier };
    for (const k of ["last_name", "phone", "email"] as const) if (adding[k].trim()) body[k] = adding[k].trim();
    const r = await post(peopleUrl, body);
    setBusy(false);
    const id = r.ok && r.body && typeof (r.body as { id?: unknown }).id === "string" ? (r.body as { id: string }).id : null;
    if (!id) return setNote(errorOf(r.body, "That person wasn't added. Nothing was changed."));
    setAdding(null);
    setNote(`${body.first_name} is in your contacts.`);
    loadGroups();
    onChanged();
    openPerson(id);
  };

  const loadTimeline = async (cursor: string | null = null) => {
    if (!person) return;
    const r = await getJson(timelineUrl(person.id, cursor));
    const t = r?.status === 200 ? readTimeline(r.body) : null;
    if (!t) return setNote("ONE couldn't load the history just now.");
    setTimeline((was) => (cursor && was ? { events: [...was.events, ...t.events], next: t.next } : t));
  };

  // ---- the map -----------------------------------------------------------------------------
  const layout = useMemo(() => {
    const orbs = new Map<string, { x: number; y: number; k: number; lx: number; ly: number; anchor: "start" | "middle" | "end" }>();
    const seats: { id: string; x: number; y: number; r: number; fx: number; fy: number; delay: number }[] = [];
    const gs = groups?.groups ?? [];
    if (group) {
      const others = gs.filter((g) => g.key !== group);
      orbs.set(group, { x: C, y: C, k: 1, lx: C, ly: C + 24, anchor: "middle" });
      others.forEach((g, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * (i + 0.5)) / others.length;
        const x = C + OR * Math.cos(a), y = C + OR * Math.sin(a);
        orbs.set(g.key, { x, y, k: 0.3, lx: x, ly: y + 44, anchor: "middle" });
      });
      const fr = focusFace(people.length);
      ringRows(people.map((p) => p.id), C, C, focusRings(100, fr), fr, 26).forEach((s, j) => seats.push({ id: s.id, x: s.x, y: s.y, r: fr, fx: C, fy: C, delay: Math.min(j, 40) * 22 }));
    } else {
      gs.forEach((g, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / gs.length;
        const x = C + FR * Math.cos(a), y = C + FR * Math.sin(a);
        const l = labelAt(a);
        orbs.set(g.key, { x, y, k: 0.44, lx: x + l.dx, ly: y + l.dy, anchor: l.anchor });
      });
    }
    return { orbs, seats };
  }, [groups, group, people]);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p] as const)), [people]);

  // A person in the middle, their sections round them. Tap a section: it comes to the middle,
  // the person and the other sections step back to the outer ring, and its fields fly out round
  // it. Tap a field: it comes to the middle; a list (children, pets) opens into one orb each.
  const drill = useMemo(() => {
    if (!person) return null;
    const secs = person.sections;
    const sec = focusSec ? secs.find((s) => s.key === focusSec) ?? null : null;
    const ring = (i: number, n: number, r: number, skipTop = false) => {
      const a = skipTop ? -Math.PI / 2 + (2 * Math.PI * (i + 1)) / (n + 1) : -Math.PI / 2 + (2 * Math.PI * i) / n;
      return { x: C + r * Math.cos(a), y: C + r * Math.sin(a), a };
    };
    const home = new Map(secs.map((s, i) => [s.key, ring(i, secs.length, SR)] as const));
    const place = new Map<string, { x: number; y: number; k: number }>();
    if (!sec) secs.forEach((s) => place.set(s.key, { ...home.get(s.key)!, k: 1 }));
    else {
      const others = secs.filter((s) => s.key !== sec.key);
      others.forEach((s, i) => place.set(s.key, { ...ring(i, others.length, OR, true), k: 0.85 }));
      // a field open: the section waits half way up, between the person and the field (a trail back)
      place.set(sec.key, focusFld ? { x: C, y: C - OR * 0.7, k: 0.8 } : { x: C, y: C, k: 1.7 });
    }
    const face = sec ? { x: C, y: C - OR, k: 0.42 } : { x: C, y: C, k: 1 };
    const fields = sec ? sec.fields : [];
    const fr = Math.min(64, focusFace(fields.length) + 12);
    const fieldSeats = sec && !focusFld ? ringRows(fields.map((f) => f.key), C, C, focusRings(110, fr), fr, 26) : [];
    const fld = sec && focusFld ? fields.find((f) => f.key === focusFld) ?? null : null;
    const items = fld && Array.isArray(fld.value) ? fld.value : [];
    const ir = focusFace(items.length);
    const itemSeats = items.length ? ringRows(items.map((_, i) => String(i)), C, C, focusRings(100, ir), ir, 26) : [];
    return { home, place, face, sec, fields, fr, fieldSeats, fld, items, itemSeats };
  }, [person, focusSec, focusFld]);

  const focusSection = (key: string | null) => {
    setFocusFld(null);
    setEdit(null);
    setFocusSec(key);
    if (key) {
      setOpenSec(key);
      setTimeout(() => document.getElementById(`pc-sec-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
    cam.reset();
  };
  const focusField = (f: Field) => {
    setFocusFld(f.key);
    setEdit(f.editable && f.type !== "list" ? { key: f.key, text: editText(f) } : null);
    setTimeout(() => document.getElementById(`pc-f-${f.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  if (err) {
    return (
      <div className="vr-msg" role="alert">
        <p>{err}</p>
        <button className="vr-btn" onClick={onClassic}>Open the Classic page</button>
      </div>
    );
  }
  if (!groups) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening your contacts…
      </div>
    );
  }

  const gLabel = (k: string) => groups.groups.find((g) => g.key === k)?.label ?? k;
  const tel = person ? dialable(person.phone) : null;
  const mail = person ? mailable(person.email) : null;
  const faceOf = (p: { id: string; name: string; photo: string | null }, r: number, clip: string) =>
    p.photo ? (
      <>
        <clipPath id={clip}>
          <circle r={r - 1.5} />
        </clipPath>
        <image href={p.photo} x={-r} y={-r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} pointerEvents="none" />
      </>
    ) : (
      <text className="vr-init vr-init-50" dy="0.35em" textAnchor="middle" fontSize={r * 0.7} pointerEvents="none">{initialsOf(p.name)}</text>
    );

  const row = (p: PersonItem) => (
    <li key={p.id}>
      <button className="ta-name" onClick={() => openPerson(p.id)} disabled={opening === p.id}>{p.name}</button>
      <span className={p.pulse ? "pc-pulse" : undefined}>{p.pulse ?? personTag(p)}</span>
    </li>
  );

  return (
    <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="vr-stage">
        <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label={person ? person.name : group ? gLabel(group) : "My Contacts"}>
          <defs>
            <radialGradient id="pc-glass" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#070b18" />
              <stop offset="0.7" stopColor="#0b1020" />
              <stop offset="1" stopColor="#2a2a3a" />
            </radialGradient>
            {groups.groups.map((g) => (
              <radialGradient key={g.key} id={`pc-glow-${g.key}`}>
                <stop offset="0.45" stopColor={groupColor(g.key)} stopOpacity="0.35" />
                <stop offset="1" stopColor={groupColor(g.key)} stopOpacity="0" />
              </radialGradient>
            ))}
            <radialGradient id="pc-core-glow">
              <stop offset="0.45" stopColor={GOLD} stopOpacity="0.3" />
              <stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* the groups: round the core, or one in the middle; they step back while a person is open */}
          <g className={`fx-move${person ? " fx-gone" : ""}`} style={{ opacity: person ? 0 : 1 }} pointerEvents={person ? "none" : undefined}>
            <circle key={`track-${group ?? "all"}`} className="vr-track fx-fade" cx={C} cy={C} r={group ? OR : FR} />
            {!group && [...layout.orbs.entries()].map(([k, o]) => <line key={`l-${k}`} className="vr-link fx-fade" x1={C} y1={C} x2={o.x} y2={o.y} pointerEvents="none" />)}

            <g className={`fx-move${group ? " fx-gone" : ""}`} style={{ transform: `translate(${C}px, ${C}px) scale(${group ? 0.3 : 1})` }} pointerEvents="none">
              <circle r={140} fill="url(#pc-core-glow)" />
              <circle r={100} fill="url(#pc-glass)" stroke={GOLD} strokeWidth={3} />
              <text className="dt-score" y={-8} textAnchor="middle">{groups.total.toLocaleString("en-US")}</text>
              <text className="dt-score-sub" y={22} textAnchor="middle" style={{ fill: "#ffe08a" }}>MY CONTACTS</text>
              {groups.needsYou > 0 && <text className="rx-name" y={50} textAnchor="middle" style={{ fill: GOLD, fontSize: 15 }}>{`${groups.needsYou} need you`}</text>}
            </g>

            {layout.seats.map((s) => {
              const p = byId.get(s.id);
              if (!p) return null;
              const col = groupColor(group ?? "other");
              const vars = { "--fx": `${s.fx}px`, "--fy": `${s.fy}px`, "--tx": `${s.x}px`, "--ty": `${s.y}px`, animationDelay: `${s.delay}ms` } as React.CSSProperties;
              const nameSize = Math.max(13, s.r * 0.34);
              return [
                <line key={`ln-${group}-${s.id}`} className="fx-fade" x1={s.fx} y1={s.fy} x2={s.x} y2={s.y} stroke={col} strokeOpacity={0.14} pointerEvents="none" style={{ animationDelay: `${s.delay + 200}ms` }} />,
                <g
                  key={`${group}-${s.id}`}
                  data-tap
                  className="rx-biz fx-out"
                  style={vars}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.name}${p.pulse ? `, Pulse: ${p.pulse}` : ""}`}
                  onClick={() => openPerson(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openPerson(p.id);
                    }
                  }}
                >
                  <title>{p.pulse ? `${p.name} · ${p.pulse}` : p.name}</title>
                  {glowing.has(p.id) && <circle r={s.r + 10} fill="none" stroke={GOLD} strokeWidth={4} className="sd-glow" pointerEvents="none" />}
                  <PulseRing r={s.r} level={p.pulse ? p.urgency ?? "today" : "good"} />
                  <circle r={s.r} fill="#121a36" stroke={col} strokeWidth={1.8} />
                  {faceOf(p, s.r, `pc-f-${s.id}`)}
                  <text className="hw-face-name" y={s.r + nameSize + 4} textAnchor="middle" style={{ fontSize: nameSize }}>{p.firstName ?? p.name.split(" ")[0]}</text>
                </g>,
              ];
            })}

            {groups.groups.map((g) => {
              const o = layout.orbs.get(g.key)!;
              const col = groupColor(g.key);
              const centre = group === g.key;
              const act = () => openGroup(g.key);
              return (
                <g key={g.key}>
                  <g
                    data-tap
                    className="rx-group fx-move"
                    style={{ transform: `translate(${o.x}px, ${o.y}px) scale(${o.k})` }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={centre}
                    aria-label={centre ? `${g.label}: back to all groups` : `${g.label}, ${g.count} ${g.count === 1 ? "person" : "people"}${g.needsYou ? `, ${g.needsYou} need you` : ""}`}
                    onClick={act}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        act();
                      }
                    }}
                  >
                    <circle r={190} fill={`url(#pc-glow-${g.key})`} opacity={g.count ? 1 : 0.35} />
                    {g.count > 0 && <PulseRing r={100} level={levelOf(g.needsYou, g.needsNow)} />}
                    <circle r={100} fill="url(#pc-glass)" stroke={col} strokeWidth={centre ? 4 : 5} opacity={g.count ? 1 : 0.5} strokeDasharray={g.kind === "source" ? "14 8" : undefined} />
                    <text className="rx-n-big" y={centre ? -6 : 0} dy={centre ? 0 : "0.35em"} textAnchor="middle" style={g.count > 999 ? { fontSize: 40 } : undefined}>{g.count.toLocaleString("en-US")}</text>
                    {g.needsYou > 0 && (
                      <g transform="translate(72,-72)" pointerEvents="none">
                        <circle r={30} fill={PULSE_COLOR[levelOf(g.needsYou, g.needsNow)]} stroke="#070b18" strokeWidth={5} />
                        <text dy="0.35em" textAnchor="middle" style={{ fill: "#1b1400", fontSize: 28, fontWeight: 800 }}>{g.needsYou}</text>
                      </g>
                    )}
                  </g>
                  <g className="fx-move" style={{ transform: `translate(${o.lx}px, ${o.ly}px)` }} pointerEvents="none">
                    <text className="rx-fam" dy="0.35em" textAnchor={o.anchor} style={{ fill: col }}>{g.label.toUpperCase()}</text>
                    {centre && <text key={`back-${g.key}`} className="rx-back fx-fade" y={26} textAnchor="middle" style={{ animationDelay: "500ms" }}>tap for all groups</text>}
                  </g>
                </g>
              );
            })}
            {group && people.length === 0 && (groups.groups.find((g) => g.key === group)?.count ?? 0) === 0 && (
              <text key={`empty-${group}`} x={C} y={C + 170} textAnchor="middle" className="rx-name fx-fade">No one in this group yet</text>
            )}
          </g>

          {/* one person, then a section, then a field: whatever is tapped comes to the middle */}
          {person && drill && (
            <g key={`p-${person.id}`}>
              <circle className="vr-track fx-move" cx={C} cy={C} r={drill.sec ? OR : SR} />
              {!drill.sec &&
                person.sections.map((s, i) => {
                  const h = drill.home.get(s.key)!;
                  return <line key={`sl-${s.key}`} className="fx-fade" x1={C} y1={C} x2={h.x} y2={h.y} stroke={sectionColor(s.key)} strokeOpacity={0.22} pointerEvents="none" style={{ animationDelay: `${i * 45 + 200}ms` }} />;
                })}

              {/* the sections: they fly out of the person once, then glide between places */}
              {person.sections.map((s, i) => {
                const col = sectionColor(s.key);
                const gaps = gapsIn(s);
                const h = drill.home.get(s.key)!;
                const at = drill.place.get(s.key)!;
                const centre = drill.sec?.key === s.key && !drill.fld;
                const act = () => (centre ? focusSection(null) : drill.sec?.key === s.key ? setFocusFld(null) : focusSection(s.key));
                const vars = { "--fx": `${C}px`, "--fy": `${C}px`, "--tx": `${h.x}px`, "--ty": `${h.y}px`, animationDelay: `${i * 45}ms` } as React.CSSProperties;
                return (
                  <g key={`sec-${s.key}`} className="fx-out" style={vars}>
                    <g
                      data-tap
                      className="rx-biz fx-move"
                      style={{ transform: `translate(${at.x - h.x}px, ${at.y - h.y}px) scale(${at.k})` }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={drill.sec?.key === s.key}
                      aria-label={centre ? `${s.label}: back to ${person.name}` : `${s.label}${s.summary ? `, ${s.summary}` : ""}${gaps ? `, ${gaps} to fill in` : ""}`}
                      onClick={act}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          act();
                        }
                      }}
                    >
                      <circle r={84} fill={col} opacity={centre ? 0.18 : 0.1} pointerEvents="none" />
                      <circle r={64} fill="url(#pc-glass)" stroke={drill.sec?.key === s.key ? "#fff" : col} strokeWidth={drill.sec?.key === s.key ? 3 : 2.2} />
                      {twoLines(s.label).map((ln, k, all) => (
                        <text key={k} y={(k - all.length / 2) * 17 + 4} textAnchor="middle" className="pc-sec-label" style={{ fill: col }}>{ln}</text>
                      ))}
                      <text y={twoLines(s.label).length > 1 ? 30 : 22} textAnchor="middle" className="pc-sec-sum">{centre ? "tap to go back" : s.summary ?? (gaps === s.fields.length ? "empty" : "")}</text>
                      {gaps > 0 && !centre && (
                        <g transform="translate(46,-46)" pointerEvents="none">
                          <circle r={13} fill="#121a36" stroke={GOLD} strokeWidth={2} />
                          <text dy="0.35em" textAnchor="middle" style={{ fill: GOLD, fontSize: 12, fontWeight: 800 }}>{gaps}</text>
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}

              {/* a section's fields, flying out of it */}
              {drill.sec &&
                drill.fieldSeats.map((seat, j) => {
                  const f = drill.fields.find((x) => x.key === seat.id)!;
                  const col = sectionColor(drill.sec!.key);
                  const shown = showValue(f);
                  const yes = f.type === "choice" && f.value === "Yes";
                  const vars = { "--fx": `${C}px`, "--fy": `${C}px`, "--tx": `${seat.x}px`, "--ty": `${seat.y}px`, animationDelay: `${120 + j * 35}ms` } as React.CSSProperties;
                  const r = seat.r;
                  return [
                    <line key={`fl-${drill.sec!.key}-${f.key}`} className="fx-fade" x1={C} y1={C} x2={seat.x} y2={seat.y} stroke={col} strokeOpacity={0.16} pointerEvents="none" style={{ animationDelay: `${j * 35 + 300}ms` }} />,
                    <g
                      key={`f-${drill.sec!.key}-${f.key}`}
                      data-tap
                      className="rx-biz fx-out"
                      style={vars}
                      role="button"
                      tabIndex={0}
                      aria-label={`${f.label}: ${shown ?? "empty"}${f.editable ? "" : ", read only"}`}
                      onClick={() => focusField(f)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          focusField(f);
                        }
                      }}
                    >
                      <title>{`${f.label}: ${shown ?? "empty"}`}</title>
                      <circle r={r + 8} fill={yes ? TEAL : col} opacity={yes ? 0.22 : 0.08} pointerEvents="none" />
                      <circle r={r} fill={yes ? "#0e2b2a" : "url(#pc-glass)"} stroke={shown == null ? GOLD : yes ? TEAL : col} strokeWidth={yes ? 3 : 1.8} strokeDasharray={shown == null ? "5 5" : undefined} opacity={f.editable || shown != null ? 1 : 0.6} />
                      {fitLines(shown == null ? (f.editable ? "Add" : "—") : yes ? "✓" : shown, r).map((ln, k, all) => (
                        <text key={k} y={(k - (all.length - 1) / 2) * r * 0.36} dy="0.35em" textAnchor="middle" className="pc-f-val" style={{ fontSize: yes ? r * 0.7 : Math.max(11, r * 0.28), fill: shown == null ? GOLD : yes ? "#8af0de" : "#eef1f8" }}>{ln}</text>
                      ))}
                      <text className="hw-face-name" y={r + Math.max(13, r * 0.3) + 4} textAnchor="middle" style={{ fontSize: Math.max(13, r * 0.3) }}>{f.label.length > 18 ? `${f.label.slice(0, 17)}…` : f.label}</text>
                    </g>,
                  ];
                })}

              {/* one field in the middle; a list opens into one orb each */}
              {drill.fld && (
                <g key={`fld-${drill.fld.key}`}>
                  <g
                    data-tap
                    className="rx-biz fx-out"
                    style={{ "--fx": `${C}px`, "--fy": `${C}px`, "--tx": `${C}px`, "--ty": `${C}px` } as React.CSSProperties}
                    role="button"
                    tabIndex={0}
                    aria-label={`${drill.fld.label}: back to ${drill.sec!.label}`}
                    onClick={() => setFocusFld(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setFocusFld(null);
                      }
                    }}
                  >
                    <circle r={150} fill="url(#pc-core-glow)" pointerEvents="none" />
                    <circle r={108} fill="url(#pc-glass)" stroke={showValue(drill.fld) == null ? GOLD : sectionColor(drill.sec!.key)} strokeWidth={4} strokeDasharray={showValue(drill.fld) == null ? "8 6" : undefined} />
                    <text y={-56} textAnchor="middle" className="pc-sec-label" style={{ fill: sectionColor(drill.sec!.key), fontSize: 16 }}>{drill.fld.label.length > 20 ? `${drill.fld.label.slice(0, 19)}…` : drill.fld.label}</text>
                    {drill.items.length ? (
                      <text y={6} textAnchor="middle" className="rx-n-big" style={{ fontSize: 48 }}>{drill.items.length}</text>
                    ) : (
                      fitLines(showValue(drill.fld) ?? (drill.fld.editable ? "Add it in the card" : "Not filled in"), 108).map((ln, k, all) => (
                        <text key={k} y={(k - (all.length - 1) / 2) * 30 + 8} dy="0.35em" textAnchor="middle" className="pc-f-val" style={{ fontSize: 24, fill: showValue(drill.fld!) == null ? GOLD : "#fff" }}>{ln}</text>
                      ))
                    )}
                    <text y={80} textAnchor="middle" className="pc-sec-sum">tap to go back</text>
                  </g>
                  {drill.itemSeats.map((seat, j) => {
                    const label = drill.items[Number(seat.id)];
                    const vars = { "--fx": `${C}px`, "--fy": `${C}px`, "--tx": `${seat.x}px`, "--ty": `${seat.y}px`, animationDelay: `${150 + j * 40}ms` } as React.CSSProperties;
                    const name = label.split(/ \(| born /)[0];
                    const rest = label.slice(name.length).trim();
                    return [
                      <line key={`il-${j}`} className="fx-fade" x1={C} y1={C} x2={seat.x} y2={seat.y} stroke={sectionColor(drill.sec!.key)} strokeOpacity={0.2} pointerEvents="none" style={{ animationDelay: `${j * 40 + 300}ms` }} />,
                      <g key={`it-${j}`} className="rx-biz fx-out" style={vars} pointerEvents="none">
                        <circle r={seat.r} fill="#121a36" stroke={sectionColor(drill.sec!.key)} strokeWidth={2} />
                        <text dy="0.35em" textAnchor="middle" className="vr-init vr-init-50" fontSize={seat.r * 0.62}>{initialsOf(name)}</text>
                        <text className="hw-face-name" y={seat.r + 18} textAnchor="middle" style={{ fontSize: 15 }}>{name}</text>
                        {rest && <text className="pc-sec-sum" y={seat.r + 36} textAnchor="middle" style={{ fontSize: 12 }}>{rest.replace(/^\(|\)$/g, "")}</text>}
                      </g>,
                    ];
                  })}
                </g>
              )}

              {/* the person: in the middle first, then up on the outer ring (tap to come back) */}
              <g className="fx-out" style={{ "--fx": `${C}px`, "--fy": `${C}px`, "--tx": `${C}px`, "--ty": `${C}px` } as React.CSSProperties}>
                <g
                  data-tap
                  className="rx-biz fx-move"
                  style={{ transform: `translate(${drill.face.x - C}px, ${drill.face.y - C}px) scale(${drill.face.k})` }}
                  role={drill.sec ? "button" : undefined}
                  tabIndex={drill.sec ? 0 : -1}
                  aria-label={drill.sec ? `Back to ${person.name}` : undefined}
                  pointerEvents={drill.sec ? undefined : "none"}
                  onClick={() => drill.sec && focusSection(null)}
                  onKeyDown={(e) => {
                    if (drill.sec && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      focusSection(null);
                    }
                  }}
                >
                  {glowing.has(person.id) && <circle r={128} fill="none" stroke={GOLD} strokeWidth={5} className="sd-glow" />}
                  <circle r={150} fill="url(#pc-core-glow)" opacity={drill.sec ? 0.5 : 1} />
                  <PulseRing r={112} level={person.pulse ? person.pulse.urgency : "good"} />
                  <circle r={112} fill="#121a36" stroke={person.pulse ? PULSE_COLOR[person.pulse.urgency] : TEAL} strokeWidth={4} />
                  {faceOf(person, 112, `pc-big-${person.id}`)}
                  <text className="hw-face-name" y={146} textAnchor="middle" style={{ fontSize: drill.sec ? 40 : 26 }}>{drill.sec ? person.firstName ?? person.name : person.name}</text>
                </g>
              </g>
            </g>
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
          <button onClick={cam.reset} aria-label="Centre on your contacts">◎</button>
        </div>
      </div>

      <aside ref={drawerRef} className="drawer vr-drawer" aria-label="My Contacts">
        <input className="rx-search pc-search" type="search" placeholder="Search name, phone, email, address, notes…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search your contacts" />
        {found ? (
          <>
            <h2>{found.length ? `${found.length}${found.length === 50 ? "+" : ""} found` : "No one found"}</h2>
            <ul className="ta-list">{found.map(row)}</ul>
            <button className="vr-classic" onClick={() => setQ("")}>Clear the search</button>
          </>
        ) : adding ? (
          <form
            className="rx-form"
            onSubmit={(e) => {
              e.preventDefault();
              addPerson();
            }}
          >
            <div className="d-head">
              <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>New contact</span>
            </div>
            <h1 className="d-title">Add a person</h1>
            {(
              [
                ["first_name", "First name", "text"],
                ["last_name", "Last name", "text"],
                ["phone", "Phone", "tel"],
                ["email", "Email", "email"],
              ] as const
            ).map(([k, label, type]) => (
              <label key={k} className="pf-field">
                <span>{label}</span>
                <input type={type} value={adding[k]} maxLength={k === "email" ? 200 : 80} autoFocus={k === "first_name"} onChange={(e) => setAdding({ ...adding, [k]: e.target.value })} />
              </label>
            ))}
            <label className="pf-field">
              <span>List</span>
              <select value={adding.tier} onChange={(e) => setAdding({ ...adding, tier: e.target.value })}>
                <option value="contact">Contacts (not a VIP)</option>
                <option value="vip100">VIP-100</option>
                <option value="vip50">VIP-50</option>
              </select>
            </label>
            <p className="d-sum rx-small">Everything else (birthday, family, home) you fill in on their card once they're added.</p>
            <div className="pf-actions">
              <button type="submit" className="chip-btn primary" disabled={busy}>{busy ? "Adding…" : "Add"}</button>
              <button type="button" className="chip-btn" onClick={() => setAdding(null)}>Cancel</button>
            </div>
          </form>
        ) : person ? (
          <>
            <div className="d-head">
              {personTag(person) && <span className="chip" style={{ color: TEAL, borderColor: TEAL }}>{personTag(person)}</span>}
              {person.stage && <span className="chip">{person.stage}</span>}
            </div>
            <h1 className="d-title">{person.name}</h1>
            {person.pulse && (
              <p className="pc-pulse-line">
                <b>Pulse</b> {person.pulse.line}
              </p>
            )}
            <div className="ta-log">
              {tel && <a className={`chip-btn${person.pulse?.nextStep === "call" ? " primary" : ""}`} href={`tel:${tel}`}>Call</a>}
              {tel && <a className={`chip-btn${person.pulse?.nextStep === "text" ? " primary" : ""}`} href={`sms:${tel}`}>Text</a>}
              {mail && <a className="chip-btn" href={`mailto:${mail}`}>Email</a>}
            </div>
            {person.sections.map((s) => (
              <SectionCard
                key={s.key}
                s={s}
                open={openSec === s.key}
                onToggle={() => {
                  const opening = openSec !== s.key;
                  setOpenSec(opening ? s.key : null);
                  setEdit(null);
                  setFocusFld(null);
                  setFocusSec(opening ? s.key : null);
                }}
                edit={edit}
                setEdit={setEdit}
                busy={busy}
                onSave={saveField}
              />
            ))}
            <section className="pc-card">
              <button
                className="pc-card-h"
                aria-expanded={!!timeline}
                onClick={() => (timeline ? setTimeline(null) : loadTimeline())}
              >
                <span style={{ color: "#c8d0e6" }}>History</span>
                <small>{person.timelineCount ? `${person.timelineCount} things` : "nothing yet"}</small>
              </button>
              {timeline && (
                <ul className="pc-time">
                  {timeline.events.map((e, i) => (
                    <li key={`${e.at}-${i}`}>
                      <time>{e.at.slice(0, 10)}</time>
                      <span>{e.title}</span>
                      {e.detail && <small>{e.detail}</small>}
                    </li>
                  ))}
                  {timeline.events.length === 0 && <li><span>Nothing recorded yet.</span></li>}
                  {timeline.next && <li><button className="vr-classic" onClick={() => loadTimeline(timeline.next)}>Older</button></li>}
                </ul>
              )}
            </section>
            <button className="vr-classic" onClick={() => setPerson(null)}>{group ? `Back to ${gLabel(group)}` : "Back to all groups"}</button>
          </>
        ) : (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: TEAL, borderColor: TEAL }}>ONE MOVE</span>
              {group && <span className="chip" style={{ color: groupColor(group), borderColor: groupColor(group) }}>{gLabel(group)}</span>}
            </div>
            <h1 className="d-title">{group ? gLabel(group) : "My Contacts"}</h1>
            <p className="d-sub">{group ? `${more.total.toLocaleString("en-US")} ${more.total === 1 ? "person" : "people"}, who needs you first` : `${groups.total.toLocaleString("en-US")} people · ${groups.needsYou} need you`}</p>
            <div className="ta-log">
              <button className="chip-btn primary" onClick={() => setAdding({ first_name: "", last_name: "", phone: "", email: "", tier: "contact" })}>+ Add a person</button>
            </div>
            {!group && (groups.gaps.vipNoBirthday > 0 || groups.gaps.toSort > 0 || groups.gaps.possibleDuplicates > 0) && (
              <div className="pc-gaps">
                {groups.gaps.vipNoBirthday > 0 && <button className="chip-btn" onClick={() => openGroup("vip50")}>{`${groups.gaps.vipNoBirthday} VIPs with no birthday`}</button>}
                {groups.gaps.toSort > 0 && <button className="chip-btn" onClick={() => openGroup("to_sort")}>{`${groups.gaps.toSort} new to sort`}</button>}
                {groups.gaps.possibleDuplicates > 0 && <span className="chip">{`${groups.gaps.possibleDuplicates} possible duplicates`}</span>}
              </div>
            )}
            {group ? (
              <>
                <ul className="ta-list">{people.map(row)}</ul>
                {more.next && <button className="vr-classic" onClick={() => loadGroup(group, more.next)}>{`Show more (${(more.total - people.length).toLocaleString("en-US")} left)`}</button>}
                <button className="vr-classic" onClick={() => openGroup(group)}>All groups</button>
              </>
            ) : (
              <>
                <h2>Pulse: who needs you</h2>
                {due.length ? <ul className="ta-list">{due.map(row)}</ul> : <p className="d-sum">No one is waiting on you right now.</p>}
              </>
            )}
            <button className="vr-classic" onClick={onClassic}>Open the Classic contacts page</button>
          </>
        )}
      </aside>
    </div>
  );
}

/** A value inside an orb: up to three short lines, cut with an ellipsis. */
function fitLines(text: string, r: number): string[] {
  const per = Math.max(6, Math.floor(r / 6.2));
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= per) cur += " " + w;
    else {
      out.push(cur);
      cur = w;
    }
    if (out.length === 3) break;
  }
  if (out.length < 3 && cur) out.push(cur);
  const all = words.join(" ");
  const lines = out.slice(0, 3).map((l) => (l.length > per ? `${l.slice(0, per - 1)}…` : l));
  if (lines.join(" ").length < all.length && lines.length === 3 && !lines[2].endsWith("…")) lines[2] = `${lines[2].slice(0, per - 1)}…`;
  return lines;
}

/** A section's name on its orb: at most two short lines. */
function twoLines(label: string): string[] {
  if (label.length <= 12) return [label];
  const words = label.split(" ");
  let a = "";
  while (words.length && (a + " " + words[0]).trim().length <= 12) a = (a + " " + words.shift()).trim();
  if (!a) a = words.shift() ?? "";
  const b = words.join(" ");
  return b ? [a, b.length > 13 ? `${b.slice(0, 12)}…` : b] : [a];
}

function SectionCard({
  s,
  open,
  onToggle,
  edit,
  setEdit,
  busy,
  onSave,
}: {
  s: Section;
  open: boolean;
  onToggle: () => void;
  edit: { key: string; text: string } | null;
  setEdit: (e: { key: string; text: string } | null) => void;
  busy: boolean;
  onSave: (f: Field) => void;
}) {
  const col = sectionColor(s.key);
  const gaps = gapsIn(s);
  return (
    <section className="pc-card" id={`pc-sec-${s.key}`}>
      <button className="pc-card-h" aria-expanded={open} onClick={onToggle}>
        <span style={{ color: col }}>{s.label}</span>
        <small>{[s.summary, gaps ? `${gaps} to fill in` : null].filter(Boolean).join(" · ")}</small>
      </button>
      {open && (
        <dl className="pc-fields">
          {s.fields.map((f) => {
            const shown = showValue(f);
            const editing = edit?.key === f.key;
            return (
              <div key={f.key} id={`pc-f-${f.key}`} className={`pc-field${shown == null ? " gap" : ""}`}>
                <dt>{f.label}</dt>
                <dd>
                  {editing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onSave(f);
                      }}
                    >
                      {f.type === "choice" ? (
                        <select autoFocus value={edit.text} onChange={(e) => setEdit({ key: f.key, text: e.target.value })}>
                          <option value="">—</option>
                          {(f.choices ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : f.type === "list" || (f.type === "text" && (shown?.length ?? 0) > 60) ? (
                        <textarea autoFocus rows={3} value={edit.text} onChange={(e) => setEdit({ key: f.key, text: e.target.value })} />
                      ) : (
                        <input
                          autoFocus
                          value={edit.text}
                          type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"}
                          inputMode={f.type === "number" || f.type === "money" ? "decimal" : f.type === "date" ? "numeric" : undefined}
                          placeholder={f.type === "date" ? "MM-DD-YYYY or MM-DD" : undefined}
                          onChange={(e) => setEdit({ key: f.key, text: e.target.value })}
                        />
                      )}
                      <span className="pf-actions">
                        <button type="submit" className="chip-btn primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                        <button type="button" className="chip-btn" onClick={() => setEdit(null)}>Cancel</button>
                      </span>
                    </form>
                  ) : f.editable ? (
                    <button className="pc-value" onClick={() => setEdit({ key: f.key, text: editText(f) })} aria-label={`${f.label}: ${shown ?? "empty"}. Edit`}>
                      {shown ?? <em>Add</em>}
                    </button>
                  ) : (
                    <span className="pc-value ro">{shown ?? <em>—</em>}</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
