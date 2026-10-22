"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DELETE_CONFIRM, REVIEWS_COPY, REVIEWS_SAVING, REVIEWS_TITLE, SOURCES, TEXT_MAX, NAME_MAX, addBody, checkAdd, countWords, dateWords, deleteBody,
  demoReviews, emptyForm, filterReviews, readDeleteAnswer, readReviewAnswer, readReviews, reviewsUrl, siteBody, sourceWords, starsWords, withReviews,
  type AddForm, type ReviewFilter, type ReviewList, type ReviewSource,
} from "@/lib/reviews.ts";

// My Profile card (Brain side of ONE MOVE's Reviews, vip50-web-crm#370). Hidden until the route answers 200. Counts are
// buttons that filter the list (PROTOCOL rule 12). In the example (?demo=1) everything is local.

export default function ReviewsSection({ demo = false }: { demo?: boolean }) {
  const [list, setList] = useState<ReviewList | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddForm>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (demo) return setList(demoReviews());
    const r = await fetch(reviewsUrl, { credentials: "include", cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setList(r ? readReviews(r.status, j) : null);
  }, [demo]);
  useEffect(() => {
    void load();
  }, [load]);

  const post = async (body: unknown) => {
    const r = await fetch(reviewsUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    return { status: r ? r.status : 0, j };
  };

  if (!list) return null;
  const words = countWords(list);
  const shown = filterReviews(list.reviews, filter);

  const toggle = async (id: string, on: boolean) => {
    if (busy) return;
    setBusy(true);
    setMsg({ ok: true, text: REVIEWS_SAVING });
    if (demo) {
      setList(withReviews(list.reviews.map((x) => (x.id === id ? { ...x, site_ok: on } : x))));
      setBusy(false);
      return setMsg({ ok: true, text: on ? "Now on your website." : "Off your website." });
    }
    const { status, j } = await post(siteBody(id, on));
    const a = readReviewAnswer(status, j);
    setBusy(false);
    if (!a.ok) return setMsg({ ok: false, text: a.error });
    setList(withReviews(list.reviews.map((x) => (x.id === id ? a.review : x))));
    setMsg({ ok: true, text: on ? "Now on your website." : "Off your website." });
  };

  const remove = async (id: string) => {
    if (busy || !window.confirm(DELETE_CONFIRM)) return;
    setBusy(true);
    setMsg({ ok: true, text: REVIEWS_SAVING });
    if (!demo) {
      const { status, j } = await post(deleteBody(id));
      const a = readDeleteAnswer(status, j);
      if (!a.ok) {
        setBusy(false);
        return setMsg({ ok: false, text: a.error });
      }
    }
    setList(withReviews(list.reviews.filter((x) => x.id !== id)));
    setBusy(false);
    setMsg({ ok: true, text: "Review deleted." });
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const bad = checkAdd(form);
    if (bad) return setMsg({ ok: false, text: bad });
    setBusy(true);
    setMsg({ ok: true, text: REVIEWS_SAVING });
    let review;
    if (demo) {
      review = { id: `demo-${Date.now()}`, reviewer: form.reviewer.trim(), text: form.text.trim(), rating: form.rating, source: form.source, site_ok: false, created_at: new Date().toISOString() };
    } else {
      const { status, j } = await post(addBody(form));
      const a = readReviewAnswer(status, j);
      if (!a.ok) {
        setBusy(false);
        return setMsg({ ok: false, text: a.error });
      }
      review = a.review;
    }
    setList(withReviews([review, ...list.reviews]));
    setForm(emptyForm());
    setAdding(false);
    setFilter("all");
    setBusy(false);
    setMsg({ ok: true, text: "Review added. Switch it on to show it on your website." });
  };

  return (
    <section id="reviews" className="pf-card rv-card" aria-label={REVIEWS_TITLE}>
      <h2>{REVIEWS_TITLE}</h2>
      <small className="pf-sub">{REVIEWS_COPY}</small>
      <div className="rvw-counts" role="group" aria-label="Show">
        <button type="button" className={`chip-btn${filter === "all" ? " primary" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{words.all}</button>
        <button type="button" className={`chip-btn${filter === "site" ? " primary" : ""}`} aria-pressed={filter === "site"} onClick={() => setFilter("site")}>{words.site}</button>
        <button type="button" className="chip-btn" onClick={() => { setAdding(!adding); setMsg(null); }} aria-expanded={adding}>{adding ? "Cancel" : "Add a review"}</button>
      </div>
      {adding ? (
        <form className="to-form rvw-form" onSubmit={add}>
          <label>Reviewer<input value={form.reviewer} maxLength={NAME_MAX} onChange={(e) => setForm({ ...form, reviewer: e.target.value })} /></label>
          <div className="rvw-pair">
            <label>Stars
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? "star" : "stars"}</option>)}
              </select>
            </label>
            <label>From
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as ReviewSource })}>
                {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <label>What they said<textarea rows={4} value={form.text} maxLength={TEXT_MAX} onChange={(e) => setForm({ ...form, text: e.target.value })} /></label>
          <div className="pf-btns"><button type="submit" className="chip-btn primary" disabled={busy}>{busy ? "Saving..." : "Save review"}</button></div>
        </form>
      ) : null}
      {msg ? <p className={`pf-note${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p> : null}
      {!shown.length ? (
        <p className="pf-sub">{filter === "site" ? "None of your reviews are on your website yet. Show all, then switch one on." : "No reviews yet. Add one above."}</p>
      ) : (
        <ul className="rvw-list">
          {shown.map((r) => {
            const long = r.text.length > 180;
            const expanded = open[r.id] === true;
            return (
              <li key={r.id} className="rvw-item">
                <div className="rvw-head">
                  <b>{r.reviewer}</b>
                  <span className="rvw-stars" role="img" aria-label={`${r.rating} out of 5 stars`}>{starsWords(r.rating)}</span>
                  <small>{sourceWords(r.source)}{dateWords(r.created_at) ? ` · ${dateWords(r.created_at)}` : ""}</small>
                </div>
                <p className={`rvw-text${expanded ? "" : " clamp"}`}>{r.text}</p>
                {long ? <button type="button" className="rvw-more" onClick={() => setOpen({ ...open, [r.id]: !expanded })}>{expanded ? "Show less" : "Read more"}</button> : null}
                <div className="rvw-actions">
                  <label className="dc-switch">
                    <input type="checkbox" role="switch" checked={r.site_ok} disabled={busy} onChange={(e) => void toggle(r.id, e.target.checked)} />
                    <span>Show on my website</span>
                  </label>
                  <button type="button" className="chip-btn" disabled={busy} onClick={() => void remove(r.id)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
