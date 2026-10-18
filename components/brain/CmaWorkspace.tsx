"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CmaParts from "./CmaParts.tsx";
import {
  DEMO_SUFFIX,
  MIDPOINT_LABEL,
  REDRAW_BUSY,
  REDRAW_BUTTON,
  REDRAW_HEAD,
  REDRAW_KEPT,
  NOTES_LINE,
  NO_SITE_WORDS,
  SEND_CONFIRM,
  SITE_SETUP_URL,
  STATUS_LONG,
  STOP_CONFIRM,
  adjustedNow,
  canRedraw,
  changeLines,
  cmaOneUrl,
  cmaRefreshUrl,
  cmaSaveUrl,
  cmaSendUrl,
  cmaStatus,
  compFacts,
  creditLine,
  demoRedraw,
  demoSaved,
  demoShared,
  linkUntil,
  midpointFromAdjustments,
  money,
  priceWords,
  readCma,
  readCmaLoaded,
  readRefreshAnswer,
  saveBody,
  subjectLine,
  toDrafts,
  videoLine,
  type AdjDraft,
  type CmaLoaded,
} from "@/lib/cma.ts";

// The CMA workspace (LEADS §1.7c-d), full screen over the Brain: the home, Property's Suggested comparables to keep or
// drop, the agent's adjustments on each, their own range, the midpoint from their adjustments (labelled, never a value
// of ONE's), private notes, Save, and Send / Stop. Send makes the client's private page live and shows the link to copy;
// ONE emails nothing. Desktop: comparables | range and notes; phone: stacked. Same routes as Classic's /cma/[id].

