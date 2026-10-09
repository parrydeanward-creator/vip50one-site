"use client";

import { useState } from "react";
import { callPrep } from "@/lib/callPrep.ts";
import { personUrl, readPerson, readTimeline, timelineUrl } from "@/lib/people.ts";
import { DRAFT_KINDS, DRAFT_LABEL, factsFrom, mailHref, smsHref, type Draft, type DraftFacts, type DraftKind } from "@/lib/drafts.ts";

// Pulse Drafts on the contact card (PULSE-ROADMAP #2): pick what to write, Pulse drafts it from what ONE MOVE knows
// about this person, the agent edits it, then sends it from their own phone or mail. Pulse never sends anything.

const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|Macintosh/.test(navigator.userAgent);

export default function DraftsSection({ contactId, phone, email, onSent }: { contactId: string; phone: string | null; email: string | null; onSent: (kind: "text" | "email") => void }) {
  const [facts, setFacts] = useState<DraftFacts | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<DraftKind | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadFacts = async (): Promise<DraftFacts | null> => {
    if (facts) return facts;
    const [pr, tr] = await Promise.all([
      fetch(personUrl(contactId), { credentials: "include", cache: "no-store" }).catch(() => null),
      fetch(timelineUrl(contactId), { credentials: "include", cache: "no-store" }).catch(() => null),
    ]);
    const person = pr && pr.ok ? readPerson(await pr.json().catch(() => null)) : null;
    if (!person) return null;
    const timeline = tr && tr.ok ? readTimeline(await tr.json().catch(() => null)) : null;
    const f = factsFrom(callPrep(person, timeline, new Date()));
    setFacts(f);
    return f;
  };

  const write = async (kind: DraftKind) => {
    setBusy(kind);
    setErr(null);
    setCopied(false);
    const f = await loadFacts();
    if (!f) {
      setBusy(null);
      return setErr("ONE couldn't load this person just now.");
    }
    const r = await fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, facts: f }) }).catch(() => null);
    const d = r && r.ok ? ((await r.json().catch(() => null)) as Draft | null) : null;
    setBusy(null);
    if (!d || typeof d.body !== "string") return setErr(r && r.status === 429 ? "That's a lot of drafts this hour. Try again in a little while." : "Pulse couldn't draft that just now.");
    setDraft(d);
    setSubject(d.subject ?? "");
    setBody(d.body);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft?.kind === "email" && subject ? `${subject}\n\n${body}` : body);
      setCopied(true);
    } catch {
      setErr("Copy didn't work here; select the words and copy them.");
    }
  };

  return (
    <div className="cc-tasks cc-drafts">
      <h2>Pulse drafts</h2>
      <div className="cc-draft-kinds" role="group" aria-label="What should Pulse draft?">
        {DRAFT_KINDS.map((k) => (
          <button key={k} type="button" className={`chip-btn${draft?.kind === k ? " primary" : ""}`} disabled={!!busy} onClick={() => void write(k)}>
            {busy === k ? "Writing…" : DRAFT_LABEL[k]}
          </button>
        ))}
      </div>
      {draft ? (
        <div className="cc-draft">
          {draft.kind === "email" ? <input aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} /> : null}
          <textarea aria-label={`${DRAFT_LABEL[draft.kind]} draft`} value={body} rows={draft.kind === "text" ? 3 : 6} onChange={(e) => setBody(e.target.value)} />
          {draft.flags.length ? <p className="cc-err">Check before sending: {draft.flags.join("; ")}. Describe the home, never who it suits.</p> : null}
          <div className="cc-draft-acts">
            {draft.kind === "text" && phone ? (
              <a className="cc-btn" href={smsHref(phone, body, isIOS())} onClick={() => onSent("text")}>Open in Messages</a>
            ) : null}
            {draft.kind === "email" && email ? (
              <a className="cc-btn" href={mailHref(email, subject || null, body)} onClick={() => onSent("email")}>Open in Mail</a>
            ) : null}
            <button type="button" className="cc-btn" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <p className="cc-source">{draft.source === "pulse" ? "Pulse's draft, from what you know about them. Change anything; you send it." : "A starting point from what you know about them. Change anything; you send it."}</p>
        </div>
      ) : null}
      {err ? <p className="cc-err">{err}</p> : null}
    </div>
  );
}
