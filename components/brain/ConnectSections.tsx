"use client";

import { useCallback, useEffect, useState } from "react";
import { connectorLogUrl, connectorUrl, leadMailUrl, readConnector, readLeadMail, readLog, revokeUrl, when, type ConnectorState, type LeadMail, type LogLine } from "@/lib/connector.ts";

// My Profile, two of the agent's own connections: the lead email address for Zillow, Realtor.com and Homes.com
// (LEADS §1.1), and "Let my own AI read my ONE data" (CONNECTOR.md v0.1). Each section hides itself until ONE MOVE
// answers, so nothing half-working shows.

export function LeadMailSection() {
  const [mail, setMail] = useState<LeadMail | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    fetch(leadMailUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMail(readLeadMail(j)))
      .catch(() => {});
  }, []);
  if (!mail) return null;
  return (
    <section className="pf-privacy" aria-label="Lead email address">
      <h2>Lead email address</h2>
      <small className="pf-sub">
        Put this in Zillow, Realtor.com and Homes.com as where your leads are emailed, or forward lead emails to it. Each lead lands in ONE MOVE, tagged with where it came
        from. Nothing is sent to the lead.
      </small>
      <div className="cn-copy">
        <code>{mail.address}</code>
        <button
          type="button"
          className="chip-btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(mail.address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {mail.recent.length ? (
        <ul className="cn-log">
          {mail.recent.map((x) => (
            <li key={x.at}>
              {when(x.at)} · {x.summary} · {x.status}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function OwnAISection() {
  const [s, setS] = useState<ConnectorState | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => {
    const st = await fetch(connectorUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(readConnector)
      .catch(() => null);
    setS(st);
    if (st?.on) {
      const l = await fetch(connectorLogUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      setLog(readLog(l));
    } else setLog([]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (!s || !s.allowed) return null;
  const post = async (url: string, body: unknown, done: string) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) setNote(j?.error || "That didn't save. Nothing was changed.");
      else {
        setNote(done);
        await load();
      }
    } catch {
      setNote("That didn't save. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="pf-privacy" aria-label="Your own AI">
      <h2>Your own AI</h2>
      <label className="dc-switch">
        <input type="checkbox" checked={s.on} disabled={busy} onChange={(e) => void post(connectorUrl, { on: e.target.checked }, e.target.checked ? "On. Add the address below in your AI app." : "Off. Every connected AI was disconnected.")} />
        Let my own AI read my ONE data
      </label>
      <small className="pf-sub">Off unless you switch it on. Read only: your AI can look at your day, contacts, VIP touches, week and Hot/Warm/Cold. It can never change anything, send anything, or see another agent&apos;s data.</small>
      {s.on ? (
        <>
          <div className="cn-copy">
            <code>{s.serverUrl}</code>
            <button
              type="button"
              className="chip-btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(s.serverUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {}
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <small className="pf-sub">In your AI app (for example Claude: Settings, Connectors, Add custom connector), paste this address, then sign in with your ONE login and tap Allow.</small>
          {s.connected.length ? (
            <ul className="cn-log">
              {s.connected.map((c) => (
                <li key={c.clientId}>
                  <b>{c.name}</b> · connected {when(c.connectedAt)}
                  {c.lastUsedAt ? ` · last used ${when(c.lastUsedAt)}` : ""}{" "}
                  <button type="button" className="chip-btn" disabled={busy} onClick={() => void post(revokeUrl, { client_id: c.clientId }, `${c.name} disconnected.`)}>
                    Disconnect
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pf-sub">No AI connected yet.</p>
          )}
          {log.length ? (
            <>
              <h3 className="cn-h">What your AI looked at</h3>
              <ul className="cn-log">
                {log.map((x, k) => (
                  <li key={`${x.at}-${k}`}>
                    {when(x.at)} · {x.line}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
      {note ? <p className="pf-note" role="status">{note}</p> : null}
    </section>
  );
}
