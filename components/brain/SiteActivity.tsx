"use client";

import { useEffect, useState } from "react";
import {
  accountLines, agoWords, clockWords, homeText, interest, mailLink, minutesWords, personSiteUrl, priceWords, readPersonSite, roomInviteUrl, siteIsEmpty, smsLink, sparkPath, trendWords,
  type PersonSite,
} from "@/lib/siteActivity.ts";
import "@/app/site-activity.css";

// VIP-SUMMARY §3ar on a contact (Parry, 23 Oct: "yes build it. looks great"; research/mockups/client-portal #contact):
// "On your site" (visits, homes viewed, time on site, last visit, 14 days of visits, the homes they looked at most, what
// they did today) and "Their account" (website, app, Room, emails; Resend Room invite). ONE MOVE answers; a contact
// whose route is not there yet, or who has never been on the site, shows nothing (no invented numbers). Text opens a
// draft on the agent's own phone; nothing is sent from ONE except the Room invite the agent asks for.

type Load = { site: PersonSite | null; done: boolean };
const cache = new Map<string, { at: number; site: PersonSite | null }>();
const FRESH_MS = 60_000;

/** One contact's site activity, shared by the card and the full contact (one call a minute per person). */
export function useSite(contactId: string | null): Load {
  const hit = contactId ? cache.get(contactId) : undefined;
  const [st, setSt] = useState<Load>(() => (hit ? { site: hit.site, done: true } : { site: null, done: false }));
  useEffect(() => {
    if (!contactId) return setSt({ site: null, done: true });
    const c = cache.get(contactId);
    if (c && Date.now() - c.at < FRESH_MS) return setSt({ site: c.site, done: true });
    let gone = false;
    setSt({ site: null, done: false });
    fetch(personSiteUrl(contactId), { credentials: "include", cache: "no-store" })
      .then(async (r) => (r.status === 200 ? readPersonSite(await r.json().catch(() => null)) : null))
      .catch(() => null)
      .then((site) => {
        const s = site && !siteIsEmpty(site) ? site : null;
        cache.set(contactId, { at: Date.now(), site: s });
        if (!gone) setSt({ site: s, done: true });
      });
    return () => {
      gone = true;
    };
  }, [contactId]);
  return st;
}

function Spark({ site, label }: { site: PersonSite; label: string }) {
  const pts = site.perDay.map((d) => d.visits);
  const s = sparkPath(pts, 600, 70);
  const rising = pts.length > 1 && pts.slice(-7).reduce((a, b) => a + b, 0) > pts.slice(0, 7).reduce((a, b) => a + b, 0);
  return (
    <svg className="sa-spark" viewBox="0 0 600 70" preserveAspectRatio="none" role="img" aria-label={`${label}${rising ? ", rising" : ""}`}>
      <path d={s.area} fill="rgba(74,163,255,.16)" />
      <path d={s.line} fill="none" stroke="#4aa3ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={s.last[0]} cy={s.last[1]} r="4" fill="#4aa3ff" />
    </svg>
  );
}

/** The person card's short version: three numbers that open the full contact, the sparkline and the top home. */
export function SiteGlance({ contactId, onOpen }: { contactId: string; onOpen: () => void }) {
  const { site } = useSite(contactId);
  if (!site) return null;
  const top = site.homes[0];
  return (
    <div className="sa-glance" aria-label="On your site">
      <div className="ct-sec ct-sec-gap">ON YOUR SITE</div>
      <div className="sa-glance-n">
        <button type="button" onClick={onOpen} aria-label={`${site.visits7} visits this week: see them`}><b>{site.visits7}</b><span>visits · 7d</span></button>
        <button type="button" onClick={onOpen} aria-label={`${site.homes7} homes viewed this week: see them`}><b>{site.homes7}</b><span>homes · 7d</span></button>
        <button type="button" onClick={onOpen} aria-label={`Last visit ${agoWords(site.lastVisitAt)}: see what they did`}><b className="sa-sm">{agoWords(site.lastVisitAt)}</b><span>last visit</span></button>
      </div>
      <Spark site={site} label="Visits per day over 14 days" />
      {top ? (
        <button type="button" className="sa-glance-top" onClick={onOpen}>
          Most viewed: <b>{top.address.split(",")[0]}</b> · {top.times}× · {minutesWords(top.seconds)} →
        </button>
      ) : null}
    </div>
  );
}

