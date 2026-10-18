"use client";

import { useEffect, useRef, useState } from "react";
import { MQ_DECKS, MQ_KEYS, MQ_TITLE, type MqKey } from "@/lib/examples/marquee.ts";
import { MqExample, MqPhoto } from "./MarqueeParts.tsx";
import MarqueeSection from "./MarqueeSections.tsx";

// Marquee inside the Brain (Parry, 18 Oct): the six tools on the labelled example, full screen, where Approve, Edit,
// Publish, Send to seller and Open work on this page only. Nothing is posted, published or sent. `href`: the real
// Marquee page through the one sign-in hop, kept as a secondary link.

export default function MarqueeView({ tool, deck, today, href, onClose }: { tool: MqKey; deck?: string; today: string; href?: string; onClose: () => void }) {
  const [tab, setTab] = useState<MqKey>(tool);
  const [open, setOpen] = useState<string | null>(deck ?? null);
  const [page, setPage] = useState(0);
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
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  const d = open ? MQ_DECKS.find((x) => x.id === open) ?? null : null;
  // on a phone the tab strip scrolls: keep the open tool's tab in sight
  useEffect(() => {
    document.querySelector(".mqv-tab.on")?.scrollIntoView?.({ inline: "center", block: "nearest" });
  }, [tab]);

  return (
    <div className="pm-full pop mqv-full" role="dialog" aria-modal="true" aria-labelledby="mqv-title" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="mqv-shell">
        <header className="mqv-top">
          <button ref={closeRef} type="button" className="chip-btn" onClick={onClose} aria-label="Close Marquee">← Back</button>
          <div className="mqv-top-t">
            <h1 className="d-title" id="mqv-title">
              Marquee: {MQ_TITLE[tab]} <MqExample />
            </h1>
            <p className="mqv-s">Example listings and people, invented. What you do here stays on this screen.</p>
          </div>
          {href ? <a className="link mqv-out" href={href} target="_blank" rel="noreferrer">Open in Marquee</a> : null}
        </header>
        <nav className="mqv-tabs" role="tablist" aria-label="Marquee tools">
          {MQ_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={`mqv-tab${tab === k ? " on" : ""}`}
              onClick={() => {
                setTab(k);
                setOpen(null);
              }}
            >
              {MQ_TITLE[k]}
            </button>
          ))}
        </nav>
        <div className="mqv-main" role="tabpanel" aria-label={MQ_TITLE[tab]}>
          {tab === "presentations" && d ? (
            <section className="mqv-reader" aria-label={`${d.kind}, ${d.listing}`}>
              <div className="mqv-btns">
                <button type="button" className="chip-btn" onClick={() => setOpen(null)}>← All presentations</button>
                <span className="mqv-s">{d.kind} · {d.listing} · page {page + 1} of {d.sections.length}</span>
              </div>
              <div className="mqv-page">
                <MqPhoto tone={d.tone} size="lg" label={page === 0 ? "Cover" : `Page ${page + 1}`} />
                <small>{d.kind} · {d.listing}</small>
                <h2>{d.sections[page]}</h2>
                <p className="mqv-s">{page === 0 ? `Prepared for the owners of ${d.listing}.` : `Written for ${d.listing} by Marquee from the listing's facts and photos. You check it before it is shown.`}</p>
              </div>
              <div className="mqv-btns">
                <button type="button" className="chip-btn" disabled={page === 0} onClick={() => setPage((n) => Math.max(0, n - 1))}>Previous</button>
                <button type="button" className="chip-btn primary" disabled={page >= d.sections.length - 1} onClick={() => setPage((n) => Math.min(d.sections.length - 1, n + 1))}>Next page</button>
              </div>
              <ol className="mqv-secs mqv-toc">
                {d.sections.map((x, i) => (
                  <li key={x}>
                    <button type="button" className={`link${page === i ? " on" : ""}`} aria-current={page === i ? "page" : undefined} onClick={() => setPage(i)}>{x}</button>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <MarqueeSection
              tool={tab}
              today={today}
              big
              onTab={(k) => {
                setTab(k);
                setOpen(null);
              }}
              onDeck={(id) => {
                setOpen(id);
                setPage(0);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
