"use client";

import { useEffect, useState } from "react";
import { monthWords } from "@/lib/marketPulse.ts";
import { CREDIT_LINE, FEED_LINE, FEED_LIVE, VIPS_BULK, demoMonthCard, monthGroups, monthUrl, ordinal, readMonthCard, type MonthCard } from "@/lib/homeReport.ts";
import {
  byDay,
  calendarLine,
  dayWords,
  leadsLine,
  marketLine,
  mixerLine,
  newsletterLine,
  plansLine,
  rsvpLine,
  timeWords,
  visitsLine,
  type Attraction,
  type EventsNow,
  type Outreach,
  type Part,
} from "@/lib/outreach.ts";

// The side panel of each Outreach and Events orb (lib/outreach.ts; Parry 16 Oct: "2 yes", "3 yes"): what the tool is
// doing now, what lands here, and the button into the ONE MOVE page inside the Brain. Never a bare link. The example
// agent's numbers are invented and say so.

const mtnToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());

export default function OutreachPanel({
  part,
  outreach,
  events,
  live,
  onOpenPage,
  onBulk,
  onOpenPerson,
}: {
  part: Part;
  outreach: Outreach | null;
  events: EventsNow | null;
  live: boolean;
  /** The ONE MOVE page inside the Brain (the open helper); `query` is passed to the page (e.g. "date=2026-10-23"). */
  onOpenPage: (path: string, query?: string) => void;
  /** Market Reports opened on "Set up Market Reports for all your VIPs". */
  onBulk: () => void;
  onOpenPerson?: (contactId: string) => void;
}) {
  const example = !live ? <p className="op-ex">Example numbers: the example agent&apos;s, not real.</p> : null;
  const open = (label = `Open ${part.label}`) => (
    <button type="button" className="chip-btn" onClick={() => onOpenPage(part.path)} aria-label={`${label} in ONE MOVE`}>{label}</button>
  );
  const waiting = <p className="hr-sub">Waiting on ONE MOVE for this month&apos;s numbers.</p>;

  if (part.key === "market_reports") return <MarketReportsPart o={outreach} live={live} example={example} open={open} onBulk={onBulk} onOpenPerson={onOpenPerson} />;

  if (part.key === "newsletter")
    return (
      <section className="d-list" aria-label="Newsletter this month">
        <h2>This month</h2>
        {outreach ? <p className="hr-line">{newsletterLine(outreach.newsletterSent)}</p> : waiting}
        <p className="hr-sub">{outreach && outreach.newsletterSent ? "This month's newsletter touch is done for every VIP it went to." : "It is a monthly VIP touch: this orb pulses until this month's newsletter is sent."}</p>
        {example}
        <div className="op-acts">{open(outreach && !outreach.newsletterSent ? "Write this month's newsletter" : "Open Newsletter")}</div>
      </section>
    );

  if (part.key === "action_plans")
    return (
      <section className="d-list" aria-label="Action Plans now">
        <h2>Right now</h2>
        {outreach ? <p className="hr-line">{plansLine(outreach.plansRunning, outreach.plansWaiting)}</p> : waiting}
        <p className="hr-sub">A plan&apos;s texts always wait as ready-to-send tasks that open on your phone. Its emails wait too, unless you switched that plan&apos;s automatic emails on.</p>
        {example}
        <div className="op-acts">{open("Open Action Plans")}</div>
      </section>
    );

  if (part.key === "landing_pages")
    return (
      <section className="d-list" aria-label="Landing Pages this month">
        <h2>This month</h2>
        {outreach ? (
          <>
            <p className="hr-line">{leadsLine(outreach.landingLeads)}</p>
            <p className="hr-sub">{visitsLine(outreach.landingVisitors)}</p>
          </>
        ) : (
          waiting
        )}
        <p className="hr-sub">Each lead from a page lands in New to Sort and Contacts, tagged with the page it came from.</p>
        {example}
        <div className="op-acts">{open("Open Landing Pages")}</div>
      </section>
    );

  if (part.key === "calendar") {
    const days = events ? byDay(events.calendar) : [];
    return (
      <section className="d-list" aria-label="Calendar, next 7 days">
        {/* The calendar itself first, never only a link at the bottom (Parry, 20 Oct) */}
        <div className="op-acts op-top">
          <button type="button" className="chip-btn primary" onClick={() => onOpenPage(part.path)} aria-label="Open your calendar in ONE MOVE">Open Calendar</button>
        </div>
        <h2>Next 7 days</h2>
        {events ? <p className="hr-line">{calendarLine(events.calendar.length)}</p> : waiting}
        {days.map(([d, items]) => (
          <div key={d}>
            <p className="op-day">{dayWords(d)}</p>
            <ul className="op-list">
              {items.map((it) => (
                <li key={it.id}>
                  {/* Every item does something (PROTOCOL rule 12): it opens the calendar on its day */}
                  <button type="button" className="op-item" onClick={() => onOpenPage(part.path, `date=${it.date}`)} aria-label={`${it.title}: open it in your calendar`}>
                    <span>{it.title}</span>
                    <small>{it.start ? `${timeWords(it.start)}${it.end ? ` to ${timeWords(it.end)}` : ""}` : "All day"}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {events && !events.calendar.length ? <p className="hr-sub">Appointments, open houses and events you add in ONE MOVE or ONE GO land here.</p> : null}
        {example}
      </section>
    );
  }

  if (part.key === "vip_events")
    return (
      <section className="d-list" aria-label="VIP Events, next event">
        <h2>Next event</h2>
        {events ? (
          events.vipNext ? (
            <>
              <p className="hr-line">{events.vipNext.title}</p>
              <p className="hr-sub">{dayWords(events.vipNext.on)}{events.vipNext.location ? ` · ${events.vipNext.location}` : ""}</p>
              <p className="hr-sub">{rsvpLine(events.vipInvited, events.vipYes)}</p>
            </>
          ) : (
            <p className="hr-line">No VIP event coming up. The VIP-50 events every agent is invited to land here.</p>
          )
        ) : (
          waiting
        )}
        {example}
        <div className="op-acts">{open("Open VIP Events")}</div>
      </section>
    );

  // Mixer
  return (
    <section className="d-list" aria-label="Mixer this month">
      <h2>This month</h2>
      {events ? (
        <>
          <p className="hr-line">{events.mixerNext ? `${events.mixerTitle ?? "Your mixer"} · ${dayWords(events.mixerNext)}` : "No mixer planned"}</p>
          <p className="hr-sub">{mixerLine(events)}</p>
          {events.mixerNext ? <p className="hr-sub">{events.mixerYes == null ? "RSVPs not kept yet" : `${events.mixerYes} yes so far`}</p> : null}
        </>
      ) : (
        waiting
      )}
      <p className="hr-sub">{events && events.mixerInvites ? "This month's mixer invite touch is done for everyone you invited." : "Mixer invites are a monthly VIP touch: this orb pulses until this month's are out."}</p>
      {events && !events.mixerNext ? <p className="hr-sub">Your next mixer, its invites and the RSVPs land here.</p> : null}
      {example}
      <div className="op-acts">{events && !events.mixerNext ? open("Plan a mixer") : open(events && !events.mixerInvites ? "Send the invites" : "Open Mixer")}</div>
    </section>
  );
}

function MarketReportsPart({ o, live, example, open, onBulk, onOpenPerson }: {
  o: Outreach | null;
  live: boolean;
  example: React.ReactNode;
  open: (label?: string) => React.ReactNode;
  onBulk: () => void;
  onOpenPerson?: (contactId: string) => void;
}) {
  const [card, setCard] = useState<MonthCard | null>(null);
  useEffect(() => {
    if (!live) return setCard(demoMonthCard(mtnToday()));
    let gone = false;
    fetch(monthUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => !gone && setCard(j ? readMonthCard(j) : null))
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [live]);
  const g = card ? monthGroups(card) : null;
  const rows = card ? [...(g?.due ?? []), ...(g?.coming ?? []), ...(g?.sent ?? [])].slice(0, 12) : [];
  return (
    <section className="d-list" aria-label="Market Reports this month">
      <h2>This month</h2>
      {o ? <p className="hr-line">{marketLine(o.reportsSetUp, o.reportsReady)}</p> : <p className="hr-sub">Waiting on ONE MOVE for this month&apos;s numbers.</p>}
      <p className="hr-sub">{CREDIT_LINE}</p>
      {FEED_LIVE ? null : <p className="hr-sub">{FEED_LINE}</p>}
      {card && rows.length ? (
        <>
          <p className="op-day">{monthWords(card.month)} report</p>
          <ul className="op-list">
            {rows.map((r) => (
              <li key={r.id}>
                {onOpenPerson && live ? (
                  <button className="link" onClick={() => onOpenPerson(r.contactId)}>{r.name}</button>
                ) : (
                  <span>{r.name}</span>
                )}
                <small>{r.sent ? "Sent" : `On the ${ordinal(r.sendDay)}`}</small>
              </li>
            ))}
          </ul>
        </>
      ) : card ? (
        <p className="hr-sub">None set up yet. Switch one on from any contact&apos;s card, or set them up for all your VIPs at once.</p>
      ) : null}
      {example}
      <div className="op-acts">
        <button type="button" className="chip-btn primary" onClick={onBulk}>{VIPS_BULK}</button>
        {open("Open Market Reports")}
      </div>
    </section>
  );
}

/** The Team orb's Agent Attraction, for a team lead (GET /api/brain/team/attraction): this week's tasks. */
export function AttractionSection({ a, live }: { a: Attraction; live: boolean }) {
  if (!a.teamLead) return null;
  const left = a.tasks.filter((t) => !t.completed).length;
  return (
    <section className="d-list" aria-label="Agent Attraction">
      <h2>Agent Attraction</h2>
      <p className="hr-sub">{a.tasks.length ? `${left ? `${left} to do` : "All done"} this week · ${a.tasks.length - left} of ${a.tasks.length} done` : "No Agent Attraction tasks this week."}</p>
      {a.tasks.length ? (
        <ul className="op-list">
          {a.tasks.map((t) => (
            <li key={t.id} className={t.completed ? "done" : undefined}>
              <span>{t.title}</span>
              <small>{t.completed ? "Done" : t.due ? dayWords(t.due) : ""}</small>
            </li>
          ))}
        </ul>
      ) : null}
      {!live ? <p className="op-ex">Example tasks: the example agent&apos;s, not real.</p> : null}
    </section>
  );
}
