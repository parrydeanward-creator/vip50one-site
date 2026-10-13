"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/goals.ts";
import { CHANCE, monthWords, type Forecast, type MonthForecast } from "@/lib/forecast.ts";

// The income forecast (K20). One gold bar per month (a single series, so no legend), the breakdown in words beside
// it, and the same numbers as a table for screen readers. Hover or tap a month for its parts. Read only.

const GOLD = "#f5c542";
const pct = (n: number) => `${Math.round(n * 100)}%`;

function parts(m: MonthForecast): string {
  const p: string[] = [];
  if (m.contract) p.push(`${money(m.contract)} under contract${m.settling.length ? ` (${m.settling.join(", ")})` : ""}`);
  if (m.hot) p.push(`${money(m.hot)} Hot`);
  if (m.warm) p.push(`${money(m.warm)} Warm`);
  return p.join(" · ") || "Nothing expected yet";
}

export default function ForecastView({ f, avgFrom, demo, onClose }: { f: Forecast; avgFrom: string; demo: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<string | null>(null);
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
  const max = Math.max(1, ...f.months.map((m) => m.total));
  const sel = f.months.find((m) => m.month === pick) ?? null;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="fc-title">
      <div className="fc">
        <div className="fc-head">
          <button ref={closeRef} className="fc-back" onClick={onClose} aria-label="Back to the Brain">←</button>
          <div>
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
            <h1 className="d-title" id="fc-title">Income forecast</h1>
            <p className="d-sub">About {money(f.total12)} GCI expected in the next 12 months{f.later ? `, about ${money(f.later)} after that` : ""}</p>
          </div>
        </div>

        <ol className="fc-bars" aria-hidden="true">
          {f.months.map((m) => (
            <li key={m.month} className={pick === m.month ? "is-pick" : undefined} onMouseEnter={() => setPick(m.month)} onMouseLeave={() => setPick(null)} onClick={() => setPick(pick === m.month ? null : m.month)}>
              <span className="fc-month">{monthWords(m.month)}</span>
              <span className="fc-track">
                {m.total ? <span className="fc-bar" style={{ width: `${(m.total / max) * 100}%` }} /> : null}
              </span>
              <span className="fc-val">{m.total ? money(m.total) : "–"}</span>
            </li>
          ))}
        </ol>
        <p className="fc-tip" aria-live="polite">{sel ? `${monthWords(sel.month)}: ${parts(sel)}` : "Point at a month to see what it is made of."}</p>

        <table className="fc-table">
          <caption>Expected GCI by month</caption>
          <thead>
            <tr><th scope="col">Month</th><th scope="col">Under contract</th><th scope="col">Hot</th><th scope="col">Warm</th><th scope="col">Total</th></tr>
          </thead>
          <tbody>
            {f.months.map((m) => (
              <tr key={m.month}>
                <th scope="row">{monthWords(m.month)}</th>
                <td>{m.contract ? money(m.contract) : "–"}</td>
                <td>{m.hot ? money(m.hot) : "–"}</td>
                <td>{m.warm ? money(m.warm) : "–"}</td>
                <td>{m.total ? money(m.total) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="wr-h">How it is worked out</h2>
        <ul className="fc-how">
          <li><b>{f.counts.contract} under contract</b>: counted in the month they settle, at {pct(CHANCE.contract)}.</li>
          <li><b>{f.counts.hot} Hot</b>: close within 3 months, at {pct(CHANCE.hot)}, spread over months 1-3.</li>
          <li><b>{f.counts.warm} Warm</b>: close in 3-12 months, at {pct(CHANCE.warm)}, spread over months 4-12.</li>
          <li><b>{f.counts.cold} Cold</b>: 12 months and up, at {pct(CHANCE.cold)}: {money(f.later)} after this year.</li>
          <li>Each closing at <b>{money(f.avgGci)}</b> GCI ({avgFrom}). ONE MOVE keeps no price per person yet.</li>
        </ul>
        <p className="pm-promise">{demo ? "Example agent. " : ""}A forecast, not a promise. Move people between Hot, Warm and Cold and it changes with them.</p>
      </div>
    </div>
  );
}
