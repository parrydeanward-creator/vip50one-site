"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONNECTIONS, FIELDS, TIME_ZONES, UPLOAD_MAX, changes, fitSize, greetingName, photoProblem, photoUrl, problem, profileUrl, readProfile, type Profile } from "@/lib/profile.ts";

/** Draw the photo at most 1200px on the long side as a JPEG, so it fits ONE MOVE's 4 MB limit. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const { w, h } = fitSize(bmp.width, bmp.height);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const out = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.88));
    if (out && out.size <= UPLOAD_MAX) return out;
  } catch {
    // a format this browser cannot draw (some HEIC): send it as it is if it fits
  }
  if (file.size <= UPLOAD_MAX) return file;
  throw new Error("That photo is too large to send. Choose a smaller one or a JPEG.");
}

// VIP-SUMMARY §3j / PROFILE.md: the one My Profile for the whole system, in
// ONE Brain. The headshot in a gold ring (preview before saving), the facts
// every product reads, and each product's own settings one click away.

export default function MyProfile({
  onUnavailable,
  onChanged,
  onBack,
  onClassic,
}: {
  onUnavailable: () => void;
  onChanged: () => void;
  onBack: () => void;
  onClassic: () => void;
}) {
  const [saved, setSaved] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    let r: Response;
    try {
      r = await fetch(profileUrl, { credentials: "include", cache: "no-store" });
    } catch {
      return onUnavailable();
    }
    if (r.status === 404 || r.status === 405) return onUnavailable();
    if (!r.ok) return setErr(r.status === 401 ? "Sign in again to see your profile." : "ONE couldn't load your profile just now.");
    const p = readProfile(await r.json().catch(() => null));
    if (!p) return onUnavailable();
    setSaved(p);
    setDraft(p);
    setErr(null);
  }, [onUnavailable]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => () => {
    if (pending) URL.revokeObjectURL(pending.preview);
  }, [pending]);

  const answer = async (r: Response) => {
    const j = await r.json().catch(() => null);
    const p = r.ok ? readProfile(j) : null;
    if (!p) throw new Error((j as { error?: string } | null)?.error || "That didn't save. Nothing was changed.");
    return p;
  };

  const save = async () => {
    if (!saved || !draft || busy) return;
    const bad = problem(draft);
    if (bad) return setNote({ ok: false, text: bad });
    const body = changes(saved, draft);
    if (!Object.keys(body).length) return setNote({ ok: true, text: "Nothing to save." });
    setBusy(true);
    setNote(null);
    try {
      const p = await answer(await fetch(profileUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      setSaved(p);
      setDraft(p);
      setNote({ ok: true, text: "Saved. Every ONE product shows this now." });
      onChanged();
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "That didn't save. Nothing was changed." });
    } finally {
      setBusy(false);
    }
  };

  const choose = (f: File | undefined) => {
    if (!f) return;
    const bad = photoProblem(f);
    if (bad) return setNote({ ok: false, text: bad });
    setNote(null);
    setPending({ file: f, preview: URL.createObjectURL(f) });
  };
  const savePhoto = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const fd = new FormData();
      const blob = await shrink(pending.file);
      fd.append("photo", blob, blob === pending.file ? pending.file.name : "headshot.jpg");
      const p = await answer(await fetch(photoUrl, { method: "POST", credentials: "include", body: fd }));
      setSaved(p);
      setDraft((d) => (d ? { ...d, photo_url: p.photo_url, photo_version: p.photo_version } : p));
      setPending(null);
      setNote({ ok: true, text: "New photo saved." });
      onChanged();
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "That photo didn't save." });
    } finally {
      setBusy(false);
    }
  };

  if (err) {
    return (
      <div className="vr-msg" role="alert">
        <p>{err}</p>
        <button className="vr-btn" onClick={onClassic}>Open the Classic page</button>
      </div>
    );
  }
  if (!saved || !draft) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening your profile…
      </div>
    );
  }

  const shown = pending?.preview ?? (saved.photo_url ? `${saved.photo_url}${saved.photo_url.includes("?") ? "&" : "?"}v=${saved.photo_version ?? ""}` : null);
  const dirty = Object.keys(changes(saved, draft)).length > 0;
  const initials = (draft.full_name || saved.email).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="pf" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="pf-col">
        <section className="pf-hero">
          <button type="button" className="pf-photo" onClick={() => fileRef.current?.click()} aria-label="Change your photo">
            {shown ? <img src={shown} alt="" /> : <span>{initials}</span>}
            <i>Change</i>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
          <div className="pf-who">
            <p className="pf-kicker">My Profile</p>
            <h1>{greetingName(draft) || "You"}</h1>
            <p className="pf-sub">{saved.email}</p>
            <p className="pf-sub">One profile for ONE GO, ONE MOVE, Marquee, ONE Open and Showly.</p>
            {pending && (
              <div className="ta-log">
                <button className="chip-btn primary" onClick={savePhoto} disabled={busy}>{busy ? "Saving…" : "Use this photo"}</button>
                <button className="chip-btn" onClick={() => setPending(null)} disabled={busy}>Cancel</button>
              </div>
            )}
          </div>
        </section>

        <form className="pf-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {FIELDS.map((f) => (
            <label key={f.key} className={`pf-field${f.long ? " long" : ""}`}>
              <span>{f.label}</span>
              {f.key === "time_zone" ? (
                <select value={draft.time_zone} onChange={(e) => setDraft({ ...draft, time_zone: e.target.value })}>
                  {!TIME_ZONES.some((z) => z.value === draft.time_zone) && <option value={draft.time_zone}>{draft.time_zone}</option>}
                  {TIME_ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                </select>
              ) : f.long ? (
                <><textarea value={draft[f.key]} maxLength={f.max} rows={8} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                <span className="pf-count">{draft[f.key].length} / {f.max}</span></>
              ) : (
                <input value={draft[f.key]} maxLength={f.max} inputMode={f.key === "mobile" ? "tel" : undefined} autoComplete={f.key === "full_name" ? "name" : f.key === "mobile" ? "tel" : "off"} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
              )}
              {f.hint && <small>{f.hint}</small>}
            </label>
          ))}
          <div className="pf-actions">
            <button type="submit" className="chip-btn primary" disabled={busy || !dirty}>{busy ? "Saving…" : "Save"}</button>
            {dirty && <button type="button" className="chip-btn" onClick={() => setDraft(saved)} disabled={busy}>Undo changes</button>}
          </div>
        </form>
        {note && <p className={`pf-note${note.ok ? "" : " bad"}`} role="status">{note.text}</p>}
      </div>

      <aside className="pf-col pf-side" aria-label="Connections and settings">
        <h2>Connections and settings</h2>
        <p className="pf-sub">Settings that belong to one product stay in that product.</p>
        {CONNECTIONS.map((c) => (
          <section key={c.product} className="pf-conn">
            <h3 style={{ color: c.color }}>{c.product}</h3>
            {c.rows.map((r) =>
              r.classic ? (
                <button key={r.label} type="button" className="pf-row" onClick={onClassic}>{r.label}<span>›</span></button>
              ) : r.href ? (
                <a key={r.label} className="pf-row" href={r.href} target="_blank" rel="noopener noreferrer">{r.label}<span>↗</span></a>
              ) : (
                <p key={r.label} className="pf-row static">{r.label}<small>{r.note}</small></p>
              ),
            )}
          </section>
        ))}
        <div className="controls pf-controls" role="toolbar" aria-label="Back">
          <button onClick={onBack} aria-label="Back">←</button>
        </div>
      </aside>
    </div>
  );
}
