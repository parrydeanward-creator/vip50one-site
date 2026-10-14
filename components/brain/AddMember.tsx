"use client";

import { useState } from "react";
import { addBody, checkAdd, readAdd, teamAddUrl, type AddForm } from "@/lib/teamAdd.ts";

// Team screen: Add a member (TEAM-ONBOARDING §1a). One tap turns on their seat, every product in the team plan, the team
// features, their coach, site and team page. Lead rotation only when ticked (off to start).
export default function AddMember({ live }: { live: boolean }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<AddForm>({ name: "", email: "", phone: "", role: "agent", rotation: false });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = checkAdd(f);
    if (problem) return setNote({ ok: false, text: problem });
    if (!live) return setNote({ ok: false, text: "Example team: Add works on your own team." });
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch(teamAddUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addBody(f)) });
      const a = readAdd(r.status, await r.json().catch(() => null), f.name.trim());
      setNote({ ok: a.kind === "added" || a.kind === "already", text: a.line });
      if (a.kind === "added") setF({ name: "", email: "", phone: "", role: "agent", rotation: false });
    } catch {
      setNote({ ok: false, text: "That didn't go through. Nothing was changed." });
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <div className="decide-btns">
        <button type="button" className="chip-btn primary" onClick={() => setOpen(true)}>Add a member</button>
      </div>
    );
  return (
    <form className="tm-add" onSubmit={submit}>
      <h3>Add a member</h3>
      <small className="pf-sub">One tap turns on their seat, every product in your team plan, the team features, their coach, their site and their team page.</small>
      <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="off" required /></label>
      <label>Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="off" required /></label>
      <label>Mobile (optional)<input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="off" /></label>
      <label>Role
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value === "admin" ? "admin" : "agent" })}>
          <option value="agent">Agent</option>
          <option value="admin">Admin (team lead only)</option>
        </select>
      </label>
      <label className="dc-switch">
        <input type="checkbox" checked={f.rotation} onChange={(e) => setF({ ...f, rotation: e.target.checked })} />
        Give them team leads now
      </label>
      <div className="decide-btns">
        <button type="submit" className="chip-btn primary" disabled={busy}>{busy ? "Adding…" : "Add"}</button>
        <button type="button" className="chip-btn" onClick={() => setOpen(false)} disabled={busy}>Close</button>
      </div>
      {note && <p className={`pf-note${note.ok ? "" : " bad"}`} role="status">{note.text}</p>}
    </form>
  );
}
