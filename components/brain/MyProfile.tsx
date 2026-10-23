"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LeadMailSection, OwnAISection, PulseModesSection } from "./ConnectSections.tsx";
import RezenSection from "./RezenSection.tsx";
import MyCardSection from "./MyCardSection.tsx";
import VoiceSection from "./VoiceSection.tsx";
import { syncKind, type VoiceKind } from "@/lib/voicePick.ts";
import { GbpProfileCard } from "./GbpScreen.tsx";
import WhereIWorkSection from "./WhereIWorkSection.tsx";
import TimeOffSection from "./TimeOffSection.tsx";
import ToursSection from "./ToursSection.tsx";
import ReviewsSection from "./ReviewsSection.tsx";
import { autostartBody, homeReportUrl, monthUrl, readMonthCard } from "@/lib/homeReport.ts";
import { BadgesSection, GoogleSections, MembershipBadge, NotificationsSection, TeamAdsSection } from "./ProfileCards.tsx";
import { brokerageAsk, CONNECTIONS, demoProfile, FIELDS, TIME_ZONES, UPLOAD_MAX, aboutChanges, changes, fitSize, greetingName, photoProblem, photoUrl, problem, profileUrl, readProfile, winsChange, WINS_MAX, type Profile } from "@/lib/profile.ts";

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

const PF_TABS = [
  { key: "connections", label: "Connections" },
  { key: "badges", label: "Badges" },
  { key: "settings", label: "Settings" },
  { key: "pulse", label: "Pulse" },
] as const;
type PfTab = (typeof PF_TABS)[number]["key"];

// VIP-SUMMARY §3j / PROFILE.md: the one My Profile for the whole system, in
// ONE Brain. The headshot in a gold ring (preview before saving), the facts
// every product reads, and each product's own settings one click away.

