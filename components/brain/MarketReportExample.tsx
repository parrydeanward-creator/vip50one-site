"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { barPct, delta, dollars, exampleReport, initials, shortPrice } from "@/lib/homeReport.ts";
import "@/app/market-report.css";

// "See an example report" (Parry 18 Oct: "what does the market report look like"). A full-screen preview of the monthly
// "Your home's neighbourhood" email, in HOME-REPORT §3's order: the area line, for sale near you now, this month, pace,
// buyer demand from your site, the note, the agent, the MLS credit and period, and the one-click stop. Every figure is
// invented and says so. No home value: ONE never shows one the agent did not set (§3.7, §7).

const mtnToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());

export default function MarketReportExample({ onClose }: { onClose: () => void }) {
  const r = exampleReport(mtnToday());
  const closeRef = useRef<HTMLButtonElement>(null);
  const max = Math.max(...r.counts.flatMap((c) => [c.now, c.lastMonth, c.yearAgo]));

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // The preview's own Escape: the Brain behind it must not also step back.
      e.stopImmediatePropagation();
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", key, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key, true);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="mrx" role="dialog" aria-modal="true" aria-label="Example Market Report" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="mrx-bar">
        <div>
          <b>Example Market Report</b>
          <span>Invented figures. Yours fill in from the MLS for each person&apos;s own home.</span>
        </div>
        <button ref={closeRef} type="button" className="chip-btn" onClick={onClose}>Close</button>
      </div>
      <div className="mrx-scroll" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <article className="mr-mail">
          <div className="mr-ribbon">Example</div>
          <header className="mr-top">
            <p className="mr-kicker">{r.monthName} · Monthly Market Report</p>
            <h1>Your home&apos;s neighbourhood</h1>
            <p className="mr-area">For {r.area}</p>
          </header>

          <section className="mr-sec">
            <h2>For sale near you now</h2>
            <div className="mr-hero">
              <div><b>{r.forSale.count}</b><span>homes for sale</span></div>
              <div><b>{shortPrice(r.forSale.min)} to {shortPrice(r.forSale.max)}</b><span>price range</span></div>
            </div>
            <p className="mr-small">The newest three:</p>
            <ul className="mr-cards">
              {r.forSale.cards.map((c) => (
                <li key={c.street}>
                  <div className="mr-photo" aria-hidden="true"><span>{c.listed}</span></div>
                  <div className="mr-card-body">
                    <b>{dollars(c.price)}</b>
                    <span>{c.beds} bd · {c.baths} ba · {c.sqft.toLocaleString("en-US")} sq ft</span>
                    <span className="mr-street">{c.street}</span>
                    <a href="#" onClick={(e) => e.preventDefault()}>See the home</a>
                    <small>{c.credit}</small>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mr-sec">
            <h2>This month</h2>
            <p className="mr-small">{r.monthName}, against {r.lastMonthName} and {r.yearAgoName}.</p>
            <div className="mr-counts">
              {r.counts.map((c) => (
                <div key={c.label} className="mr-count">
                  <div className="mr-count-head"><span>{c.label}</span><b>{c.now}</b></div>
                  <div className="mr-bars">
                    <div className="mr-bar-row"><i>This month</i><span className="mr-bar now" style={{ width: `${barPct(c.now, max)}%` }} /><em>{c.now}</em></div>
                    <div className="mr-bar-row"><i>{r.lastMonthName}</i><span className="mr-bar" style={{ width: `${barPct(c.lastMonth, max)}%` }} /><em>{c.lastMonth}</em></div>
                    <div className="mr-bar-row"><i>A year ago</i><span className="mr-bar" style={{ width: `${barPct(c.yearAgo, max)}%` }} /><em>{c.yearAgo}</em></div>
                  </div>
                  <p className="mr-small">{delta(c.now, c.lastMonth)} on last month · {delta(c.now, c.yearAgo)} on a year ago</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mr-sec">
            <h2>Pace</h2>
            <div className="mr-hero">
              <div><b>{r.pace.days} days</b><span>typical time to sell ({r.pace.daysLast} last month)</span></div>
              <div><b>{r.pace.supply} months</b><span>of homes for sale at this pace</span></div>
            </div>
          </section>

          <section className="mr-sec">
            <h2>Buyer demand from my website</h2>
            <p className="mr-demand"><b>{r.demand}</b> buyers have a saved search on my website that covers your home this month.</p>
            <p className="mr-small">A count only. Buyers&apos; names are never shared.</p>
          </section>

          <section className="mr-sec mr-note">
            <h2>A note from {r.agent.first}</h2>
            <p>{r.note}</p>
            <p className="mr-sign">{r.agent.first}</p>
          </section>

          <section className="mr-agent">
            <div className="mr-face" aria-hidden="true">{initials(r.agent.name)}</div>
            <div className="mr-agent-text">
              <b>{r.agent.name}</b>
              <span>{r.agent.brokerage}</span>
              <span>{r.agent.phone} · {r.agent.email}</span>
            </div>
          </section>

          <footer className="mr-foot">
            <p>{r.period}</p>
            <p>{r.source}</p>
            <p>You get this report because {r.agent.first} set it up for your home. <a href="#" onClick={(e) => e.preventDefault()}>Stop my monthly report</a> (one click).</p>
          </footer>
        </article>
        <p className="mrx-after">Your own name, photo and brokerage go where Alex&apos;s are. No home value is ever shown unless you set one. Sold prices join once UtahRealEstate.com allows them.</p>
      </div>
    </div>,
    document.body,
  );
}

/** The "See an example report" button and the preview it opens. */
export function ExampleReportButton({ label = "See an example report", className = "chip-btn" }: { label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>
      {open ? <MarketReportExample onClose={() => setOpen(false)} /> : null}
    </>
  );
}
