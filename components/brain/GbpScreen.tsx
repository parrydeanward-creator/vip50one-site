"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CONNECT_LINE,
  DEMO_NOTE,
  DONE_FIX,
  DONE_PUBLISH,
  DONE_REPLY,
  FOOTER,
  GBP_PATH,
  GBP_TITLE,
  SAVING,
  canSendText,
  connectBody,
  dateWords,
  demoGbp,
  demoStateFrom,
  disconnectBody,
  fieldWords,
  fixBody,
  gbpConnectUrl,
  gbpDisconnectUrl,
  gbpFixUrl,
  gbpPublishUrl,
  gbpReplyUrl,
  gbpUrl,
  isLowStar,
  monthWords,
  publishBody,
  readGbp,
  readGbpAnswer,
  replyBody,
  sourceWords,
  starsWords,
  shownWords,
  stateWords,
  waitingGoogle,
  type GbpAnswer,
  type GbpData,
} from "@/lib/gbp.ts";

// Google Business Profile (GBP.md §3, §5b), full screen over the Brain, the same look as the CMA workspace. ONE MOVE
// serves the routes; a missing route reads as "waiting on Google". Every button shows "Saving..." and then the result in
// words; a failure shows ONE MOVE's own words and keeps the text. A tap sends exactly the text shown. In the example
// (?demo=1, ?demo=1&gbp=waiting) everything is local and nothing is called.

