"use client";

import { useEffect, useRef, useState } from "react";
import { applyBody, readProposal, savedLine, talkApplyUrl, talkUrl, whenWords, type Proposal } from "@/lib/talk.ts";

// Talk, don't type, on the person card: say or type what happened, Pulse proposes, the agent keeps what is right.
// Uses the browser's own speech recognition where it exists (Chrome, Edge, Safari); otherwise the agent types.
// Nothing is saved until "Save what's ticked", and nothing is ever sent to anyone.

type Rec = { start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; interimResults: boolean; continuous: boolean; lang: string };

export default function TalkSection({ contactId, first, onSaved }: { contactId: string; first: string; onSaved?: () => void }) {
  const [words, setWords] = useState("");
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [p, setP] = useState<Proposal | null>(null);
  const [keepNote, setKeepNote] = useState(true);
  const [keepFields, setKeepFields] = useState<Set<string>>(new Set());
  const [keepFollow, setKeepFollow] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);

  useEffect(() => {
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    setCanListen(!!(W.SpeechRecognition ?? W.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);
  useEffect(() => {
    setWords("");
    setP(null);
    setMsg(null);
  }, [contactId]);

  const listen = () => {
    if (listening) return rec.current?.stop();
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = true;
    const before = words ? `${words} ` : "";
    r.onresult = (e) => setWords(before + Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  const ask = async () => {
    rec.current?.stop();
    setBusy(true);
    setMsg(null);
    const r = await fetch(talkUrl, { method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: contactId, text: words.trim() }) }).catch(() => null);
    const j = r && r.ok ? await r.json().catch(() => null) : null;
    const next = readProposal(j, words);
    setBusy(false);
    setP(next);
    setKeepNote(!!next.note);
    setKeepFields(new Set(next.fields.map((f) => f.key)));
    setKeepFollow(!!next.followUp);
    if (!j) setMsg("Pulse couldn't read that just now. Your own words are kept as the note.");
  };

  const save = async () => {
    if (!p) return;
    setBusy(true);
    const r = await fetch(talkApplyUrl, { method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(applyBody(contactId, p, { note: keepNote, fields: keepFields, followUp: keepFollow })) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    const line = savedLine(j);
    if (!line) return setMsg((j && typeof j.error === "string" && j.error) || "That did not save. Nothing was changed.");
    setMsg(line);
    setP(null);
    setWords("");
    onSaved?.();
  };

  const toggle = (k: string) => setKeepFields((s) => {
    const n = new Set(s);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  });

  return (
    <div className="cc-tasks tk" aria-label="Talk to Pulse">
      <h2>Talk to Pulse</h2>
      {!p ? (
        <>
          <textarea className="tk-words" rows={3} value={words} onChange={(e) => setWords(e.target.value)} placeholder={`How did it go with ${first}? Say it or type it.`} />
          <div className="decide-btns">
            {canListen && <button type="button" className="chip-btn" aria-pressed={listening} onClick={listen}>{listening ? "Stop" : "🎙 Talk"}</button>}
            <button type="button" className="chip-btn primary" disabled={busy || !words.trim()} onClick={() => void ask()}>{busy ? "Pulse is reading…" : "Pulse, file this"}</button>
          </div>
        </>
      ) : (
        <>
          <p className="d-sum">Untick anything wrong, then save. Nothing is sent to anyone.</p>
          <ul className="tk-list">
            {p.note && (
              <li><label><input type="checkbox" checked={keepNote} onChange={(e) => setKeepNote(e.target.checked)} /> Note: {p.note}</label></li>
            )}
            {p.fields.map((f) => (
              <li key={f.key}><label><input type="checkbox" checked={keepFields.has(f.key)} onChange={() => toggle(f.key)} /> {f.label}: {f.value}{f.was ? <small> (was {f.was})</small> : null}</label></li>
            ))}
            {p.followUp && (
              <li><label><input type="checkbox" checked={keepFollow} onChange={(e) => setKeepFollow(e.target.checked)} /> Follow-up {whenWords(p.followUp.inDays)}: {p.followUp.title}</label></li>
            )}
          </ul>
          <div className="decide-btns">
            <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void save()}>Save what&apos;s ticked</button>
            <button type="button" className="chip-btn" onClick={() => setP(null)}>Back</button>
          </div>
        </>
      )}
      {msg && <p className="pm-empty" role="status">{msg}</p>}
    </div>
  );
}
