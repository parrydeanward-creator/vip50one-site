"use client";

import { useCallback, useEffect, useState } from "react";
import CmaWorkspace from "./CmaWorkspace.tsx";
import {
  CARD_TITLE,
  DEMO_ROW,
  EMPTY_LINE,
  cmaListUrl,
  cmaStartUrl,
  demoLoaded,
  readCmaList,
  rowFrom,
  rowLine,
  type CmaLoaded,
  type CmaRow,
} from "@/lib/cma.ts";

// The CMA card on a person (LEADS §1.7c; the Brain half of vip50-web-crm#310). This contact's CMAs from ONE MOVE, each
// opening the workspace; "Build a CMA" asks ONE Property for a draft with Suggested comparables near their home. Same
// routes as Classic's card. In the demo it shows one labelled example and nothing is called.

export default function CmaSection({ contactId, first, demo = false }: { contactId: string; first: string; demo?: boolean }) {
  const [rows, setRows] = useState<CmaRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState<CmaRow | null>(null);
  // The example's CMAs, kept here so the workspace's changes stay while the card is open.
  const [demoData, setDemoData] = useState<Record<string, CmaLoaded>>({});
  const name = first.trim() || "them";

  const load = useCallback(async () => {
    if (demo) {
      setRows([DEMO_ROW]);
      setDemoData({ [DEMO_ROW.cmaId]: demoLoaded(contactId) });
      return;
    }
    const j = await fetch(cmaListUrl(contactId), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    setRows(readCmaList(j) ?? []);
  }, [contactId, demo]);
  useEffect(() => {
    setRows(null);
    setErr(null);
    setOpen(null);
    void load();
  }, [load]);

  const start = async () => {
    setBusy(true);
    setErr(null);
    if (demo) {
      const id = `demo-cma-${Date.now()}`;
      const row: CmaRow = { ...DEMO_ROW, cmaId: id, createdAt: new Date().toISOString() };
      setDemoData((d) => ({ ...d, [id]: demoLoaded(contactId) }));
      setRows((r) => [row, ...(r ?? [])]);
      setBusy(false);
      setOpen(row);
      return;
    }
    const r = await fetch(cmaStartUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: contactId }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!r || !r.ok || typeof j?.cma_id !== "string") {
      setErr((j && typeof j.error === "string" && j.error) || "Could not start a CMA just now. Nothing was changed.");
      return;
    }
    const row: CmaRow = { cmaId: j.cma_id, address: null, status: "draft", link: null, linkEnds: null, sentAt: null, createdAt: new Date().toISOString() };
    setRows((x) => [row, ...(x ?? [])]);
    setOpen(row);
    void load();
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(link);
    } catch {
      setErr("Could not copy. Select the link and copy it yourself.");
    }
  };

  const changed = (d: CmaLoaded) => {
    if (!open) return;
    if (demo) setDemoData((x) => ({ ...x, [open.cmaId]: d }));
    setRows((rs) => (rs ?? []).map((r) => (r.cmaId === open.cmaId ? rowFrom(r, d) : r)));
  };

  if (!rows) return null;
  return (
    <div className="cc-tasks hr-card cma-card" aria-label={`${CARD_TITLE} for ${name}`}>
      <div className="hr-head">
        <h2>{CARD_TITLE}</h2>
        <button type="button" className="chip-btn primary cma-build" disabled={busy} onClick={() => void start()}>{busy ? "Building…" : "Build a CMA"}</button>
      </div>
      {rows.length ? (
        <ul className="cma-list">
          {rows.map((r) => (
            <li key={r.cmaId}>
              <button type="button" className="cma-row" onClick={() => setOpen(r)} aria-label={`Open the CMA for ${r.address ?? "their home"}`}>
                <span className="hr-line">{r.address ?? "Their home"}</span>
                <small className="hr-sub">{rowLine(r)}</small>
              </button>
              {r.status === "sent" && r.link ? (
                <button type="button" className="chip-btn cma-copy" onClick={() => void copy(r.link!)}>{copied === r.link ? "Copied" : "Copy link"}</button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hr-sub">No CMA for {name} yet. {EMPTY_LINE}</p>
      )}
      {err ? <p className="cc-err" role="status">{err}</p> : null}
      {demo ? <p className="cc-source">Example agent. Nothing is sent.</p> : null}
      {open ? (
        <CmaWorkspace
          key={open.cmaId}
          cmaId={open.cmaId}
          address={open.address}
          first={name}
          demo={demo}
          demoData={demo ? demoData[open.cmaId] : undefined}
          onChanged={changed}
          onClose={() => {
            setOpen(null);
            if (!demo) void load();
          }}
        />
      ) : null}
    </div>
  );
}
