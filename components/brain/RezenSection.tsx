"use client";

import { useCallback, useEffect, useState } from "react";
import { REZEN_OPEN, cleanKey, readConnect, readLine, readRezen, rezenBoxesUrl, rezenConnectUrl, rezenDisconnectUrl, rezenUrl, sinceWords, type RezenState } from "@/lib/rezen.ts";

// My Profile: Connect reZEN (REZEN.md §3). Three steps on one card: open reZEN, paste the key, tick what passes through.
// Hidden until ONE MOVE answers. The key lives only in the box until Connect, then only in MASTER's Vault.
export default function RezenSection() {
  const [s, setS] = useState<RezenState | null>(null);
  const [key, setKey] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [sure, setSure] = useState(false);

  const load = useCallback(async () => {
    const st = await fetch(rezenUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(readRezen)
      .catch(() => null);
    setS(st);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (!s) return null;

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: r.ok, j: await r.json().catch(() => null) };
  };

  const connect = async (yes = false) => {
    const k = cleanKey(key);
    if (!k) return setNote({ ok: false, text: "That doesn't look like a reZEN key. Copy the whole key and paste it again." });
    setBusy(true);
    setNote(null);
    try {
      const { ok, j } = await post(rezenConnectUrl, yes ? { key: k, confirm: true } : { key: k });
      const a = readConnect(ok, j);
      if (a.kind === "confirm") return setConfirm(a.line);
      setConfirm(null);
      if (a.kind === "error") return setNote({ ok: false, text: a.line });
      setKey("");
      setNote({ ok: true, text: `Connected${a.name ? ` as ${a.name}` : ""}. Now tick what passes through.` });
      await load();
    } catch {
      setNote({ ok: false, text: "ONE couldn't reach reZEN just now. Nothing was saved." });
    } finally {
      setBusy(false);
    }
  };

  const tick = async (box: string, on: boolean) => {
    setBusy(true);
    setNote(null);
    try {
      const { ok, j } = await post(rezenBoxesUrl, { box, on });
      if (!ok) setNote({ ok: false, text: (j as { error?: string } | null)?.error ?? "That didn't save. Nothing was changed." });
      await load();
    } catch {
      setNote({ ok: false, text: "That didn't save. Nothing was changed." });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setNote(null);
    try {
      const { ok } = await post(rezenDisconnectUrl, {});
      setNote(ok ? { ok: true, text: "Disconnected. Your key was deleted, and what came from reZEN is removed within the hour." } : { ok: false, text: "That didn't go through. Try again." });
      setSure(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pf-card rz" aria-label="reZEN">
      <h2>reZEN</h2>
      {!s.connected ? (
        <>
          <small className="pf-sub">Optional. Bring your Real deals, cap and more into ONE. You choose what passes through, and you can disconnect at any time.</small>
          <ol className="rz-steps">
            <li>
              <b>Make a key in reZEN.</b> Open reZEN, tap the menu next to your photo, then Security Settings, then Recent API Key, then <i>+ Generate Key</i>. Name it &quot;ONE&quot; and copy it.
              <a className="chip-btn" href={REZEN_OPEN} target="_blank" rel="noopener noreferrer">Open reZEN ↗</a>
            </li>
            <li>
              <b>Paste it here.</b>
              <form
                className="rz-paste"
                onSubmit={(e) => {
                  e.preventDefault();
                  void connect();
                }}
              >
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Your reZEN API key"
                  placeholder="Paste your reZEN key"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setConfirm(null);
                  }}
                />
                <button type="submit" className="chip-btn primary" disabled={busy || !key.trim()}>{busy ? "Checking…" : "Connect"}</button>
              </form>
              <small className="pf-sub">Only paste it here: never in a chat or an email. ONE never asks for your reZEN password.</small>
            </li>
            <li><b>Tick what passes through.</b> Shown once you are connected.</li>
          </ol>
          {confirm && (
            <div className="rz-confirm" role="alert">
              <p>{confirm}</p>
              <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void connect(true)}>Yes, that is me</button>
              <button type="button" className="chip-btn" disabled={busy} onClick={() => { setConfirm(null); setKey(""); }}>No, clear it</button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="rz-who">
            Connected as <b>{s.name ?? "you"}</b>
            {(s.lastReadAt ?? s.read.readAt) ? `, last read ${sinceWords(s.lastReadAt ?? s.read.readAt)}` : s.connectedAt ? `, connected ${sinceWords(s.connectedAt)}` : ""}
          </p>
          {s.error && <p className="pf-note bad" role="status">{s.error}. Paste a new key from reZEN to fix it.</p>}
          {readLine(s.read) ? <p className="rz-line">{readLine(s.read)}.</p> : <small className="pf-sub">Nothing has come through yet. ONE reads reZEN once an hour.</small>}
          <h3>What passes through</h3>
          <ul className="rz-boxes">
            {s.boxes.map((b) => (
              <li key={b.key}>
                <label className="dc-switch">
                  <input type="checkbox" checked={b.on} disabled={busy} onChange={(e) => void tick(b.key, e.target.checked)} />
                  {b.label}
                </label>
                {b.brings && <small className="pf-sub">{b.brings}</small>}
              </li>
            ))}
          </ul>
          <small className="pf-sub">An unticked box is never read, and unticking one removes what came from it within the hour. Only you see it; money never shows on a team screen.</small>
          {s.error && (
            <form className="rz-paste" onSubmit={(e) => { e.preventDefault(); void connect(); }}>
              <input type="password" autoComplete="off" spellCheck={false} aria-label="A new reZEN API key" placeholder="Paste a new reZEN key" value={key} onChange={(e) => setKey(e.target.value)} />
              <button type="submit" className="chip-btn primary" disabled={busy || !key.trim()}>Reconnect</button>
            </form>
          )}
          {sure ? (
            <div className="rz-confirm">
              <p>Disconnect reZEN? Your key is deleted, and everything that came from reZEN is removed.</p>
              <button type="button" className="chip-btn" disabled={busy} onClick={() => void disconnect()}>Yes, disconnect</button>
              <button type="button" className="chip-btn" disabled={busy} onClick={() => setSure(false)}>Keep it</button>
            </div>
          ) : (
            <button type="button" className="chip-btn" disabled={busy} onClick={() => setSure(true)}>Disconnect</button>
          )}
        </>
      )}
      {note && <p className={`pf-note${note.ok ? "" : " bad"}`} role="status">{note.text}</p>}
    </section>
  );
}
