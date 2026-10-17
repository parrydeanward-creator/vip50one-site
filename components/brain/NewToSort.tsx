"use client";

import { useMemo, useState } from "react";
import { initialsOf, ringRows } from "@/lib/vips.ts";
import { focusFace, focusRings } from "@/lib/orbs.ts";
import { phoneLine } from "@/lib/hwc.ts";
import { dialable } from "@/lib/contact.ts";
import { EMPTY_LINE, KIND_COLOR, KIND_LABEL, SORT_BUTTONS, countOf, pulseLine, sortPerson, sortedLine, sourceTitle, waitingOldestFirst, whereLine, type NewToSort as Nts, type NtsPerson, type NtsSource, type SortTo } from "@/lib/newToSort.ts";
import PulseMark from "./PulseMark.tsx";
import PulseRing from "./PulseRing.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";

// New to Sort in ONE Brain (lib/newToSort.ts), built like Hot/Warm/Cold: the New to Sort orb in the middle with one orb
// per source round it and the people as faces round their source. A tapped source comes to the middle with its people
// round it; a tapped face glides to the middle and opens in the side panel: where they came from, what they said, their
// details, Pulse's one line and the six buttons. The side panel without a person lists everyone waiting, oldest first,
// with the same buttons per row. Nothing is sent to anyone; nobody goes into the VIP-50 here.

const SIZE = 1700;
const C = 850;
const HUB = 130;
const SRC = 92;
const FOCUS = 170;
const RING = 520;
const MOVE_GREEN = "#2fb7a3";