export default function MyProfile({
  onUnavailable,
  onChanged,
  onBack,
  onClassic,
  demo = false,
  gbpDemo = demo,
  onOpenGbp,
  askAi,
  onOpenAskAi,
}: {
  onUnavailable: () => void;
  onChanged: () => void;
  onBack: () => void;
  onClassic: () => void;
  /** The example agent (?demo=1): example data, nothing called, nothing saved. */
  demo?: boolean;
  /** Google Business Profile shows its example when true (the example agent and the tour). */
  gbpDemo?: boolean;
  /** Opens the Google Business Profile screen over the Brain. */
  onOpenGbp?: () => void;
  /** Ask AI about you's card (lib/aiCheck.ts askAiCard; Parry, 19 Oct: off ONE YOU, onto My Profile). */
  askAi?: { title: string; line: string; due: boolean };
  /** Opens the Ask AI about you view over the Brain, as the orb did. */
  onOpenAskAi?: () => void;
}) {
  const [saved, setSaved] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [pulseVoice, setPulseVoice] = useState<VoiceKind | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  // /dashboard/profile#pulse (and #badges, #settings, #connections) opens that section, as Classic does.
  const [tab, setTab] = useState<PfTab>(demo ? "pulse" : "connections");
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (PF_TABS.some((t) => t.key === h)) setTab(h as PfTab);
  }, []);
  const pickTab = (t: PfTab) => {
    setTab(t);
    try {
      window.history.replaceState(null, "", `#${t}`);
    } catch {}
  };

  const load = useCallback(async () => {
    if (demo) {
      const p = demoProfile();
      setSaved(p);
      setDraft(p);
      return;
    }
    let r: Response;
    try {
      r = await fetch(profileUrl, { credentials: "include", cache: "no-store" });
    } catch {
      return onUnavailable();
    }
    if (r.status === 404 || r.status === 405) return onUnavailable();
    if (!r.ok) return setErr(r.status === 401 ? "Sign in again to see your profile." : "ONE couldn't load your profile just now.");
    const j = await r.json().catch(() => null);
    const p = readProfile(j);
    if (!p) return onUnavailable();
    // Pulse's voice from MASTER (vip50-web-crm#277): into the local copy every say() reads, and to the picker.
    const k = syncKind(j);
    if (k) setPulseVoice(k);
    setSaved(p);
    setDraft(p);
    setErr(null);
  }, [onUnavailable, demo]);
  const demoNote = () => setNote({ ok: true, text: "Example agent. Nothing is saved." });

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
    if (demo) return demoNote();
    const bad = problem(draft);
    if (bad) return setNote({ ok: false, text: bad });
    const about = aboutChanges(saved.about, draft.about);
    const wins = winsChange(saved, draft);
    const body = { ...changes(saved, draft), ...(about ? { about } : {}), ...(wins !== undefined ? { vip_50_wins: wins } : {}) };
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

  // The one-time legal-name confirm (PROFILE.md v1.1): saved on its own, never with other edits.
  const confirmBrokerage = async () => {
    if (!saved || busy) return;
    if (demo) return demoNote();
    setBusy(true);
    setNote(null);
    try {
      const p = await answer(await fetch(profileUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brokerage_confirmed: true }) }));
      setSaved(p);
      setDraft((d) => (d ? { ...d, brokerage_confirmed_at: p.brokerage_confirmed_at } : p));
      setNote({ ok: true, text: "Confirmed. Thank you." });
      onChanged();
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "That didn't save. Nothing was changed." });
    } finally {
      setBusy(false);
    }
  };

  // Privacy (§3j.4, PROFILE.md §2): saved the moment it is switched, off by default, the agent's own choice.
  const setShare = async (on: boolean) => {
    if (!saved || busy) return;
    if (demo) return demoNote();
    setBusy(true);
    setNote(null);
    try {
      const p = await answer(await fetch(profileUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ share_contact_info: on }) }));
      setSaved(p);
      setDraft((d) => (d ? { ...d, share_contact_info: p.share_contact_info } : p));
      setNote({ ok: true, text: on ? "Members of VIP-50 can now see your phone and email." : "Your phone and email are hidden from members." });
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
    if (demo) {
      setPending(null);
      return demoNote();
    }
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
  const dirty = Object.keys(changes(saved, draft)).length > 0 || !!aboutChanges(saved.about, draft.about) || winsChange(saved, draft) !== undefined;
  const initials = (draft.full_name || saved.email).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="pf" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <section className="pf-hero">
          <button type="button" className="pf-photo" onClick={() => fileRef.current?.click()} aria-label="Change your photo">
            {shown ? <img src={shown} alt="" /> : <span>{initials}</span>}
            <i>Change</i>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
          <div className="pf-who">
            {/* a back button on every page (Parry, 23 Oct: "I need back buttons on every page") */}
            <button type="button" className="page-back" data-act="page-back" onClick={onBack} aria-label="Back">← Back</button>
            <p className="pf-kicker">My Profile</p>
            <h1>{greetingName(draft) || "You"}</h1>
            <p className="pf-sub">{saved.email}</p>
            {demo ? <p className="pf-sub">Example agent. Nothing is saved.</p> : <MembershipBadge />}
            <p className="pf-sub">One profile for ONE GO, ONE MOVE, Marquee, ONE Open and Showly.</p>
            {pending && (
              <div className="ta-log">
                <button className="chip-btn primary" onClick={savePhoto} disabled={busy}>{busy ? "Saving…" : "Use this photo"}</button>
                <button className="chip-btn" onClick={() => setPending(null)} disabled={busy}>Cancel</button>
              </div>
            )}
          </div>
        </section>

        {saved && brokerageAsk(saved) ? (
          <section className="pf-confirm" aria-label="Confirm your brokerage">
            <b>Confirm your brokerage</b>
            <p>{brokerageAsk(saved)}</p>
            {saved.brokerage.trim() && !saved.brokerage_confirmed_at ? (
              <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void confirmBrokerage()}>Yes, that is the legal name</button>
            ) : null}
            <small>Change it below if it isn't. Every site, post and ad prints it exactly as typed.</small>
          </section>
        ) : null}
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
                <><textarea value={draft[f.key]} maxLength={f.max} rows={5} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                <span className="pf-count">{draft[f.key].length} / {f.max}</span></>
              ) : (
                <input value={draft[f.key]} maxLength={f.max} inputMode={f.key === "mobile" ? "tel" : undefined} autoComplete={f.key === "full_name" ? "name" : f.key === "mobile" ? "tel" : "off"} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
              )}
              {f.hint && <small>{f.hint}</small>}
            </label>
          ))}
          {draft.vip_50_wins !== null && (
            <label className="pf-field long">
              <span>VIP-50 Wins</span>
              <textarea value={draft.vip_50_wins} maxLength={WINS_MAX} rows={4} onChange={(e) => setDraft({ ...draft, vip_50_wins: e.target.value })} />
              <small>Your milestone wins with the VIP-50 system. Shown on your member card in the Lounge.</small>
            </label>
          )}
          <div className="pf-actions">
            <button type="submit" className="chip-btn primary" disabled={busy || !dirty}>{busy ? "Saving…" : "Save"}</button>
            {dirty && <button type="button" className="chip-btn" onClick={() => setDraft(saved)} disabled={busy}>Undo changes</button>}
          </div>
        </form>
        {note && <p className={`pf-note${note.ok ? "" : " bad"}`} role="status">{note.text}</p>}

      {/* PROFILE.md §2 v1.9: profile facts saved on their own card, in the two-column grid (one column on a phone).
          Time off joins them (Parry, 16 Oct: off ONE YOU, onto My Profile, on Classic and the Brain alike). */}
      <div className="pf-cards">
        <MyCardSection demo={demo} />
        <WhereIWorkSection demo={demo} />
        <TimeOffSection demo={demo} />
        <ToursSection demo={demo} />
        <ReviewsSection demo={demo} />
        <GbpProfileCard demo={gbpDemo} onOpen={onOpenGbp} />
        {askAi && onOpenAskAi ? (
          <section className="pf-card" aria-label={askAi.title}>
            <h2>{askAi.title}</h2>
            <small className="pf-sub">{askAi.line}</small>
            <div className="pf-btns">
              <button type="button" className={`chip-btn${askAi.due ? " primary" : ""}`} onClick={onOpenAskAi}>
                Open
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {/* The same sections as Classic's My Profile (vip50-web-crm#253): Connections (reZEN first), Badges, Settings, Pulse. */}
      <div className="pf-tabs" role="tablist" aria-label="My Profile sections">
        {PF_TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : undefined} onClick={() => pickTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="pf-cards" role="tabpanel" aria-label={PF_TABS.find((t) => t.key === tab)?.label}>
        {demo && tab !== "pulse" ? (
          <section className="pf-card pf-span" aria-label="Example agent">
            <small className="pf-sub">Example agent. Your own connections, badges and settings show here when you sign in.</small>
          </section>
        ) : tab === "connections" ? (
          <>
            <RezenSection />
            <LeadMailSection />
            <GoogleSections />
            <OwnAISection />
            <section className="pf-card" aria-label="Lofty and the Lounge">
              <h2>Lofty and the Lounge</h2>
              <small className="pf-sub">Lofty stays connected in ONE MOVE until your ONE site replaces it. Your posts and the community feed are in the Lounge.</small>
              <div className="pf-btns">
                <a className="chip-btn" href="/dashboard/lounge?tab=feed">Open the Lounge</a>
                <button type="button" className="chip-btn" onClick={onClassic}>Lofty in ONE MOVE</button>
              </div>
            </section>
          </>
        ) : tab === "badges" ? (
          <BadgesSection />
        ) : tab === "settings" ? (
          <>
            <NotificationsSection />
            <TeamAdsSection />
            {saved.share_contact_info !== null && (
              <section className="pf-card" aria-label="Contact sharing">
                <h2>Contact sharing</h2>
                <label className="dc-switch">
                  <input type="checkbox" checked={!!saved.share_contact_info} disabled={busy} onChange={(e) => setShare(e.target.checked)} />
                  Show my phone and email to members
                </label>
                <small className="pf-sub">Off unless you switch it on. When it is off, your member card in the Lounge shows no phone, email or Call button.</small>
              </section>
            )}
            <ReferralsSection />
            <HomeReportSwitch />
            {CONNECTIONS.map((c) => (
              <section key={c.product} className="pf-card pf-conn">
                <h3 style={{ color: c.color }}>{c.product}</h3>
                {c.rows.map((r) =>
                  r.href ? (
                    <a key={r.label} className="pf-row" href={r.href} target="_blank" rel="noopener noreferrer">{r.label}<span>↗</span></a>
                  ) : (
                    <p key={r.label} className="pf-row static">{r.label}<small>{r.note}</small></p>
                  ),
                )}
              </section>
            ))}
          </>
        ) : (
          <>
            <VoiceSection demo={demo} pulseVoice={pulseVoice} />
            {demo ? null : (
              <div className="pf-span">
                <PulseModesSection />
              </div>
            )}
          </>
        )}
      </div>
      <div className="controls pf-controls" role="toolbar" aria-label="Back">
        <button onClick={onBack} aria-label="Back">←</button>
      </div>
    </div>
  );
}

/** VIP-SUMMARY §3af.1: "Receive referrals from ONE agents" (default on). Off hides the agent from the referral picker. */
const listedUrl = "https://move.vip50one.com/api/brain/network/listed";
function ReferralsSection() {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch(listedUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setOn(j && typeof j.listed === "boolean" ? j.listed : null))
      .catch(() => {});
  }, []);
  const save = async (next: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(listedUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listed: next }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "That didn't save. Nothing was changed.");
      setOn(j.listed === true);
      setMsg(next ? "ONE agents can send you referrals." : "You are hidden from the referral picker.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "That didn't save. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };
  if (on === null) return null;
  return (
    <section className="pf-card" aria-label="Referrals">
      <h2>Referrals</h2>
      <label className="dc-switch">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => save(e.target.checked)} />
        Receive referrals from ONE agents
      </label>
      <small className="pf-sub">On unless you switch it off. Other agents see your name, photo, city, team and licence state, never your clients.</small>
      {msg ? <small className="pf-sub" role="status">{msg}</small> : null}
    </section>
  );
}

/**
 * HOME-REPORT §4.3 (16 Oct): "Start a Home Report automatically for anyone who asks on my site", off by default. Off:
 * each request arrives in ONE MOVE as a task the agent starts with one tap. Read from the monthly card, set on ONE MOVE.
 */
function HomeReportSwitch() {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch(monthUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setOn(readMonthCard(j)?.autostart ?? null))
      .catch(() => {});
  }, []);
  const save = async (next: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(homeReportUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(autostartBody(next)) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "That didn't save. Nothing was changed.");
      setOn(j.autostart === true);
      setMsg(next ? "A request on your site now starts its Market Report by itself." : "Each request on your site arrives as a task you start with one tap.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "That didn't save. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };
  if (on === null) return null;
  return (
    <section className="pf-card" aria-label="Market Report">
      <h2>Market Report</h2>
      <label className="dc-switch">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => save(e.target.checked)} />
        Start a Market Report automatically for anyone who asks on my site
      </label>
      <small className="pf-sub">Off unless you switch it on. Off, each request arrives in ONE MOVE as a task you start with one tap. Their marketing yes is checked either way.</small>
      {msg ? <small className="pf-sub" role="status">{msg}</small> : null}
    </section>
  );
}
