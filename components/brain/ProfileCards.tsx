"use client";

import { useCallback, useEffect, useState } from "react";
import { chimeOn, setChime } from "@/lib/chime.ts";
import { calendarDisconnectUrl, calendarSyncUrl, connectCalendarUrl, connectContactsUrl, googleDisconnectUrl, googlePhotosUrl, googleStatusUrl, readGoogle, shortWhen, type GoogleState } from "@/lib/googleLink.ts";
import { membershipUrl, planName, readMembership, standing, type Membership } from "@/lib/membership.ts";
import { badgePath, badgesUrl, pct, readBadges, type Badges } from "@/lib/badges.ts";
import { CONSENT_LINE, adsConsentUrl, readAdsConsent, type AdsConsent } from "@/lib/teamWelcome.ts";
import { NOTIFY_KEYS, NOTIFY_LABEL, notifyUrl, readNotify, type NotifyKey, type NotifyPrefs } from "@/lib/notifyPrefs.ts";

// My Profile cards that ONE MOVE's Classic profile has too (Parry, 14 Oct, hard rule: every My Profile item on both
// pages). Each card hides itself until its route answers, so nothing half-working shows.

const json = (r: Response) => (r.ok ? r.json() : null);

/** The plan, small, in the header beside the photo (Parry, 14-15 Oct: "move the membership type up in the header with
 * the profile pic. make it much smaller"), with Manage billing when Stripe bills them. */
export function MembershipBadge() {
  const [m, setM] = useState<Membership | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(membershipUrl, { cache: "no-store" }).then(json).then((j) => setM(readMembership(j))).catch(() => {});
  }, []);
  if (!m) return null;
  const s = standing(m);
  const open = async () => {
    setBusy(true);
    setErr(null);
    const j = await fetch(membershipUrl, { method: "POST" }).then((r) => r.json().catch(() => null)).catch(() => null);
    if (j && typeof j.url === "string") {
      window.location.assign(j.url);
      return;
    }
    setErr(j?.error ?? "Billing could not open just now. Try again in a minute.");
    setBusy(false);
  };
  return (
    <p className={`pf-plan${s.warn ? " warn" : ""}`}>
      <span>{planName(m)}{m.access === "comp" ? " · Comped" : s.warn ? ` · ${s.text}` : ""}</span>
      {m.stripe ? (
        <button type="button" className="pf-plan-btn" disabled={busy} onClick={() => void open()}>{busy ? "Opening…" : "Manage billing"}</button>
      ) : null}
      {err ? <small role="alert">{err}</small> : null}
    </p>
  );
}

function useGoogle() {
  const [g, setG] = useState<GoogleState | null>(null);
  const load = useCallback(async () => {
    const j = await fetch(googleStatusUrl, { cache: "no-store" }).then(json).catch(() => null);
    setG(readGoogle(j));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { g, load };
}

async function post(url: string): Promise<{ ok: boolean; text: string | null; added?: number }> {
  const r = await fetch(url, { method: "POST" }).catch(() => null);
  const j = r ? await r.json().catch(() => null) : null;
  return { ok: !!r?.ok && j?.ok !== false, text: typeof j?.error === "string" ? j.error : null, added: typeof j?.added === "number" ? j.added : undefined };
}

export function GoogleSections() {
  const { g, load } = useGoogle();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ which: "contacts" | "calendar"; text: string } | null>(null);
  if (!g || !g.available) return null;
  const run = async (which: "contacts" | "calendar", url: string, done: (r: Awaited<ReturnType<typeof post>>) => string) => {
    setBusy(url);
    setNote(null);
    const r = await post(url);
    setNote({ which, text: r.ok ? done(r) : r.text ?? "That didn't work. Try again in a minute." });
    setBusy(null);
    await load();
  };
  return (
    <>
      <section className="pf-card" aria-label="Google Contacts">
        <h2>Google Contacts</h2>
        <small className="pf-sub">Faces for your contacts from Google Contacts. ONE only reads; nothing is changed in Google.</small>
        {g.connected ? (
          <>
            <p className="pf-line">Connected{g.lastPhotosAt ? ` · photos last brought in ${shortWhen(g.lastPhotosAt)}` : ""}</p>
            <div className="pf-btns">
              <button type="button" className="chip-btn primary" disabled={!!busy} onClick={() => void run("contacts", googlePhotosUrl, (r) => (r.added ? `${r.added} photos added.` : "Photos are up to date."))}>
                {busy === googlePhotosUrl ? "Bringing in…" : "Bring in photos"}
              </button>
              <button type="button" className="chip-btn" disabled={!!busy} onClick={() => void run("contacts", googleDisconnectUrl, () => "Google is disconnected.")}>Disconnect</button>
            </div>
          </>
        ) : (
          <div className="pf-btns">
            <a className="chip-btn primary" href={connectContactsUrl}>Connect Google</a>
          </div>
        )}
        {note?.which === "contacts" ? <small className="pf-sub" role="status">{note.text}</small> : null}
      </section>
      {g.calendarAvailable ? (
        <section className="pf-card" aria-label="Google Calendar">
          <h2>Google Calendar</h2>
          <small className="pf-sub">Your plan and your Google Calendar stay in step, both ways. Only your own calendar; never a shared one.</small>
          {g.calendarOn ? (
            <>
              <p className="pf-line">On{g.calendarSyncedAt ? ` · last in step ${shortWhen(g.calendarSyncedAt)}` : ""}</p>
              {g.calendarError ? <small className="pf-sub warn">{g.calendarError}</small> : null}
              <div className="pf-btns">
                <button type="button" className="chip-btn primary" disabled={!!busy} onClick={() => void run("calendar", calendarSyncUrl, () => "In step now.")}>
                  {busy === calendarSyncUrl ? "Working…" : "Bring in step now"}
                </button>
                <button type="button" className="chip-btn" disabled={!!busy} onClick={() => void run("calendar", calendarDisconnectUrl, () => "Google Calendar is off.")}>Turn off</button>
              </div>
            </>
          ) : (
            <>
              <div className="pf-btns">
                <a className="chip-btn primary" href={connectCalendarUrl}>Connect Google Calendar</a>
              </div>
              {/* Google's review of the calendar scope is still open (vip50-web-crm#400): say what its screen will show */}
              <small className="pf-sub" data-note="gcal-unverified">Google may show a &quot;not verified yet&quot; screen while it reviews ONE: tap Advanced, then Continue.</small>
            </>
          )}
          {note?.which === "calendar" ? <small className="pf-sub" role="status">{note.text}</small> : null}
        </section>
      ) : null}
    </>
  );
}

export function NotificationsSection() {
  const [p, setP] = useState<NotifyPrefs | null>(null);
  const [chime, setChimeState] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(notifyUrl, { cache: "no-store" }).then(json).then((j) => setP(readNotify(j))).catch(() => {});
    setChimeState(chimeOn());
  }, []);
  if (!p) return null;
  const flip = async (key: NotifyKey, on: boolean) => {
    setErr(null);
    setP({ ...p, [key]: on });
    const r = await fetch(notifyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, on }) }).catch(() => null);
    if (!r?.ok) {
      setP({ ...p, [key]: !on });
      setErr("That didn't save. Try again.");
    }
  };
  return (
    <section className="pf-card" aria-label="Notifications">
      <h2>Notifications</h2>
      <small className="pf-sub">On your phone (ONE GO) and in your browser.</small>
      {NOTIFY_KEYS.map((k) => (
        <label key={k} className="dc-switch">
          <input type="checkbox" checked={p[k]} onChange={(e) => void flip(k, e.target.checked)} />
          <span>{NOTIFY_LABEL[k].label} <small className="pf-sub">{NOTIFY_LABEL[k].sub}</small></span>
        </label>
      ))}
      <label className="dc-switch">
        <input type="checkbox" checked={chime} onChange={(e) => { setChime(e.target.checked); setChimeState(e.target.checked); }} />
        <span>Sound on this computer <small className="pf-sub">A soft chime when a block starts.</small></span>
      </label>
      {err ? <small className="pf-sub warn" role="alert">{err}</small> : null}
    </section>
  );
}

