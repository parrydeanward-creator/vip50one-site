"use client";

import { useEffect, useRef, useState } from "react";
import { EXAMPLE_LANDING, GROWTH_EXAMPLE_LABEL, GROWTH_TITLES, SPEND_LINE, TEAM_SPEND_LINE, pieceKey, pieceLine, type GrowthKey } from "@/lib/examples/growth.ts";
import { AdsList, AreasList, GrowthNote, InboxList, LandingList, RequestsList, ResultsBlock, SignalsList, SpeedBlock, growthDo, useGrowthExample } from "./GrowthParts.tsx";

// ONE Growth's full view inside the Brain (Parry, 18 Oct): every piece with its example, the buttons working on it
// locally, a tab per piece. Dark, like the CMA workspace. Nothing is sent, published or spent from here; the
// agent's real studio stays one button away on the side panel.

export default function GrowthView({ start, keys, live, onClose }: { start: string; keys: string[]; live: boolean; onClose: () => void }) {
  const s = useGrowthExample();
  const tabs = Array.from(new Set(keys.map(pieceKey).filter((k): k is GrowthKey => !!k)));
  const [tab, setTab] = useState<GrowthKey>(pieceKey(start) ?? tabs[0] ?? "ads");
  const [openLead, setOpenLead] = useState<string | null>("ld-1");
  const [asking, setAsking] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      growthDo({ kind: "clearNote" });
    };
  }, []);
  useEffect(() => {
    document.querySelector(".gv-tabs .on")?.scrollIntoView?.({ inline: "center", block: "nearest" });
  }, [tab]);
  const go = (k: GrowthKey) => {
    growthDo({ kind: "clearNote" });
    setTab(k);
  };

  return (
    <div className="pm-full pop gv-full" role="dialog" aria-modal="true" aria-labelledby="gv-title" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="gv-shell">
        <header className="gv-top">
          <button ref={closeRef} type="button" className="chip-btn" onClick={onClose} aria-label="Back to the Brain">← Back</button>
          <div className="gv-top-t">
            <span className="chip gv-chip-g">ONE GROWTH</span>
            <h1 className="d-title" id="gv-title">{GROWTH_TITLES[tab]}</h1>
            <span className="chip gv-chip">{GROWTH_EXAMPLE_LABEL}</span>
          </div>
        </header>
        <nav className="gv-tabs" aria-label="ONE Growth pieces">
          {tabs.map((k) => (
            <button key={k} type="button" className={k === tab ? "on" : ""} aria-current={k === tab ? "page" : undefined} onClick={() => go(k)}>
              {GROWTH_TITLES[k]}
            </button>
          ))}
        </nav>
        <p className="gv-ex">{pieceLine(tab, s)}</p>
        <GrowthNote s={s} />
        <div className="gv-body">
          {tab === "ads" && <AdsList s={s} full />}
          {tab === "areas" && <AreasList s={s} full />}
          {tab === "landing" && <LandingList s={s} full />}
          {tab === "speed" && (
            <div className="gv-card gv-wide"><SpeedBlock s={s} /></div>
          )}
          {tab === "signals" && (
            <>
              <p className="gv-sub">Suggestions for you only, from public records and what people did on your pages. No home values are shown; a value goes to your CMA.</p>
              <SignalsList s={s} />
            </>
          )}
          {tab === "inbox" && (
            <>
              <p className="gv-sub">Zillow, Realtor.com and Homes.com lead emails, your ads and your site, as contacts in one list. Texts open on your phone for you to send.</p>
              <InboxList s={s} full open={openLead} onOpen={setOpenLead} />
            </>
          )}
          {tab === "results" && <div className="gv-card gv-wide"><ResultsBlock full /></div>}
          {tab === "adreq" && (
            <>
              <p className="gv-sub">Only you or an admin approves and publishes a team ad.</p>
              <RequestsList s={s} full asking={asking} onAsk={setAsking} />
            </>
          )}
        </div>
        <p className="gv-promise">
          {live ? "Example data until your own Growth results reach the Brain. " : "Example agent. "}
          {tab === "adreq" ? TEAM_SPEND_LINE : tab === "ads" || tab === "results" ? SPEND_LINE : tab === "landing" ? `A home value page never shows a value: ${EXAMPLE_LANDING[0]!.lead.toLowerCase()}` : "Nothing is sent from this example."}
        </p>
      </div>
    </div>
  );
}
