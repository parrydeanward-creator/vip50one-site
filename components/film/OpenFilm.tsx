"use client";

import Showcase from "./Showcase.tsx";
import { OPEN_STEPS } from "@/lib/showcase.ts";

// ONE Open showcase (Parry, 30 Sep). Every feature shown is in vip-open main
// (read 30 Sep): Home's Needs you and Next open house card, the Open House
// Protocol's four phases with their clocked tasks, the Exclusive Neighborhood
// Tour and RSVPs, the kiosk sign-in, Host live with the safety check-in,
// Rate & notes (1-5 stars plus a Hot flag), the Follow-Up Attack and automatic
// emails, Reports, and the Scorecard funnel. The hand-off of visitors into ONE
// MOVE waits on the event contract, so it says Coming.


const TABS = ["Home", "Events", "Follow-Up", "Scorecard", "More"];
const tabFor = (s: string) => (["home", "splash"].includes(s) ? 0 : ["prep", "neighbors", "live", "rate", "reports"].includes(s) ? 1 : s === "attack" ? 2 : s === "score" ? 3 : 0);

export default function OpenFilm({ record = false, slow = 1 }: { record?: boolean; slow?: number }) {
  return (
    <Showcase
      name="ONE Open"
      accent="#f06a5a"
      steps={OPEN_STEPS}
      outro={["ONE Open.", "From sign-in to signed.", "Part of ONE."]}
      tabs={TABS}
      tabFor={tabFor}
      record={record}
      slow={slow}
      render={(s) => <OpenScreen id={s.screen} />}
    />
  );
}