/** Badges tab: this week's badges with progress, then the milestone badges, earned ones lit. */
export function BadgesSection() {
  const [b, setB] = useState<Badges | null>(null);
  useEffect(() => {
    fetch(badgesUrl, { cache: "no-store" }).then(json).then((j) => setB(readBadges(j))).catch(() => {});
  }, []);
  if (!b) return <p className="pf-sub">Loading your badges…</p>;
  return (
    <>
      <section className="pf-card pf-span" aria-label="This week's badges">
        <h2>This week</h2>
        <small className="pf-sub">Earned, never given: each one unlocks when you reach its number this week.</small>
        <ul className="bd-tiles">
          {b.weekly.map((x) => (
            <li key={x.name} className={x.earned ? "on" : undefined}>
              <b>{x.name}</b>
              <span className="bd-bar"><i style={{ width: `${pct(x.count, x.target)}%` }} /></span>
              <small>{x.earned ? "Earned this week" : `${x.count} of ${x.target}`}{x.times ? ` · ${x.times} in all` : ""}</small>
              <a className="link" data-act="badge-tile" href={`/dashboard${badgePath(x.name)}`}>{x.earned ? "See where it came from" : "Work on it"}</a>
            </li>
          ))}
        </ul>
      </section>
      {b.milestones.length ? (
        <section className="pf-card pf-span" aria-label="Milestone badges">
          <h2>Milestones</h2>
          <ul className="bd-tiles">
            {b.milestones.map((x) => (
              <li key={x.name} className={x.earned ? "on" : undefined}>
                <b>{x.name}</b>
                {x.description ? <small>{x.description}</small> : null}
                {x.earned ? <small>Earned{x.earnedAt ? ` ${x.earnedAt.slice(0, 10)}` : ""}</small> : x.target ? <span className="bd-bar"><i style={{ width: `${pct(x.progress, x.target)}%` }} /></span> : null}
                <a className="link" data-act="badge-tile" href="/dashboard/achievements">Open the Scoreboard</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/** Settings > Team ads (walker 14 Oct, Parry approved): the agent's own consent to the team lead's ads, on or off any
 * time. Hidden for agents not on a team and for the team lead and admins, who run the ads. */
export function TeamAdsSection() {
  const [c, setC] = useState<AdsConsent | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const j = await fetch(adsConsentUrl, { credentials: "include", cache: "no-store" }).then(json).catch(() => null);
    setC(readAdsConsent(j));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (!c || c.lead) return null;
  const flip = async (agree: boolean) => {
    setBusy(true);
    setErr(null);
    const r = await fetch(adsConsentUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agree }) }).catch(() => null);
    if (!r?.ok) setErr("That didn't save. Try again in a minute.");
    await load();
    setBusy(false);
  };
  return (
    <section className="pf-card" aria-label="Team ads">
      <h2>Team ads</h2>
      <small className="pf-sub">{CONSENT_LINE.replace(" You can turn this off any time in My Profile.", "")}</small>
      <label className="dc-switch">
        <input type="checkbox" checked={c.on} disabled={busy} onChange={(e) => void flip(e.target.checked)} />
        {c.on ? `On: ${c.team} may run ads that show me` : "Off: no team ad shows me"}
      </label>
      {err ? <small className="pf-sub warn" role="alert">{err}</small> : null}
    </section>
  );
}
