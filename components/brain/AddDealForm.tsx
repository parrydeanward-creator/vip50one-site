"use client";

import { useEffect, useRef, useState } from "react";
import { contactsSearchUrl, type ContactHit } from "@/lib/contact.ts";
import {
  DATE_LABEL,
  FORM_KEYS,
  dealBody,
  dealsUrl,
  demoRepcAnswer,
  demoSaved,
  emptyForm,
  formFromRead,
  readDeals,
  readRepcAnswer,
  repcUploadUrl,
  uploadProblem,
  type Deal,
  type DealForm,
} from "@/lib/deals.ts";

// "Add a deal" on the Deals panel (walker note, Parry: "yes"; vip50-web-crm#295). Pick the client from ONE MOVE's
// contacts, the address and side; type the REPC dates or upload the signed REPC and Pulse fills them. Every date Pulse
// read is marked for the agent to check; any it could not read is flagged. Nothing is saved until the agent presses Save.

const DEMO_PEOPLE: ContactHit[] = [
  { id: "r7", name: "Chris Allen", tier: "vip50", phone_last4: "4410" },
  { id: "r8", name: "Dana Whitaker", tier: "vip100", phone_last4: "0932" },
  { id: "r9", name: "Sam Ortiz", tier: null, phone_last4: null },
];

