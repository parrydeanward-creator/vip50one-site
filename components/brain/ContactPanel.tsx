"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LOG_QUESTION,
  MONTH_BOXES,
  QUARTER_BOXES,
  TIER_LABEL,
  contactUrl,
  homesMailto,
  readOffers,
  dialable,
  mailable,
  touchUrl,
  type ContactCard,
  type TouchKind,
} from "@/lib/contact.ts";
import { LOGGABLE } from "@/lib/audit.ts";
import { productLink } from "@/lib/productSignIn.ts";
import CallPrepCard from "./CallPrepCard.tsx";
import PanelBoundary from "./PanelBoundary.tsx";
import SendsSection from "./SendsSection.tsx";
import DraftsSection, { type DraftPreset } from "./DraftsSection.tsx";
import LifeEventsSection from "./LifeEventsSection.tsx";
import PermissionsSection from "./PermissionsSection.tsx";
import HomeReportSection from "./HomeReportSection.tsx";
import CmaSection from "./CmaSection.tsx";
import ShareLinkSection, { MyHomeLine, usePersonExtras } from "./SiteFeedsSection.tsx";
import TalkSection from "./TalkSection.tsx";
import LeadCard from "./LeadCard.tsx";
import { leadCardMode, type LeadOutcome, type NewLead, type RetryWhen } from "@/lib/newLeads.ts";

/** A new lead on this card (ecosystem 17 Oct): the lead card replaces the VIP boxes until they are reached and sorted. */
export interface LeadProps {
  lead?: NewLead | null;
  agentFirst?: string | null;
  onLeadOutcome?: (contactId: string, outcome: LeadOutcome, when: RetryWhen | null) => void;
}

// A box the agent ticks by hand asks first, like Call and Text (Parry, 5 Oct:
// "the checkbox is not checking when clicked"). Newsletter and mixer invite
// tick themselves when one is actually sent; a ticked box is not unticked here.
type Ask = { kind: string; question: string; label: string; box?: boolean };
const askFor = (kind: TouchKind): Ask => ({ kind, question: LOG_QUESTION[kind], label: kind });

// VIP-SUMMARY §3c: the person in the right panel, with Call / Text / Email.
// Tapping one opens the phone, messages or mail; the panel then asks once
// whether to log it (as ONE MOVE's action bar does, so a misdial never
// counts). Logging runs ONE MOVE's own logTouchEverywhere.
// The contact card, inside a boundary: if one value is ever wrong, this card says so and the page stays up.
/** A touch the agent came to do (Weekly Review): the card opens with that touch's action ready. */
export interface TouchGoal {
  key: string;
  label: string;
  onPage?: (path: string) => void; // newsletter and mixer invite go out from their own ONE MOVE screens
}

export default function ContactPanel(props: { contactId: string; taskId?: string; onLogged: () => void; touch?: TouchGoal } & LeadProps) {
  return (
    <PanelBoundary key={props.contactId} label="This contact">
      <ContactCard {...props} />
    </PanelBoundary>
  );
}