/** The state, read from ONE MOVE (or the example's). `reload` reads again quietly. */
export function useGbp(demo: boolean): { data: GbpData | null; setData: (d: GbpData) => void; reload: () => Promise<void> } {
  const [data, setData] = useState<GbpData | null>(null);
  const reload = useCallback(async () => {
    if (demo) return setData(demoGbp(demoStateFrom(window.location.search)));
    const r = await fetch(gbpUrl, { credentials: "include", cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setData(r ? readGbp(j, r.ok) : waitingGoogle());
  }, [demo]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, setData, reload };
}

type Msg = { busy?: boolean; ok?: boolean; text: string };

export default function GbpScreen({ demo = false, onClose }: { demo?: boolean; onClose: () => void }) {
  const { data, setData, reload } = useGbp(demo);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [msgs, setMsgs] = useState<Record<string, Msg>>({});
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;

  useEffect(() => {
    setMounted(true);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeFn.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const say = (key: string, m: Msg | null) =>
    setMsgs((x) => {
      const n = { ...x };
      if (m) n[key] = m;
      else delete n[key];
      return n;
    });

  // One tap: "Saving...", the call (or the example's local change), then the result in words.
  const act = async (key: string, url: string, body: unknown, done: string, local: () => void) => {
    say(key, { busy: true, text: SAVING });
    if (demo) {
      local();
      return say(key, { ok: true, text: `${done} ${DEMO_NOTE}` });
    }
    const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    const a: GbpAnswer = readGbpAnswer(j, !!r?.ok);
    if (!a.ok) return say(key, { ok: false, text: a.words });
    say(key, { ok: true, text: done });
    if (a.url && url === gbpConnectUrl) return void window.location.assign(a.url);
    local();
    void reload();
  };

  const connect = () =>
    act("connect", gbpConnectUrl, connectBody(), "Google Business Profile is on.", () => {
      if (demo && data) setData({ ...demoGbp("connected") });
    });
  const disconnect = () => {
    if (!window.confirm("Turn off Google Business Profile? ONE stops using your Google profile. Nothing on Google is changed.")) return;
    void act("disconnect", gbpDisconnectUrl, disconnectBody(), "Google Business Profile is off.", () => {
      if (data) setData({ state: "not_connected", location: null, reviews: [], posts: [], mismatches: [], metrics: null });
    });
  };
  const send = (id: string, text: string) =>
    act(`rv:${id}`, gbpReplyUrl, replyBody(id, text), DONE_REPLY, () => {
      if (data) setData({ ...data, reviews: data.reviews.map((r) => (r.id === id ? { ...r, reply: text.trim(), draft: null } : r)) });
    });
  const publish = (id: string, text: string) =>
    act(`po:${id}`, gbpPublishUrl, publishBody(id, text), DONE_PUBLISH, () => {
      if (data) setData({ ...data, posts: data.posts.map((p) => (p.id === id ? { ...p, text: text.trim(), status: "published", publishedAt: new Date().toISOString() } : p)) });
    });
  const fix = (field: string) =>
    act(`fx:${field}`, gbpFixUrl, fixBody(field), DONE_FIX, () => {
      if (data) setData({ ...data, mismatches: data.mismatches.filter((m) => m.field !== field) });
    });

  const state = data?.state ?? null;
  const Note = ({ k }: { k: string }) => {
    const m = msgs[k];
    return m ? <p className={m.busy ? "hr-sub" : m.ok ? "cc-done" : "cc-err"} role="status">{m.text}</p> : null;
  };

  const drafts = data?.posts.filter((p) => p.status === "draft") ?? [];
  const published = data?.posts.filter((p) => p.status === "published") ?? [];

  const view = (
    <div className="pm-full pop cma-full gbp-full" role="dialog" aria-modal="true" aria-labelledby="gbp-title" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="cma-shell gbp-shell">
        <header className="cma-top">
          <button ref={closeRef} type="button" className="chip-btn" onClick={onClose} aria-label="Close Google Business Profile">← Back</button>
          <div className="cma-top-t">
            <h1 className="d-title" id="gbp-title">{GBP_TITLE}</h1>
          </div>
        </header>
        {!data ? <p className="hr-sub">Loading...</p> : null}
        {data ? (
          <>
            <section className="pc-card cma-box gbp-state" aria-label="State" data-state={data.state}>
              <p className="hr-line gbp-state-line">{data.words || (data.state === "not_connected" ? "Google Business Profile is not turned on." : stateWords(data.state, data.location))}</p>
              {data.state === "not_connected" ? (
                <>
                  <div className="cc-perm-acts">
                    <button type="button" className="chip-btn primary gbp-connect" disabled={!!msgs.connect?.busy} onClick={() => void connect()}>Turn on Google Business Profile</button>
                  </div>
                  <p className="hr-sub">{CONNECT_LINE}</p>
                  <Note k="connect" />
                </>
              ) : null}
              {data.state === "connected" ? (
                <>
                  <button type="button" className="link gbp-disconnect" disabled={!!msgs.disconnect?.busy} onClick={disconnect}>Disconnect</button>
                  <Note k="disconnect" />
                </>
              ) : null}
            </section>

            {data.state === "connected" ? (
              <div className="gbp-cols">
                <section className="gbp-col" aria-label="Reviews">
                  <h2>Reviews</h2>
                  {!data.reviews.length ? <p className="hr-sub">No reviews yet.</p> : null}
                  <ul className="gbp-list">
                    {data.reviews.map((r) => {
                      const text = edits[`rv:${r.id}`] ?? r.draft ?? "";
                      const k = `rv:${r.id}`;
                      return (
                        <li key={r.id} className={`pc-card cma-box gbp-item${isLowStar(r.stars) ? " low" : ""}`} data-review={r.id}>
                          <p className="hr-line">
                            <b>{r.firstName}</b> <span className={`chip gbp-stars${isLowStar(r.stars) ? " low" : ""}`}>{starsWords(r.stars)}</span>
                            {isLowStar(r.stars) ? <span className="gbp-needs"> Needs a reply soon</span> : null}
                          </p>
                          {r.at ? <p className="hr-sub">{dateWords(r.at)}</p> : null}
                          {r.text ? <p className="hr-line gbp-quote">{r.text}</p> : null}
                          {r.reply ? (
                            <>
                              <p className="hr-sub gbp-replied"><b>Your reply:</b> {r.reply}</p>
                              <Note k={k} />
                            </>
                          ) : (
                            <>
                              <label className="gbp-box">
                                {r.draft ? "Pulse's draft reply. Change it if you like." : "Your reply"}
                                <textarea
                                  rows={3}
                                  maxLength={4000}
                                  value={text}
                                  aria-label={`Reply to ${r.firstName}`}
                                  onChange={(e) => {
                                    setEdits((x) => ({ ...x, [k]: e.target.value }));
                                    say(k, null);
                                  }}
                                />
                              </label>
                              <div className="cc-perm-acts">
                                <button type="button" className="chip-btn primary gbp-send" disabled={!!msgs[k]?.busy || !canSendText(text)} onClick={() => void send(r.id, text)}>Send</button>
                              </div>
                              <Note k={k} />
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="gbp-col" aria-label="Posts">
                  <h2>Posts</h2>
                  {!data.posts.length ? <p className="hr-sub">No posts yet. A new listing or open house becomes a draft here.</p> : null}
                  <ul className="gbp-list">
                    {drafts.map((p) => {
                      const k = `po:${p.id}`;
                      const text = edits[k] ?? p.text;
                      return (
                        <li key={p.id} className="pc-card cma-box gbp-item" data-post={p.id}>
                          <p className="hr-line"><b>{p.title || "Post"}</b> <span className="chip gbp-src">Draft</span></p>
                          <p className="hr-sub">{sourceWords(p.source)}</p>
                          {p.photoUrl ? <img className="gbp-photo" src={p.photoUrl} alt="" /> : null}
                          <label className="gbp-box">
                            Post text. Change it if you like.
                            <textarea
                              rows={4}
                              maxLength={1500}
                              value={text}
                              aria-label={`Text of the post: ${p.title || "Post"}`}
                              onChange={(e) => {
                                setEdits((x) => ({ ...x, [k]: e.target.value }));
                                say(k, null);
                              }}
                            />
                          </label>
                          {p.link ? <p className="hr-sub">Link: {p.link}</p> : null}
                          <div className="cc-perm-acts">
                            <button type="button" className="chip-btn primary gbp-publish" disabled={!!msgs[k]?.busy || !canSendText(text)} onClick={() => void publish(p.id, text)}>Publish</button>
                          </div>
                          <Note k={k} />
                        </li>
                      );
                    })}
                    {published.map((p) => (
                      <li key={p.id} className="pc-card cma-box gbp-item gbp-pub" data-post={p.id}>
                        <p className="hr-line"><b>{p.title || "Post"}</b> <span className="chip gbp-src on">Published{p.publishedAt ? ` ${dateWords(p.publishedAt)}` : ""}</span></p>
                        <p className="hr-sub">{sourceWords(p.source)}</p>
                        <p className="hr-line gbp-quote">{p.text}</p>
                        <Note k={`po:${p.id}`} />
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="gbp-col" aria-label="Profile check">
                  <h2>Profile check</h2>
                  {!data.mismatches.length ? <p className="hr-sub">Your details on Google match ONE.</p> : null}
                  <ul className="gbp-list">
                    {data.mismatches.map((m) => {
                      const k = `fx:${m.field}`;
                      return (
                        <li key={m.field} className="pc-card cma-box gbp-item" data-field={m.field}>
                          <p className="hr-line"><b>{fieldWords(m.field)}</b></p>
                          <p className="hr-sub">On Google</p>
                          <p className="hr-line gbp-val">{m.google || "Nothing"}</p>
                          <p className="hr-sub">In ONE</p>
                          <p className="hr-line gbp-val">{m.one || "Nothing"}</p>
                          <div className="cc-perm-acts">
                            <button type="button" className="chip-btn primary gbp-fix" disabled={!!msgs[k]?.busy} onClick={() => void fix(m.field)}>Fix on Google</button>
                          </div>
                          <Note k={k} />
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="gbp-col" aria-label="Numbers">
                  <h2>Numbers{data.metrics ? `: ${monthWords(data.metrics.month)}` : ""}</h2>
                  {data.metrics ? (
                    <div className="pc-card cma-box gbp-nums">
                      <dl>
                        <div><dt>Calls</dt><dd>{data.metrics.calls}</dd></div>
                        <div><dt>Directions</dt><dd>{data.metrics.directions}</dd></div>
                        <div><dt>Website clicks</dt><dd>{data.metrics.clicks}</dd></div>
                        <div><dt>Views</dt><dd>{data.metrics.views}</dd></div>
                      </dl>
                      <p className="cc-source">{monthWords(data.metrics.month)}. Source: {data.metrics.source}.</p>
                    </div>
                  ) : (
                    <p className="hr-sub">Numbers show here once Google has a month to report.</p>
                  )}
                </section>
              </div>
            ) : null}
            <p className="cc-source gbp-footer">{FOOTER}</p>
            {demo ? <p className="cc-source">Example agent. Nothing is sent to Google.</p> : null}
          </>
        ) : null}
      </div>
    </div>
  );
  return mounted ? createPortal(view, document.body) : null;
}

/** The My Profile card (Brain): the state in words and an Open link. `onOpen` opens the screen without a page load. */
export function GbpProfileCard({ demo = false, onOpen }: { demo?: boolean; onOpen?: () => void }) {
  const { data } = useGbp(demo);
  return (
    <section className="pf-card gbp-card" aria-label={GBP_TITLE}>
      <h2>{GBP_TITLE}</h2>
      <small className="pf-sub">{data ? shownWords(data) : "Loading..."}</small>
      <div className="pf-btns">
        <a
          className="chip-btn"
          href={GBP_PATH}
          onClick={(e) => {
            if (!onOpen) return;
            e.preventDefault();
            onOpen();
          }}
        >
          Open
        </a>
      </div>
    </section>
  );
}
