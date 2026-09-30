"use client";

import type { CSSProperties } from "react";
import Showcase from "./Showcase.tsx";
import { MARQUEE_STEPS } from "@/lib/showcase.ts";

// Marquee showcase (Parry, 30 Sep). Every screen is a feature in marquee-app
// main (read 30 Sep): the listing presentation and comparable sales, the room
// by room walkthrough, the build (address and photos in, campaign out), the
// campaign pieces, the reel, the posting panel (scheduled posting off until
// the agent turns it on; missed pieces never posted late), the open house door
// with sign-ins ranked hot / warm / cool, the seller's live view, the one-tap
// recap, the weekly report from six answers, and Home's "things need you".

const B = "#4f7fe0";
const d = (ms: number): CSSProperties => ({ animationDelay: `calc(var(--s) * ${ms}ms)` });

export default function MarqueeFilm({ record = false, slow = 1 }: { record?: boolean; slow?: number }) {
  return (
    <Showcase
      name="Marquee"
      accent={B}
      steps={MARQUEE_STEPS}
      outro={["Marquee.", "Every listing, launched.", "Part of ONE."]}
      record={record}
      slow={slow}
      render={(s) => <MarqueeScreen id={s.screen} phone={s.device === "phone"} />}
    />
  );
}

const PIECES: [string, string][] = [
  ["Listing packet", "12 pages"],
  ["Premium flyer", "Print-ready"],
  ["Open house kit", "Signs, room cards, QR"],
  ["Weekly seller report", "Every Friday"],
  ["Social feed and story", "7 posts"],
  ["Reel ready to post", "15 sec · 1080×1920"],
  ["Reel scripts", "3 scripts"],
  ["Sphere outreach", "Texts and emails"],
  ["Publishing calendar", "60 days"],
];

