"use client";

import { useCallback, useEffect, useState } from "react";
import { permissionsUrl, readPermissions, stateWord, stopBody, yesBody, type ChannelState, type Permissions } from "@/lib/permissions.ts";

// Permissions on the contact card (LEADS.md §2.5): each channel's state with one button. "They said yes" asks how they
// agreed and for the agent's tick; "They asked me to stop" asks once. Same route as ONE MOVE and ONE GO.

export default function PermissionsSection({ contactId, onChanged }: { contactId: string; onChanged?: () => void }) {
  const [p, setP] = useState<Permissions | null>(null);
  const [open, setOpen] = useState<string | null>(null); // channel being changed
  const [how, setHow] = useState("");
  const [note, setNote] = useState("");
  const [tick, setTick] = useState(false);
  const [back, setBack] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const j = await fetch(permissionsUrl(contactId), { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setP(j ? readPermissions(j) : null);
  }, [contactId]);
  useEffect(() => {
    setP(null);
    setOpen(null);
    void load();
  }, [load]);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    const r = await fetch(permissionsUrl(contactId), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!r || !r.ok) return setMsg((j && typeof j.error === "string" && j.error) || "That did not save. Try again in a moment.");
    const next = readPermissions(j);
    if (next) setP(next);
    else void load();
    setOpen(null);
    setMsg("Saved.");
    onChanged?.();
  };
  const begin = (c: ChannelState) => {
    setOpen(c.channel);
    setHow("");
    setNote("");
    setTick(false);
    setBack(false);
    setMsg(null);
  };

  if (!p) return null;
  return (
    <div className="cc-tasks cc-perms">
      <h2>Permissions</h2>
      <ul className="cc-perm-list">
        {p.channels.map((c) => (
          <li key={c.channel}>
            <span className={`cc-perm-state s-${c.state}`}>{c.label}: {stateWord(c.state)}</span>
            {c.since ? <small> since {new Date(c.since).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</small> : null}
            <span className="cc-perm-acts">
              {c.state !== "yes" ? <button type="button" className="chip-btn" disabled={busy} onClick={() => begin(c)}>They said yes</button> : null}
              {c.state !== "no" ? (
                <button type="button" className="chip-btn" disabled={busy} onClick={() => { if (window.confirm(`Record that they asked you to stop ${c.channel === "sms" ? "texting" : "emailing"} them? Pulse stops at once.`)) void send(stopBody(c)); }}>
                  They asked me to stop
                </button>
              ) : null}
            </span>
            {open === c.channel ? (
              <div className="cc-perm-form">
                <label>
                  How they agreed
                  <select value={how} onChange={(e) => setHow(e.target.value)}>
                    <option value="">Choose…</option>
                    {p.hows.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}
                  </select>
                </label>
                <label>Note (optional) <input type="text" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></label>
                {c.needsAddedBack ? (
                  <label className="cc-perm-tick"><input type="checkbox" checked={back} onChange={(e) => setBack(e.target.checked)} /> They asked to be added back</label>
                ) : null}
                <label className="cc-perm-tick"><input type="checkbox" checked={tick} onChange={(e) => setTick(e.target.checked)} /> I have their permission</label>
                {c.carrierNote ? <p className="cc-source">{c.carrierNote}</p> : null}
                {(() => {
                  const y = yesBody(c, how, note, tick, back);
                  return "problem" in y ? (
                    <>
                      <p className="cc-source">{y.problem}</p>
                      <button type="button" className="cc-btn" disabled>Save yes</button>
                    </>
                  ) : (
                    <button type="button" className="cc-btn" disabled={busy} onClick={() => void send(y.body)}>Save yes</button>
                  );
                })()}
                <button type="button" className="vr-classic" onClick={() => setOpen(null)}>Cancel</button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {msg ? <p className="cc-source" role="status">{msg}</p> : null}
      {p.history.length ? (
        <ul className="cc-perm-history">{p.history.map((h, i) => <li key={i}>{h.line}</li>)}</ul>
      ) : null}
      <p className="cc-source">Nothing is sent to them when this changes.</p>
    </div>
  );
}