function OpenScreen({ id }: { id: string }) {
  switch (id) {
    case "splash":
      return (
        <div className="ga-splash">
          <div className="ga-logo" style={{ fontSize: 80 }}>
            <span>ONE</span>
            <b style={{ color: "#f06a5a" }}>OPEN</b>
          </div>
          <p>From Sign-In to Signed</p>
        </div>
      );
    case "home":
      return (
        <div>
          <p className="ga-sm">6-week streak</p>
          <p className="ga-h1">Good morning, Sarah</p>
          <p className="ga-sec" style={{ color: "#f06a5a" }}>Needs you</p>
          <div className="op-need urgent">A follow-up email to Kim R. did not go out.</div>
          <div className="op-need">2 visitors from 1482 Maple Ridge Dr not rated yet.</div>
          <div className="op-need good">3 new neighbor RSVPs this week, 1 wants a home value.</div>
          <p className="ga-sec" style={{ color: "#f06a5a" }}>Next open house</p>
          <div className="op-next">
            <b>1482 Maple Ridge Dr</b>
            <span>Sunday 1-3pm · 4 days to go</span>
            <div className="op-bar"><i style={{ width: "57%" }} /></div>
            <small>Checklist 4/7 · Photos 24 · Next: Confirm it's live in the MLS</small>
            <em>Continue prep</em>
          </div>
        </div>
      );
    case "prep":
      return (
        <div>
          <p className="ga-h1">Prepare</p>
          <p className="ga-sm">Countdown · T-4 days</p>
          <ul className="op-tasks">
            {[
              ["Start daily prep stories", "Daily until Sunday", true],
              ["Launch paid social ads", "5 days before", true],
              ["Door knock the neighborhood", "4 days before", true],
              ["Confirm it's live in the MLS", "72 hours before", false, "tick"],
              ["Pull 3 alternate homes", "1 day before", false],
              ["Print flyers and QR sign-in sheets", "1 day before", false],
              ["Load the kit", "Morning of", true],
            ].map(([t, when, d, anim]) => (
              <li key={t as string} className={`${d ? "done" : ""} ${anim ? "op-tick" : ""}`}>
                <span className="ga-box">{d ? "✓" : ""}</span>
                <span className="ga-tk">
                  <b>{t}</b>
                  <small>{when}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "neighbors":
      return (
        <div>
          <p className="ga-h1">Exclusive Neighborhood Tour</p>
          <p className="ga-sm">1482 Maple Ridge Dr · first 30 minutes</p>
          <div className="op-big">
            <b className="op-count">14</b>
            <span>RSVPs</span>
          </div>
          {[
            ["The Garcias", "Coming · wants a home value"],
            ["Linda P.", "Coming"],
            ["The Okafors", "Coming · bringing a friend"],
          ].map(([n, s], k) => (
            <div key={n} className="op-rsvp" style={{ animationDelay: `calc(var(--s) * ${700 + k * 500}ms)` }}>
              <span className="ga-av">{n.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
              <span className="ga-tk">
                <b>{n}</b>
                <small>{s}</small>
              </span>
            </div>
          ))}
        </div>
      );
    case "kiosk":
      return (
        <div className="op-kiosk">
          <div className="op-kl">
            <p className="op-kbrand">Welcome to 1482 Maple Ridge Dr</p>
            <p className="ga-sm">Please sign in. Security notice: all visitors sign in.</p>
          </div>
          <div className="op-form">
            {[
              ["First name", "Kim"],
              ["Last name", "Reyes"],
              ["Mobile phone", "(801) 555-0142"],
              ["Email", "kim.reyes@example.com"],
              ["When are you hoping to move?", "This spring"],
              ["Working with an agent?", "No"],
            ].map(([l, v], k) => (
              <label key={l}>
                <span>{l}</span>
                <b className="op-type" style={{ animationDelay: `calc(var(--s) * ${300 + k * 520}ms)` }}>{v}</b>
              </label>
            ))}
            <div className="op-next-guest">Sign in · Next guest</div>
          </div>
        </div>
      );
    case "live":
      return (
        <div>
          <div className="ga-live" style={{ marginTop: 4 }}>
            <b>LIVE</b> Safety check-in is on
          </div>
          <p className="ga-h1">Host live</p>
          <div className="op-stats">
            {[
              ["Visitors", "11"],
              ["Neighbors", "4"],
              ["Hot", "2"],
              ["Appts", "1"],
            ].map(([l, v]) => (
              <span key={l}>
                <b className="op-count">{v}</b>
                <small>{l}</small>
              </span>
            ))}
          </div>
          <p className="ga-sec" style={{ color: "#f06a5a" }}>Just signed in</p>
          {["Kim Reyes · hoping to move this spring", "Sam Patel · neighbor", "Jordan Lee · working with an agent"].map((t, k) => (
            <div key={t} className="op-rsvp" style={{ animationDelay: `calc(var(--s) * ${400 + k * 500}ms)` }}>
              <span className="ga-av">{t.split(" ").slice(0, 2).map((w) => w[0]).join("")}</span>
              <span className="ga-tk">
                <b>{t.split(" · ")[0]}</b>
                <small>{t.split(" · ")[1]}</small>
              </span>
            </div>
          ))}
        </div>
      );
    case "rate":
      return (
        <div>
          <p className="ga-h1">Rate &amp; notes</p>
          <p className="ga-sm">Five stars means "call first."</p>
          {[
            ["Kim Reyes", 5, true, "Ready to list in the spring. Loved the kitchen."],
            ["Sam Patel", 3, false, "Neighbor. Curious about value."],
            ["Jordan Lee", 2, false, "Has an agent."],
          ].map(([n, st, hot, note], k) => (
            <div key={n as string} className="op-visitor">
              <div className="op-vtop">
                <b>{n}</b>
                {hot && <span className="op-hot">🔥 Hot</span>}
              </div>
              <div className="op-stars">
                {[1, 2, 3, 4, 5].map((x) => (
                  <i key={x} className={x <= (st as number) ? "on" : ""} style={{ animationDelay: `calc(var(--s) * ${300 + k * 600 + x * 90}ms)` }}>★</i>
                ))}
              </div>
              <small>{note}</small>
            </div>
          ))}
        </div>
      );
    case "attack":
      return (
        <div>
          <p className="ga-h1">Follow-Up Attack</p>
          <p className="ga-sm">Kim Reyes · 5 stars · Hot</p>
          {[
            ["Day 0-1", ["Video text: thanks for coming", "Call: what did you love?"], true],
            ["Days 2-7 · call daily", ["Send 3 homes like this", "Offer a home value"], false],
            ["Weeks 2-4 · weekly", ["Market update", "Invite to the next open house"], false],
          ].map(([h, items, d]) => (
            <div key={h as string} className="op-phase">
              <p>{h as string}</p>
              {(items as string[]).map((t) => (
                <span key={t} className={d ? "done" : ""}>
                  {d ? "✓ " : "○ "}
                  {t}
                </span>
              ))}
            </div>
          ))}
          <p className="ga-sec" style={{ color: "#f06a5a" }}>Automatic emails</p>
          <div className="op-emails">
            <span className="done">Thank you + home report · sent</span>
            <span>Homes like this · Friday</span>
            <span>Still looking? · next week</span>
          </div>
        </div>
      );
    case "reports":
      return (
        <div>
          <p className="ga-h1">Reports</p>
          <div className="op-report">
            <p className="ga-sm">Seller report · 1482 Maple Ridge Dr</p>
            <div className="op-stats small">
              <span><b>14</b><small>Visitors</small></span>
              <span><b>2</b><small>Hot</small></span>
              <span><b>4</b><small>Neighbors</small></span>
            </div>
            <small>"Loved the kitchen. Wanted a bigger yard."</small>
            <em className="op-send">Send to Taylor (listing agent)</em>
          </div>
          <div className="op-gci">
            <small>Pipeline GCI from this open house</small>
            <b>$18,600</b>
          </div>
        </div>
      );
    case "score":
    default:
      return (
        <div>
          <p className="ga-h1">Scorecard</p>
          <p className="ga-sm">Your Business-Building Machine · this week</p>
          <div className="op-funnel">
            {[
              ["Open houses", 2],
              ["Conversations", 26],
              ["New relationships", 14],
              ["CRM contacts", 14],
              ["VIP50 connections", 3],
              ["Appointments", 2],
              ["Clients", 1],
              ["Referrals", 1],
            ].map(([l, v], k) => (
              <div key={l as string} style={{ width: `${100 - k * 8}%`, animationDelay: `calc(var(--s) * ${200 + k * 180}ms)` }}>
                <span>{l}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </div>
      );
  }
}
