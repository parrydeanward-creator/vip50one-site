"use client";

import { useEffect, useState } from "react";
import { IN_BRAIN } from "@/lib/moveMenu.ts";
import { PIECES, PIECE_NAME, launchBody, launchUrl, listingsUrl, pieceWords, readLaunches, type Launch, type PieceKey } from "@/lib/launch.ts";

const MOVE_URL = "https://move.vip50one.com";
const PACKAGE_LINE = "Launch comes with Marquee, in ONE Complete.";

// One-tap listing launch (K21, LAUNCH.md v0.2) in the side panel of a listing orb or its Launch orb. Before a launch:
// the five pieces as switches, all on, and Launch this listing. After: each piece in plain words with Open, which
// goes to the product where the agent approves it. Nothing here approves, publishes or sends anything.
export default function LaunchPanel({
  listingRef,
  launch,
  live,
  onLaunched,
  onOpenPage,
}: {
  listingRef: string;
  launch: Launch | null;
  live: boolean;
  onLaunched: (l: Launch) => void;
  /** Open a ONE MOVE page inside the Brain (path, query). */
  onOpenPage: (path: string, query: string) => void;
}) {
  const [can, setCan] = useState<boolean | null>(live ? null : true);
  const [on, setOn] = useState<Partial<Record<PieceKey, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!live || launch) return;
    fetch(listingsUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setCan(j ? j.can_launch === true : false))
      .catch(() => setCan(false));
  }, [live, launch]);

  const start = async () => {
    if (!live) return setErr("Example agent: Launch works on your own Marquee listings.");
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(launchUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(launchBody(listingRef, on)) });
      const j = await r.json().catch(() => ({}));
      const l = r.ok && j.ok ? readLaunches({ launch: j.launch })?.[0] : null;
      if (!l) throw new Error(typeof j.error === "string" ? j.error : "ONE MOVE didn't take that. Try again.");
      onLaunched(l);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ONE MOVE didn't take that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const open = (url: string) => {
    if (url.startsWith("/")) {
      const [path, query = ""] = url.split("?");
      if (IN_BRAIN.has(path)) return onOpenPage(path, query);
      return window.open(`${MOVE_URL}${url}`, "_blank", "noopener");
    }
    window.open(url, "_blank", "noopener");
  };

  if (launch) {
    return (
      <div className="launch">
        <h2 className="wr-h">Launch</h2>
        <ul className="launch-list">
          {launch.pieces.map((p) => (
            <li key={p.piece} className={`launch-${p.state}`}>
              <span>
                <b>{PIECE_NAME[p.piece]}</b>
                <small>{pieceWords(p)}</small>
              </span>
              {p.openUrl && p.state !== "done" && p.state !== "skipped" && (
                <button className="btn ghost-btn" onClick={() => open(p.openUrl!)} aria-label={`Open ${PIECE_NAME[p.piece]}`}>Open</button>
              )}
            </li>
          ))}
        </ul>
        <p className="pm-promise">Nothing goes out until you approve it where it opens.</p>
      </div>
    );
  }

  if (can === false) return <p className="d-src">{PACKAGE_LINE}</p>;

  return (
    <div className="launch">
      <h2 className="wr-h">Launch this listing</h2>
      <p className="d-src">Pulse drafts each piece. You approve each one before anything goes out.</p>
      <ul className="launch-list">
        {PIECES.map((k) => (
          <li key={k}>
            <label>
              <input type="checkbox" checked={on[k] !== false} onChange={(e) => setOn((o) => ({ ...o, [k]: e.target.checked }))} />
              <span>{PIECE_NAME[k]}</span>
            </label>
          </li>
        ))}
      </ul>
      <button className="btn btn-wide" disabled={busy || can === null || PIECES.every((k) => on[k] === false)} onClick={start}>
        {busy ? "Starting..." : "Launch this listing"}
      </button>
      {err && <p className="decide-err" role="alert">{err}</p>}
    </div>
  );
}
