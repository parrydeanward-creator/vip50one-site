"use client";

import { useEffect, useState } from "react";
import {
  DEMO_DRAFT,
  NET_FIELDS,
  PART_FAILED,
  PART_SAVED,
  PART_SAVING,
  PITCH_HEADLINE_MAX,
  PITCH_LINES_MAX,
  PREP_MAX,
  blankPrep,
  cmaDraftUrl,
  cmaSaveUrl,
  demandLine,
  demoPart,
  netBody,
  netDraftOf,
  netFigures,
  netLine,
  nextCountLine,
  nextDraftOf,
  nextHomeBody,
  parseRange,
  pitchBody,
  pitchDraftOf,
  prepBody,
  prepDraftsOf,
  readCma,
  readDraft,
  type CmaLoaded,
  type NetDraft,
  type NextDraft,
  type PartKey,
  type PitchDraft,
  type PrepDraft,
} from "@/lib/cma.ts";

// The four parts under the range (LEADS §1.7d; same words as Classic's CMA screen). Each part has its own Save and
// sends only that part to POST /api/brain/cma/save, so a part left out stays unchanged. "Draft with Pulse" only fills
// fields; nothing is saved until the agent presses Save. Pulse never proposes a value.

type Msg = { ok: boolean; text: string } | null;

