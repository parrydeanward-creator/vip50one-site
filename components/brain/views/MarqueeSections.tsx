"use client";

import { useState } from "react";
import {
  MQ_DECKS, MQ_EXAMPLE_PUBLISHED, MQ_EXAMPLE_SENT, MQ_LISTINGS, MQ_NOTHING_POSTS, MQ_POSTS, MQ_REPORTS, MQ_ROOMS, MQ_ROOMS_FOR, MQ_STEPS,
  calendarWeek, dayName, money, mqCaption, type MqKey, type MqPost,
} from "@/lib/examples/marquee.ts";
import { MqPhoto } from "./MarqueeParts.tsx";
import { mqDispatch, useMarquee } from "./marqueeStore.ts";

// Marquee's six tools, drawn from the labelled example (lib/examples/marquee.ts). The same sections fill the side
// panel (compact) and the full view (`big`). Approve, Edit, Publish and Send to seller change this page only.

type Props = { tool: MqKey; today: string; big?: boolean; onDeck?: (id: string) => void; onTab?: (k: MqKey) => void };

export default function MarqueeSection({ tool, today, big, onDeck, onTab }: Props) {
  if (tool === "listings") return <Listings big={big} onTab={onTab} />;
  if (tool === "calendar") return <Calendar today={today} big={big} />;
  if (tool === "posts") return <Posts today={today} big={big} />;
  if (tool === "reports") return <Reports big={big} />;
  if (tool === "presentations") return <Decks big={big} onDeck={onDeck} />;
  return <Rooms big={big} />;
}

