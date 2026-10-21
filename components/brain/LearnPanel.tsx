"use client";

import { useEffect, useState } from "react";
import { HIT_WORD, LEARN_HOME, dateWords, demoHits, learnSearchUrl, openTarget, readHits, searchable, vaultLine, videosLine, type Hit, type Learn, type LearnPartKey } from "@/lib/learn.ts";

// Learn shows what is inside (lib/learn.ts; walker 0245). The Learn orb's panel: one search box across videos, docs and
// the Vault, and the way into Learn home. Each part orb's panel: Start here, What's New, The Vault, Tour films.

/** Open a link: inside the Brain when it is a ONE MOVE page that lives there, else a new tab. */
function useOpen(onOpenPage: (path: string) => void) {
  return (href: string) => {
    const t = openTarget(href);
    if (t.kind === "brain") onOpenPage(t.path);
    else window.open(t.url, "_blank", "noopener");
  };
}

/** The Learn orb's own panel: the search box and Learn home. */
export function LearnSearch({ live, learn, onOpenPage }: { live: boolean; learn: Learn | null; onOpenPage: (path: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [err, setErr] = useState(false);
  const open = useOpen(onOpenPage);

  useEffect(() => {
    if (!searchable(q)) return setHits(null);
    if (!live) return setHits(demoHits(q));
    let gone = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(learnSearchUrl(q.trim()), { credentials: "include", cache: "no-store" });
        const j = r.ok ? await r.json() : null;
        if (gone) return;
        setErr(!r.ok);
        setHits(readHits(j));
      } catch {
        if (!gone) {
          setErr(true);
          setHits([]);
        }
      }
    }, 300);
    return () => {
      gone = true;
      clearTimeout(t);
    };
  }, [q, live]);

  return (
    <section className="d-list" aria-label="Search Learn">
      <h2>Search Learn</h2>
      <input className="pp-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search videos, docs and the Vault" aria-label="Search videos, docs and the Vault" />
      {hits && hits.length ? (
        <ul className="pp-hits" aria-label="Learn results">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.id}`}>
              <button type="button" onClick={() => open(h.href)} aria-label={`Open ${HIT_WORD[h.kind]}: ${h.title}`}>
                <b>{h.title}</b>
                <small>{[HIT_WORD[h.kind], h.detail].filter(Boolean).join(" · ")}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : hits ? (
        <small className="pm-empty">{err ? "ONE MOVE didn't answer the search just now." : "Nothing in Learn matches that yet."}</small>
      ) : null}
      {learn ? <p className="hr-sub">{`${videosLine(learn.watched, learn.total)} · ${vaultLine(learn.vaultCount)}`}</p> : null}
      {!live ? <p className="op-ex">Example results: the example agent&apos;s, not real.</p> : null}
      <p className="hr-sub">Asking Pulse &quot;how do I ...&quot; comes later.</p>
      <div className="op-acts">
        <button type="button" className="chip-btn" onClick={() => (live ? onOpenPage(LEARN_HOME) : undefined)} disabled={!live} aria-label="Open Learn home in ONE MOVE">Open Learn home</button>
      </div>
    </section>
  );
}

/** One Learn part's panel. */
export function LearnPartPanel({ part, learn, live, onOpenPage, onFilm }: { part: LearnPartKey; learn: Learn | null; live: boolean; onOpenPage: (path: string) => void; onFilm: (f: "a" | "b" | "c") => void }) {
  const open = useOpen(onOpenPage);
  const example = !live ? <p className="op-ex">Example: the example agent&apos;s, not real.</p> : null;
  const waiting = <p className="hr-sub">Waiting on ONE MOVE for what is in Learn.</p>;
  const pageBtn = (label: string, path: string) => (
    <button type="button" className="chip-btn" disabled={!live} onClick={() => onOpenPage(path)} aria-label={`${label} in ONE MOVE`}>{label}</button>
  );

  if (part === "films")
    return (
      <section className="d-list" aria-label="Tour films">
        <h2>Tour films</h2>
        <ul className="op-list">
          <li><span>What everything means</span><small>The map, the orbs and Pulse</small></li>
          <li><span>The ONE GO tour</span><small>The phone app</small></li>
          <li><span>The website film</span><small>Your website, start to finish</small></li>
        </ul>
        <div className="op-acts">
          <button type="button" className="chip-btn primary" onClick={() => onFilm("a")} aria-label="Watch What everything means">What everything means</button>
          <button type="button" className="chip-btn" onClick={() => onFilm("b")} aria-label="Watch the ONE GO tour">Watch the ONE GO tour</button>
          <button type="button" className="chip-btn" onClick={() => onFilm("c")} aria-label="Watch the website film">Watch the website film</button>
        </div>
      </section>
    );

  if (part === "start")
    return (
      <section className="d-list" aria-label="Start here">
        <h2>Start here</h2>
        {learn ? (
          <>
            <p className="hr-sub">{videosLine(learn.watched, learn.total)}</p>
            {learn.nextVideo ? (
              <>
                <p className="hr-line">Next: {learn.nextVideo.title}</p>
                {learn.nextVideo.category ? <p className="hr-sub">{learn.nextVideo.category}</p> : null}
              </>
            ) : (
              <p className="hr-sub">No video picked for you yet. The Video Library has them all.</p>
            )}
          </>
        ) : (
          waiting
        )}
        {example}
        <div className="op-acts">
          {learn?.nextVideo ? (
            <button type="button" className="chip-btn primary" disabled={!live} onClick={() => open(learn.nextVideo!.url)} aria-label={`Watch ${learn.nextVideo.title}`}>Watch it</button>
          ) : null}
          {pageBtn("Open Video Library", "/content")}
        </div>
      </section>
    );

  if (part === "whats_new")
    return (
      <section className="d-list" aria-label="What's New, latest">
        <h2>Latest</h2>
        {learn ? (
          learn.whatsNew.length ? (
            <ul className="op-list ln-news">
              {learn.whatsNew.map((n) => (
                <li key={`${n.date}-${n.title}`}>
                  <span>
                    {n.href && live ? (
                      <button type="button" className="link" onClick={() => open(n.href!)}>{n.title}</button>
                    ) : (
                      n.title
                    )}
                    {n.body ? <small className="ln-body">{n.body}</small> : null}
                  </span>
                  <small>{dateWords(n.date)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hr-sub">Nothing new yet. Each change to ONE lands here with its date.</p>
          )
        ) : (
          waiting
        )}
        {example}
        <div className="op-acts">{pageBtn("Open What's New", "/whats-new")}</div>
      </section>
    );

  // The Vault
  return (
    <section className="d-list" aria-label="The Vault, newest">
      <h2>The Vault</h2>
      {learn ? (
        <>
          <p className="hr-line">{vaultLine(learn.vaultCount)}</p>
          {learn.vaultNewest.length ? (
            <>
              <p className="op-day">Newest</p>
              <ul className="op-list">
                {learn.vaultNewest.map((v) => (
                  <li key={v.id}>
                    <span>{v.title}</span>
                    <small>{[v.category, v.added ? dateWords(v.added) : null].filter(Boolean).join(" · ")}</small>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        waiting
      )}
      {example}
      <div className="op-acts">{pageBtn("Open The Vault", "/vault")}</div>
    </section>
  );
}
