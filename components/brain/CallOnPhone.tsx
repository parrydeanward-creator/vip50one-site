"use client";

import { useEffect, useRef, useState } from "react";
import { DIAL_LINE, POLL_MS, POLL_TRIES, dialBody, dialStatusUrl, dialUrl, readDial, readDialStatus } from "@/lib/dial.ts";

// "Call on my phone" (VIP-SUMMARY §3ad): one push to the agent's own ONE GO; the phone dials only on their tap there.
// Shows sent, then opened or expired, or ONE MOVE's refusal line. Nothing reaches the client.
export default function CallOnPhone({ contactId, dialRef, demo, className = "pi-btn" }: { contactId: string; dialRef?: string | null; demo?: boolean; className?: string }) {
  const [line, setLine] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);
  useEffect(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setLine(null);
  }, [contactId]);

  const send = async () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    if (demo) return setLine(`Example agent: ${DIAL_LINE.sent}`);
    setSending(true);
    setLine(null);
    const r = await fetch(dialUrl, { method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dialBody(contactId, dialRef)) }).catch(() => null);
    const sent = readDial(r ? await r.json().catch(() => null) : null);
    setSending(false);
    if (!sent.ok) return setLine(sent.line);
    setLine(DIAL_LINE.sent);
    let tries = 0;
    const poll = async () => {
      tries += 1;
      const s = await fetch(dialStatusUrl(sent.id), { credentials: "include", cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      const state = readDialStatus(s);
      if (state && state !== "sent") return setLine(DIAL_LINE[state]);
      if (tries < POLL_TRIES) pollRef.current = setTimeout(poll, POLL_MS);
    };
    pollRef.current = setTimeout(poll, POLL_MS);
  };

  return (
    <>
      <button type="button" className={className} disabled={sending} onClick={() => void send()}>Call on my phone</button>
      {line && <span className="cop-line" role="status">{line}</span>}
    </>
  );
}