function ContactCard({ contactId, taskId, onLogged, lead, agentFirst, onLeadOutcome, touch }: { contactId: string; taskId?: string; onLogged: () => void; touch?: TouchGoal } & LeadProps) {
  const [card, setCard] = useState<ContactCard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [prep, setPrep] = useState(false); // Call Prep before the call (PULSE-ROADMAP #1)
  const [preset, setPreset] = useState<DraftPreset | null>(null); // a life event's touch, for Pulse Drafts (§3y)
  const [tried, setTried] = useState(false); // a lead: Call / Text / Email tapped, so "Did you reach them?" asks
  const [leadSorted, setLeadSorted] = useState(false);
  const leadMode = leadCardMode(lead, leadSorted);
  const extras = usePersonExtras(contactId); // My Home and Share your link (vip50-web-crm#312)
  // a lead not reached yet answers "Did you reach them?" instead of "Log this call?" (Reached logs the call)
  const tap = (kind: TouchKind) => (leadMode === "reach" ? setTried(true) : setAsk(askFor(kind)));

  const load = useCallback(async () => {
    try {
      const r = await fetch(contactUrl(contactId), { credentials: "include", cache: "no-store" });
      if (!r.ok) throw new Error(r.status === 401 ? "Sign in again to see this contact." : "ONE couldn't load this contact just now.");
      setCard((await r.json()) as ContactCard);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ONE couldn't load this contact just now.");
    }
  }, [contactId]);

  useEffect(() => {
    setCard(null);
    setAsk(null);
    setDone(null);
    load();
  }, [load]);

  const log = async ({ kind, label }: Ask) => {
    setBusy(true);
    try {
      const r = await fetch(touchUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          kind,
          detail: kind === "call" ? "Called from ONE Brain" : kind === "text" ? "Texted from ONE Brain" : kind === "email" ? "Emailed from ONE Brain" : `${label} logged from ONE Brain`,
          // §3c.3 (v1.5): close the follow-up this came from (vip50-web-crm#40, live).
          ...(taskId ? { task_id: taskId } : {}),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error ?? "ONE MOVE didn't take that. Try again.");
      setDone(kind === "email" ? "Email logged." : kind === "call" || kind === "text" ? `${kind === "call" ? "Call" : "Text"} logged${j.completed_task ? ", task done" : ""}. Boxes ticked.` : `${label} logged. Box ticked.`);
      setAsk(null);
      await load();
      // Let "logged" show for a moment; then the Brain reloads and a closed
      // follow-up leaves the list.
      setTimeout(onLogged, 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ONE MOVE didn't take that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (err && !card) return <p className="cc-err">{err}</p>;
  if (!card) return <p className="cc-loading">Loading contact…</p>;

  const tel = dialable(card.phone);
  const mail = mailable(card.email);
  const first = card.first_name || (card.name ?? "").split(" ")[0] || "them";

  return (
    <div className="cc">
      <div className="cc-meta">
        {card.tier && TIER_LABEL[card.tier] && <span className="cc-tier">{TIER_LABEL[card.tier]}</span>}
        {card.last_touch ? (
          <span>
            Last touch: {(card.last_touch.kind ?? "touch").replace(/_/g, " ")}, {new Date(card.last_touch.on + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        ) : (
          <span>No touches yet</span>
        )}
      </div>
      <MyHomeLine myHome={extras?.myHome} />
      {(() => {
        // CONNECTIONS §5.2: a next step for an open house buyer. Each opens where the agent acts; nothing is sent from ONE.
        const offers = readOffers(card.offers);
        if (!offers.length || leadMode !== "none") return null; // a lead's offers sit under Sort them
        const suggested = offers.some((o) => o.suggested);
        return (
          <div className={`cc-offers${suggested ? " is-suggested" : ""}`}>
            {suggested && <p className="cc-offers-h">Pulse suggests a next step</p>}
            {offers.map((o) =>
              o.kind === "showly_tour" ? (
                <a key={o.kind} className="btn ghost-btn" href={productLink(o.url)} target="_blank" rel="noopener noreferrer">{o.label}</a>
              ) : (
                <a key={o.kind} className="btn ghost-btn" href={homesMailto(card.email ?? null, first, o.url)}>{o.label}</a>
              ),
            )}
          </div>
        );
      })()}
      {(card.phone || card.email) && (
        <p className="cc-lines">
          {card.phone && <span>{card.phone}</span>}
          {card.email && <span>{card.email}</span>}
        </p>
      )}

      <div className="cc-actions">
        {tel ? (
          <button type="button" className="cc-btn" onClick={() => setPrep(true)}>Call</button>
        ) : (
          <span className="cc-btn off" aria-disabled="true">Call</span>
        )}
        {tel ? (
          <a className="cc-btn" href={`sms:${tel}`} onClick={() => tap("text")}>Text</a>
        ) : (
          <span className="cc-btn off" aria-disabled="true">Text</span>
        )}
        {mail ? (
          <a className="cc-btn" href={`mailto:${mail}`} onClick={() => tap("email")}>Email</a>
        ) : (
          <span className="cc-btn off" aria-disabled="true">Email</span>
        )}
      </div>

      {touch && leadMode === "none" && !card.month?.[touch.key] ? (
        <div className="cc-touch" role="group" aria-label={`${touch.label} for ${first}`}>
          <p>{first} needs a {touch.label.toLowerCase()} this month.</p>
          {touch.key === "call" ? (
            tel ? <button type="button" className="cc-btn" onClick={() => setPrep(true)}>Call {first} now</button> : <span className="cc-btn off" aria-disabled="true">No phone number</span>
          ) : touch.key === "video_text" ? (
            tel ? <a className="cc-btn" href={`sms:${tel}`} onClick={() => setAsk({ kind: "video_text", question: LOG_QUESTION.text.replace("text", "video text"), label: "Video text" })}>Open Messages</a> : <span className="cc-btn off" aria-disabled="true">No phone number</span>
          ) : touch.key === "social" ? (
            <button type="button" className="cc-btn" onClick={() => setAsk({ kind: "social", question: "Log a social touch", label: "Social" })}>Log a social touch</button>
          ) : touch.key === "newsletter" || touch.key === "mixer" ? (
            <button type="button" className="cc-btn" disabled={!touch.onPage} onClick={() => touch.onPage?.(touch.key === "newsletter" ? "/newsletter" : "/mixer")}>
              {touch.key === "newsletter" ? "Open the newsletter" : "Open mixer invites"}
            </button>
          ) : null}
        </div>
      ) : null}

      {prep && (
        <CallPrepCard
          contactId={contactId}
          phone={card.phone}
          onClose={() => setPrep(false)}
          onDial={() => {
            setPrep(false);
            tap("call");
          }}
        />
      )}
      {ask && !ask.box && (
        <div className="cc-ask pop" role="status">
          <p>
            {ask.question} with {first}?
          </p>
          <div>
            <button className="btn" disabled={busy} onClick={() => log(ask)}>Yes, log it</button>
            <button className="btn ghost-btn" disabled={busy} onClick={() => setAsk(null)}>Not now</button>
          </div>
        </div>
      )}
      {done && <p className="cc-done" role="status">{done}</p>}
      {err && card && <p className="cc-err">{err}</p>}

      {lead && leadMode !== "none" ? (
        <LeadCard
          lead={lead}
          phone={card.phone ?? null}
          email={card.email ?? null}
          tel={tel}
          sourceLabel={card.source_label}
          agentFirst={agentFirst}
          live
          tried={tried}
          onOutcome={(o, when) => {
            setTried(false);
            onLeadOutcome?.(contactId, o, when);
            if (o === "reached") void load();
          }}
          onSorted={() => {
            setLeadSorted(true);
            setTimeout(onLogged, 1500);
          }}
          after={(() => {
            const offers = readOffers(card.offers);
            return offers.length ? (
              <div className="cc-offers">
                {offers.map((o) =>
                  o.kind === "showly_tour" ? (
                    <a key={o.kind} className="btn ghost-btn" href={productLink(o.url)} target="_blank" rel="noopener noreferrer">{o.label}</a>
                  ) : (
                    <a key={o.kind} className="btn ghost-btn" href={homesMailto(card.email ?? null, first, o.url)}>{o.label}</a>
                  ),
                )}
              </div>
            ) : null;
          })()}
        />
      ) : (
      <div className="cc-boxes">
        <h2>This month</h2>
        <ul>
          {MONTH_BOXES.map(([k, label]) => (
            <Box key={k} on={!!card.month?.[k]} label={label} kind={LOGGABLE[k]} busy={busy} ask={ask} first={first} onAsk={setAsk} onYes={log} />
          ))}
        </ul>
        <h2>This quarter</h2>
        <ul>
          {QUARTER_BOXES.map(([k, label]) => (
            <Box key={k} on={!!card.quarter?.[k]} label={label} kind={LOGGABLE[k]} busy={busy} ask={ask} first={first} onAsk={setAsk} onYes={log} />
          ))}
        </ul>
      </div>
      )}

      {card.open_tasks && card.open_tasks.length > 0 && (
        <div className="cc-tasks">
          <h2>Open tasks</h2>
          <ul>
            {card.open_tasks.map((t) => (
              <li key={t.id}>
                {t.title}
                {t.due && <small> · due {new Date(t.due + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <LifeEventsSection contactId={contactId} name={card.name} onDraft={setPreset} />
      <TalkSection contactId={contactId} first={first} onSaved={onLogged} />
      <DraftsSection contactId={contactId} phone={tel} email={mail} onSent={(k) => tap(k)} preset={preset} />
      <PermissionsSection contactId={contactId} />
      <HomeReportSection contactId={contactId} first={first} />
      <CmaSection contactId={contactId} first={first} />
      {extras?.canShareLink ? <ShareLinkSection contactId={contactId} first={first} /> : null}
      <SendsSection contactId={contactId} />
      {card.source_label && <p className="cc-source">{card.source_label}</p>}
    </div>
  );
}

// A box asks right where it was clicked (Parry, 8 Oct: on Jen Wright the question showed at the top of the panel,
// far from the box, so the box seemed not to tick). The box shows ticked while it asks; Yes logs it, Not now clears.
function Box({ on, label, kind, busy, ask, first, onAsk, onYes }: { on: boolean; label: string; kind?: string; busy: boolean; ask: Ask | null; first: string; onAsk: (a: Ask | null) => void; onYes: (a: Ask) => void }) {
  if (on || !kind) {
    return (
      <li className={on ? "on" : "auto"}>
        <i aria-hidden="true">{on ? "✓" : ""}</i>
        {label}
        {!on && <small> · ticks when sent</small>}
      </li>
    );
  }
  const asking = !!ask?.box && ask.label === label;
  return (
    <li className={asking ? "on asking" : undefined}>
      <button type="button" className="cc-box" disabled={busy} aria-pressed={asking} onClick={() => onAsk(asking ? null : { kind, label, box: true, question: `Log a ${label.toLowerCase()}` })} aria-label={`Log a ${label.toLowerCase()}`}>
        <i aria-hidden="true">{asking ? "✓" : ""}</i>
        {label}
      </button>
      {asking && (
        <div className="cc-ask cc-ask-here pop" role="status">
          <p>
            {ask!.question} with {first}?
          </p>
          <div>
            <button className="btn" disabled={busy} onClick={() => onYes(ask!)}>Yes, log it</button>
            <button className="btn ghost-btn" disabled={busy} onClick={() => onAsk(null)}>Not now</button>
          </div>
        </div>
      )}
    </li>
  );
}
