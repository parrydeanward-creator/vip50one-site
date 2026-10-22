"use client";

import { useEffect, useRef, useState } from "react";
import { clock12, type Block } from "@/lib/schedule.ts";
import { panelRows, type TouchItem } from "@/lib/touchBlock.ts";

// The Power Hour's touches (Parry, 22 Oct: "when the user clicks on power hour it should populate all those auto touches
// (tasks) and populate them in the side bar with the persons name and make it clickable so when clicked it will open the
// contacts full page so the user can do what they are supposed to and then click all the boxes when accomplished").
// Opened from the Power Hour or its follow-up ("Finish your VIP touches") on the Day Clock and in Your day. A right-hand
// panel on a desktop, a bottom sheet on a phone, as ONE MOVE Classic's PowerHourPanel. Each box completes the task the way
// ONE MOVE's task list does (POST /api/brain/day/done); the answered day recounts the panel, the block and the clock.

const MARK: Record<TouchItem["kind"], string> = { call: "☎", text: "✉", note: "✎" };

export default function TouchPanel({ block, demo, covered = false, onClose, onTick, onContact }: { block: Block; demo: boolean; /** A contact opened from the panel is on top: Escape is its. */ covered?: boolean; onClose: () => void; onTick: (item: TouchItem, done: boolean) => Promise<string | null>; onContact: (contactId: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const coveredRef = useRef(covered);
  coveredRef.current = covered;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || coveredRef.current) return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  const rows = panelRows(block);
  const done = rows.filter((r) => r.done).length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const tick = async (item: TouchItem, on: boolean) => {
    setBusy(item.ref);
    setError(null);
    setError(await onTick(item, on));
    setBusy(null);
  };
  return (
    <div className="phx-wrap" role="presentation">
      <div className="phx-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="phx pop" role="dialog" aria-modal="true" aria-labelledby="phx-title">
        <span className="phx-grip" aria-hidden="true" />
        <header className="phx-head">
          <span className="phx-mark" aria-hidden="true">⚡</span>
          <div>
            <h1 id="phx-title">{block.title}</h1>
            <p>
              {clock12(block.start)} to {clock12(block.end)} · {block.followUp ? "What is left from your Power Hour" : "Today's VIP touches"}
            </p>
          </div>
          <button ref={closeRef} className="phx-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        {rows.length > 0 && (
          <div className="phx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={rows.length} aria-valuenow={done} aria-label={`${done} of ${rows.length} done`}>
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
        {rows.length ? (
          <ul className="phx-list">
            {rows.map((r) => (
              <li key={r.key} className={r.done ? "is-done" : ""}>
                <button
                  className={`phx-box${r.done ? " on" : ""}`}
                  role="checkbox"
                  aria-checked={r.done}
                  disabled={busy === r.key}
                  onClick={() => void tick(r.item, !r.done)}
                  aria-label={`${r.done ? "Mark not done" : "Mark done"}: ${r.what}, ${r.name}`}
                >
                  {r.done ? "✓" : ""}
                </button>
                <span className="phx-body">
                  {r.contactId ? (
                    <a
                      className="phx-name"
                      href={r.href!}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                        e.preventDefault();
                        onContact(r.contactId!);
                      }}
                    >
                      {r.name}
                    </a>
                  ) : (
                    <span className="phx-name">{r.name}</span>
                  )}
                  <small>
                    <span aria-hidden="true">{MARK[r.kind]}</span> {r.what}
                    {r.done ? " · done" : ""}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pm-empty">No touches in this block.</p>
        )}
        {error && <p className="phx-error" role="alert">{error}</p>}
        <footer className="phx-foot">
          Tap a name to open their page. Tick the box when it is done: your trackers and Pulse update.
          {!block.followUp && " Anything not done when the hour ends moves to a block later today."}
          {demo && " Example agent: nothing is saved."}
        </footer>
      </aside>
    </div>
  );
}
