"use client";

import { useCallback, useEffect, useState } from "react";
import { closedUrl, demoClosed, readClosed, readReview, reviewLinks, stepAction, stepBody, stepsLeft, type ClosedHome, type ClosedStep, type ReviewDraft } from "@/lib/closed.ts";

// "Closed: <street>" (CONNECTIONS §5.4), in the morning panel. One card per home closed in the last 90 days; each
// step is one tap and nothing is sent: the review opens in the agent's own Messages or email.
export default function ClosedCards({ live }: { live: boolean }) {
  const [homes, setHomes] = useState<ClosedHome[] | null>(live ? null : demoClosed());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [gci, setGci] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Record<string, ReviewDraft>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!live) return;
    fetch(closedUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setHomes(j ? readClosed(j) : null))
      .catch(() => {});
  }, [live]);
  useEffect(load, [load]);

  const tap = async (h: ClosedHome, s: ClosedStep | "dismiss") => {
    setErr(null);
    if (!live) return setErr("Example agent: these steps work on your own closings.");
    const body = s === "dismiss" ? { id: h.id, step: "dismiss" } : stepBody(h.id, s, gci[h.id]);
    setBusy(`${h.id}:${s === "dismiss" ? "dismiss" : s.key}`);
    try {
      const r = await fetch(closedUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(typeof j.error === "string" ? j.error : "ONE MOVE didn't take that. Try again.");
      if (s !== "dismiss" && s.key === "review") {
        const d = readReview(j);
        if (d) setReview((m) => ({ ...m, [h.id]: d }));
      }
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ONE MOVE didn't take that. Try again.");
    } finally {
      setBusy(null);
    }
  };

  if (!homes?.length) return null;
  return (
    <div className="since closed-cards">
      {homes.map((h) => {
        const left = stepsLeft(h);
        const d = review[h.id];
        const links = d ? reviewLinks(d) : null;
        return (
          <section key={h.id} className="closed-card" aria-label={h.title}>
            <h2>{h.title}</h2>
            <p className="since-when">
              {[h.closedOn && `Closed ${h.closedOn}`, h.price && `$${h.price.toLocaleString("en-US")}`, h.side].filter(Boolean).join(" · ")}
              {left ? ` · ${left} step${left === 1 ? "" : "s"} for you` : " · All done"}
            </p>
            <ul className="launch-list">
              {h.steps.map((s) => {
                const act = stepAction(s);
                return (
                  <li key={s.key} className={s.done ? "launch-done" : s.ready ? "launch-ready" : "launch-requested"}>
                    <span>
                      <b>{s.done ? "✓ " : ""}{s.label}</b>
                      {s.note && <small>{s.note}</small>}
                      {s.key === "goal" && act && (
                        <input
                          className="closed-gci"
                          inputMode="decimal"
                          placeholder="GCI (optional)"
                          aria-label="GCI for this closing, optional"
                          value={gci[h.id] ?? ""}
                          onChange={(e) => setGci((m) => ({ ...m, [h.id]: e.target.value }))}
                        />
                      )}
                    </span>
                    {act && (
                      <button className="chip-btn" disabled={busy === `${h.id}:${s.key}`} onClick={() => tap(h, s)}>
                        {act}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {d && (
              <div className="closed-review">
                <p>{d.text}</p>
                <div className="closed-review-actions">
                  {links?.sms && <a className="btn ghost-btn" href={links.sms}>Text it from my phone</a>}
                  {links?.mail && <a className="btn ghost-btn" href={links.mail}>Email it</a>}
                  <button
                    className="btn ghost-btn"
                    onClick={() => navigator.clipboard?.writeText(d.text).then(() => setCopied(h.id)).catch(() => {})}
                  >
                    {copied === h.id ? "Copied" : "Copy"}
                  </button>
                </div>
                <small>You send it yourself. Nothing goes out from ONE.</small>
              </div>
            )}
            <button className="link" onClick={() => tap(h, "dismiss")} disabled={busy === `${h.id}:dismiss`}>
              Hide this card
            </button>
          </section>
        );
      })}
      {err && <p className="since-none" role="alert">{err}</p>}
    </div>
  );
}