/** The full contact's block: Pulse with Call/Text/Book showing, the account box, the numbers, homes and today. */
export function OnYourSite({ contactId, first, phone, email, onCall, onBook }: { contactId: string; first: string; phone: string | null; email: string | null; onCall: () => void; onBook: () => void }) {
  const { site } = useSite(contactId);
  const [invite, setInvite] = useState<{ busy: boolean; said: string | null }>({ busy: false, said: null });
  if (!site) return null;
  const now = Date.now();
  const bars = interest(site.homes);
  const textHome = (address: string) => smsLink(phone, homeText(first, address)) ?? mailLink(email, `${address}`, homeText(first, address));
  const resend = async () => {
    setInvite({ busy: true, said: null });
    try {
      const r = await fetch(roomInviteUrl(contactId), { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: "{}" });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; example?: boolean; error?: string } | null;
      setInvite({ busy: false, said: r.ok && j?.ok ? (j.example ? "(Example: nothing was sent.)" : `Room invitation sent to ${first} again.`) : j?.error ?? "The invitation didn't go. Try again in a moment." });
    } catch {
      setInvite({ busy: false, said: "The invitation didn't go. Try again in a moment." });
    }
  };
  const pulse = site.pulse;
  const textNow = smsLink(phone, `Hi ${first}, `);
  const acts = (
    <div className="sa-acts">
      {phone ? <button type="button" className={`ct-btn${pulse?.action !== "text" ? " solid" : ""}`} onClick={onCall}>Call</button> : null}
      {textNow ? <a className={`ct-btn${pulse?.action === "text" ? " solid" : ""}`} href={textNow}>Text</a> : null}
      <button type="button" className={`ct-btn${pulse?.action === "showing" ? " solid" : ""}`} onClick={onBook}>Book showing</button>
    </div>
  );
  return (
    <section className="sa-contact" aria-label="On your site">
      <div className="sa-side">
        {pulse ? (
          <div className={`sa-pulse${pulse.action === "text" ? " warm" : ""}`}>
            <b>PULSE: {pulse.action === "text" ? "TEXT" : pulse.action === "showing" ? "BOOK A SHOWING" : "CALL"} {first.toUpperCase()} TODAY</b>
            {pulse.line}
          </div>
        ) : null}
        {acts}
        <div className="sa-card sa-account">
          <h3>Their account</h3>
          <dl className="sa-kv">
            {accountLines(site.account, now).map((l) => (
              <div key={l.key}>
                <dt>{l.label}</dt>
                <dd className={l.ok ? "y" : "n"}>{l.words}</dd>
              </div>
            ))}
          </dl>
          {site.account.room && !site.account.room.openedAt ? (
            <button type="button" className="ct-btn sa-wide" disabled={invite.busy} onClick={resend}>{invite.busy ? "Sending…" : "Resend Room invite"}</button>
          ) : null}
          {invite.said ? <p className="sa-said" role="status">{invite.said}</p> : null}
        </div>
      </div>
      <div className="sa-main">
        <div className="sa-card">
          <h3>On your site <span>Last 30 days</span></h3>
          <div className="sa-stats">
            <div className="sa-st"><span>Visits</span><b>{site.visits30}</b><em>{site.visits7} this week</em></div>
            <div className="sa-st"><span>Homes viewed</span><b>{site.homes30}</b><em>{site.homes7} this week</em></div>
            <div className="sa-st"><span>Time on site</span><b>{minutesWords(site.seconds30)}</b><em>{trendWords(site.seconds30, site.secondsPrev30) ?? " "}</em></div>
            <div className="sa-st"><span>Last visit</span><b className="sa-up">{agoWords(site.lastVisitAt, now)}</b><em>{site.lastDevice ? `on ${site.lastDevice === "phone" ? "a phone" : "a computer"}` : " "}</em></div>
          </div>
          <Spark site={site} label="Visits per day over 14 days" />
          <p className="sa-cap">Visits per day, last 14 days</p>
        </div>
        {site.homes.length ? (
          <div className="sa-card">
            <h3>Homes {first} looked at most</h3>
            <div className="sa-scroll">
              <table className="sa-vt">
                <thead>
                  <tr><th>Home</th><th className="r">Times</th><th className="r">Time</th><th>Interest</th><th><span className="sa-sr">Action</span></th></tr>
                </thead>
                <tbody>
                  {site.homes.map((h, i) => {
                    const href = textHome(h.address);
                    return (
                      <tr key={h.key}>
                        <td>
                          {h.address}{h.price != null ? ` · ${priceWords(h.price)}` : ""}
                          {h.note ? <small>{h.note}</small> : null}
                        </td>
                        <td className="r">{h.times}</td>
                        <td className="r">{minutesWords(h.seconds)}</td>
                        <td><div className="sa-bar"><span style={{ width: `${bars[i]}%` }} /></div></td>
                        <td>
                          {href ? (
                            <a className="ct-btn sa-row-btn" href={href} aria-label={`Text ${first} about ${h.address}`}>Text about it</a>
                          ) : (
                            <button type="button" className="ct-btn sa-row-btn" onClick={onBook}>Showing</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {site.today.length ? (
          <div className="sa-card">
            <h3>What {first} did <span>Today</span></h3>
            <ol className="sa-tl">
              {site.today.map((t, i) => (
                <li key={`${t.at}-${i}`}>
                  <time>{clockWords(t.at)}</time>
                  <i className={`k-${t.kind}`} aria-hidden="true" />
                  <span>{t.text}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
