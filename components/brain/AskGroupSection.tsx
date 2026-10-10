"use client";

import { useState } from "react";
import { smsHref } from "@/lib/drafts.ts";
import { askLogUrl, askUrl, logBody, readGroups, readPeople, type AskGroup, type AskPerson } from "@/lib/permissionAsk.ts";

// Ask a group for permission (LEADS §2.3a). The agent texts each person their own yes/no link from their own phone or
// Mac; ONE sends nothing. Each tap of Text is logged on that contact's timeline (not a VIP touch).

const isApple = () => typeof navigator !== "undefined" && /iPhone|iPad|Macintosh/.test(navigator.userAgent);

export default function AskGroupSection() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<AskGroup[] | null>(null);
  const [group, setGroup] = useState<AskGroup | null>(null);
  const [people, setPeople] = useState<AskPerson[] | null>(null);
  const [texted, setTexted] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = async (url: string) => {
    const r = await fetch(url, { credentials: "include", cache: "no-store" }).catch(() => null);
    if (!r || !r.ok) {
      setNote(r && (r.status === 404 || r.status === 405) ? "This arrives with ONE MOVE's next update." : "ONE couldn't load that just now.");
      return null;
    }
    return r.json().catch(() => null);
  };
  const start = async () => {
    setOpen(true);
    setNote(null);
    const j = await load(askUrl());
    setGroups(readGroups(j));
  };
  const pick = async (g: AskGroup) => {
    setGroup(g);
    setPeople(null);
    setNote(null);
    const j = await load(askUrl(g.key));
    setPeople(readPeople(j) ?? []);
  };
  const sent = (p: AskPerson) => {
    setTexted((t) => [...t, p.id]);
    fetch(askLogUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(logBody([p.id])) }).catch(() => {});
  };

  if (!open) {
    return (
      <div className="ta-log">
        <button className="chip-btn" onClick={() => void start()}>Ask a group for permission</button>
      </div>
    );
  }
  return (
    <section className="ag" aria-label="Ask a group for permission">
      <h2>Ask for permission</h2>
      <p className="d-sum">Text each person their own yes-or-no link from your phone or Mac. ONE sends nothing; their answer saves itself. Asking is not a VIP touch.</p>
      {note ? <p className="d-sum">{note}</p> : null}
      {!group && groups ? (
        <div className="ag-groups">
          {groups.map((g) => (
            <button key={g.key} className="chip-btn" disabled={!g.count} onClick={() => void pick(g)}>
              {g.label} · {g.count}
            </button>
          ))}
        </div>
      ) : null}
      {group ? (
        <>
          <p className="d-sub">
            {group.label}: {people ? `${people.length - texted.filter((id) => people.some((p) => p.id === id)).length} left to text` : "Loading…"}
          </p>
          {people && people.length ? (
            <ul className="ta-list ag-list">
              {people.map((p) => (
                <li key={p.id} className={texted.includes(p.id) ? "done" : ""}>
                  <span className="pm-body">
                    <b>{p.name}</b>
                    <small>{p.text}</small>
                  </span>
                  <a className="chip-btn primary" href={smsHref(p.phone, p.text, isApple())} onClick={() => sent(p)}>
                    {texted.includes(p.id) ? "Texted" : "Text"}
                  </a>
                </li>
              ))}
            </ul>
          ) : people ? (
            <p className="d-sum">Everyone in this group has been asked or has answered.</p>
          ) : null}
          <button className="vr-classic" onClick={() => setGroup(null)}>Other groups</button>
        </>
      ) : null}
      <button className="vr-classic" onClick={() => setOpen(false)}>Close</button>
    </section>
  );
}