export default function AddDealForm({ today, live, onSaved, onCancel }: { today: string; live: boolean; onSaved: (d: Deal | null) => void; onCancel: () => void }) {
  const [f, setF] = useState<DealForm>(() => emptyForm(today));
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ContactHit[] | null>(null);
  const [busy, setBusy] = useState<"upload" | "save" | null>(null);
  const [msg, setMsg] = useState<{ text: string; field?: string } | null>(null);
  const [readNote, setReadNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<DealForm>) => setF((x) => ({ ...x, ...patch }));
  const setDate = (k: string, v: string) => setF((x) => ({ ...x, dates: { ...x.dates, [k]: v }, unread: x.unread.filter((u) => u !== k) }));

  // Search the agent's ONE MOVE contacts as they type (the same search "Who is this?" uses).
  useEffect(() => {
    if (f.contact) return;
    const term = q.trim();
    if (term.length < 2) return setHits([]);
    if (!live) return setHits(DEMO_PEOPLE.filter((p) => p.name.toLowerCase().includes(term.toLowerCase())));
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
  }, [q, f.contact, live]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const bad = uploadProblem(file);
    if (bad) return setMsg({ text: bad, field: "file" });
    setMsg(null);
    setReadNote(null);
    setBusy("upload");
    let a;
    if (!live) a = demoRepcAnswer(today);
    else {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(repcUploadUrl, { method: "POST", credentials: "include", body: fd }).catch(() => null);
      a = readRepcAnswer(r ? await r.json().catch(() => null) : null, !!r?.ok);
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    if (!a.ok) return setMsg({ text: a.error, field: "file" });
    setF((x) => formFromRead(x, a));
    if (!a.read) setReadNote(a.note ?? "Pulse could not read it; type the dates in.");
  };

  const save = async () => {
    const b = dealBody(f);
    if (!b.ok) return setMsg({ text: b.error, field: b.field });
    setMsg(null);
    setBusy("save");
    if (!live) {
      setBusy(null);
      return onSaved(demoSaved(f, today));
    }
    const r = await fetch(dealsUrl(), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b.body) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(null);
    // 409: a deal at this address on this side already; 400 names the field. ONE MOVE's own words either way.
    if (!r || !r.ok || !j?.ok) return setMsg({ text: (j && typeof j.error === "string" && j.error) || "That didn't save just now. Nothing was changed.", field: j?.field });
    const d = j.deal ? readDeals({ deals: [j.deal] })?.[0] ?? null : null;
    onSaved(d ? { ...d, repcPath: d.repcPath ?? f.filePath } : null);
  };

  const keys = f.form ? FORM_KEYS[f.form] : [];
  const flagged = (k: string) => f.unread.includes(k);
  const err = (k: string) => (msg?.field === k ? <small className="dl-warn" role="alert">{msg.text}</small> : null);
  const cant = (k: string) => (flagged(k) ? <small className="dl-warn" id={`dl-u-${k}`}>Pulse could not read this</small> : null);
  const readCls = (k: string) => (f.pulseRead ? (flagged(k) ? " dl-unread" : " dl-read") : "");

  return (
    <section className="dl-add cm-form" aria-label="Add a deal">
      <h2 className="pm-h">Add a deal</h2>

      <div className="cm-row">
        <b>Client</b>
        {f.contact ? (
          <div className="dl-picked">
            <span>{f.contact.name}</span>
            <button type="button" className="chip-btn" onClick={() => set({ contact: null })} aria-label="Change the client">Change</button>
          </div>
        ) : (
          <>
            <input className="pp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your contacts" aria-label="Search your contacts for the client" />
            {hits && hits.length > 0 ? (
              <ul className="pp-hits">
                {hits.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => set({ contact: { id: c.id, name: c.name } })}>
                      <b>{c.name}</b>
                      <small>{c.phone_last4 ? `phone ending ${c.phone_last4}` : "no phone"}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : q.trim().length >= 2 && hits ? (
              <small className="pm-empty">No one by that name in ONE MOVE yet. Add them there first.</small>
            ) : null}
          </>
        )}
        {err("contact_id")}
      </div>

      <div className="dl-upload">
        <label className={`chip-btn${busy === "upload" ? " dl-busy" : ""}`}>
          {busy === "upload" ? "Pulse is reading it..." : f.filePath ? "Upload a different REPC" : "Upload the signed REPC"}
          <input ref={fileRef} className="sr-only" type="file" accept="application/pdf,.pdf" aria-label="Upload the signed REPC" disabled={!!busy} onChange={(e) => void upload(e.target.files?.[0])} />
        </label>
        <small className="pm-empty">A PDF, 20 MB at most. Pulse fills the dates for you to check. Or type them below.</small>
        {f.filePath ? <small className="dl-ok">REPC attached. It is kept with the deal when you save.</small> : null}
        {readNote ? <small className="dl-warn" role="status">{readNote}</small> : null}
        {err("file")}
      </div>

      {f.pulseRead ? (
        <p className="dl-check" role="status">
          Pulse read this; check each date. {f.unread.length ? `${f.unread.length} could not be read and ${f.unread.length === 1 ? "is" : "are"} marked.` : ""}
        </p>
      ) : null}

      <label className={`cm-row${readCls("address")}`}>
        <b>Address</b>
        <input value={f.address} maxLength={200} placeholder="418 Maple Ridge Dr, Lehi" aria-label="Property address" onChange={(e) => set({ address: e.target.value, unread: f.unread.filter((u) => u !== "address") })} />
        {cant("address")}
        {err("address")}
      </label>

      <div className={`cm-row${readCls("side")}`} role="group" aria-label="Side">
        <b>Side</b>
        <div className="decide-btns">
          {(["buy", "sell", "both"] as const).map((s) => (
            <button key={s} type="button" className="chip-btn" aria-pressed={f.side === s} onClick={() => set({ side: s, unread: f.unread.filter((u) => u !== "side") })}>
              {s === "buy" ? "Buyer" : s === "sell" ? "Seller" : "Both sides"}
            </button>
          ))}
        </div>
        {cant("side")}
        {err("side")}
      </div>

      <div className={`cm-row${readCls("repc_form")}`} role="group" aria-label="REPC form">
        <b>REPC form</b>
        <div className="decide-btns">
          {(["2018", "2027"] as const).map((x) => (
            <button key={x} type="button" className="chip-btn" aria-pressed={f.form === x} onClick={() => set({ form: x, unread: f.unread.filter((u) => u !== "repc_form") })}>
              {x} form
            </button>
          ))}
        </div>
        {cant("repc_form")}
        {err("repc_form")}
      </div>

      <div className="dl-grid">
        <label className={`cm-row${readCls("accepted_on")}`}>
          <b>Accepted on</b>
          <input type="date" value={f.acceptedOn} aria-label="Accepted on" aria-describedby={flagged("accepted_on") ? "dl-u-accepted_on" : undefined} onChange={(e) => set({ acceptedOn: e.target.value, unread: f.unread.filter((u) => u !== "accepted_on") })} />
          {cant("accepted_on")}
          {err("accepted_on")}
        </label>
        {keys.map((k) => (
          <label key={k} className={`cm-row${readCls(k)}`}>
            <b>{DATE_LABEL[k]}</b>
            <input type="date" value={f.dates[k] ?? ""} aria-label={DATE_LABEL[k]} aria-describedby={flagged(k) ? `dl-u-${k}` : undefined} onChange={(e) => setDate(k, e.target.value)} />
            {cant(k)}
            {err(k)}
          </label>
        ))}
        <label className="cm-row">
          <b>Price</b>
          <input inputMode="decimal" value={f.price} placeholder="$" aria-label="Price" onChange={(e) => set({ price: e.target.value })} />
          {err("price")}
        </label>
        <label className="cm-row">
          <b>GCI, if you know it</b>
          <input inputMode="decimal" value={f.gci} placeholder="$" aria-label="GCI" onChange={(e) => set({ gci: e.target.value })} />
          {err("gci")}
        </label>
      </div>
      {!f.form ? <small className="pm-empty">Pick the REPC form to see its dates.</small> : null}
      {msg && !["contact_id", "file", "address", "side", "repc_form", "accepted_on", "price", "gci", ...keys].includes(msg.field ?? "") ? (
        <small className="dl-warn" role="alert">{msg.text}</small>
      ) : null}

      <div className="decide-btns">
        <button type="button" className="chip-btn primary" disabled={!!busy} onClick={() => void save()}>
          {busy === "save" ? "Saving..." : "Save"}
        </button>
        <button type="button" className="chip-btn" disabled={busy === "save"} onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="pm-empty">Nothing is saved until you press Save. ONE MOVE sets a reminder the day before each deadline. Only you see your deals.</p>
    </section>
  );
}
