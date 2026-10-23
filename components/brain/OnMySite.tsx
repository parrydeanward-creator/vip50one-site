"use client";

import { useCallback, useEffect, useState } from "react";
import { personUrl, readPerson } from "@/lib/people.ts";
import { HEAT_COLOR, RANGES, heatWords, streetName, phoneWords, readSiteActivity, siteActivityUrl, siteText, smsLink, type Range, type SiteActivity, type SitePerson } from "@/lib/siteActivity.ts";
import { initialsOf } from "@/lib/vips.ts";
import CallPrepCard from "./CallPrepCard.tsx";
import { exampleActivityBody } from "@/lib/examples/siteActivity.ts";
import { makeExampleStore } from "@/lib/examples/move2.ts";
import { todayIn } from "@/lib/hwc.ts";
import "@/app/contacts-board.css";
import "@/app/site-activity.css";

// "Who is on my site" (VIP-SUMMARY §3ar; Parry, 23 Oct: "yes build it. looks great"; research/mockups/client-portal
// #onsite). People who signed in on the agent's site or app, most active first, each a tap from a call or a text, and
// Open lands on them in My Contacts. Anonymous visitors are counted, never named. Today / 7 days / 30 days. Nothing is
// sent from here: Text opens a draft on the agent's own phone.

const exampleStorePeople = () => makeExampleStore(todayIn()).people.filter((p) => !p.deleted).map((p) => ({ id: p.id, name: `${p.first} ${p.last}` }));
const rangeWord = (r: Range) => (r === "today" ? "today" : r === "7d" ? "this week" : "this month");