export default function CmaWorkspace({
  cmaId,
  address,
  first,
  demo = false,
  demoData,
  onChanged,
  onOpenNew,
  onClose,
}: {
  cmaId: string;
  address: string | null;
  first: string;
  demo?: boolean;
  demoData?: CmaLoaded;
  onChanged: (d: CmaLoaded) => void;
  /** A redrawn draft was made: open it (the example's comes with its data). */
  onOpenNew: (cmaId: string, demoData?: CmaLoaded) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<CmaLoaded | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  const [adj, setAdj] = useState<Record<string, AdjDraft[]>>({});
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;

  const take = useCallback((j: CmaLoaded) => {
    setD(j);
    setKeep(Object.fromEntries(j.cma.comparables.map((c) => [c.listingId, true])));
    setAdj(Object.fromEntries(j.cma.comparables.map((c) => [c.listingId, toDrafts(c.adjustments)])));
    setLow(j.cma.range ? String(j.cma.range.low) : "");
    setHigh(j.cma.range ? String(j.cma.range.high) : "");
    setNotes(j.cma.notes);
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    if (demo) {
      if (demoData) take(demoData);
      else setLoadErr("The example could not be shown.");
      return;
    }
    const r = await fetch(cmaOneUrl(cmaId), { credentials: "include", cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    const loaded = r?.ok ? readCmaLoaded(j) : null;
    if (!loaded) return setLoadErr((j && typeof j.error === "string" && j.error) || "The CMA could not be loaded just now.");
    take(loaded);
    changedRef.current(loaded);
    // demoData is read once on open; later changes come back through take().
  }, [cmaId, demo, take]);
  useEffect(() => {
    void load();
  }, [load]);

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

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
    setMsg(null);
  };

  const save = async () => {
    if (!d) return;
    const body = saveBody(cmaId, d.cma.comparables, keep, adj, low, high, notes);
    if ("error" in body) return setMsg({ ok: false, text: body.error });
    setBusy(true);
    setMsg(null);
    if (demo) {
      const next = demoSaved(d, body);
      take(next);
      onChanged(next);
      setBusy(false);
      return setMsg({ ok: true, text: "Saved." });
    }
    const r = await fetch(cmaSaveUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!r || !r.ok) return setMsg({ ok: false, text: (j && typeof j.error === "string" && j.error) || "That did not save. Nothing was changed." });
    const cma = readCma(j?.cma);
    if (cma) {
      const next = { ...d, cma };
      take(next);
      onChanged(next);
    } else void load();
    setMsg({ ok: true, text: "Saved." });
  };

  const share = async (action: "send" | "stop") => {
    if (!d) return;
    if (!window.confirm(action === "send" ? SEND_CONFIRM : STOP_CONFIRM)) return;
    setBusy(true);
    setMsg(null);
    setCopied(false);
    const done = action === "send" ? `The page is live. Copy the link and send it to ${first} yourself.` : "The link is stopped. The page no longer opens.";
    if (demo) {
      const next = demoShared(d, action, new Date());
      take(next);
      onChanged(next);
      setBusy(false);
      return setMsg({ ok: true, text: `${done} (Example: nothing went live.)` });
    }
    const r = await fetch(cmaSendUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cma_id: cmaId, action }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!r || !r.ok) return setMsg({ ok: false, text: (j && typeof j.error === "string" && j.error) || "That did not go through. Nothing was changed." });
    setMsg({ ok: true, text: done });
    void load();
  };

  const redraw = async () => {
    if (!d || busy) return;
    setBusy(true);
    setMsg(null);
    if (demo) {
      const id = `demo-cma-redraw-${Date.now()}`;
      setBusy(false);
      return onOpenNew(id, demoRedraw(d, cmaId));
    }
    const r = await fetch(cmaRefreshUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cma_id: cmaId }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    const a = readRefreshAnswer(j, !!r?.ok);
    if (!a.ok) return setMsg({ ok: false, text: a.words });
    onOpenNew(a.cmaId);
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setMsg({ ok: false, text: "Could not copy. Select the link and copy it yourself." });
    }
  };

  const status = d ? cmaStatus(d.cma) : "draft";
  const sent = !!d?.cma.sent;
  const redrawn = !!d && !!d.refreshedFrom && !sent;
  const live = status === "sent";
  const mid = d
    ? midpointFromAdjustments(d.cma.comparables.map((c) => ({ price: c.price, keep: !!keep[c.listingId], rows: adj[c.listingId] ?? [] })))
    : null;
  const video = d ? videoLine(d.welcomeVideo) : null;
  const canSend = !!d && !sent && d.cma.status === "ready" && d.hasSite && !dirty;
  const setRow = (id: string, i: number, patch: Partial<AdjDraft>) =>
    edit(setAdj)({ ...adj, [id]: (adj[id] ?? []).map((x, k) => (k === i ? { ...x, ...patch } : x)) });

  const view = (
    <div className="pm-full pop cma-full" role="dialog" aria-modal="true" aria-labelledby="cma-title" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="cma-shell">
        <header className="cma-top">
          <button ref={closeRef} type="button" className="chip-btn" onClick={onClose} aria-label="Close the CMA">← Back</button>
          <div className="cma-top-t">
            <h1 className="d-title" id="cma-title">CMA{address ? `: ${address}` : first ? ` for ${first}` : ""}</h1>
            {d ? <span className={`chip cma-status s-${status}`}>{STATUS_LONG[status]}</span> : null}
          </div>
        </header>
        {loadErr ? <p className="cc-err" role="status">{loadErr}</p> : null}
        {!d && !loadErr ? <p className="hr-sub">Loading the CMA…</p> : null}
        {d ? (
          <>
            {redrawn ? (
              <section className="pc-card cma-box cma-redrawn" aria-label="What changed since you sent it">
                <h2>{REDRAW_HEAD}</h2>
                <ul className="cma-changes">
                  {changeLines(d.changes, (id) => d.cma.comparables.find((c) => c.listingId === id)?.values.address_line ?? `MLS ${id}`).map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                <small className="hr-sub">{REDRAW_KEPT}</small>
              </section>
            ) : null}
            {video ? (
              <p className="hr-sub cma-video">
                {video.text}
                {video.action && video.url ? (
                  <>
                    {" · "}
                    <a href={video.url} target="_blank" rel="noreferrer" className="link">{video.action}</a>
                  </>
                ) : null}
              </p>
            ) : null}
            <section className="pc-card cma-box cma-subject" aria-label="The home">
              <h2>The home</h2>
              <p className="hr-line">{address ?? "Their home"}</p>
              <p className="hr-sub">{subjectLine(d.cma.facts)}</p>
            </section>
            <div className="cma-cols">
              <section className="cma-comps" aria-label="Comparables">
                <h2>Comparables{d.cma.comparables.length ? ` (${d.cma.comparables.filter((c) => keep[c.listingId]).length} kept of ${d.cma.comparables.length})` : ": none yet"}</h2>
                {!d.cma.comparables.length ? <p className="hr-sub">No sales came back for this home yet (the MLS feed may not be connected). Add your sales in your notes for now.</p> : null}
                {d.cma.notShown ? <p className="hr-sub">{d.cma.notShown} left out under the MLS rules.</p> : null}
                {!sent && d.cma.comparables.some((c) => !keep[c.listingId]) ? <p className="hr-sub">Dropped homes leave this CMA when you save.</p> : null}
                <ul className="cma-comp-list">
                  {d.cma.comparables.map((c) => {
                    const on = !!keep[c.listingId];
                    const rows = adj[c.listingId] ?? [];
                    const now = adjustedNow(c.price, rows);
                    const credit = creditLine(c);
                    const title = `${c.values.address_line ?? "Listing"}${c.values.city ? `, ${c.values.city}` : ""}`;
                    return (
                      <li key={c.listingId} className={`pc-card cma-box cma-comp${on ? "" : " dropped"}`} data-listing={c.listingId}>
                        <div className="cma-comp-h">
                          <div className="cma-comp-t">
                            <p className="hr-line"><b>{title}</b>{c.suggested ? <span className="chip cma-sugg">Suggested</span> : null}</p>
                            <p className="hr-sub">{compFacts(c.values)}</p>
                            <p className="hr-line">{money(c.price)} <small className="hr-sub">{priceWords(c)}</small></p>
                          </div>
                          {!sent ? (
                            <div className="cma-keep" role="group" aria-label={`Keep or drop ${title}`}>
                              <button type="button" className={`chip-btn${on ? " primary" : ""}`} aria-pressed={on} onClick={() => edit(setKeep)({ ...keep, [c.listingId]: true })}>Keep</button>
                              <button type="button" className={`chip-btn${on ? "" : " primary"}`} aria-pressed={!on} onClick={() => edit(setKeep)({ ...keep, [c.listingId]: false })}>Drop</button>
                            </div>
                          ) : null}
                        </div>
                        {on ? (
                          <div className="cma-adj">
                            {rows.map((a, i) => (
                              <div key={i} className="cma-adj-row">
                                <input type="text" aria-label={`Adjustment ${i + 1} on ${title}: what it is`} disabled={sent} value={a.label} maxLength={60} placeholder="What (e.g. smaller lot)" onChange={(e) => setRow(c.listingId, i, { label: e.target.value })} />
                                <input type="text" inputMode="numeric" aria-label={`Adjustment ${i + 1} on ${title}: amount, + or -`} disabled={sent} value={a.amount} maxLength={12} placeholder="+/- $" onChange={(e) => setRow(c.listingId, i, { amount: e.target.value.replace(/[^0-9+\-$,]/g, "") })} />
                                {!sent ? (
                                  <button type="button" className="link cma-adj-x" aria-label={`Remove adjustment ${i + 1} on ${title}`} onClick={() => edit(setAdj)({ ...adj, [c.listingId]: rows.filter((_, k) => k !== i) })}>Remove</button>
                                ) : null}
                              </div>
                            ))}
                            {!sent ? (
                              <button type="button" className="link cma-adj-add" onClick={() => edit(setAdj)({ ...adj, [c.listingId]: [...rows, { label: "", amount: "" }] })}>+ Adjustment</button>
                            ) : null}
                            <p className="hr-sub">Adjusted: {money(now)}</p>
                          </div>
                        ) : (
                          <p className="hr-sub">Dropped. Not on this CMA.</p>
                        )}
                        {credit ? <p className="cc-source cma-credit">{credit}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
              <section className="cma-side" aria-label="Your range and notes">
                <div className="pc-card cma-box">
                  <h2>Your range</h2>
                  {mid ? (
                    <p className="hr-sub cma-mid">
                      {MIDPOINT_LABEL}: <b>{money(mid.value)}</b> ({mid.count} kept)
                    </p>
                  ) : (
                    <p className="hr-sub cma-mid">Keep at least one comparable to see the {MIDPOINT_LABEL.toLowerCase()}.</p>
                  )}
                  <small className="hr-sub">You set the range. Pulse and ONE never suggest a value.</small>
                  <div className="cma-range">
                    <label>
                      Low
                      <input type="text" inputMode="numeric" disabled={sent} value={low} placeholder="$" maxLength={12} onChange={(e) => edit(setLow)(e.target.value.replace(/[^0-9]/g, ""))} />
                    </label>
                    <span className="hr-sub">to</span>
                    <label>
                      High
                      <input type="text" inputMode="numeric" disabled={sent} value={high} placeholder="$" maxLength={12} onChange={(e) => edit(setHigh)(e.target.value.replace(/[^0-9]/g, ""))} />
                    </label>
                  </div>
                  <label className="cma-notes">
                    Notes
                    <textarea disabled={sent} value={notes} maxLength={4000} rows={4} placeholder="Only you see these" onChange={(e) => edit(setNotes)(e.target.value)} />
                  </label>
                  <small className="hr-sub">{NOTES_LINE}</small>
                  <div className="cc-perm-acts">
                    {!sent ? <button type="button" className="chip-btn primary cma-save" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button> : null}
                    {!sent ? <button type="button" className="chip-btn cma-send" disabled={busy || !canSend} onClick={() => void share("send")}>Send (make the page live)</button> : null}
                    {canRedraw(d.cma) ? <button type="button" className="chip-btn cma-redraw" disabled={busy} onClick={() => void redraw()}>{busy ? REDRAW_BUSY : REDRAW_BUTTON}</button> : null}
                    {live ? <button type="button" className="chip-btn cma-stop" disabled={busy} onClick={() => void share("stop")}>Stop the link</button> : null}
                  </div>
                  {!sent && dirty ? <p className="hr-sub">Save your changes before you send.</p> : null}
                  {!sent && !dirty && d.cma.status !== "ready" ? <p className="hr-sub">Set your range and save before you send.</p> : null}
                  {!sent && !d.hasSite ? (
                    <p className="hr-sub cma-nosite">
                      {NO_SITE_WORDS}{" "}
                      <a href={SITE_SETUP_URL} target="_blank" rel="noreferrer" className="link">Set up your site</a>
                    </p>
                  ) : null}
                  {sent && !live ? <p className="hr-sub">This CMA has been sent and its link is stopped. Build a new one to make changes.</p> : null}
                  {sent && live ? <p className="hr-sub">This CMA has been sent. Build a new one to make changes.</p> : null}
                  {live && d.link ? (
                    <div className="cma-link">
                      <p className="hr-line">{linkUntil(d.cma.sent?.linkEnds ?? null)}</p>
                      <div className="cma-link-row">
                        <input type="text" readOnly value={d.link} aria-label="The private page link" onFocus={(e) => e.currentTarget.select()} />
                        <button type="button" className="chip-btn primary cma-copy" onClick={() => void copy(d.link!)}>{copied ? "Copied" : "Copy link"}</button>
                      </div>
                      <small className="hr-sub">ONE does not email it. Send it to {first} yourself.</small>
                    </div>
                  ) : null}
                  {msg ? <p className={msg.ok ? "cc-done" : "cc-err"} role="status">{msg.text}</p> : null}
                </div>
                <CmaParts
                  d={d}
                  cmaId={cmaId}
                  demo={demo}
                  sent={sent}
                  low={low}
                  high={high}
                  onSaved={(next) => {
                    setD(next);
                    onChanged(next);
                  }}
                />
                {d.cma.source ? <p className="cc-source">{d.cma.source}</p> : null}
                {demo ? <p className="cc-source">Example agent. Nothing is sent. {DEMO_SUFFIX}</p> : null}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
  return mounted ? createPortal(view, document.body) : null;
}
