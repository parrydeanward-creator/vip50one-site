"use client";

import { useCallback, useState } from "react";
import { GoogleSections } from "./ProfileCards.tsx";
import { PulseModesSection } from "./ConnectSections.tsx";
import RezenSection from "./RezenSection.tsx";
import { ANDROID_APP, CONSENT_LINE, IOS_APP, adsConsentUrl, firstOpen, progress, readWelcome, welcomeUrl, type Welcome } from "@/lib/teamWelcome.ts";

// TEAM-ONBOARDING §3: "Welcome to <team>" with the same six steps as Classic, each with Skip for now. Pages open
// inside the Brain (onOpenPage), never Classic.
export default function TeamWelcome({ w, onChange, onLater, onOpenPage, onProfile }: {
  w: Welcome;
  onChange: (w: Welcome | null) => void;
  onLater: () => void;
  onOpenPage: (path: string) => void;
  onProfile: () => void;
}) {
  const [open, setOpen] = useState<string | null>(firstOpen(w));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const j = await fetch(welcomeUrl, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const next = readWelcome(j);
    onChange(next);
    if (next) setOpen((cur) => (cur && next.steps.some((s) => s.key === cur && !s.done) ? cur : firstOpen(next)));
  }, [onChange]);

  const post = async (url: string, body: unknown) => {
    setBusy(true);
    setErr(null);
    const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!r?.ok) setErr("That didn't save. Try again.");
    await reload();
    setBusy(false);
  };

  if (w.allDone) {
    return (
      <div className="tw" role="dialog" aria-label="You're set">
        <div className="tw-scroll">
        <h1>You&apos;re set.</h1>
        <p className="pf-sub">Three good first moves:</p>
        <div className="tw-moves">
          <button type="button" className="chip-btn" onClick={() => onOpenPage("/contacts/vip")}>Call one VIP</button>
          <button type="button" className="chip-btn" onClick={() => onOpenPage("/daily")}>Open Plan my day</button>
          <button type="button" className="chip-btn" onClick={() => onOpenPage("/team-leads")}>See the team&apos;s leads</button>
        </div>
        </div>
        <div className="tw-foot">
          <button type="button" className="chip-btn primary" onClick={onLater}>Open ONE</button>
        </div>
      </div>
    );
  }

  const openStep = w.steps.find((s) => s.key === open) ?? null;
  const body: Record<string, React.ReactNode> = {
    profile: (
      <>
        <p className="pf-sub">Add your photo and a short bio, and your full legal name and URE member ID. Then connect reZEN if you use it (optional).</p>
        <button type="button" className="chip-btn primary" onClick={onProfile}>Open My Profile</button>
        <RezenSection />
      </>
    ),
    consent: (
      <>
        <p>{CONSENT_LINE}</p>
        <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void post(adsConsentUrl, { agree: true })}>I agree</button>
      </>
    ),
    app: (
      <>
        <p className="pf-sub">Install ONE GO on your phone and sign in with this same email. It is where you do your day.</p>
        <div className="tw-moves">
          <a className="chip-btn" href={IOS_APP} target="_blank" rel="noopener noreferrer">iPhone</a>
          <a className="chip-btn" href={ANDROID_APP} target="_blank" rel="noopener noreferrer">Android</a>
        </div>
      </>
    ),
    people: (
      <>
        <p className="pf-sub">Bring your contacts in from Google here, or from your phone in ONE GO. Then pick your first VIPs.</p>
        <button type="button" className="chip-btn primary" onClick={() => onOpenPage("/contacts/vip")}>Pick my first VIPs</button>
      </>
    ),
    calendar: (
      <>
        <p className="pf-sub">Connect your calendar so Pulse plans your day around it. ONE GO can also use your phone&apos;s calendar.</p>
        <GoogleSections />
      </>
    ),
    pulse: <PulseModesSection />,
  };

  return (
    <div className="tw" role="dialog" aria-label={`Welcome to ${w.team}`}>
      <div className="tw-scroll">
      <h1>Welcome to {w.team}</h1>
      <p className="pf-sub">About 15 minutes. {progress(w)}. Skip anything and come back to it.</p>
      {err ? <p className="pf-sub warn" role="alert">{err}</p> : null}
      <ol className="tw-steps">
        {w.steps.map((s, i) => (
          <li key={s.key} className={`${s.done ? "done" : ""}${open === s.key ? " open" : ""}`}>
            <button type="button" className="tw-head" aria-expanded={open === s.key} onClick={() => setOpen(open === s.key ? null : s.key)}>
              <span className="tw-n" aria-hidden="true">{s.done ? "✓" : i + 1}</span>
              <span className="tw-label">{s.label}</span>
              <small>{s.done ? (s.skipped ? "Skipped" : "Done") : ""}</small>
            </button>
            {open === s.key ? (
              <div className="tw-body">
                {body[s.key] ?? null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      </div>
      {/* Pinned to the bottom of the box (walker, 14 Oct: at phone width Later sat below the screen). */}
      <div className="tw-foot">
        {openStep && !openStep.done ? (
          <button type="button" className="chip-btn" disabled={busy} onClick={() => void post(welcomeUrl, { skip: openStep.key })}>Skip this step</button>
        ) : null}
        <button type="button" className="chip-btn" onClick={onLater}>Later</button>
      </div>
    </div>
  );
}
