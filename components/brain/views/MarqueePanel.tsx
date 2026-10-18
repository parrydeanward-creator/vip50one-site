"use client";

import { MQ_TITLE, type MqKey } from "@/lib/examples/marquee.ts";
import { MqExample } from "./MarqueeParts.tsx";
import MarqueeSection from "./MarqueeSections.tsx";

// The side panel of a Marquee tool orb (VIP-SUMMARY §3ai; Parry, 18 Oct: the panel shows the example itself, never a
// blank). `example`: the agent has nothing in this tool yet, so the labelled example shows. With real data the orb's
// own rows show below as before, and the example stays one tap away, labelled.

const OPEN_LINE: Record<MqKey, string> = {
  listings: "Every listing with its photo, price, days on market and where its campaign is.",
  calendar: "The week's posts by day, with channel and whether each is scheduled or waiting for you.",
  posts: "Approve or edit each post, then tap Publish. Nothing posts before that.",
  reports: "This week's numbers and feedback for each seller, with Send to seller.",
  presentations: "Your listing appointment and marketing packet, page by page.",
  room_cards: "A card for each room, written for the open house and the listing's room pages.",
};

export default function MarqueePanel({ tool, today, example, onOpen }: { tool: MqKey; today: string; example: boolean; onOpen: (deck?: string, tool?: MqKey) => void }) {
  const title = MQ_TITLE[tool];
  return (
    <section className="mqv-panel" aria-label={`${title}${example ? ", example" : ""}`}>
      <button type="button" className="pi-film pm-open" onClick={() => onOpen()}>
        <span className="pi-play" aria-hidden="true">▶</span>
        <span>
          <b>{example ? `Open ${title}` : `See an example of ${title}`}</b>
          <span>{OPEN_LINE[tool]}</span>
        </span>
      </button>
      {example ? (
        <>
          <h2 className="pm-h mqv-h">
            {title} <MqExample />
          </h2>
          <MarqueeSection tool={tool} today={today} onDeck={(id) => onOpen(id)} onTab={(k) => onOpen(undefined, k)} />
        </>
      ) : null}
    </section>
  );
}