export default function OnMySite({ live, onBack, onOpenPerson }: { live: boolean; onBack: () => void; onOpenPerson: (id: string) => void }) {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<SiteActivity | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");
  const [callFor, setCallFor] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async (r: Range) => {
    setState("loading");
    // the example agent: the example store's people (the same ids My Contacts' example opens), no network
    if (!live) {
      const a = readSiteActivity(exampleActivityBody(r, exampleStorePeople()));
      setData(a);
      setState(a ? "ok" : "none");
      return;
    }
    try {
      const res = await fetch(siteActivityUrl(r), { credentials: "include", cache: "no-store" });
      const a = res.status === 200 ? readSiteActivity(await res.json().catch(() => null)) : null;
      setData(a);
      setState(a ? "ok" : "none");
    } catch {
      setData(null);
      setState("none");
    }
  }, [live]);
  useEffect(() => {
    void load(range);
  }, [range, load]);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 6000);
    return () => clearTimeout(t);
  }, [note]);

  // Text: their number from ONE MOVE, then a draft in the agent's own messages app. No number: open them to add one.
  const textThem = async (p: SitePerson) => {
    try {
      const r = await fetch(personUrl(p.contactId), { credentials: "include", cache: "no-store" });
      const person = r.status === 200 ? readPerson(await r.json().catch(() => null)) : null;
      const href = person ? smsLink(person.phone, siteText(person.firstName ?? p.name.split(" ")[0])) : null;
      if (href) return void (window.location.href = href);
    } catch {}
    setNote(`No mobile number for ${p.name} yet. Opening their contact to add one.`);
    onOpenPerson(p.contactId);
  };

  const head = (
    <header className="ct-head">
      <div>
        <button type="button" className="page-back" data-act="page-back" onClick={onBack} aria-label="Back">← Back</button>
        <span className="ct-tag">ONE MOVE · PEOPLE</span>
        <h1 className="ct-h1">WHO IS ON MY SITE</h1>
        <p className="sa-lede">People who signed in on your site or app, most active first. Anonymous visitors are counted, never named.</p>
      </div>
    </header>
  );

  if (state === "none" && !data) {
    return (
      <div className="ct sa-page" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        {head}
        <div className="ct-card sa-empty">
          <p>{live ? "Your site's visitors show here once ONE MOVE starts reading your site's activity. Nothing to show yet." : "The example could not load. Try again."}</p>
          <div className="sa-acts">
            <button type="button" className="ct-btn" onClick={() => void load(range)}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const a = data;
  const firstNew = a?.people.find((p) => p.heat === "new") ?? null;
  const toList = () => document.getElementById("sa-people")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="ct sa-page" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      {callFor ? <CallPrepCard contactId={callFor} onClose={() => setCallFor(null)} onDial={() => setCallFor(null)} demo={!live} /> : null}
      {head}
      <div className="sa-filt" role="group" aria-label="How far back">
        {RANGES.map((r) => (
          <button key={r.key} type="button" className={range === r.key ? "on" : undefined} aria-pressed={range === r.key} onClick={() => setRange(r.key)}>{r.label}</button>
        ))}
      </div>
      {!a ? (
        <div className="page-panel-veil" role="status"><span className="page-panel-spin" aria-hidden="true" />Opening who is on your site…</div>
      ) : (
        <>
          <div className="sa-stats sa-stats-page" aria-busy={state === "loading"}>
            <button type="button" className="sa-st" onClick={toList}><span>Signed-in visitors</span><b>{a.signedIn.toLocaleString("en-US")}</b><em>see who →</em></button>
            <button type="button" className="sa-st" onClick={toList}><span>Site visits</span><b>{a.visits.toLocaleString("en-US")}</b><em>all visitors · who signed in →</em></button>
            <button type="button" className="sa-st" onClick={() => (firstNew ? onOpenPerson(firstNew.contactId) : toList())}>
              <span>New leads</span><b>{a.newLeads.toLocaleString("en-US")}</b><em>{firstNew ? `open ${firstNew.name.split(" ")[0]} →` : "from forms and sign-ups"}</em>
            </button>
            <button type="button" className="sa-st" onClick={toList}><span>Top home</span><b className="sa-top">{a.topHome ? streetName(a.topHome.address) : "None yet"}</b><em>{a.topHome ? `${a.topHome.views} views · ${a.topHome.saves} saves` : "\u00a0"}</em></button>
          </div>
          <div className="sa-two">
            <div className="ct-card">
              <h3 className="sa-h3">Your site</h3>
              <dl className="sa-kv">
                <div><dt>Top pages</dt><dd>{a.topPages.length ? a.topPages.join(" · ") : "Not enough yet"}</dd></div>
                <div><dt>Top area</dt><dd>{a.topArea ?? "Not enough yet"}</dd></div>
                <div><dt>Phones vs computers</dt><dd>{phoneWords(a.phoneShare) ?? "Not enough yet"}</dd></div>
                <div><dt>Busiest time</dt><dd>{a.busiest ?? "Not enough yet"}</dd></div>
              </dl>
              {a.topHome ? <p className="sa-cap">Most viewed home {rangeWord(range)}: {a.topHome.address}.</p> : null}
            </div>
            <div className="ct-card" id="sa-people">
              <h3 className="sa-h3">Most active {rangeWord(range)}</h3>
              {a.people.length ? (
                <ul className="sa-wl">
                  {a.people.map((p) => {
                    const c = p.heat ? HEAT_COLOR[p.heat] : "#8089a2";
                    return (
                      <li key={p.contactId} className="sa-wr">
                        <button type="button" className="sa-av" style={{ borderColor: c }} onClick={() => onOpenPerson(p.contactId)} aria-label={`Open ${p.name}`}>{initialsOf(p.name)}</button>
                        <div className="sa-wr-b">
                          <button type="button" className="sa-wr-t" onClick={() => onOpenPerson(p.contactId)}>
                            <i style={{ background: c }} aria-hidden="true" />
                            {p.name}
                            {p.kind || heatWords(p.heat) ? <small> · {[p.kind, heatWords(p.heat)].filter(Boolean).join(" · ")}</small> : null}
                          </button>
                          <div className="sa-wr-s">{p.line}</div>
                        </div>
                        <div className="sa-wr-a">
                          {p.action === "call" ? (
                            <button type="button" className="ct-btn solid" onClick={() => setCallFor(p.contactId)}>Call</button>
                          ) : (
                            <button type="button" className="ct-btn solid" onClick={() => void textThem(p)}>Text</button>
                          )}
                          {p.action === "call" ? <button type="button" className="ct-btn" onClick={() => void textThem(p)}>Text</button> : <button type="button" className="ct-btn" onClick={() => setCallFor(p.contactId)}>Call</button>}
                          <button type="button" className="ct-btn" onClick={() => onOpenPerson(p.contactId)}>Open</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="sa-cap">Nobody signed in {rangeWord(range)}. Sharing your site link on a VIP's contact brings people back.</p>
              )}
            </div>
          </div>
          {!live ? <p className="sa-cap">Example: invented people. Nothing is saved or sent.</p> : null}
        </>
      )}
      {note ? (
        <div className="ct-toast pop" role="status">
          <span>{note}</span>
          <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
        </div>
      ) : null}
    </div>
  );
}
