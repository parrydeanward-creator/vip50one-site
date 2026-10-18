"use client";

import { GROWTH_EXAMPLE_LABEL, GROWTH_TITLES, SPEND_LINE, TEAM_SPEND_LINE, pieceKey, pieceLine } from "@/lib/examples/growth.ts";
import { AdsList, AreasList, GrowthNote, InboxList, LandingList, RequestsList, ResultsBlock, SignalsList, SpeedBlock, useGrowthExample } from "./GrowthParts.tsx";

// The side panel of one piece round the ONE Growth orb: the example itself (the ads, the areas, the leads...), its
// buttons working on the example, then "Open <piece>" for the full view inside the Brain. Labelled "Example" until a
// reader for the agent's own Growth data exists in the Brain (the studio and ONE MOVE keep the real thing, behind the
// secondary button below this panel).

const OPEN_LINE: Record<string, string> = {
  ads: "Every draft and live ad, with its words, budget and results. Approve, publish or pause.",
  areas: "Your areas with homes, turnover, postcards and the next market note.",
  landing: "Each page with its preview, visitors and leads. Pause or turn on.",
  speed: "Pick Off, Ask me or Autopilot, and see how fast new leads hear back.",
  signals: "Homeowners who may sell soon, the reason in plain words, and a Call.",
  inbox: "Every new lead by source, with Pulse's reply draft for you to send.",
  results: "The month's spend, leads, appointments and closings by source.",
  adreq: "Ads your agents asked for. Approve, or ask a question first.",
};

export default function GrowthPanel({ childKey, onOpen, showOpen }: { childKey: string; onOpen: () => void; showOpen: boolean }) {
  const s = useGrowthExample();
  const k = pieceKey(childKey);
  if (!k) return null;
  return (
    <section className="gv-panel" aria-label={`${GROWTH_TITLES[k]}, example`}>
      <p className="gv-ex">
        <span className="chip gv-chip">{GROWTH_EXAMPLE_LABEL}</span> {pieceLine(k, s)}
      </p>
      {k === "signals" && <p className="gv-sub">What this looks like once the MLS feed is connected. Suggestions for you only; no home values shown.</p>}
      {k === "ads" && <AdsList s={s} />}
      {k === "areas" && <AreasList s={s} />}
      {k === "landing" && <LandingList s={s} />}
      {k === "speed" && <SpeedBlock s={s} />}
      {k === "signals" && <SignalsList s={s} />}
      {k === "inbox" && <InboxList s={s} />}
      {k === "results" && <ResultsBlock />}
      {k === "adreq" && <RequestsList s={s} />}
      <GrowthNote s={s} />
      {(k === "ads" || k === "results") && <p className="gv-promise">{SPEND_LINE}</p>}
      {k === "adreq" && <p className="gv-promise">{TEAM_SPEND_LINE}</p>}
      {showOpen && (
        <button type="button" className="pi-film pm-open gv-open" onClick={onOpen}>
          <span className="pi-play" aria-hidden="true">▣</span>
          <span>
            <b>Open {GROWTH_TITLES[k]}</b>
            <span>{OPEN_LINE[k]}</span>
          </span>
        </button>
      )}
    </section>
  );
}

/** The secondary button's words for the piece's real place (the studio, ONE MOVE, My Profile). */
export function realLabel(kind: string): string {
  if (kind === "site") return "Open in your website studio";
  if (kind === "movePage") return "Open in ONE MOVE";
  if (kind === "profile") return "Open in My Profile";
  if (kind === "likely") return "Open likely to move";
  return "Open";
}
