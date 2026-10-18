"use client";

import { useSyncExternalStore } from "react";
import {
  AD_STATUS_WORDS, EXAMPLE_ADS, EXAMPLE_AREAS, EXAMPLE_FUNNEL, EXAMPLE_LANDING, EXAMPLE_LEADS, EXAMPLE_MONTH, EXAMPLE_REPLY_SECONDS, EXAMPLE_REQUESTS,
  EXAMPLE_SIGNALS, EXAMPLE_SOURCES, GUARDRAILS, MODES, SPEND_LINE, adButtons, agoWords, applyGrowth, barShares, convRate, costPerLead, durationWords,
  TEAM_SPEND_LINE, initialGrowthState, median, money, monthTotals, requestTotal, type ExampleLanding, type GrowthExampleAction, type GrowthExampleState,
} from "@/lib/examples/growth.ts";
import "@/app/growth-views.css";

// One example state for the Growth pieces, shared by the side panel and the full view, so a tap in one shows in the
// other. In memory only: a reload starts the example again. Nothing here reaches a server.
let state: GrowthExampleState = initialGrowthState();
const subs = new Set<() => void>();
export function growthDo(a: GrowthExampleAction) {
  state = applyGrowth(state, a);
  subs.forEach((f) => f());
}
export function useGrowthExample(): GrowthExampleState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => state,
    () => state,
  );
}

const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function GrowthNote({ s }: { s: GrowthExampleState }) {
  return s.note ? <p className="gv-note" role="status">{s.note}</p> : null;
}

