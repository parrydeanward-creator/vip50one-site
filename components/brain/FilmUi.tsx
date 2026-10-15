"use client";

import PulseMark from "./PulseMark.tsx";
import { SignalDemoSvg } from "./SignalDemo.tsx";

// What everything means v2 (Parry, 15 Oct: "the pill and ask pulse bar do not show when the video is talking about them
// ... make sure that what it is talking about actually is on the screen"). The Brain's own pieces, drawn large on the
// film's stage with the Brain's own classes, at the moment the voice names them. Example agent; nothing is live.

const DAY = [
  { t: "8:00", w: "Call Tom Miller", k: "Follow-up, 3 days late", done: true },
  { t: "8:20", w: "Call Sarah Mitchell", k: "Call due today", done: true },
  { t: "8:40", w: "Handwritten note to Jen Alvarez", k: "Birthday today", done: false },
  { t: "10:00", w: "Showing, 1482 Maple Ridge Dr", k: "Fixed: never moves", fixed: true },
  { t: "11:00", w: "Video text to Amy Chen", k: "VIP touch", done: false },
];
const MENU = [
  ["My Profile", "Your photo and details, used by every product."],
  ["My website", "Edit your site and see who visited."],
  ["Growth results", "Leads, appointments and closings from your ads."],
  ["My plan and billing", "Your plan, card and invoices."],
  ["Help: what everything means", "The orbs, the colours and the pulses."],
];

export default function FilmUi({ kind }: { kind: string }) {
  switch (kind) {
    case "now":
      return (
        <div className="film-ui film-ui-top-right">
          <button className="next-pill film-hl" tabIndex={-1}>Now: call Tom Miller · 10 min</button>
          <span className="film-note">Tap it to open your day</span>
        </div>
      );
    case "day":
      return (
        <div className="film-ui film-ui-panel">
          <p className="film-kick">Your day</p>
          <p className="film-h">Planned round your calendar</p>
          <ul className="film-day">
            {DAY.map((d, i) => (
              <li key={d.t} className={d.fixed ? "fixed" : ""}>
                <span className={`film-tick${d.done ? " will-tick" : ""}`} style={{ animationDelay: `${3.2 + i * 1.4}s` }}>{d.fixed ? "🔒" : "✓"}</span>
                <b>{d.t}</b>
                <span>
                  {d.w}
                  <small>{d.k}</small>
                </span>
              </li>
            ))}
          </ul>
          <button className="pi-btn film-hl film-looks" tabIndex={-1}>Looks good</button>
        </div>
      );
    case "ask":
      return (
        <div className="film-ui film-ui-top">
          <div className="ask-field film-hl">
            <PulseMark />
            <span className="film-typed">Who haven&apos;t I called in 60 days?</span>
            <span className="ask-go">Ask</span>
          </div>
        </div>
      );
    case "back":
    case "help":
      return (
        <>
        {kind === "back" && (
          <div className="film-ui film-ui-panel film-ui-left">
            <p className="film-kick">ONE MOVE · Follow-ups</p>
            <p className="film-h">Tom Miller</p>
            <p className="film-line">Follow-up 3 days late. Last talked 18 days ago about selling in the spring.</p>
            <span className="pi-btn film-looks">Call Tom</span>
          </div>
        )}
        <div className="film-ui film-ui-controls">
          <div className="controls map-ctrls film-ctrls">
            <button tabIndex={-1} className={kind === "back" ? "film-hl" : ""} data-film-tip={kind === "back" ? "Back" : undefined}>←</button>
            <button tabIndex={-1}>−</button>
            <button tabIndex={-1}>+</button>
            <button tabIndex={-1}>◎</button>
            <button tabIndex={-1} className={`help-btn${kind === "help" ? " film-hl" : ""}`} data-film-tip={kind === "help" ? "What everything means" : undefined}>?</button>
          </div>
        </div>
        </>
      );
    case "timeline":
      return (
        <div className="film-ui film-ui-bottom">
          <div className="film-chips">
            <span className="film-chip past">Touches logged</span>
            <span className="film-chip past">Closings</span>
            <span className="film-chip next">Birthdays</span>
            <span className="film-chip next">Open houses</span>
            <span className="film-chip next">Posts</span>
          </div>
          <div className="timeline on film-timeline">
            <span className="tl-end">Past</span>
            <div className="tl-track film-track">
              <span className="film-knob" />
            </div>
            <span className="tl-end">Future</span>
            <span className="tl-now film-today">Today</span>
          </div>
        </div>
      );
    case "menu":
      return (
        <div className="film-ui film-ui-top-right film-menu-wrap">
          <span className="me-menu film-hl">
            <span className="me-ini">SB</span>
            <span className="me-burger" aria-hidden="true">☰</span>
          </span>
          <div className="pmenu film-menu">
            <div className="pmenu-head">
              <b>Sarah Bennett</b>
              <small className="pmenu-plan">ONE Complete + ONE Growth</small>
            </div>
            <ul>
              {MENU.map(([l, w]) => (
                <li key={l}>
                  <span className="pmenu-row">
                    <b>{l}</b>
                    <small>{w}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    case "hwc":
    case "vip":
      return (
        <div className="film-ui film-ui-panel film-ui-big">
          <p className="film-kick">{kind === "hwc" ? "Hot, Warm and Cold" : "VIP-50 and VIP-100"}</p>
          <SignalDemoSvg kind={kind} label={kind === "hwc" ? "Hot, Warm and Cold" : "VIP rings"} />
        </div>
      );
    default:
      return null;
  }
}
