"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import PulseRing from "./PulseRing.tsx";
import { allVips, fullNote, monthWords, numbersLine, toSend, type Area, type MarketPulse, type Vip } from "@/lib/marketPulse.ts";

// Market Pulse (VIP-SUMMARY §3aa). Each area the agent's VIPs live in round a centre that counts the notes still to
// send. Tap an area: it comes to the middle (the orb rule) with its month and its VIPs; open a VIP to read the exact
// note and press Send. A fixed note from ONE Property's numbers, not written by AI; nothing is sent until the agent
// presses Send.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 300;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";

export default function MarketPulseView({ data, demo, onSend, onClose }: { data: MarketPulse; demo: boolean; onSend: (v: Vip) => Promise<boolean>; onClose: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [sel, setSel] = useState<string | null>(null);
  const [vip, setVip] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
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

  const areas = data.areas.slice(0, 10);
  const picked = areas.find((a) => a.area === sel) ?? null;
  const left = toSend(data).length;
  const seats = areas.map((a, k) => {
    const ang = (k / Math.max(areas.length, 1)) * 2 * Math.PI;
    return { a, x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  });
  const pick = (a: Area, x: number, y: number) => {
    setVip(null);
    if (sel === a.area) {
      setSel(null);
      return cam.reset();
    }
    setSel(a.area);
    cam.centreOn(x, y);
  };
  const back = () => {
    setSel(null);
    setVip(null);
    cam.reset();
  };
  const send = async (v: Vip) => {
    setBusy(true);
    const ok = await onSend(v);
    setBusy(false);
    setNote(ok ? `Sent to ${v.name}. Their market box is ticked for this month.` : "That didn't send just now. Nothing was sent.");
    if (ok) setVip(null);
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="mp-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Market Pulse areas">
            <defs>
              <radialGradient id="mp-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#2b2a3f" />
              </radialGradient>
              <radialGradient id="mp-hi" cx="40%" cy="30%" r="60%">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ a, x, y }) => (
              <line key={`l-${a.area}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            <g aria-label={`${left} notes to send`} {...(picked ? { "data-tap": true, role: "button", tabIndex: 0, ...tap(back) } : {})}>
              {data.ready && left > 0 && <PulseRing r={CORE} level="today" x={C} y={C} />}
              <circle cx={C} cy={C} r={CORE} fill="url(#mp-glass)" stroke={GOLD} strokeWidth={3} />
              <circle cx={C} cy={C} r={CORE} fill="url(#mp-hi)" pointerEvents="none" />
              <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{data.ready ? left : "–"}</text>
              <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">TO SEND</text>
              <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">{`${monthWords(data.month)} market`}</text>
            </g>
            {seats.map(({ a, x, y }) => {
              const wait = a.vips.filter((v) => !v.sentAt).length;
              const on = sel === a.area;
              const hue = wait ? GOLD : GREEN;
              return (
                <g key={a.area} data-tap className={`cm-orb${on ? " picked" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${a.label}: ${wait ? `${wait} to send` : "all sent"}`} {...tap(() => pick(a, x, y))}>
                  {data.ready && wait > 0 && <PulseRing r={56} level="today" x={x} y={y} />}
                  <circle cx={x} cy={y} r={56} fill="url(#mp-glass)" stroke={hue} strokeWidth={on ? 4 : 2.5} />
                  <circle cx={x} cy={y} r={56} fill="url(#mp-hi)" pointerEvents="none" />
                  <text className="pm-mark" x={x} y={y - 6} textAnchor="middle" fontSize={22} fill={hue}>{wait ? wait : "✓"}</text>
                  <text className="cm-orb-k" x={x} y={y + 20} textAnchor="middle">{a.vips.length} {a.vips.length === 1 ? "VIP" : "VIPS"}</text>
                  <text className="pm-name-l" x={x} y={y + 56 + 24} textAnchor="middle">{a.label}</text>
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="Market Pulse">
          <div className="d-head">
            <span className="chip" style={{ color: GREEN, borderColor: GREEN }}>ONE MOVE</span>
          </div>
          <h1 className="d-title" id="mp-title">{picked ? picked.label : "Market Pulse"}</h1>
          {!data.ready ? (
            <p className="d-sum">Market Pulse starts when the MLS feed is live and your MLS link is confirmed. Then on the 1st of each month, each VIP gets a short note about their own area, ready for you to send.</p>
          ) : picked ? (
            <section className="cm-form">
              <p className="d-sub">{monthWords(data.month)} · {numbersLine(picked.numbers)}</p>
              <ul className="pm-list pm-compact">
                {picked.vips.map((v) => (
                  <li key={v.id}>
                    <i className="pm-dot" style={{ background: v.sentAt ? GREEN : GOLD }} aria-hidden="true" />
                    <span className="pm-body">
                      <button className="ta-name" aria-expanded={vip === v.id} onClick={() => setVip(vip === v.id ? null : v.id)}>{v.name}</button>
                      <small>{v.sentAt ? `Sent ${new Date(v.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : v.email ? "Ready to send" : "No email: text it from ONE GO"}</small>
                    </span>
                  </li>
                ))}
              </ul>
              {(() => {
                const v = picked.vips.find((x) => x.id === vip);
                if (!v) return null;
                return (
                  <div className="mp-note">
                    <h2 className="pm-h">The note to {v.name.split(" ")[0]}</h2>
                    <pre className="mp-text">{fullNote(v, picked)}</pre>
                    {!v.sentAt && v.email ? (
                      <div className="decide-btns">
                        <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void send(v)}>{demo ? "Send (example)" : `Send to ${v.email}`}</button>
                      </div>
                    ) : null}
                    {!v.sentAt && !v.email ? <p className="pm-empty">No email on file. In ONE GO, tap Text and it opens in your phone&apos;s Messages for you to send.</p> : null}
                  </div>
                );
              })()}
              <button className="vr-classic" onClick={back}>All areas</button>
            </section>
          ) : (
            <>
              <p className="d-sub">{left ? `${left} of ${allVips(data).length} to send` : `All ${allVips(data).length} sent`} · {monthWords(data.month)}</p>
              <p className="d-sum">Each VIP&apos;s own market for last month, in a short note from you. It is the sixth monthly touch: their box ticks when you send it. Tap an area to read and send.</p>
              {data.missing.length > 0 && <p className="pm-empty">No area yet for {data.missing.map((m) => m.name).join(", ")}. Add their address in ONE MOVE and they join next month.</p>}
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}A fixed note filled from the MLS numbers; Pulse does not write it. Nothing is sent until you press Send.</p>
        </aside>
      </div>
    </div>
  );
}
