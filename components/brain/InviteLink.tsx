"use client";

import { useEffect, useState } from "react";
import { INVITE_ABOUT, inviteUrl, readInvite, type InviteLink as Link } from "@/lib/teamInvite.ts";

// Team screen: the invite link (TEAM-ONBOARDING §2.1), beside Add a member, for the team's owner and admins only (the
// route answers 403 to anyone else, and then the card hides).
export default function InviteLink({ live }: { live: boolean }) {
  const [link, setLink] = useState<Link | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return setLink(null);
    fetch(inviteUrl, { credentials: "include", cache: "no-store" })
      .then(async (r) => setLink(readInvite(r.ok, await r.json().catch(() => null))))
      .catch(() => setLink(undefined));
  }, [live]);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNote("Copied. Paste it into a text or email to the people joining.");
    } catch {
      setNote("Select the link and copy it.");
    }
  };

  const call = async (method: "POST" | "DELETE", thenCopy = false) => {
    if (!live) return setNote("Example team: the link works on your own team.");
    setBusy(true);
    setNote(null);
    const r = await fetch(inviteUrl, { method, credentials: "include" }).catch(() => null);
    const next = r ? readInvite(r.ok, await r.json().catch(() => null)) : undefined;
    if (next === undefined) setNote("That didn't go through. Nothing was changed.");
    else {
      setLink(next);
      if (method === "DELETE") setNote("The link is ended. Nobody else can join with it.");
      else if (thenCopy && next) await copy(next.url);
      else setNote("New link made. The old one no longer works.");
    }
    setBusy(false);
  };

  if (link === undefined) return null;
  return (
    <section className="tm-add" aria-label="Invite link">
      <h3>Invite link</h3>
      <small className="pf-sub">{INVITE_ABOUT}</small>
      {link ? (
        <>
          <div className="cn-copy">
            <input readOnly value={link.url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="chip-btn" onClick={() => void copy(link.url)}>Copy</button>
          </div>
          {link.line ? <small className="pf-sub">{link.line}</small> : null}
          <div className="decide-btns">
            <button type="button" className="chip-btn" disabled={busy} onClick={() => void call("POST")}>New link</button>
            <button type="button" className="chip-btn" disabled={busy} onClick={() => void call("DELETE")}>End link</button>
          </div>
        </>
      ) : (
        <div className="decide-btns">
          <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void call("POST", true)}>{busy ? "Making…" : "Copy invite link"}</button>
        </div>
      )}
      {note ? <p className="pf-note" role="status">{note}</p> : null}
    </section>
  );
}
