"use client";

import { useEffect, useState } from "react";
import { readTimeline, timelineUrl } from "@/lib/people.ts";
import { EVENT_TITLE, firstName, fromTimeline, keepBody, keepUrl, touchFor, type Found } from "@/lib/lifeEvents.ts";
import type { DraftPreset } from "./DraftsSection.tsx";

// Life events on the contact card (VIP-SUMMARY §3y): what the agent wrote in this person's timeline, read with the
// plain rules, each with the touch Pulse suggests. Only the agent sees it; nothing is sent.

const when = (at: string) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function LifeEventsSection({ contactId, name, onDraft }: { contactId: string; name: string; onDraft: (p: DraftPreset) => void }) {
  const [found, setFound] = useState<Found[] | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  useEffect(() => {
    let off = false;
    fetch(timelineUrl(contactId), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => !off && setFound(fromTimeline(contactId, name, j ? readTimeline(j) : null)))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [contactId, name]);
  const list = (found ?? []).filter((f) => !gone.includes(f.event));
  if (!list.length) return null;
  const keep = (f: Found, state: "done" | "not_this") => {
    setGone((g) => [...g, f.event]);
    // remembered by ONE MOVE once its route is live (§3y.5); until then, put away for this visit
    fetch(keepUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(keepBody(contactId, f.event, state)) }).catch(() => {});
  };
  const first = firstName(name);
  return (
    <div className="cc-tasks cc-life">
      <h2>Life events</h2>
      <ul>
        {list.map((f) => {
          const t = touchFor(f.event, first);
          return (
            <li key={f.event}>
              <b>{EVENT_TITLE[f.event]}</b> <small>· you wrote {when(f.at)}: &ldquo;{f.quote}&rdquo;</small>
              <span className="cc-life-touch">{t.line}</span>
              <span className="cc-life-acts">
                {t.draft && t.ask ? (
                  <button type="button" className="chip-btn primary" onClick={() => onDraft({ kind: t.draft!, ask: t.ask!, event: f.event, label: `Pulse drafts the ${t.draft === "note" ? "note" : t.draft}` })}>
                    Draft it
                  </button>
                ) : null}
                <button type="button" className="chip-btn" onClick={() => keep(f, "done")}>Done</button>
                <button type="button" className="chip-btn" onClick={() => keep(f, "not_this")}>Not this</button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
