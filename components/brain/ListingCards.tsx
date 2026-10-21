"use client";

import { useEffect, useMemo, useState } from "react";
import type { GraphNode } from "@/lib/graph/types.ts";
import Icon from "./Icon.tsx";
import { listingsUrl, type Launch, type PieceKey, type PieceState } from "@/lib/launch.ts";
import type { MyListing } from "@/lib/examples/move2.ts";
import { fitsLine, fitsUrl, readFits, type Fits } from "@/lib/listingFits.ts";
import { STAGE_WORDS, domWords, factsLine, launchProgress, listingOrb, money, toursWords, type LaunchProgress, type ListingFacts } from "@/lib/listingCards.ts";
import "@/app/marquee-views.css";
import "@/app/listing-cards.css";

// Your listings as rich cards (Parry, 18 Oct: "we have pics and whatnot so there should be better graphics"). One card
// per listing: the listing photo, price, status, the numbers Marquee sends, the launch's five pieces, who of the agent's
// people fit, the next open house, and Launch / Open in Marquee / Seller report. A click on a card opens that listing's
// orb (the orbs rule), where Launch and "Who of mine fits" already live. Nothing here sends or publishes anything.

const TONES = ["dusk", "sage", "sand", "slate", "ember", "sky"] as const;
export type CardTone = (typeof TONES)[number];
export const toneOf = (key: string): CardTone => TONES[[...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TONES.length];

/** The listing photo, or a drawn home when there is none (never a person's face). */
export function ListingPhoto({ image, tone, label, example = false }: { image: string | null; tone: CardTone; label: string; example?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (image && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="lst-img" src={image} alt={`Listing photo: ${label}`} loading="lazy" onError={() => setBroken(true)} />;
  }
  return (
    <div className={`lst-drawn mqv-${tone}`} role="img" aria-label={example ? `Example photo: ${label}` : `No listing photo yet: ${label}`}>
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <circle cx="128" cy="24" r="10" className="mqv-sun" />
        <path d="M0 78 L28 64 L60 72 L94 58 L128 70 L160 60 L160 100 L0 100 Z" className="mqv-hill" />
        <path d="M46 74 L80 48 L114 74 Z" className="mqv-roof" />
        <rect x="54" y="72" width="52" height="28" className="mqv-wall" />
        <rect x="75" y="82" width="10" height="18" className="mqv-door" />
        <rect x="60" y="78" width="9" height="8" className="mqv-win" />
        <rect x="91" y="78" width="9" height="8" className="mqv-win" />
      </svg>
    </div>
  );
}

export interface CardView {
  key: string;
  street: string;
  place: string | null;
  stage: "live" | "under_contract" | "closed" | "launching" | "other";
  stageLabel: string;
  price: number | null;
  dom: string | null;
  facts: string | null;
  image: string | null;
  tone: CardTone;
  example?: boolean;
  launch: LaunchProgress | null; // null: no launch for this agent's package
  fits: { line: string; count: number } | null;
  openHouse: { when: string; ahead: number } | null;
  tours?: { line: string; href: string | null } | null; // "2 tours booked · next Thu 22 Oct", opens Showly
  marqueeLine: string | null; // "2 posts to approve · 3 scheduled"
  extra?: string | null; // the example's views and showings
}

const SEG_WORDS: Record<string, string> = { off: "not started", requested: "asked for", drafting: "being drafted", ready: "ready for you", done: "done", skipped: "not this time", failed: "needs a look" };

export function ListingCard({
  v,
  onOpen,
  onLaunch,
  onFits,
  marqueeHref,
  reportHref,
  canLaunch,
  onMarquee,
  onReport,
  onTours,
}: {
  v: CardView;
  onOpen: () => void;
  onLaunch?: () => void;
  onFits?: () => void;
  marqueeHref?: string | null;
  reportHref?: string | null;
  canLaunch: boolean;
  /** Example agent: the button acts on screen instead of following a link. */
  onMarquee?: () => void;
  onReport?: () => void;
  onTours?: () => void;
}) {
  const stop = (fn?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn?.();
  };
  const L = v.launch;
  return (
    <article className={`lst-card lst-${v.stage}`} onClick={onOpen} aria-label={`${v.street}${v.price ? `, ${money(v.price)}` : ""}`}>
      <div className="lst-photo">
        <ListingPhoto image={v.image} tone={v.tone} label={v.street} example={v.example} />
        <span className="lst-shade" aria-hidden="true" />
        <span className="lst-tags">
          <span className={`lst-pill lst-pill-${v.stage}`}>{v.stageLabel}</span>
          {v.example ? <span className="lst-ex">Example</span> : null}
        </span>
        {v.dom ? <span className="lst-dom">{v.dom}</span> : null}
        <div className="lst-over">
          {v.price ? <p className="lst-price">{money(v.price)}</p> : <p className="lst-price lst-price-none">Price not set</p>}
          <h3 className="lst-street">
            <button type="button" className="lst-open" onClick={stop(onOpen)}>{v.street}</button>
          </h3>
        </div>
      </div>
      <div className="lst-body">
        <p className="lst-place">
          {[v.place, v.facts].filter(Boolean).join(" · ") || "Marquee listing"}
        </p>
        {L ? (
          <div className="lst-launch">
            <p className="lst-row-h">
              <span>Launch</span>
              <b>{L.launched ? `${L.done} of ${L.total} done` : "Not launched"}</b>
            </p>
            <ol className="lst-segs" aria-label={`Launch: ${L.pieces.map((p) => `${p.name} ${SEG_WORDS[p.state]}`).join(", ")}`}>
              {L.pieces.map((p) => (
                <li key={p.key} className={`lst-seg s-${p.state}`} title={`${p.name}: ${SEG_WORDS[p.state]}`} />
              ))}
            </ol>
            <p className="lst-next">{L.next}</p>
          </div>
        ) : null}
        <ul className="lst-facts">
          {v.fits ? (
            <li>
              <Icon kind="people" size={16} />
              {v.fits.count > 0 && onFits ? (
                <button type="button" className="lst-link" onClick={stop(onFits)}>{v.fits.line}</button>
              ) : (
                <span>{v.fits.line}</span>
              )}
            </li>
          ) : null}
          {v.openHouse ? (
            <li>
              <Icon kind="open" size={16} />
              <span>Open house {v.openHouse.when}{v.openHouse.ahead ? ` · ${v.openHouse.ahead} signed up ahead` : ""}</span>
            </li>
          ) : null}
          {v.tours ? (
            <li>
              <Icon kind="open" size={16} />
              {v.tours.href ? (
                <a className="lst-link" href={v.tours.href} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>{v.tours.line}</a>
              ) : onTours ? (
                <button type="button" className="lst-link" onClick={stop(onTours)}>{v.tours.line}</button>
              ) : (
                <span>{v.tours.line}</span>
              )}
            </li>
          ) : null}
          {v.marqueeLine ? (
            <li>
              <Icon kind="marquee" size={16} />
              <span>{v.marqueeLine}</span>
            </li>
          ) : null}
          {v.extra ? (
            <li>
              <Icon kind="star" size={16} />
              <span>{v.extra}</span>
            </li>
          ) : null}
        </ul>
        <div className="lst-btns">
          {L && !L.launched && canLaunch && onLaunch ? (
            <button type="button" className="chip-btn primary" onClick={stop(onLaunch)}>Launch this listing</button>
          ) : L?.launched && onLaunch ? (
            <button type="button" className="chip-btn primary" onClick={stop(onLaunch)}>See the launch</button>
          ) : null}
          {marqueeHref ? (
            <a className="chip-btn" href={marqueeHref} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>Open in Marquee</a>
          ) : onMarquee ? (
            <button type="button" className="chip-btn" onClick={stop(onMarquee)}>Open in Marquee</button>
          ) : null}
          {reportHref ? (
            <a className="chip-btn" href={reportHref} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>Seller report</a>
          ) : onReport ? (
            <button type="button" className="chip-btn" onClick={stop(onReport)}>Seller report</button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** "2 posts to approve · 3 scheduled · 4 posted this month", only the parts there are. */
export function marqueeLine(f: Pick<ListingFacts, "approvals" | "scheduled" | "posted">): string | null {
  const parts = [
    f.approvals ? `${f.approvals} ${f.approvals === 1 ? "piece" : "pieces"} to approve` : null,
    f.scheduled ? `${f.scheduled} scheduled` : null,
    f.posted ? `${f.posted} posted this month` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** A live listing orb's facts as a card. */
export function cardOf(f: ListingFacts, launch: Launch | null, fits: Fits | null | undefined, showLaunch: boolean): CardView {
  return {
    key: f.ref,
    street: f.street,
    place: f.place,
    stage: f.stage,
    stageLabel: STAGE_WORDS[f.stage],
    price: f.price,
    dom: domWords(f),
    facts: factsLine(f),
    image: f.image,
    tone: toneOf(f.ref),
    launch: showLaunch || launch ? launchProgress(launch) : null,
    fits: fits ? { line: fitsLine(fits), count: fits.reason ? 0 : fits.count } : null,
    openHouse: f.openHouse,
    tours: f.tours ? { line: toursWords(f.tours), href: f.tours.href } : null,
    marqueeLine: marqueeLine(f),
  };
}

/** The listings on the graph, in Marquee's order (live first, then under contract, then closed). */
export function listingNodes(nodes: GraphNode[]): (GraphNode & { listing: ListingFacts })[] {
  const order = { live: 0, under_contract: 1, other: 2, closed: 3 } as const;
  return nodes
    .filter((n): n is GraphNode & { listing: ListingFacts } => /^marquee:listing:/.test(n.id) && !!n.listing)
    .sort((a, b) => order[a.listing.stage] - order[b.listing.stage] || b.importance - a.importance);
}

/**
 * The live "Your listings" page inside the Brain (/dashboard/listings). `fixture` skips the network (screen checks):
 * its fits and can_launch stand in for ONE MOVE's answers.
 */
export default function ListingsPage({
  nodes,
  launches,
  onOpen,
  onClose,
  onClassic,
  fixture,
}: {
  nodes: GraphNode[];
  launches: Launch[] | null;
  /** Open a listing's orb; `fits` scrolls its panel to "Who of mine fits". */
  onOpen: (id: string, part?: "launch" | "fits") => void;
  onClose: () => void;
  onClassic: () => void;
  fixture?: { canLaunch: boolean; fits: Record<string, Fits> };
}) {
  const homes = useMemo(() => listingNodes(nodes), [nodes]);
  const [can, setCan] = useState<boolean | null>(fixture ? fixture.canLaunch : null);
  const [fits, setFits] = useState<Record<string, Fits>>(fixture?.fits ?? {});
  const refs = homes.map((h) => h.listing.ref).join(",");

  useEffect(() => {
    if (fixture) return;
    let alive = true;
    fetch(listingsUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setCan(j ? j.can_launch === true : false))
      .catch(() => alive && setCan(false));
    return () => {
      alive = false;
    };
  }, [fixture]);

  useEffect(() => {
    if (fixture || !refs) return;
    let alive = true;
    for (const ref of refs.split(",").slice(0, 12)) {
      fetch(fitsUrl(ref), { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => j && alive && setFits((m) => ({ ...m, [ref]: readFits(j) })))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [refs, fixture]);

  const live = homes.filter((h) => h.listing.stage === "live").length;
  const total = homes.reduce((n, h) => n + (h.listing.stage !== "closed" && h.listing.price ? h.listing.price : 0), 0);
  const ready = (launches ?? []).reduce((n, l) => n + l.pieces.filter((p) => p.state === "ready").length, 0);

  return (
    <div className="lst-page" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <header className="lst-head">
        <div>
          <p className="lst-kicker">ONE MOVE · People</p>
          <h2 className="lst-title">Your listings</h2>
        </div>
        <div className="lst-head-btns">
          <button type="button" className="page-panel-classic" onClick={onClassic}>Classic page</button>
          <button type="button" className="page-panel-close" onClick={onClose} aria-label="Close Your listings">×</button>
        </div>
      </header>
      {homes.length ? (
        <>
          <dl className="lst-stats">
            <div><dt>Live</dt><dd>{live}</dd></div>
            <div><dt>Total list price</dt><dd>{total ? money(total) : "None"}</dd></div>
            <div><dt>Launch pieces ready</dt><dd>{ready}</dd></div>
          </dl>
          <div className="lst-grid">
            {homes.map((h) => {
              const f = h.listing;
              const launch = launches?.find((l) => l.listingRef === f.ref) ?? null;
              return (
                <ListingCard
                  key={f.ref}
                  v={cardOf(f, launch, fits[f.ref], can !== false)}
                  canLaunch={can === true}
                  onOpen={() => onOpen(listingOrb(f.ref))}
                  onLaunch={() => onOpen(listingOrb(f.ref), "launch")}
                  onFits={() => onOpen(listingOrb(f.ref), "fits")}
                  marqueeHref={f.marquee}
                  reportHref={f.report?.href ?? null}
                />
              );
            })}
          </div>
          <p className="lst-foot">Photos, prices and posts come from Marquee; open houses from ONE Open. Nothing is sent or posted from here.</p>
        </>
      ) : (
        <div className="lst-empty">
          <p>No Marquee listings to show yet. Your listings appear here, with their photos, as soon as Marquee has them.</p>
          <button type="button" className="chip-btn" onClick={onClassic}>Open the Classic page</button>
        </div>
      )}
    </div>
  );
}

/** The example agent's listing as the same card (lib/examples/move2.ts MY_LISTINGS); its figures are invented. */
export function exampleCard(l: MyListing): CardView {
  const launch: Launch | null = l.launch
    ? { id: `ex-${l.id}`, listingRef: l.id, address: l.street, createdAt: null, pieces: (Object.entries(l.launch) as [PieceKey, PieceState][]).map(([piece, state]) => ({ piece, state, openUrl: null, note: null, updatedAt: null })) }
    : null;
  const stage = l.status === "Active" ? "live" : l.status === "Under contract" ? "under_contract" : "launching";
  return {
    key: l.id,
    street: l.street,
    place: l.city,
    stage,
    stageLabel: l.status === "Active" ? "Live" : l.status,
    price: l.price,
    dom: domWords({ stage: stage === "launching" ? "other" : stage, daysOnMarket: l.days || null }),
    facts: factsLine(l),
    image: null,
    tone: l.tone,
    example: true,
    launch: launchProgress(launch),
    fits: { line: l.fits ? `${l.fits} of your people ${l.fits === 1 ? "fits" : "fit"} this home` : "None of your people fit this home yet.", count: l.fits },
    openHouse: l.openHouse ? { when: l.openHouse, ahead: 0 } : null,
    marqueeLine: l.marquee,
    tours: l.tours ? { line: toursWords({ count: l.tours.count, next: l.tours.next }), href: null } : null,
    extra: l.views ? `${l.views.toLocaleString("en-US")} views · ${l.showings} showings` : null,
  };
}
