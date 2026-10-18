"use client";

import { useEffect, useState } from "react";
import { personUrl } from "@/lib/people.ts";
import {
  NO_SITE_LINK,
  SHARE_LINE,
  SHARE_TITLE,
  demoPersonExtras,
  demoReferralLink,
  readPersonExtras,
  readReferralLink,
  referralLinkUrl,
  type MyHome,
  IMPROVEMENTS_HEAD,
  MAX_IMPROVEMENT_PHOTOS,
  improvementLine,
  type PersonExtras,
  type ReferralLink,
} from "@/lib/siteFeeds.ts";

// The person card's "My Home:" line (MY-HOME v0.2) and "Share your link" card (SITE-FEEDS K17), the Brain half of
// vip50-web-crm#312; Classic's person card has both. The link is the VIP's own on the agent's site: the agent copies the
// words or opens their phone's Messages with them filled in. ONE sends nothing. The example agent's link is made up.

/** `can_share_link` and `my_home` for a person: given (Contacts already read them), the example's, or read here. */
export function usePersonExtras(contactId: string, opts: { demo?: boolean; given?: PersonExtras | null } = {}): PersonExtras | null {
  const { demo = false, given } = opts;
  const [x, setX] = useState<PersonExtras | null>(given ?? null);
  useEffect(() => {
    if (given !== undefined) return setX(given);
    if (demo) return setX(demoPersonExtras(contactId));
    let live = true;
    setX(null);
    fetch(personUrl(contactId), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live && j) setX(readPersonExtras(j));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [contactId, demo, given]);
  return x;
}

export function MyHomeLine({ myHome }: { myHome: MyHome | null | undefined }) {
  if (!myHome) return null;
  return (
    <>
      <p className="cc-myhome">
        <b>My Home:</b> {myHome.words}
      </p>
      {myHome.improvements && myHome.improvements.length ? (
        <div className="cc-improvements">
          <p>{IMPROVEMENTS_HEAD}</p>
          <ul>
            {myHome.improvements.map((i) => (
              <li key={i.id}>
                {improvementLine(i)}
                {i.photos && i.photos.length ? (
                  <ul className="imp-photos" aria-label={`Photos of ${i.what}`}>
                    {i.photos.slice(0, MAX_IMPROVEMENT_PHOTOS).map((u, k) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <li key={u}><img className="imp-photo" src={u} alt={`${i.what}, photo ${k + 1}`} width={56} height={56} loading="lazy" referrerPolicy="no-referrer" /></li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

/** Both, for a card that has only the contact's id (Market Reports' person, the example agent's included). */
export function PersonFeeds({ contactId, first, demo = false }: { contactId: string; first: string; demo?: boolean }) {
  const x = usePersonExtras(contactId, { demo });
  if (!x) return null;
  return (
    <>
      <MyHomeLine myHome={x.myHome} />
      {x.canShareLink ? <ShareLinkSection contactId={contactId} first={first} demo={demo} /> : null}
    </>
  );
}

export default function ShareLinkSection({ contactId, first, demo = false }: { contactId: string; first: string; demo?: boolean }) {
  const [a, setA] = useState<ReferralLink | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const name = first.trim();

  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setA(null);
    setErr(null);
    setCopied(false);
  }, [contactId]);

  // As Classic: the link is made only when the agent taps (ONE MOVE makes the code on the first ask, then keeps it).
  const get = async () => {
    setErr(null);
    if (demo) return setA(demoReferralLink(name));
    setBusy(true);
    const r = await fetch(referralLinkUrl(contactId), { credentials: "include", cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    const got = readReferralLink(j);
    if (got) return setA(got);
    setErr((j && typeof j.error === "string" && j.error) || "Could not make the link just now. Try again.");
  };

  const copy = async () => {
    if (!a || !a.ok) return;
    try {
      await navigator.clipboard.writeText(a.text);
      setCopied(true);
    } catch {
      setErr("Could not copy. Select the link and copy it yourself.");
    }
  };

  return (
    <div className="cc-tasks hr-card share-card" aria-label={`${SHARE_TITLE} for ${name || "this VIP"}`}>
      <div className="hr-head">
        <h2>{SHARE_TITLE}</h2>
        {!a ? (
          <button type="button" className="chip-btn primary share-get" disabled={busy} onClick={() => void get()}>
            {busy ? "Getting…" : `Get ${name ? `${name}'s` : "their"} link`}
          </button>
        ) : null}
      </div>
      <p className="hr-sub">
        A link just for {name || "this VIP"} to send friends. Anyone who reaches out through it is credited to {name || "them"} as a referral.
      </p>
      {a && !a.ok ? (
        <p className="hr-line share-words">
          {a.words}
          {a.reason === "no_site" ? (
            <>
              {" "}
              <a className="share-setup" href={NO_SITE_LINK} target="_blank" rel="noopener noreferrer">Set up your site</a>
            </>
          ) : null}
        </p>
      ) : null}
      {a && a.ok ? (
        <>
          <p className="share-url">{a.url}</p>
          <div className="decide-btns share-acts">
            <button type="button" className="chip-btn primary share-copy" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</button>
            <a className="chip-btn share-sms" href={a.sms}>Open Messages</a>
          </div>
          <p className="hr-sub">{SHARE_LINE}</p>
        </>
      ) : null}
      {err ? <p className="cc-err" role="status">{err}</p> : null}
      {demo ? <p className="cc-source">Example agent. Nothing is sent.</p> : null}
    </div>
  );
}
