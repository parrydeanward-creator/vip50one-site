"use client";

import { useCallback, useEffect, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import PulseRing from "./PulseRing.tsx";
import HomeReportSection from "./HomeReportSection.tsx";
import { monthWords } from "@/lib/marketPulse.ts";
import {
  bulkBody,
  bulkButton,
  bulkUrl,
  demoBulk,
  demoMonthCard,
  monthGroups,
  monthUrl,
  ordinal,
  readBulk,
  readMonthCard,
  withBulkStarted,
  type BulkPerson,
  type MonthCard,
  type MonthRow,
} from "@/lib/homeReport.ts";

// Home Reports, ONE MOVE's /home-reports drawn in the Brain (HOME-REPORT.md §4.2, §5.4; Parry 16 Oct, and the hard rule
// of 13 Oct: every feature in Classic and the Brain). This month's reports round a centre that counts the ones due: Due,
// Coming later, Sent, and the past clients ready to start. Tap a group: it comes to the middle (the orb rule, 6 Oct) and
// its people list in the panel; tap a person for their Home Report card. The bulk start lists every past client ticked;
// the agent unticks, then starts. The example agent (?demo=1) runs on example data with no network.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 290;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const SKY = "#6fb6ff";
const LAV = "#b7a6ff";

type Key = "due" | "coming" | "sent" | "start";
const LABEL: Record<Key, string> = { due: "Due now", coming: "Later this month", sent: "Sent", start: "Past clients to start" };
const HUE: Record<Key, string> = { due: GOLD, coming: SKY, sent: GREEN, start: LAV };
const first = (name: string) => name.split(" ")[0] ?? "";

export default function HomeReports({
  demo,
  onUnavailable,
  onBack,
  onClassic,
  onOpenPerson,
}: {
  demo: boolean;
  onUnavailable: () => void;
  onBack: () => void;
  onClassic: () => void;
  /** The person's own contact card in the Brain; not offered in the demo. */
  onOpenPerson?: (contactId: string) => void;
}) {
  const cam = useSvgCamera(SIZE);
  const [card, setCard] = useState<MonthCard | null>(null);
  const [bulk, setBulk] = useState<BulkPerson[]>([]);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<Key | null>(null);
  const [who, setWho] = useState<MonthRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
    if (demo) {
      const b = demoBulk();
      setCard(demoMonthCard(today));
      setBulk(b);
      setTicked(new Set(b.map((p) => p.id)));
      return;
    }
    let r: Response;
    try {
      r = await fetch(monthUrl, { credentials: "include", cache: "no-store" });
    } catch {
      return onUnavailable();
    }
    if (r.status === 404 || r.status === 405) return onUnavailable();
    if (!r.ok) return setErr(r.status === 401 ? "Sign in again to see your Home Reports." : "ONE couldn't load your Home Reports just now.");
    const m = readMonthCard(await r.json().catch(() => null));
    if (!m) return onUnavailable();
    const b = await fetch(bulkUrl, { credentials: "include", cache: "no-store" })
      .then((x) => (x.ok ? x.json() : null))
      .then((j) => readBulk(j) ?? [])
      .catch(() => [] as BulkPerson[]);
    setCard(m);
    setBulk(b);
    // Every row ticked; the agent unticks anyone to leave out (§4.2).
    setTicked(new Set(b.map((p) => p.id)));
    setErr(null);
  }, [demo, onUnavailable]);
  useEffect(() => {
    void load();
  }, [load]);

  if (err) {
    return (
      <div className="vr-msg" role="alert">
        <p>{err}</p>
        <button className="vr-btn" onClick={onClassic}>Open the Classic page</button>
      </div>
    );
  }
  if (!card) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening your Home Reports…
      </div>
    );
  }

  const g = monthGroups(card);
  const rows: Record<Key, MonthRow[]> = { due: g.due, coming: g.coming, sent: g.sent, start: [] };
  const keys: Key[] = (["due", "coming", "sent", "start"] as Key[]).filter((k) => (k === "start" ? bulk.length > 0 : rows[k].length > 0));
  const seats = keys.map((k, i) => {
    const ang = (i / Math.max(keys.length, 1)) * 2 * Math.PI;
    return { k, x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  });
  const countOf = (k: Key) => (k === "start" ? bulk.length : rows[k].length);

  const pick = (k: Key, x: number, y: number) => {
    setWho(null);
    if (sel === k) {
      setSel(null);
      return cam.reset();
    }
    setSel(k);
    cam.centreOn(x, y);
  };
  const back = () => {
    if (who) return setWho(null);
    if (sel) {
      setSel(null);
      return cam.reset();
    }
    onBack();
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });

  const startBulk = async () => {
    const people = bulk.filter((p) => ticked.has(p.id));
    if (!people.length) return;
    setBusy(true);
    let started = people.length;
    let skipped = 0;
    if (!demo) {
      const r = await fetch(bulkUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bulkBody(people.map((p) => p.id))) }).catch(() => null);
      const j = r ? await r.json().catch(() => null) : null;
      if (!r || !r.ok) {
        setBusy(false);
        return setNote((j && typeof j.error === "string" && j.error) || "That did not start. Nothing was changed.");
      }
      started = typeof j?.started === "number" ? j.started : started;
      skipped = Array.isArray(j?.skipped) ? j.skipped.length : 0;
      await load();
    } else {
      setCard((m) => (m ? withBulkStarted(m, people, (p) => `demo-bulk-${p.id}`) : m));
      setBulk((b) => b.filter((p) => !ticked.has(p.id)));
    }
    setBusy(false);
    setSel(null);
    cam.reset();
    setNote(`Started ${started} Home Report${started === 1 ? "" : "s"}, each on the 5th.${skipped ? ` ${skipped} could not start.` : ""}`);
  };

  const due = g.due.length;
  return (
    <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="vr-stage">
        <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Home Reports this month">
          <defs>
            <radialGradient id="hr-glass" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#0b1226" />
              <stop offset="0.7" stopColor="#111a33" />
              <stop offset="1" stopColor="#2b2a3f" />
            </radialGradient>
            <radialGradient id="hr-hi" cx="40%" cy="30%" r="60%">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="vr-track" cx={C} cy={C} r={RING} />
          {seats.map(({ k, x, y }) => (
            <line key={`l-${k}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
          ))}
          <g aria-label={`${due} due now`} {...(sel ? { "data-tap": true, role: "button", tabIndex: 0, ...tap(() => { setSel(null); setWho(null); cam.reset(); }) } : {})}>
            {due > 0 && <PulseRing r={CORE} level="today" x={C} y={C} />}
            <circle cx={C} cy={C} r={CORE} fill="url(#hr-glass)" stroke={due ? GOLD : GREEN} strokeWidth={3} />
            <circle cx={C} cy={C} r={CORE} fill="url(#hr-hi)" pointerEvents="none" />
            <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{due ? due : card.reports.length ? "✓" : "0"}</text>
            <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">{due ? "DUE NOW" : "RUNNING"}</text>
            <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">{`${monthWords(card.month)} report`}</text>
          </g>
          {seats.map(({ k, x, y }) => {
            const on = sel === k;
            const n = countOf(k);
            return (
              <g key={k} data-tap className={`cm-orb${on ? " picked" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${LABEL[k]}: ${n}`} {...tap(() => pick(k, x, y))}>
                {k === "due" && <PulseRing r={56} level="today" x={x} y={y} />}
                <circle cx={x} cy={y} r={56} fill="url(#hr-glass)" stroke={HUE[k]} strokeWidth={on ? 4 : 2.5} />
                <circle cx={x} cy={y} r={56} fill="url(#hr-hi)" pointerEvents="none" />
                <text className="pm-mark" x={x} y={y + 2} textAnchor="middle" fontSize={24} fill={HUE[k]}>{n}</text>
                <text className="cm-orb-k" x={x} y={y + 22} textAnchor="middle">{k === "start" ? "TO START" : n === 1 ? "REPORT" : "REPORTS"}</text>
                <text className="pm-name-l" x={x} y={y + 56 + 24} textAnchor="middle">{LABEL[k]}</text>
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
          <button onClick={() => { setSel(null); setWho(null); cam.reset(); }} aria-label="Back to the middle">◎</button>
        </div>
      </div>

      <aside className="drawer vr-drawer pm-drawer" aria-label="Home Reports">
        <div className="d-head">
          <span className="chip" style={{ color: GREEN, borderColor: GREEN }}>ONE MOVE</span>
        </div>
        {who ? (
          <>
            <h1 className="d-title">{who.name}</h1>
            <HomeReportSection key={who.contactId} contactId={who.contactId} first={first(who.name)} demo={demo} onChanged={() => { if (!demo) void load(); }} />
            <p className="hr-links">
              {onOpenPerson && !demo ? <button className="vr-classic" onClick={() => onOpenPerson(who.contactId)}>Open {first(who.name)}&apos;s contact card</button> : null}
              <button className="vr-classic" onClick={() => setWho(null)}>Back to {sel ? LABEL[sel] : "Home Reports"}</button>
            </p>
          </>
        ) : sel === "start" ? (
          <>
            <h1 className="d-title">Past clients to start</h1>
            <p className="d-sum">Past clients with an address and an email who have no Home Report yet. Untick anyone you would rather leave out. Each one goes on the 5th of the month.</p>
            <ul className="pm-list hr-bulk">
              {bulk.map((p) => (
                <li key={p.id}>
                  <input
                    type="checkbox"
                    id={`hr-b-${p.id}`}
                    checked={ticked.has(p.id)}
                    onChange={() =>
                      setTicked((s) => {
                        const n = new Set(s);
                        if (n.has(p.id)) n.delete(p.id);
                        else n.add(p.id);
                        return n;
                      })
                    }
                  />
                  <label className="pm-body" htmlFor={`hr-b-${p.id}`}>
                    <b>{p.name}</b>
                    <small>{p.address}</small>
                  </label>
                </li>
              ))}
            </ul>
            <div className="decide-btns">
              <button type="button" className="chip-btn primary" disabled={busy || ticked.size === 0} onClick={() => void startBulk()}>{bulkButton(bulk.filter((p) => ticked.has(p.id)).length)}</button>
            </div>
            <button className="vr-classic" onClick={() => { setSel(null); cam.reset(); }}>All Home Reports</button>
          </>
        ) : sel ? (
          <>
            <h1 className="d-title">{LABEL[sel]}</h1>
            <ul className="pm-list pm-compact">
              {rows[sel].map((r) => (
                <li key={r.id}>
                  <i className="pm-dot" style={{ background: HUE[sel] }} aria-hidden="true" />
                  <span className="pm-body">
                    <button className="ta-name" onClick={() => setWho(r)}>{r.name}</button>
                    <small>{r.address} · {r.sent ? "Sent" : `On the ${ordinal(r.sendDay)}`}</small>
                  </span>
                </li>
              ))}
            </ul>
            <button className="vr-classic" onClick={() => { setSel(null); cam.reset(); }}>All Home Reports</button>
          </>
        ) : (
          <>
            <h1 className="d-title">Home Reports</h1>
            <p className="d-sub">
              {card.reports.length ? `${card.reports.length} running · ${due ? `${due} due now` : "none due now"}` : "None running yet"} · {monthWords(card.month)} report
            </p>
            <p className="d-sum">A monthly report on each client&apos;s own neighbourhood, sent until you or they stop it. Start one on any contact&apos;s card{bulk.length ? ", or for your past clients here" : ""}. Tap a group to see who is in it.</p>
            <p className="pm-empty">Until the MLS feed is live, no figures go out by themselves: on each report&apos;s day you paste that month&apos;s RPR link and send it from your own email.</p>
            <p className="pm-empty">Requests from your site start {card.autostart ? "by themselves" : "with one tap from a task"}. Change it in My Profile.</p>
          </>
        )}
        <p className="pm-promise">{demo ? "Example agent. " : ""}Nothing is sent to a client unless you started their report.</p>
      </aside>
    </div>
  );
}
