"use client";

import { useEffect, useState } from "react";
import { listUrl, readPage, type PersonItem } from "@/lib/people.ts";
import { referralsUrl } from "@/lib/referrals.ts";

// Log a referral from the Brain (Parry, 21 Oct, on the Referrals goal: "this does nothing with no way to change
// anything"): who sent it (one of the agent's contacts, searched) and who they sent (a name, added as a new lead).
// ONE MOVE's POST /api/brain/referrals does the rest, as Classic's "Log referral": the referral counts toward the goal,
// the new lead gets its plans, and a thank-you task lands on today. Nothing is sent to anyone.

export default function LogReferral({ demo, onLogged }: { demo: boolean; onLogged: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PersonItem[]>([]);
  const [from, setFrom] = useState<PersonItem | null>(null);
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open || from || demo || q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => {
      fetch(listUrl({ q, sort: "name", limit: 6 }), { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setHits(readPage(j)?.items ?? []))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, from, demo]);

  const save = async () => {
    if (!from || !sent.trim() || busy) return;
    if (demo) return setNote({ ok: false, text: "Example agent: referrals are not saved." });
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch(referralsUrl(), {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrer_contact_id: from.id, referred_name: sent.trim() }),
      });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!r.ok || !j?.ok) return setNote({ ok: false, text: j?.error || "That referral didn't save. Nothing was changed." });
      setNote({ ok: true, text: `Logged: ${from.firstName ?? from.name} sent you ${sent.trim()}. A thank-you task is on today, and ${sent.trim()} is a new lead.` });
      setFrom(null); setQ(""); setSent(""); setOpen(false);
      onLogged();
    } catch {
      setNote({ ok: false, text: "That referral didn't save. Nothing was changed." });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="lr">
        <button type="button" className="chip-btn primary" onClick={() => { setOpen(true); setNote(null); }}>Log a referral</button>
        {note ? <p className={`pf-note${note.ok ? "" : " bad"}`} role="status">{note.text}</p> : null}
      </div>
    );
  }
  return (
    <form className="lr lr-open" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <label>
        <span>Who sent it?</span>
        {from ? (
          <span className="lr-picked">
            <b>{from.name}</b>
            <button type="button" className="link" onClick={() => { setFrom(null); setQ(""); }}>Change</button>
          </span>
        ) : (
          <input autoFocus value={q} placeholder="Search your contacts" aria-label="Who sent the referral" onChange={(e) => setQ(e.target.value)} />
        )}
      </label>
      {!from && hits.length ? (
        <ul className="lr-hits" role="listbox" aria-label="Contacts">
          {hits.map((p) => (
            <li key={p.id}><button type="button" onClick={() => { setFrom(p); setHits([]); }}>{p.name}</button></li>
          ))}
        </ul>
      ) : null}
      <label>
        <span>Who did they send you?</span>
        <input value={sent} maxLength={120} placeholder="Their name" aria-label="Who they sent you" onChange={(e) => setSent(e.target.value)} />
      </label>
      <span className="gl-acts">
        <button type="submit" className="vr-btn" disabled={busy || !from || !sent.trim()}>{busy ? "Saving" : "Log it"}</button>
        <button type="button" className="vr-btn" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
      </span>
      {note ? <p className={`pf-note${note.ok ? "" : " bad"}`} role="status">{note.text}</p> : null}
    </form>
  );
}