/** Pulse Ads: each ad with its picture block, headline, area, budget, buttons; a live ad's results. */
export function AdsList({ s, full = false, limit }: { s: GrowthExampleState; full?: boolean; limit?: number }) {
  return (
    <ul className={`gv-list${full ? " gv-grid" : ""}`} aria-label="Pulse Ads">
      {EXAMPLE_ADS.slice(0, limit).map((ad) => {
        const st = s.ads[ad.id] ?? ad.status;
        const r = ad.results;
        const cpl = r ? costPerLead(r.spend, r.leads) : null;
        return (
          <li key={ad.id} className="gv-card gv-ad">
            <div className="gv-pic" aria-label={`Picture: ${ad.picture}`}>
              <span>{ad.picture}</span>
              <small>{ad.channel}</small>
            </div>
            <div className="gv-ad-b">
              <p className="gv-h">{ad.headline}</p>
              {full && <p className="gv-sub">{ad.body}</p>}
              <p className="gv-sub">{ad.area} · {money(ad.dailyBudget)} a day</p>
              <p className={`gv-st st-${st}`}>{AD_STATUS_WORDS[st]}</p>
              {r && st !== "draft" && st !== "approved" && (
                <dl className="gv-stats" aria-label="Results this month">
                  <div><dt>Spend</dt><dd>{money(r.spend)}</dd></div>
                  <div><dt>Clicks</dt><dd>{r.clicks}</dd></div>
                  <div><dt>Leads</dt><dd>{r.leads}</dd></div>
                  <div><dt>Per lead</dt><dd>{cpl == null ? "-" : money(cpl, true)}</dd></div>
                </dl>
              )}
              <div className="gv-btns">
                {adButtons(st).map((b, i) => (
                  <button key={b.label} type="button" className={`chip-btn${i === 0 && b.label !== "Pause" ? " primary" : ""}`} onClick={() => growthDo({ kind: "ad", id: ad.id, to: b.to })}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function AreasList({ s, full = false }: { s: GrowthExampleState; full?: boolean }) {
  return (
    <ul className={`gv-list${full ? " gv-grid" : ""}`} aria-label="Farm areas">
      {EXAMPLE_AREAS.map((a) => (
        <li key={a.id} className="gv-card">
          <div className="gv-map" aria-hidden="true"><span>{a.name.split(",")[0]}</span></div>
          <p className="gv-h">{a.name}</p>
          <dl className="gv-stats">
            <div><dt>Homes</dt><dd>{a.homes.toLocaleString("en-US")}</dd></div>
            <div><dt>Last postcard</dt><dd>{fmtDay(a.lastPostcard)}</dd></div>
            <div><dt>Turnover</dt><dd>{a.turnover}% a year</dd></div>
          </dl>
          {full && <p className="gv-sub">Next: {a.nextNote}</p>}
          <div className="gv-btns">
            <button type="button" className={`chip-btn${s.postcards[a.id] ? "" : " primary"}`} disabled={!!s.postcards[a.id]} onClick={() => growthDo({ kind: "postcard", id: a.id })}>
              {s.postcards[a.id] ? "Postcard drafted" : "Draft next postcard"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LandingPreview({ p }: { p: ExampleLanding }) {
  return (
    <div className="gv-lp" aria-label={`Preview of ${p.title}`}>
      <div className="gv-lp-bar"><i /><i /><i /><span>sarah-bennett.vip50homes.com{p.path}</span></div>
      <div className="gv-lp-hero">
        <small>{p.kind}</small>
        <b>{p.title}</b>
        <span>{p.lead}</span>
        <span className="gv-lp-field">Name</span>
        <span className="gv-lp-field">Email or phone</span>
        <span className="gv-lp-cta">{p.ask}</span>
      </div>
    </div>
  );
}

export function LandingList({ s, full = false }: { s: GrowthExampleState; full?: boolean }) {
  return (
    <ul className={`gv-list${full ? " gv-grid" : ""}`} aria-label="Landing pages">
      {EXAMPLE_LANDING.map((p, i) => {
        const off = !!s.pagesOff[p.id];
        return (
          <li key={p.id} className={`gv-card${off ? " is-off" : ""}`}>
            {(full || i === 0) && <LandingPreview p={p} />}
            <p className="gv-h">{p.title}</p>
            <dl className="gv-stats">
              <div><dt>Visitors</dt><dd>{p.visitors}</dd></div>
              <div><dt>Leads</dt><dd>{p.leads}</dd></div>
              <div><dt>Rate</dt><dd>{convRate(p.visitors, p.leads)}%</dd></div>
            </dl>
            {full && (
              <div className="gv-btns">
                <button type="button" className="chip-btn" onClick={() => growthDo({ kind: "page", id: p.id, on: off })}>{off ? "Turn on" : "Pause page"}</button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SpeedBlock({ s }: { s: GrowthExampleState }) {
  const now = MODES.find((m) => m.key === s.mode)!;
  return (
    <div className="gv-speed">
      <div className="gv-seg" role="radiogroup" aria-label="Pulse's mode for new leads">
        {MODES.map((m) => (
          <button key={m.key} type="button" role="radio" aria-checked={s.mode === m.key} className={s.mode === m.key ? "on" : ""} onClick={() => growthDo({ kind: "mode", mode: m.key })}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="gv-sub">{now.line}</p>
      <div className="gv-big">
        <b>{durationWords(median(EXAMPLE_REPLY_SECONDS[s.mode]))}</b>
        <span>median first reply, last {EXAMPLE_REPLY_SECONDS[s.mode].length} leads</span>
      </div>
      <p className="gv-guard">{GUARDRAILS}</p>
    </div>
  );
}

export function SignalsList({ s }: { s: GrowthExampleState }) {
  return (
    <ul className="gv-list" aria-label="Seller signals">
      {EXAMPLE_SIGNALS.map((p) => (
        <li key={p.id} className="gv-card gv-row">
          <span className="gv-init" aria-hidden="true">{p.name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("")}</span>
          <span className="gv-row-b">
            <span><b>{p.name}</b> <small>{p.street} · {p.since}</small></span>
            <span className="gv-sub">{p.signal}</span>
          </span>
          <button type="button" className={`chip-btn${s.called[p.id] ? "" : " primary"}`} disabled={!!s.called[p.id]} onClick={() => growthDo({ kind: "call", id: p.id })}>
            {s.called[p.id] ? "On today's list" : "Call"}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function InboxList({ s, full = false, open, onOpen }: { s: GrowthExampleState; full?: boolean; open?: string | null; onOpen?: (id: string | null) => void }) {
  return (
    <ul className="gv-list" aria-label="Lead inbox">
      {EXAMPLE_LEADS.map((l) => {
        const st = s.leads[l.id] ?? l.status;
        const shown = full && open === l.id;
        return (
          <li key={l.id} className="gv-card gv-lead">
            <div className="gv-row">
              <span className={`gv-src src-${l.source.replace(/[^a-z]/gi, "").toLowerCase()}`}>{l.source}</span>
              <span className="gv-row-b">
                <span><b>{l.name}</b> <small>{agoWords(l.minutesAgo)}</small></span>
                <span className="gv-sub">{l.about}</span>
              </span>
              <span className={`gv-st st-${st === "New" ? "new" : st === "Replied" ? "replied" : "appt"}`}>{st}</span>
            </div>
            {full ? (
              shown ? (
                <div className="gv-draft">
                  <p className="gv-sub">Pulse&apos;s reply draft</p>
                  <p className="gv-draft-t">{l.draft}</p>
                  <div className="gv-btns">
                    <button type="button" className="chip-btn primary" onClick={() => growthDo({ kind: "reply", id: l.id })}>Send reply</button>
                    <button type="button" className="chip-btn" onClick={() => onOpen?.(null)}>Close</button>
                  </div>
                </div>
              ) : (
                <div className="gv-btns"><button type="button" className="chip-btn" onClick={() => onOpen?.(l.id)}>Reply draft</button></div>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ResultsBlock({ full = false }: { full?: boolean }) {
  const t = monthTotals(EXAMPLE_SOURCES, EXAMPLE_FUNNEL);
  const shares = barShares(EXAMPLE_SOURCES);
  return (
    <div className="gv-results">
      <dl className="gv-stats gv-totals" aria-label={`${EXAMPLE_MONTH} totals`}>
        <div><dt>Spend</dt><dd>{money(t.spend)}</dd></div>
        <div><dt>Leads</dt><dd>{t.leads}</dd></div>
        <div><dt>Appointments</dt><dd>{t.appointments}</dd></div>
        <div><dt>Closings</dt><dd>{t.closings}</dd></div>
        <div><dt>Per lead</dt><dd>{t.cpl == null ? "-" : money(t.cpl, true)}</dd></div>
      </dl>
      <p className="gv-sub">Leads by source, {EXAMPLE_MONTH}</p>
      <ul className="gv-bars" aria-label="Leads by source">
        {EXAMPLE_SOURCES.map((r, i) => (
          <li key={r.source}>
            <span className="gv-bar-l">{r.source}</span>
            <span className="gv-bar-t"><span style={{ width: `${Math.max(4, shares[i]! * 100)}%` }} /></span>
            <span className="gv-bar-n">{r.leads}{full && r.spend != null ? ` · ${money(r.spend)}` : ""}</span>
          </li>
        ))}
      </ul>
      {full && <p className="gv-sub">Spend counts only your own ads. Zillow, Realtor.com and Homes.com leads are paid on those sites, not through ONE.</p>}
    </div>
  );
}

export function RequestsList({ s, full = false, asking, onAsk }: { s: GrowthExampleState; full?: boolean; asking?: string | null; onAsk?: (id: string | null) => void }) {
  return (
    <ul className="gv-list" aria-label="Ad requests">
      {EXAMPLE_REQUESTS.map((r) => {
        const st = s.requests[r.id] ?? r.status;
        return (
          <li key={r.id} className="gv-card">
            <p className="gv-h">{r.what}</p>
            <p className="gv-sub">{r.agent} · {r.area} · {money(r.dailyBudget)} a day for {r.days} days (up to {money(requestTotal(r))})</p>
            <p className={`gv-st st-${st === "published" ? "live" : st}`}>{st === "waiting" ? "Waiting for you" : st === "approved" ? "Approved, not published" : st === "published" ? "Live" : "Question asked"}</p>
            {full && asking === r.id ? (
              <div className="gv-draft">
                <label className="gv-sub" htmlFor={`q-${r.id}`}>Your question for {r.agent.split(" ")[0]}</label>
                <textarea id={`q-${r.id}`} className="gv-ta" rows={2} defaultValue="Can we start Thursday instead, and add the photos from the listing?" />
                <div className="gv-btns">
                  <button type="button" className="chip-btn primary" onClick={() => { growthDo({ kind: "request", id: r.id, to: "asked" }); onAsk?.(null); }}>Send question</button>
                  <button type="button" className="chip-btn" onClick={() => onAsk?.(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="gv-btns">
                {st === "published" ? null : st === "approved" ? (
                  <button type="button" className="chip-btn primary" onClick={() => growthDo({ kind: "request", id: r.id, to: "published" })}>Publish</button>
                ) : (
                  <button type="button" className="chip-btn primary" onClick={() => growthDo({ kind: "request", id: r.id, to: "approved" })}>Approve</button>
                )}
                {st !== "published" && <button type="button" className="chip-btn" onClick={() => (full ? onAsk?.(r.id) : growthDo({ kind: "request", id: r.id, to: "asked" }))}>Ask a question</button>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export { SPEND_LINE, TEAM_SPEND_LINE };