export default function NewToSort({
  data,
  live,
  onSorted,
  onBack,
  onClassic,
}: {
  data: Nts | null;
  live: boolean;
  onSorted: (contactId: string, to: SortTo) => void;
  onBack: () => void;
  onClassic: () => void;
}) {
  const [only, setOnly] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const cam = useSvgCamera(SIZE);
  const sources = useMemo(() => data?.sources ?? [], [data]);
  const total = countOf(data);
  const shownOnly = only && sources.some((s) => s.key === only) ? only : null;

  // where each source orb sits: round the hub, or (one chosen) in the middle with the rest along the top
  const pos = useMemo(() => {
    const out = new Map<string, { x: number; y: number; r: number }>();
    if (shownOnly) {
      const rest = sources.filter((s) => s.key !== shownOnly);
      out.set(shownOnly, { x: C, y: C + 90, r: FOCUS });
      rest.forEach((s, i) => out.set(s.key, { x: C + (i - (rest.length - 1) / 2) * 300 + 220, y: 190, r: 70 }));
      return out;
    }
    sources.forEach((s, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, sources.length);
      out.set(s.key, { x: C + Math.cos(a) * RING, y: C + Math.sin(a) * RING, r: SRC });
    });
    return out;
  }, [sources, shownOnly]);
  const hub = shownOnly ? { x: C - (sources.length > 1 ? 560 : 300), y: 190, r: 70 } : { x: C, y: C, r: HUB };

  const seats = useMemo(() => {
    return sources
      .filter((s) => !shownOnly || s.key === shownOnly)
      .flatMap((s) => {
        const p = pos.get(s.key)!;
        const ids = s.people.map((x) => x.contactId);
        if (shownOnly) {
          const r = focusFace(ids.length);
          return ringRows(ids, p.x, p.y, focusRings(FOCUS, r), r, 18).map((x) => ({ ...x, src: s.key }));
        }
        return ringRows(ids, p.x, p.y, [SRC + 58, SRC + 112, SRC + 166], 26, 8).map((x) => ({ ...x, src: s.key }));
      });
  }, [sources, shownOnly, pos]);

  const byId = useMemo(() => {
    const m = new Map<string, { person: NtsPerson; source: NtsSource }>();
    for (const source of sources) for (const person of source.people) m.set(person.contactId, { person, source });
    return m;
  }, [sources]);
  const who = pick ? byId.get(pick) ?? null : null;
  const waiting = waitingOldestFirst(data, shownOnly);

  const sort = async (p: NtsPerson, to: SortTo) => {
    if (busy) return;
    setNote(null);
    if (!live) {
      setNote(`${sortedLine(p.firstName, to)} (example)`);
      if (pick === p.contactId) {
        setPick(null);
        cam.reset();
      }
      return onSorted(p.contactId, to);
    }
    setBusy(p.contactId);
    try {
      const r = await sortPerson(p, to);
      setNote(r.line);
      if (r.ok) {
        if (pick === p.contactId) {
          setPick(null);
          cam.reset();
        }
        onSorted(p.contactId, to);
      }
    } finally {
      setBusy(null);
    }
  };

  // a name in the list: that face glides to the middle too (Parry, 6 Oct: every orb, every view)
  const openPerson = (id: string) => {
    setNote(null);
    setPick(id);
    const f = seats.find((x) => x.id === id);
    if (f) cam.centreOn(f.x, f.y);
  };
  const pickSource = (key: string) => {
    setPick(null);
    setOnly((o) => (o === key ? null : key));
    cam.reset();
  };
  const back = () => {
    if (pick) {
      setPick(null);
      return cam.reset();
    }
    if (shownOnly) {
      setOnly(null);
      return cam.reset();
    }
    onBack();
  };
  const key = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  const buttons = (p: NtsPerson) => (
    <div className="ta-log nts-btns">
      {SORT_BUTTONS.map((b) => (
        <button
          key={b.to}
          className={`chip-btn${p.suggest?.cls === b.to ? " primary" : ""}`}
          style={b.color && p.suggest?.cls !== b.to ? { color: b.color, borderColor: b.color } : undefined}
          disabled={!!busy}
          onClick={() => sort(p, b.to)}
        >
          {b.label}
        </button>
      ))}
    </div>
  );

  if (!data) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening New to Sort…
      </div>
    );
  }

  return (
    <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="vr-stage">
        <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="New to Sort">
          <defs>
            <radialGradient id="nts-glass" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#070b18" />
              <stop offset="0.7" stopColor="#0b1020" />
              <stop offset="1" stopColor="#2a2a3a" />
            </radialGradient>
          </defs>
          {!shownOnly && sources.map((s) => {
            const p = pos.get(s.key)!;
            return <line key={`l-${s.key}`} className="vr-link" x1={C} y1={C} x2={p.x} y2={p.y} />;
          })}

          {/* the New to Sort orb: yellow while anyone waits, a still green ring when no one does */}
          <g
            data-tap
            className="hw-orb fx-move"
            style={{ transform: `translate(${hub.x}px, ${hub.y}px)` }}
            role="button"
            tabIndex={0}
            aria-label={`New to Sort: ${total} waiting`}
            onClick={() => {
              setPick(null);
              setOnly(null);
              cam.reset();
            }}
            onKeyDown={key(() => {
              setPick(null);
              setOnly(null);
              cam.reset();
            })}
          >
            <PulseRing r={hub.r + 4} level={total ? "today" : "good"} />
            <circle cx={0} cy={0} r={hub.r} fill="url(#nts-glass)" stroke={MOVE_GREEN} strokeWidth={3} />
            <text className="hw-n" x={0} y={-8} textAnchor="middle">{total}</text>
            <text className="hw-label" x={0} y={30} textAnchor="middle" style={{ fill: MOVE_GREEN, fontSize: hub.r < 100 ? 18 : undefined }}>NEW TO SORT</text>
          </g>

          {sources.map((s) => {
            const p = pos.get(s.key)!;
            const col = KIND_COLOR[s.kind];
            const on = shownOnly === s.key;
            return (
              <g
                key={s.key}
                data-tap
                className="hw-orb fx-move"
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${sourceTitle(s)}: ${s.people.length} to sort`}
                onClick={() => pickSource(s.key)}
                onKeyDown={key(() => pickSource(s.key))}
              >
                <PulseRing r={p.r + 3} level="today" />
                <circle cx={0} cy={0} r={p.r} fill="url(#nts-glass)" stroke={col} strokeWidth={2.5} />
                <text className="hw-n" x={0} y={-6} textAnchor="middle" style={{ fontSize: p.r * 0.42 }}>{s.people.length}</text>
                <text className="hw-label" x={0} y={p.r * 0.3} textAnchor="middle" style={{ fill: col, fontSize: Math.max(13, p.r * 0.17) }}>{KIND_LABEL[s.kind].toUpperCase()}</text>
                <text className="hw-face-name" x={0} y={p.r + 30} textAnchor="middle" style={{ fontSize: Math.max(15, p.r * 0.2) }}>{sourceTitle(s)}</text>
                {on && <text className="rx-back" x={0} y={p.r * 0.3 + 26} textAnchor="middle">tap for every source</text>}
              </g>
            );
          })}

          {seats.map((f, idx) => {
            const hit = byId.get(f.id);
            if (!hit) return null;
            const { person: p, source: s } = hit;
            const col = KIND_COLOR[s.kind];
            const on = pick === p.contactId;
            const from = pos.get(f.src)!;
            return (
              <g
                key={`${shownOnly ?? "all"}-${p.contactId}`}
                data-tap
                className="hw-face fx-out"
                style={{ "--fx": `${from.x}px`, "--fy": `${from.y}px`, "--tx": `${f.x}px`, "--ty": `${f.y}px`, animationDelay: `${Math.min(idx, 60) * 14}ms` } as React.CSSProperties}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}, ${sourceTitle(s)}`}
                onClick={() => {
                  setNote(null);
                  setPick(on ? null : p.contactId);
                  if (on) cam.reset();
                  else cam.centreOn(f.x, f.y);
                }}
                onKeyDown={key(() => {
                  setPick(on ? null : p.contactId);
                  if (on) cam.reset();
                  else cam.centreOn(f.x, f.y);
                })}
              >
                <desc>{p.name}</desc>
                <circle cx={0} cy={0} r={f.r} fill="#121a36" stroke={on ? "#fff" : col} strokeWidth={on ? 3 : 1.6} />
                <text x={0} y={0} dy="0.35em" textAnchor="middle" style={{ fill: col, fontSize: f.r * 0.72, fontWeight: 700 }} pointerEvents="none">{initialsOf(p.name)}</text>
                {p.rating === 5 && <circle cx={f.r * 0.72} cy={-f.r * 0.72} r={Math.max(5, f.r * 0.16)} fill="#f5c542" pointerEvents="none" />}
                {(shownOnly || on) && <text className="hw-face-name" y={f.r + Math.max(14, f.r * 0.36) + 4} textAnchor="middle" style={{ fontSize: Math.max(14, f.r * 0.36) }}>{p.firstName}</text>}
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
          <button onClick={cam.reset} aria-label="Centre on New to Sort">◎</button>
        </div>
      </div>

      <aside className="drawer vr-drawer" aria-label="New to Sort">
        {who ? (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: KIND_COLOR[who.source.kind], borderColor: KIND_COLOR[who.source.kind] }}>{KIND_LABEL[who.source.kind]}</span>
            </div>
            <h1 className="d-title">{who.person.name}</h1>
            <p className="d-sub">{whereLine(who.person, who.source)}</p>
            {who.person.rating ? <p className="d-sum">{`Rated it ${"★".repeat(who.person.rating)}${"☆".repeat(5 - who.person.rating)}`}</p> : null}
            {who.person.said && (
              <>
                <h2>What they said</h2>
                <blockquote className="hw-draft">{who.person.said}</blockquote>
              </>
            )}
            <h2>Details</h2>
            <ul className="ta-list">
              {who.person.phone ? (
                <li>
                  <span>Phone</span>
                  {dialable(who.person.phone) ? <a className="ta-name" href={`tel:${dialable(who.person.phone)}`}>{phoneLine(who.person.phone)}</a> : <span>{phoneLine(who.person.phone)}</span>}
                </li>
              ) : null}
              {who.person.email ? (
                <li>
                  <span>Email</span>
                  <a className="ta-name" href={`mailto:${who.person.email}`}>{who.person.email}</a>
                </li>
              ) : null}
              {!who.person.phone && !who.person.email && <li><span>No phone or email yet.</span></li>}
            </ul>
            <p className="hw-pulse-line">
              <PulseMark label={false} />
              <span>{pulseLine(who.person)}</span>
            </p>
            {buttons(who.person)}
            <p className="d-sum rx-small">Nothing is sent to them. Not for me archives them; nobody is deleted. The VIP-50 is chosen in VIP Management.</p>
          </>
        ) : (
          <>
            <div className="d-head">
              <span className="chip" style={{ color: MOVE_GREEN, borderColor: MOVE_GREEN }}>ONE MOVE</span>
            </div>
            <h1 className="d-title">{shownOnly ? sourceTitle(sources.find((s) => s.key === shownOnly)!) : "New to Sort"}</h1>
            <p className="d-sub">{total ? `${waiting.length} waiting, oldest first` : "No one waiting"}</p>
            {!data.fromMove && <p className="d-sum rx-small">ONE MOVE's full New to Sort list arrives with its next update; this shows the new people ONE already has.</p>}
            {!total && <p className="d-sum">{EMPTY_LINE}</p>}
            <ul className="ta-list nts-list">
              {waiting.map(({ person: p, source: s }) => (
                <li key={p.contactId} className="nts-row">
                  <button className="ta-name" onClick={() => openPerson(p.contactId)}>
                    <b>{p.name}</b> <small>{sourceTitle(s)}</small>
                  </button>
                  <p className="d-sum rx-small">{pulseLine(p)}</p>
                  {buttons(p)}
                </li>
              ))}
            </ul>
            <button className="vr-classic" onClick={onClassic}>Open the Classic page</button>
          </>
        )}
      </aside>
    </div>
  );
}
