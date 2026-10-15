"use client";

import { useCallback, useEffect, useState } from "react";
import { canRemove, membersUrl, readMembers, removeConfirm, removedLine, type Member, type Members } from "@/lib/teamMembers.ts";

// Team screen: the members, with Remove and Put back for the team lead and admins (TEAM-ONBOARDING §5). Nothing here
// touches a member's own contacts or plan.
export default function TeamMembers({ live }: { live: boolean }) {
  const [m, setM] = useState<Members | null>(null);
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!live) return;
    const j = await fetch(membersUrl, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setM(readMembers(j));
  }, [live]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!m) return null;

  const put = async (x: Member, active: boolean) => {
    setBusy(true);
    setNote(null);
    const r = await fetch(membersUrl, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: x.id, active }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setNote(r?.ok ? (active ? `${x.name} is back on the team.` : `${x.name} is off the team.`) : (j?.error as string) ?? "That didn't go through. Nothing was changed.");
    setAsk(null);
    await load();
    setBusy(false);
  };

  const active = m.members.filter((x) => x.active).length;
  if (!open)
    return (
      <div className="decide-btns">
        <button type="button" className="chip-btn" onClick={() => setOpen(true)}>Members ({active})</button>
      </div>
    );
  return (
    <section className="tm-add" aria-label="Members">
      <h3>Members · {active}</h3>
      <ul className="tm-members">
        {m.members.map((x) => (
          <li key={x.id} className={x.active ? undefined : "left"}>
            <span>
              <b>{x.name}</b>
              <small>{x.active ? (x.role === "owner" ? "Team lead" : x.role === "admin" ? "Admin" : "Agent") : removedLine(x.leftAt)}</small>
            </span>
            {canRemove(m.myRole, x) ? (
              x.active ? (
                <button type="button" className="chip-btn" disabled={busy} onClick={() => setAsk(x)}>Remove</button>
              ) : (
                <button type="button" className="chip-btn" disabled={busy} onClick={() => void put(x, true)}>Put back</button>
              )
            ) : null}
          </li>
        ))}
      </ul>
      {ask ? (
        <div className="tm-confirm" role="alertdialog" aria-label={`Remove ${ask.name}`}>
          <p>{removeConfirm(ask.name)}</p>
          <div className="decide-btns">
            <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void put(ask, false)}>{busy ? "Removing…" : `Remove ${ask.name}`}</button>
            <button type="button" className="chip-btn" disabled={busy} onClick={() => setAsk(null)}>Keep them</button>
          </div>
        </div>
      ) : null}
      {note ? <p className="pf-note" role="status">{note}</p> : null}
      <div className="decide-btns">
        <button type="button" className="chip-btn" onClick={() => setOpen(false)}>Close</button>
      </div>
    </section>
  );
}