function MarqueeScreen({ id, phone }: { id: string; phone: boolean }) {
  if (phone) return <PhoneScreen id={id} />;
  switch (id) {
    case "splash":
      return (
        <div className="mv-splash">
          <div className="mq-logo">MARQUEE</div>
          <p>Every listing, marketed like a luxury listing.</p>
        </div>
      );
    case "present":
      return (
        <div className="mq-web">
          <p className="mq-lbl">Listing presentation · 822 N Grandridge Ct</p>
          <div className="mq-deck">
            {["The plan", "Your buyer", "Pricing", "Comparable sales", "The campaign", "Open house", "Reporting", "Next steps"].map((t, k) => (
              <div key={t} className={`mq-slide sc-in ${t === "Comparable sales" ? "big" : ""}`} style={d(100 + k * 120)}>
                <small>{String(k + 1).padStart(2, "0")}</small>
                <b>{t}</b>
                {t === "Comparable sales" && (
                  <div className="mq-comps">
                    {[
                      ["814 N Grandridge", "$742,000", "Sold Aug"],
                      ["901 Aspen Ct", "$728,500", "Sold Jul"],
                      ["77 Summit Ln", "$761,000", "Sold Jun"],
                    ].map(([a, p, w], j) => (
                      <span key={a} className="sc-in" style={d(1300 + j * 250)}>
                        {a}
                        <b>{p}</b>
                        <em>{w}</em>
                      </span>
                    ))}
                    <i className="sc-in" style={d(2200)}>Yours, not ours.</i>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    case "build":
      return (
        <div className="mq-web">
          <p className="mq-lbl">New listing · 822 N Grandridge Ct</p>
          <div className="mq-build">
            {[
              ["You", "Add the address and photos", "About 10 minutes", "done"],
              ["Marquee", "Builds the whole campaign", "About an hour, then a text", "run"],
              ["You", "Read it and approve", "About 15 minutes", ""],
            ].map(([who, what, time, st], k) => (
              <div key={what} className={`mq-bstep sc-in ${st}`} style={d(200 + k * 400)}>
                <small>{who}</small>
                <b>{what}</b>
                <span>{time}</span>
                {st === "run" && (
                  <div className="mq-prog">
                    <i />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mq-photos">
            {Array.from({ length: 8 }, (_, k) => (
              <i key={k} className="sc-in" style={{ ...d(1600 + k * 90), filter: `hue-rotate(${k * 25}deg)` }} />
            ))}
          </div>
          <div className="mv-toast sc-in" style={{ ...d(3200), borderColor: B }}>Text · Marquee: Your campaign for 822 N Grandridge Ct is ready to read.</div>
        </div>
      );
    case "campaign":
      return (
        <div className="mq-web">
          <p className="mq-kick">YOUR CAMPAIGN, ALREADY BUILT</p>
          <p className="mq-lbl">822 N Grandridge Ct · 9 pieces · waiting for your approval</p>
          <div className="mq-grid">
            {PIECES.map(([t, s], k) => (
              <div key={t} className="mq-piece sc-in" style={d(150 + k * 140)}>
                <div className="mq-pthumb" style={{ filter: `hue-rotate(${k * 18}deg)` }} />
                <b>{t}</b>
                <small>{s}</small>
              </div>
            ))}
          </div>
        </div>
      );
    case "posting":
      return (
        <div className="mq-web">
          <p className="mq-lbl">Posting · 822 N Grandridge Ct</p>
          <div className="mq-switch">
            <div>
              <b>Scheduled posting</b>
              <small>Off until you turn it on. Only pieces you approved ever post.</small>
            </div>
            <span className="mq-toggle sc-toggle" style={d(1200)}>
              <i />
            </span>
          </div>
          <p className="mq-on sc-in" style={d(1500)}>On · you turned it on today, 9:12am</p>
          <div className="mq-days">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dd, k) => (
              <div key={dd} className="mq-day sc-in" style={d(1900 + k * 120)}>
                <small>{dd}</small>
                <i />
                <span>{["Just listed", "Kitchen", "Reel", "Open house", "Backyard", "Neighborhood", "Last chance"][k]}</span>
              </div>
            ))}
          </div>
          <p className="mq-note sc-in" style={d(2900)}>Give all 7 a day · A piece that misses its day is never posted late.</p>
        </div>
      );
    case "social":
      return (
        <div className="mq-web">
          <p className="mq-lbl">Connect your accounts</p>
          <div className="mq-social">
            {["Instagram", "Facebook"].map((n) => (
              <div key={n} className="mq-acct">
                <b>{n}</b>
                <span className="mq-wait">Waiting on Meta's review</span>
              </div>
            ))}
          </div>
          <p className="mq-note">Until then, every piece is ready to download and post yourself.</p>
        </div>
      );
    case "report":
      return (
        <div className="mq-web mq-two">
          <div>
            <p className="mq-lbl">Week 3 · six answers</p>
            {[
              ["Showings this week", "6"],
              ["Second showings", "2"],
              ["What buyers said", "Loved the kitchen; wanted a bigger yard"],
              ["Price and condition", "Priced right for the street"],
              ["Offers or serious interest", "One buyer asking about disclosures"],
              ["Your recommendation for next week", "Hold price, push the reel"],
            ].map(([q, a], k) => (
              <div key={q} className="mq-qa sc-in" style={d(150 + k * 260)}>
                <small>{q}</small>
                <b>{a}</b>
              </div>
            ))}
          </div>
          <div className="mq-rep sc-in" style={d(2000)}>
            <small style={{ color: B }}>WEEKLY SELLER REPORT</small>
            <b>822 N Grandridge Ct · Week 3</b>
            <div className="mq-rstats">
              <span>
                <b>6</b>showings
              </span>
              <span>
                <b>2</b>came back
              </span>
              <span>
                <b>31</b>at the open house
              </span>
            </div>
            <p>Buyers loved the kitchen. One is asking about disclosures. My recommendation: hold the price and push the reel this week.</p>
          </div>
        </div>
      );
    case "home":
    default:
      return (
        <div className="mq-web">
          <p className="mq-h">3 things need you this week</p>
          <p className="mq-lbl">About 12 minutes in all</p>
          {[
            ["Approve 4 social pieces", "822 N Grandridge Ct", "4 min"],
            ["Answer six questions", "Friday's seller report", "3 min"],
            ["Ask the seller for photos", "1180 Birch St", "5 min"],
          ].map(([t, s, m], k) => (
            <div key={t} className="mq-need sc-in" style={d(200 + k * 250)}>
              <span>
                <b>{t}</b>
                <small>{s}</small>
              </span>
              <em>{m}</em>
            </div>
          ))}
          <div className="mq-track">
            {["Won", "Photos", "Built", "Approved", "Live", "Open house", "Reports", "Under contract", "Closed"].map((t, k) => (
              <span key={t} className={k < 5 ? "on" : k === 5 ? "now" : ""}>{t}</span>
            ))}
          </div>
        </div>
      );
  }
}

function PhoneScreen({ id }: { id: string }) {
  switch (id) {
    case "walk":
      return (
        <div>
          <p className="ga-sm">822 N Grandridge Ct</p>
          <p className="ga-h1">Walkthrough</p>
          {[
            ["Kitchen", "Quartz, new range, great light", true],
            ["Primary suite", "Walk-in closet, mountain view", true],
            ["Backyard", "Covered patio, mature trees", false],
          ].map(([r, n, done], k) => (
            <div key={r as string} className="mq-room sc-in" style={d(200 + k * 400)}>
              <div className="mq-rthumb" style={{ filter: `hue-rotate(${k * 40}deg)` }} />
              <span className="ga-tk">
                <b>{r}</b>
                <small>{n}</small>
              </span>
              {done ? <em className="mq-ok">✓</em> : <em className="mq-rec">● note</em>}
            </div>
          ))}
          <div className="sh-new">+ Next room</div>
        </div>
      );
    case "reel":
      return (
        <div className="mq-reel">
          <div className="mq-reelimg" />
          <div className="mq-reelcap">
            <small>JUST LISTED</small>
            <b>822 N Grandridge Ct</b>
            <span>4 bd · 3 ba · mountain views</span>
          </div>
          <div className="mq-reelbar">
            <i />
          </div>
          <div className="mq-approve sc-in" style={d(3000)}>Approve</div>
        </div>
      );
    case "door":
      return (
        <div>
          <p className="ga-sm">Open house · Sat 1-4pm</p>
          <p className="ga-h1">Sign-ins</p>
          {[
            ["Kim Patel", "Buyer · no agent · moving in 60 days", "hot"],
            ["The Garcias", "Buyers · pre-approved", "hot"],
            ["Tom Nash", "Neighbor", "warm"],
            ["Lena Brooks", "Buyer · has an agent", "cool"],
          ].map(([n, s, band], k) => (
            <div key={n} className="mq-sign sc-in" style={d(200 + k * 350)}>
              <span className="ga-tk">
                <b>{n}</b>
                <small>{s}</small>
              </span>
              <span className={`mq-band ${band}`}>{band}</span>
            </div>
          ))}
          <div className="mq-qr sc-in" style={d(1800)}>
            <i />
            <span>Room card · Kitchen · scan to sign in</span>
          </div>
        </div>
      );
    case "live":
      return (
        <div>
          <p className="ga-sm">Your live view · 822 N Grandridge Ct</p>
          <p className="ga-h1">Happening now</p>
          <div className="mq-live">
            {[
              ["14", "signed in"],
              ["9", "buyers"],
              ["3", "agents"],
            ].map(([n, l], k) => (
              <span key={l} className="sc-in" style={d(200 + k * 200)}>
                <b>{n}</b>
                {l}
              </span>
            ))}
          </div>
          <p className="ga-sec" style={{ color: B }}>Rooms they're looking at</p>
          {[
            ["Kitchen", 86],
            ["Backyard", 64],
            ["Primary suite", 48],
          ].map(([r, w], k) => (
            <div key={r} className="mq-roombar">
              <span>{r}</span>
              <i className="sc-grow-x" style={{ width: `${w}%`, ...d(900 + k * 200) }} />
            </div>
          ))}
          <p className="ga-sec" style={{ color: B }}>What they're asking</p>
          <div className="mq-q sc-in" style={d(1800)}>"Are the solar panels owned?"</div>
          <div className="mq-q sc-in" style={d(2400)}>"How old is the roof?"</div>
        </div>
      );
    case "recap":
    default:
      return (
        <div>
          <p className="ga-sm">822 N Grandridge Ct · Sat</p>
          <p className="ga-h1">Tell your seller how it went</p>
          <div className="sh-draft">
            <em>Written up — read it before you send</em>
            <p className="op-type" style={{ animationDuration: "calc(var(--s) * 1600ms)", animationDelay: "calc(var(--s) * 400ms)" }}>
              31 people came through today, 9 of them buyers. Two couples are worth a call tonight. Most time was spent in the kitchen and the backyard. Questions: the solar panels and the roof.
            </p>
          </div>
          <div className="sh-send sc-in" style={d(2400)}>Send to the Hendersons</div>
        </div>
      );
  }
}