export default function CmaParts({
  d,
  cmaId,
  demo,
  sent,
  low,
  high,
  onSaved,
}: {
  d: CmaLoaded;
  cmaId: string;
  demo: boolean;
  sent: boolean;
  low: string;
  high: string;
  /** The CMA after one part saved (only that part and the counts changed). */
  onSaved: (next: CmaLoaded) => void;
}) {
  const [net, setNet] = useState<NetDraft>(() => netDraftOf(d.cma.net));
  const [next, setNext] = useState<NextDraft>(() => nextDraftOf(d.cma.nextHome));
  const [prep, setPrep] = useState<PrepDraft[]>(() => prepDraftsOf(d.cma.prep));
  const [pitch, setPitch] = useState<PitchDraft>(() => pitchDraftOf(d.cma.pitch));
  const [busy, setBusy] = useState<PartKey | "draft" | null>(null);
  const [msgs, setMsgs] = useState<Partial<Record<PartKey, Msg>>>({});
  const say = (k: PartKey, m: Msg) => setMsgs((x) => ({ ...x, [k]: m }));

  // A new CMA opened in the same workspace starts from its own saved parts.
  useEffect(() => {
    setNet(netDraftOf(d.cma.net));
    setNext(nextDraftOf(d.cma.nextHome));
    setPrep(prepDraftsOf(d.cma.prep));
    setPitch(pitchDraftOf(d.cma.pitch));
    setMsgs({});
    // Only when the CMA itself changes; a part Save updates d but must keep what is typed in the other parts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmaId]);

  const saveOne = async (key: PartKey, body: Record<string, unknown> | { error: string }) => {
    if ("error" in body && typeof body.error === "string" && !("cma_id" in body)) return say(key, { ok: false, text: body.error });
    setBusy(key);
    say(key, { ok: true, text: PART_SAVING });
    if (demo) {
      onSaved(demoPart(d, body));
      setBusy(null);
      return say(key, { ok: true, text: PART_SAVED });
    }
    const r = await fetch(cmaSaveUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(null);
    if (!r || !r.ok || j?.ok === false) return say(key, { ok: false, text: (j && typeof j.error === "string" && j.error) || PART_FAILED });
    // Take back only this part (and the counts) from the answer, so what is typed in the other parts stays.
    const cma = readCma(j?.cma);
    if (cma) onSaved({ ...d, cma: { ...d.cma, [partField[key]]: cma[partField[key]], ...(key === "next_home" ? { buyerDemand: cma.buyerDemand } : {}) } });
    else onSaved(demoPart(d, body));
    say(key, { ok: true, text: PART_SAVED });
  };

  const draft = async () => {
    if (busy) return;
    say("prep", null);
    if (demo) {
      setPrep(DEMO_DRAFT.prep);
      setPitch(DEMO_DRAFT.pitch);
      return say("prep", { ok: true, text: "Pulse drafted these from the example seller's answers. Check them, then Save." });
    }
    setBusy("draft");
    say("prep", { ok: true, text: "Pulse is drafting…" });
    const r = await fetch(cmaDraftUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cma_id: cmaId }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(null);
    const out = r?.ok ? readDraft(j) : readDraft({ ok: false, words: j && typeof j.error === "string" ? j.error : null });
    if ("error" in out) return say("prep", { ok: false, text: out.error });
    if (out.prep.length) setPrep(out.prep);
    if (out.pitch) setPitch(out.pitch);
    say("prep", { ok: true, text: "Pulse drafted these from your seller's answers. Check them, then Save each part." });
  };

  const rg = parseRange(low, high);
  const range = "range" in rg ? rg.range : null;
  const figs = netFigures(range, net);
  const setNetF = (k: keyof NetDraft, v: string) => setNet({ ...net, [k]: v.replace(/[^0-9.$,%]/g, "") });
  const setPrepF = (i: number, patch: Partial<PrepDraft>) => setPrep(prep.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const countLine = nextCountLine(d.cma.nextHome);
  const demandL = demandLine(d.cma.buyerDemand);
  const lines = pitch.lines.split(/\r?\n/).filter((l) => l.trim()).length;

  const foot = (key: PartKey, label: string, body: () => Record<string, unknown> | { error: string }) => (
    <div className="cc-perm-acts cma-part-acts">
      {!sent ? (
        <button type="button" className="chip-btn primary" disabled={busy === key} onClick={() => void saveOne(key, body())}>
          {label}
        </button>
      ) : null}
      {msgs[key] ? <span className={msgs[key]!.ok ? "cc-done" : "cc-err"} role="status">{msgs[key]!.text}</span> : null}
    </div>
  );

  return (
    <>
      <div className="pc-card cma-box cma-part" data-part="net">
        <h2>Net sheet</h2>
        <div className="cma-net-grid">
          {NET_FIELDS.map((f) => (
            <label key={f.key}>
              {f.label}
              <input type="text" inputMode="decimal" disabled={sent} value={net[f.key]} placeholder={f.pct ? "%" : "$"} maxLength={12} onChange={(e) => setNetF(f.key, e.target.value)} />
            </label>
          ))}
        </div>
        {figs ? <p className="hr-line cma-net-line">{netLine(figs)}</p> : <small className="hr-sub">Set your range and fill in the commission to see what the seller nets.</small>}
        {foot("net", "Save net sheet", () => netBody(cmaId, net))}
      </div>

      <div className="pc-card cma-box cma-part" data-part="next_home">
        <h2>Your next home</h2>
        <div className="cma-net-grid cma-next-grid">
          <label>
            City or ZIP
            <input type="text" disabled={sent} value={next.where} maxLength={80} onChange={(e) => setNext({ ...next, where: e.target.value })} />
          </label>
          <label>
            Beds at least
            <input type="text" inputMode="numeric" disabled={sent} value={next.beds} maxLength={2} onChange={(e) => setNext({ ...next, beds: e.target.value.replace(/[^0-9]/g, "") })} />
          </label>
          <label>
            Price up to
            <input type="text" inputMode="numeric" disabled={sent} value={next.price} placeholder="$" maxLength={12} onChange={(e) => setNext({ ...next, price: e.target.value.replace(/[^0-9$,]/g, "") })} />
          </label>
        </div>
        {countLine ? <p className="hr-sub cma-count">{countLine}</p> : null}
        {demandL ? <p className="hr-sub cma-count">{demandL}</p> : null}
        {foot("next_home", "Save next home", () => nextHomeBody(cmaId, next, d.cma.nextHome))}
      </div>

      <div className="pc-card cma-box cma-part" data-part="prep">
        <h2>Fix this, skip that</h2>
        <div className="cma-prep">
          {prep.map((r, i) => (
            <div key={i} className="cma-prep-row">
              <label>
                What
                <input type="text" disabled={sent} value={r.item} maxLength={200} onChange={(e) => setPrepF(i, { item: e.target.value })} />
              </label>
              <label>
                Why
                <input type="text" disabled={sent} value={r.why} maxLength={400} onChange={(e) => setPrepF(i, { why: e.target.value })} />
              </label>
              <div className="cma-prep-do" role="group" aria-label={`Fix or skip item ${i + 1}`}>
                <button type="button" className={`chip-btn${r.do === "fix" ? " primary" : ""}`} aria-pressed={r.do === "fix"} disabled={sent} onClick={() => setPrepF(i, { do: "fix" })}>Fix</button>
                <button type="button" className={`chip-btn${r.do === "skip" ? " primary" : ""}`} aria-pressed={r.do === "skip"} disabled={sent} onClick={() => setPrepF(i, { do: "skip" })}>Skip</button>
              </div>
              <label>
                Pro from your Rolodex (optional)
                <span className="cma-prep-pro">
                  <input type="text" aria-label={`Pro name, item ${i + 1}`} placeholder="Name" disabled={sent} value={r.proName} maxLength={120} onChange={(e) => setPrepF(i, { proName: e.target.value })} />
                  <input type="text" inputMode="tel" aria-label={`Pro phone, item ${i + 1}`} placeholder="Phone" disabled={sent} value={r.proPhone} maxLength={40} onChange={(e) => setPrepF(i, { proPhone: e.target.value })} />
                </span>
              </label>
              {!sent ? <button type="button" className="link cma-adj-x" aria-label={`Remove item ${i + 1}`} onClick={() => setPrep(prep.filter((_, k) => k !== i))}>Remove</button> : null}
            </div>
          ))}
        </div>
        {!sent ? (
          <div className="cma-prep-add">
            <button type="button" className="link" disabled={prep.length >= PREP_MAX} onClick={() => setPrep([...prep, blankPrep()])}>+ Item</button>
            <button type="button" className="link" disabled={busy === "draft"} onClick={() => void draft()}>Draft with Pulse</button>
            {prep.length >= PREP_MAX ? <small className="hr-sub">Up to {PREP_MAX} items.</small> : null}
          </div>
        ) : null}
        {foot("prep", "Save fix and skip", () => prepBody(cmaId, prep))}
      </div>

      <div className="pc-card cma-box cma-part" data-part="pitch">
        <h2>How we&apos;d sell it</h2>
        <label className="cma-notes">
          Headline
          <input type="text" className="cma-wide" disabled={sent} value={pitch.headline} maxLength={PITCH_HEADLINE_MAX} onChange={(e) => setPitch({ ...pitch, headline: e.target.value })} />
        </label>
        <small className="hr-sub">{pitch.headline.length} of {PITCH_HEADLINE_MAX} characters</small>
        <label className="cma-notes">
          Lines (one per line, up to {PITCH_LINES_MAX})
          <textarea disabled={sent} value={pitch.lines} rows={5} onChange={(e) => setPitch({ ...pitch, lines: e.target.value })} />
        </label>
        {lines > PITCH_LINES_MAX ? <small className="cc-err">Up to {PITCH_LINES_MAX} lines.</small> : null}
        {foot("pitch", "Save how we'd sell it", () => pitchBody(cmaId, pitch))}
      </div>
    </>
  );
}

const partField = { net: "net", prep: "prep", pitch: "pitch", next_home: "nextHome" } as const;
