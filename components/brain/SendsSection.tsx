"use client";

import { useCallback, useEffect, useState } from "react";
import { reasonWord, readSends, sendsLine, sendsUrl, statusWord, type SendAction, type Sends } from "@/lib/sends.ts";

// "What Pulse is sending" on the contact card (LEADS.md §5), the same list and the same Stop, Stop all and Start
// again as ONE MOVE's person card. Stop all stops Pulse's helpers only; the agent's own sends are never stopped.

const when = (at: string | null) => (at ? new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");

export default function SendsSection({ contactId }: { contactId: string }) {
  const [sends, setSends] = useState<Sends | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const j = await fetch(sendsUrl(contactId), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    setSends(j ? readSends(j) : null);
  }, [contactId]);
  useEffect(() => {
    setSends(null);
    void load();
  }, [load]);

  const act = async (a: SendAction) => {
    setBusy(true);
    setErr(null);
    const ok = await fetch(sendsUrl(contactId), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) })
      .then((r) => r.ok)
      .catch(() => false);
    if (!ok) setErr("That did not go through. Try again in a moment.");
    await load();
    setBusy(false);
  };

  if (!sends) return null;
  return (
    <div className="cc-tasks cc-sends">
      <h2>What Pulse is sending</h2>
      <p className="cc-sends-line">{sendsLine(sends)}</p>
      {sends.items.length ? (
        <ul>
          {sends.items.map((s) => (
            <li key={s.id}>
              {s.what}
              <small>
                {" · "}
                {statusWord(s.status)}
                {s.at ? ` ${when(s.at)}` : ""}
                {s.channel ? ` · ${s.channel}` : ""}
                {s.reason ? ` · ${reasonWord(s.reason)}` : ""}
              </small>
              {s.canStop && !sends.stoppedAll ? (
                <button type="button" className="cc-stop" disabled={busy} onClick={() => void act({ action: "stop", id: s.id })} aria-label={`Stop: ${s.what}`}>
                  Stop
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {sends.stoppedAll ? (
        <button type="button" className="cc-btn" disabled={busy} onClick={() => void act({ action: "start_again" })}>Start Pulse again for this person</button>
      ) : (
        <button type="button" className="cc-btn" disabled={busy} onClick={() => void act({ action: "stop_all" })}>Stop all Pulse sends to this person</button>
      )}
      <p className="cc-source">Your own texts and emails are never stopped by this.</p>
      {err ? <p className="cc-err">{err}</p> : null}
    </div>
  );
}
