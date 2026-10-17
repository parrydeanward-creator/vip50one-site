"use client";

import { useState } from "react";
import { EMPTY_LINE, GROUPS, MAX_SHOWN, countOf, followUpsLogUrl, shownRows, whenWords, type FollowRow, type FollowUps } from "@/lib/followUps.ts";
import { taskDoneUrl } from "@/lib/contact.ts";
import { CLASSIC_DASHBOARD_URL } from "@/lib/host.ts";

const DOT = { overdue: "#ff5a5a", today: "#f5c542", next7: "#4fd18b" } as const;

/** Close the task: ONE MOVE's follow-ups log route first; the Brain's task-done route when that is not there yet. */
async function logTouch(taskId: string): Promise<void> {
  const send = (url: string) =>
    fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task_id: taskId }) });
  let first: Response | null = null;
  try {
    first = await send(followUpsLogUrl);
  } catch {
    first = null; // not there yet (no CORS answer) or offline: try the task-done route
  }
  if (first?.ok) return;
  if (first && first.status !== 404 && first.status !== 405) {
    const j = await first.json().catch(() => ({}));
    throw new Error(j.error ?? "ONE MOVE didn't take that. Try again.");
  }
  const r = await send(taskDoneUrl);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(j.error ?? "ONE MOVE didn't take that. Try again.");
}

// The Follow-ups orb's side panel (lib/followUps.ts): Overdue, Today and Next 7 days. A row opens the person's record
// (their orb, with the person card); "Log the touch" closes the task. In the demo nothing is saved.
export default function FollowUpsPanel({ f, today, live, onOpen, onLogged }: {
  f: FollowUps;
  today: string;
  live: boolean;
  onOpen: (orbId: string) => void;
  onLogged: () => void;
}) {
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const shown = shownRows(f);
  const total = countOf(f);

  const log = async (row: FollowRow) => {
    const key = row.taskId ?? row.orbId;
    setMsg(null);
    if (!live) {
      setLogged((s) => new Set(s).add(key));
      setMsg(`Logged. ${row.firstName || "That one"} is off your list. (An example: nothing was saved.)`);
      return;
    }
    if (!row.taskId) return;
    setBusy(key);
    try {
      await logTouch(row.taskId);
      setLogged((s) => new Set(s).add(key));
      setMsg(`Logged. ${row.firstName || "That one"} is off your list.`);
      onLogged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ONE MOVE didn't take that. Try again.");
    } finally {
      setBusy(null);
    }
  };

  if (!total)
    return (
      <section className="fu-panel" aria-label="Follow-ups">
        <p className="fu-empty" role="status">{EMPTY_LINE}</p>
        <ul className="fu-how">
          <li><b>A call note:</b> say or type "call her back Thursday" and ONE MOVE makes the follow-up.</li>
          <li><b>Talk to Pulse:</b> tell Pulse what you promised and it lands here.</li>
          <li><b>An action plan:</b> each step that is yours shows here on its day.</li>
        </ul>
      </section>
    );

  return (
    <section className="fu-panel" aria-label="Follow-ups">
      {msg ? <p className="fu-msg" role="status">{msg}</p> : null}
      {GROUPS.map((g) => {
        const rows = shown.filter((s) => s.group === g.key).map((s) => s.row);
        return (
          <div key={g.key} className="fu-group">
            <h3>
              {g.label} <small>{f[g.key].length}</small>
            </h3>
            {rows.length ? (
              <ul className="pm-list pm-compact">
                {rows.map((row) => {
                  const key = row.taskId ?? row.orbId;
                  const done = logged.has(key);
                  return (
                    <li key={key} className={done ? "is-done" : undefined}>
                      <i className="pm-dot" style={{ background: DOT[g.key] }} aria-hidden="true" />
                      <button type="button" className="fu-row" onClick={() => onOpen(row.orbId)} aria-label={`${row.what}, ${whenWords(row, g.key, today)}. Open the record`}>
                        <span className="pm-body">
                          <b>{row.firstName || row.what}</b>
                          <small>{row.firstName ? `${row.what} · ${whenWords(row, g.key, today)}` : whenWords(row, g.key, today)}</small>
                        </span>
                      </button>
                      {done ? (
                        <small className="fu-done">Logged</small>
                      ) : live && !row.taskId ? null : (
                        <button type="button" className="chip-btn" disabled={busy === key} onClick={() => log(row)}>
                          {busy === key ? "Logging…" : "Log the touch"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="fu-none">{g.key === "overdue" ? "Nothing overdue." : g.key === "today" ? "Nothing due today." : "Nothing in the next 7 days."}</p>
            )}
          </div>
        );
      })}
      {total > MAX_SHOWN ? (
        <p className="fu-more">
          {total - MAX_SHOWN} more in <a href={CLASSIC_DASHBOARD_URL} target="_blank" rel="noreferrer">ONE MOVE</a>. Fifteen show at one time; clear these and the next ones come up.
        </p>
      ) : null}
    </section>
  );
}
