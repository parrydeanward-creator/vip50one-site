"use client";

import { namesPerson } from "@/lib/personTask.ts";
import { useEffect, useState } from "react";
import ContactPanel, { type LeadProps } from "./ContactPanel.tsx";
import { readSignals, signalKind, signalsUrl } from "@/lib/webSignals.ts";
import { contactsSearchUrl, nameFromTitle, taskDoneUrl, taskLinkUrl, TIER_LABEL, type ContactHit } from "@/lib/contact.ts";

// A ONE MOVE item about a person. With a contact: the card, Call / Text /
// Email (ContactPanel). A follow-up with no contact yet (VIP-SUMMARY §3c.6):
// "Who is this?" search, link it, then the card; or Mark done.
export default function PersonPanel({
  contactId,
  taskId,
  title,
  onChanged,
  openContacts,
  onOpenPage,
  lead,
  agentFirst,
  onLeadOutcome,
}: LeadProps & {
  contactId?: string;
  taskId?: string;
  title: string;
  onChanged: () => void;
  openContacts: () => void;
  /** Open a ONE MOVE page inside the Brain, filled in for this contact (`?contact=<id>`). */
  onOpenPage?: (path: string, query: string) => void;
}) {
  const [linked, setLinked] = useState<string | undefined>(contactId);
  const [q, setQ] = useState(() => nameFromTitle(title));
  const [hits, setHits] = useState<ContactHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => setLinked(contactId), [contactId]);

  // Search as the agent types (after a short pause).
  useEffect(() => {
    if (linked || !taskId) return;
    const term = q.trim();
    if (term.length < 2) return setHits([]);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(contactsSearchUrl(term), { credentials: "include", cache: "no-store" });
        const j = r.ok ? await r.json() : { contacts: [] };
        setHits(Array.isArray(j.contacts) ? j.contacts : []);
      } catch {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, linked, taskId]);

  const post = async (url: string, body: object) => {
    const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error ?? "ONE MOVE didn't take that. Try again.");
  };

  const link = async (c: ContactHit) => {
    if (!taskId) return;
    setBusy(true);
    setMsg(null);
    try {
      await post(taskLinkUrl, { task_id: taskId, contact_id: c.id });
      setLinked(c.id);
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ONE MOVE didn't take that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const markDone = async () => {
    if (!taskId) return;
    setBusy(true);
    setMsg(null);
    try {
      await post(taskDoneUrl, { task_id: taskId });
      setMsg("Done. It's off your list.");
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ONE MOVE didn't take that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (linked)
    return (
      <>
        <ContactPanel key={linked} contactId={linked} taskId={taskId} onLogged={onChanged} lead={lead} agentFirst={agentFirst} onLeadOutcome={onLeadOutcome} />
        <WebHotLine contactId={linked} />
        {onOpenPage ? (
          <div className="decide-btns pp-more">
            {/* VIP-SUMMARY §3af: opens filled in for this person (vip50-web-crm#224); Buyer Needs retired 23 Oct */}
            <button type="button" className="chip-btn" onClick={() => onOpenPage("/referral-network", `contact=${encodeURIComponent(linked)}`)}>
              Refer to a ONE agent
            </button>
          </div>
        ) : null}
      </>
    );
  if (!taskId || !namesPerson(title)) return null; // Agent Attraction and other non-person tasks: no "Who is this?"

  return (
    <div className="pp">
      <h2>Who is this?</h2>
      <p className="pp-note">This follow-up isn't linked to a contact yet. Pick the right person and ONE shows their card, with Call, Text and Email.</p>
      <input className="pp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your contacts" aria-label="Search your contacts" />
      {hits && hits.length > 0 && (
        <ul className="pp-hits">
          {hits.map((c) => (
            <li key={c.id}>
              <button disabled={busy} onClick={() => link(c)}>
                <b>{c.name}</b>
                <small>
                  {c.tier && TIER_LABEL[c.tier] ? `${TIER_LABEL[c.tier]} · ` : ""}
                  {c.phone_last4 ? `phone ending ${c.phone_last4}` : "no phone"}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hits && hits.length === 0 && q.trim().length >= 2 && (
        <p className="pp-note">
          Not in your contacts.{" "}
          <button className="link" onClick={openContacts}>
            Add them in Contacts →
          </button>
        </p>
      )}
      <div className="pp-done">
        <button className="btn ghost-btn" disabled={busy} onClick={markDone}>
          Mark done
        </button>
      </div>
      {msg && <p className="cc-done" role="status">{msg}</p>}
    </div>
  );
}

/** "Hot on your website" for this one person (LOFTY-PARITY P3): ONE MOVE's words, or nothing. Read only. */
function WebHotLine({ contactId }: { contactId: string }) {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    fetch(`${signalsUrl}?contact_id=${encodeURIComponent(contactId)}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const s = readSignals(j)?.find((x) => x.contactId === contactId);
        if (on) setLine(s ? `${signalKind(s)}: ${s.words}` : null);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [contactId]);
  return line ? <p className="pc-pulse-line"><b>WEBSITE</b>{line}</p> : null;
}
