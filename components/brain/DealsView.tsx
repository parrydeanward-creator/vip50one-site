"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import PulseRing from "./PulseRing.tsx";
import { SIDE_WORD, dealLevel, dueOn, movedLine, nextDate, timeWords, whenLine, type ClosingAsk, type Deal, type Status } from "@/lib/deals.ts";

// Deals under contract (VIP-SUMMARY §3z). Each deal round a centre that counts them; a deal pulses red on a deadline's
// day and yellow the day before. Tap one: it comes to the middle (Parry, 6 Oct, the rule for every orb) with every
// REPC date and days left; tap it again, or "All deals", to go back. Pulse never explains cancellation rights (that
// is the hand-back rule); nothing is sent to anyone; only the agent sees a deal.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 300;
const HUE = { under_contract: "#f5c542", closed: "#3fbf7f", fell_through: "#8089a2" } as const;
const STATUS_WORD: Record<Status, string> = { under_contract: "Under contract", closed: "Closed", fell_through: "Fell through" };
const date = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export type SetStatus = (d: Deal, status: Status, closing?: { id: string } | "new") => Promise<"ok" | "failed" | ClosingAsk>;

export default function DealsView({ deals, today, demo, onStatus, onClose }: { deals: Deal[]; today: string; demo: boolean; onStatus: SetStatus; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ deal: Deal; q: ClosingAsk } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const open = deals.filter((d) => d.status === "under_contract");
  const recent = deals.filter((d) => d.status !== "under_contract").slice(0, 4);
  const list = [...open, ...recent].slice(0, 12);
  const picked = list.find((d) => d.id === sel) ?? null;
  const seats = list.map((d, k) => {
    const a = (k / Math.max(list.length, 1)) * 2 * Math.PI;
    return { d, x: C + RING * Math.sin(a), y: C - RING * Math.cos(a) };
  });
  const pick = (d: Deal, x: number, y: number) => {
    if (sel === d.id) {
      setSel(null);
      return cam.reset();
    }
    setSel(d.id);
    setAsk(null);
    cam.centreOn(x, y);
  };
  const back = () => {
    setSel(null);
    setAsk(null);
    cam.reset();
  };
  const set = async (d: Deal, status: Status, closing?: { id: string } | "new") => {
    setBusy(true);
    const r = await onStatus(d, status, closing);
    setBusy(false);
    if (r === "failed") return setNote("That didn't save just now. Nothing was changed.");
    if (r !== "ok") return setAsk({ deal: d, q: r });
    back();
    setNote(status === "closed" ? `Closed. ${d.contact.name}'s closing counts toward your goals once.` : status === "fell_through" ? "Marked as fallen through. Its reminders stop." : "Back under contract.");
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });
  const red = open.filter((d) => dealLevel(d, today) === "now").length;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="dl-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Deals under contract">
            <defs>
              <radialGradient id="dl-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#2b2a3f" />
              </radialGradient>
              <radialGradient id="dl-hi" cx="40%" cy="30%" r="60%">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ d, x, y }) => (
              <line key={`l-${d.id}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            <g aria-label={`${open.length} under contract`} {...(picked ? { "data-tap": true, role: "button", tabIndex: 0, ...tap(back) } : {})}>
              <circle cx={C} cy={C} r={CORE} fill="url(#dl-glass)" stroke="#f5c542" strokeWidth={3} />
              <circle cx={C} cy={C} r={CORE} fill="url(#dl-hi)" pointerEvents="none" />
              <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{open.length}</text>
              <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">UNDER CONTRACT</text>
              <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">{red ? `${red} due today` : "REPC deadlines"}</text>
            </g>
            {seats.map(({ d, x, y }) => {
              const hue = HUE[d.status];
              const level = dealLevel(d, today);
              const n = d.status === "under_contract" ? nextDate(d, today) : null;
              const on = sel === d.id;
              return (
                <g key={d.id} data-tap className={`cm-orb${on ? " picked" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${d.contact.name}: ${n ? whenLine(n, today) : STATUS_WORD[d.status]}`} {...tap(() => pick(d, x, y))}>
                  {level !== "good" && <PulseRing r={56} level={level} x={x} y={y} />}
                  <circle cx={x} cy={y} r={56} fill="url(#dl-glass)" stroke={hue} strokeWidth={on ? 4 : 2.5} strokeOpacity={d.status === "under_contract" ? 1 : 0.6} />
                  <circle cx={x} cy={y} r={56} fill="url(#dl-hi)" pointerEvents="none" />
                  <text className="pm-mark" x={x} y={y - 6} textAnchor="middle" fontSize={22} fill={hue}>{d.status === "closed" ? "✓" : d.status === "fell_through" ? "×" : n ? (dueOn(n) === today ? "Today" : String(Math.round((Date.parse(dueOn(n)) - Date.parse(today)) / 86_400_000))) : "·"}</text>
                  <text className="cm-orb-k" x={x} y={y + 20} textAnchor="middle">{d.status === "under_contract" ? (n ? n.label.toUpperCase().slice(0, 14) : "NO DATES") : STATUS_WORD[d.status].toUpperCase()}</text>
                  <text className="pm-name-l" x={x} y={y + 56 + 24} textAnchor="middle">{d.contact.name}</text>
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
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={back} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Deals">
          <div className="d-head">
            <span className="chip" style={{ color: "#3fbf7f", borderColor: "#3fbf7f" }}>ONE MOVE</span>
          </div>
          <h1 className="d-title" id="dl-title">{picked ? picked.contact.name : "Deals"}</h1>
          {picked ? (
            <section className="cm-form">
              <p className="d-sub">{SIDE_WORD[picked.side]} · {STATUS_WORD[picked.status]} · {picked.form} REPC{picked.acceptedOn ? ` · accepted ${date(picked.acceptedOn)}` : ""}</p>
              <h2 className="pm-h">Deadlines, {timeWords(picked.deadlineTime)} on the day</h2>
              <ul className="pm-list pm-compact">
                {picked.dates.map((x) => {
                  const lv = picked.status === "under_contract" && dueOn(x) >= today ? (dueOn(x) === today ? "#ff6b6b" : whenLine(x, today).endsWith("tomorrow") ? "#f5c542" : "#3fbf7f") : "#8089a2";
                  const moved = movedLine(x);
                  return (
                    <li key={x.key}>
                      <i className="pm-dot" style={{ background: lv }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>{x.label}</b>
                        <small>{date(x.on)}{dueOn(x) >= today ? ` · ${whenLine(x, today).slice(x.label.length).replace(/^ /, "")}` : " · passed"}{moved ? ` · ${moved}` : ""}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {ask && ask.deal.id === picked.id ? (
                <div className="vr-ask" role="alert">
                  <p className="d-sum">{ask.q.question}</p>
                  <div className="decide-btns">
                    <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void set(picked, "closed", { id: ask.q.id })}>Yes, the same closing</button>
                    <button type="button" className="chip-btn" disabled={busy} onClick={() => void set(picked, "closed", "new")}>No, a new closing</button>
                  </div>
                </div>
              ) : (
                <div className="decide-btns">
                  {picked.status === "under_contract" ? (
                    <>
                      <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void set(picked, "closed")}>It closed</button>
                      <button type="button" className="chip-btn" disabled={busy} onClick={() => void set(picked, "fell_through")}>It fell through</button>
                    </>
                  ) : (
                    <button type="button" className="chip-btn" disabled={busy} onClick={() => void set(picked, "under_contract")}>Back under contract</button>
                  )}
                </div>
              )}
              <p className="pm-empty">Dates are as you typed them. On the 2027 form, earnest money and settlement that land on a weekend or Utah holiday move to the next business day. For cancellation rights, ask your broker or the contract.</p>
              <button className="vr-classic" onClick={back}>All deals</button>
            </section>
          ) : (
            <>
              <p className="d-sub">{open.length ? `${open.length} under contract${red ? ` · ${red} due today` : ""}` : "None under contract"}</p>
              <p className="d-sum">Every REPC deadline with days left. A deal pulses yellow the day before a deadline and red on the day. Tap one to see its dates.</p>
              {open.length ? (
                <ul className="pm-list pm-compact">
                  {open.map((d) => {
                    const n = nextDate(d, today);
                    return (
                      <li key={d.id}>
                        <i className="pm-dot" style={{ background: dealLevel(d, today) === "now" ? "#ff6b6b" : dealLevel(d, today) === "today" ? "#f5c542" : "#3fbf7f" }} aria-hidden="true" />
                        <span className="pm-body">
                          <b>{d.contact.name}</b>
                          <small>{SIDE_WORD[d.side]} · {n ? whenLine(n, today) : "no dates left"}</small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="pm-empty">Add a deal on the person in ONE MOVE or ONE GO, with its REPC dates, and it shows here with every deadline.</p>
              )}
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}Only you see your deals; a coach or team leader sees at most a count. Nothing is sent to anyone.</p>
        </aside>
      </div>
    </div>
  );
}