function Listings({ big, onTab }: { big?: boolean; onTab?: (k: MqKey) => void }) {
  const s = useMarquee();
  return (
    <ul className={`mqv-list${big ? " mqv-grid3" : ""}`} aria-label="Example listings">
      {MQ_LISTINGS.map((l) => (
        <li key={l.id} className="mqv-card mqv-listing">
          <MqPhoto tone={l.tone} size={big ? "lg" : "md"} />
          <div className="mqv-body">
            <p className="mqv-t">{l.street}</p>
            <p className="mqv-s">{l.city} · {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString("en-US")} sq ft</p>
            <p className="mqv-price">{money(l.price)}</p>
            <p className="mqv-s">
              <span className={`mqv-pill mqv-st-${l.status === "Live" ? "live" : l.status === "Under contract" ? "uc" : "soon"}`}>{l.status}</span>{" "}
              {l.daysOnMarket == null ? "Not on the market yet" : `${l.daysOnMarket} days on market`}
            </p>
            <div className="mqv-bar" role="progressbar" aria-valuemin={0} aria-valuemax={MQ_STEPS} aria-valuenow={l.step} aria-label={`Campaign step ${l.step} of ${MQ_STEPS}`}>
              <i style={{ width: `${Math.round((l.step / MQ_STEPS) * 100)}%` }} />
            </div>
            <p className="mqv-s">Campaign step {l.step} of {MQ_STEPS} · {l.next}</p>
            {onTab ? (
              <div className="mqv-btns">
                {MQ_POSTS.some((p) => p.listing === l.street && !s.published.includes(p.id)) ? (
                  <button type="button" className="chip-btn primary" aria-label={`Posts waiting: ${l.street}`} onClick={() => onTab("posts")}>
                    {MQ_POSTS.filter((p) => p.listing === l.street && !s.published.includes(p.id)).length} posts to approve
                  </button>
                ) : null}
                {MQ_REPORTS.some((r) => r.listing === l.street) ? (
                  <button type="button" className="chip-btn" aria-label={`Seller report: ${l.street}`} onClick={() => onTab("reports")}>Seller report</button>
                ) : null}
                {MQ_DECKS.some((d) => d.listing === l.street) ? (
                  <button type="button" className="chip-btn" aria-label={`Presentation: ${l.street}`} onClick={() => onTab("presentations")}>Presentation</button>
                ) : null}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Calendar({ today, big }: { today: string; big?: boolean }) {
  const s = useMarquee();
  const week = calendarWeek(today, s);
  return (
    <div className={big ? "mqv-week" : "mqv-days"} aria-label="This week's posts">
      {week.map((d) => (
        <section key={d.iso} className={`mqv-day${d.name === "Today" ? " is-today" : ""}`} aria-label={`${d.name} ${d.date}`}>
          <h3 className="mqv-day-h">
            {d.name} <small>{d.name === d.short ? d.date : `${d.short} ${d.date}`}</small>
          </h3>
          {d.posts.length ? (
            <ul className="mqv-cal">
              {d.posts.map((p) => (
                <li key={p.id} className={`mqv-cal-i mqv-w-${p.words === "Scheduled" ? "ok" : p.words === "Waiting for you" ? "wait" : "appr"}`}>
                  <span className="mqv-cal-time">{p.time}</span>
                  <span className="mqv-cal-what">
                    <b>{p.what}</b> {p.listing}
                    <small>{p.channel} · {p.words}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mqv-s mqv-none">Nothing posting</p>
          )}
        </section>
      ))}
    </div>
  );
}

function Posts({ today, big }: { today: string; big?: boolean }) {
  const s = useMarquee();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const ready = s.approved.filter((id) => !s.published.includes(id)).length;
  const left = MQ_POSTS.filter((p) => !s.published.includes(p.id)).length;
  const save = (p: MqPost) => {
    mqDispatch({ t: "caption", id: p.id, text: draft });
    setEditing(null);
  };
  return (
    <div className="mqv-posts">
      <p className="mqv-rule">{MQ_NOTHING_POSTS}</p>
      <div className="mqv-pub" role="group" aria-label="Publish">
        <span className="mqv-s">{left} waiting · {ready} approved</span>
        <button
          type="button"
          className="chip-btn primary"
          disabled={!ready}
          onClick={() => {
            mqDispatch({ t: "publish" });
            setNote(`${ready} ${ready === 1 ? "post" : "posts"} set to post on ${ready === 1 ? "its day" : "their days"}. ${MQ_EXAMPLE_PUBLISHED}`);
          }}
        >
          {ready ? `Publish ${ready} approved` : "Publish approved"}
        </button>
      </div>
      {note ? <p className="mqv-done" role="status">{note}</p> : null}
      <ul className={`mqv-list${big ? " mqv-grid3" : ""}`} aria-label="Example posts waiting for approval">
        {MQ_POSTS.map((p) => {
          const pub = s.published.includes(p.id);
          const ok = s.approved.includes(p.id);
          return (
            <li key={p.id} className={`mqv-card mqv-post${ok ? " is-ok" : ""}${pub ? " is-pub" : ""}`}>
              <MqPhoto tone={p.tone} label={p.kind} size={big ? "lg" : "md"} />
              <div className="mqv-body">
                <p className="mqv-s"><b className="mqv-chan">{p.channel}</b> · {dayName(today, p.day)} {p.time} · {p.listing}</p>
                {editing === p.id ? (
                  <>
                    <label className="mqv-s" htmlFor={`mqv-cap-${p.id}`}>Caption</label>
                    <textarea id={`mqv-cap-${p.id}`} className="mqv-edit" value={draft} rows={4} onChange={(e) => setDraft(e.target.value)} />
                    <div className="mqv-btns">
                      <button type="button" className="chip-btn primary" onClick={() => save(p)}>Save</button>
                      <button type="button" className="chip-btn" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <p className="mqv-cap">{mqCaption(s, p)}</p>
                )}
                {pub ? (
                  <p className="mqv-done" role="status">Published. {MQ_EXAMPLE_PUBLISHED}</p>
                ) : editing === p.id ? null : (
                  <div className="mqv-btns">
                    <button
                      type="button"
                      className={`chip-btn${ok ? "" : " primary"}`}
                      aria-pressed={ok}
                      aria-label={ok ? `Approved: ${p.kind}, ${p.listing}. Tap to undo.` : `Approve: ${p.kind}, ${p.listing}`}
                      onClick={() => mqDispatch({ t: ok ? "unapprove" : "approve", id: p.id })}
                    >
                      {ok ? "Approved" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="chip-btn"
                      aria-label={`Edit: ${p.kind}, ${p.listing}`}
                      onClick={() => {
                        setDraft(mqCaption(s, p));
                        setEditing(p.id);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Reports({ big }: { big?: boolean }) {
  const s = useMarquee();
  return (
    <ul className={`mqv-list${big ? " mqv-grid2" : ""}`} aria-label="Example seller reports">
      {MQ_REPORTS.map((r) => {
        const sent = s.sent.includes(r.id);
        return (
          <li key={r.id} className="mqv-card mqv-report">
            <MqPhoto tone={r.tone} label={`Week ${r.week}`} size={big ? "lg" : "md"} />
            <div className="mqv-body">
              <p className="mqv-t">{r.listing}</p>
              <p className="mqv-s">Week {r.week} report for {r.seller}, the seller</p>
              <dl className="mqv-stats">
                <div><dt>Views</dt><dd>{r.views.toLocaleString("en-US")}</dd></div>
                <div><dt>Saves</dt><dd>{r.saves}</dd></div>
                <div><dt>Showings</dt><dd>{r.showings}</dd></div>
              </dl>
              {r.viewsChange ? <p className="mqv-s">Views up {r.viewsChange}% on last week</p> : null}
              <p className="mqv-cap"><b>Feedback:</b> {r.feedback}</p>
              {sent ? (
                <p className="mqv-done" role="status">Marked sent to {r.seller}. {MQ_EXAMPLE_SENT}</p>
              ) : (
                <div className="mqv-btns">
                  <button type="button" className="chip-btn primary" aria-label={`Send to seller: ${r.listing}, week ${r.week}`} onClick={() => mqDispatch({ t: "send", id: r.id })}>
                    Send to seller
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Decks({ big, onDeck }: { big?: boolean; onDeck?: (id: string) => void }) {
  return (
    <ul className={`mqv-list${big ? " mqv-grid2" : ""}`} aria-label="Example presentations">
      {MQ_DECKS.map((d) => (
        <li key={d.id} className="mqv-card mqv-deck">
          <div className="mqv-cover">
            <MqPhoto tone={d.tone} size={big ? "lg" : "md"} />
            <div className="mqv-cover-t">
              <small>{d.kind}</small>
              <b>{d.listing}</b>
            </div>
          </div>
          <div className="mqv-body">
            <p className="mqv-s">{d.pages} pages · {d.state}</p>
            <ol className="mqv-secs">
              {(big ? d.sections : d.sections.slice(0, 4)).map((x) => <li key={x}>{x}</li>)}
            </ol>
            {!big && d.sections.length > 4 ? <p className="mqv-s">and {d.sections.length - 4} more</p> : null}
            {onDeck ? (
              <div className="mqv-btns">
                <button type="button" className="chip-btn primary" aria-label={`Open: ${d.kind}, ${d.listing}`} onClick={() => onDeck(d.id)}>Open</button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Rooms({ big }: { big?: boolean }) {
  return (
    <>
      <p className="mqv-s">Room cards for {MQ_ROOMS_FOR}: 6 of 7 rooms written, {MQ_ROOMS.length} shown here</p>
      <ul className={`mqv-rooms${big ? " mqv-rooms-big" : ""}`} aria-label="Example room cards">
        {MQ_ROOMS.map((r) => (
          <li key={r.id} className="mqv-card mqv-room">
            <MqPhoto tone={r.tone} label={r.room} size={big ? "lg" : "sm"} />
            <div className="mqv-body">
              <p className="mqv-t">{r.room}</p>
              <p className="mqv-cap">{r.caption}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
