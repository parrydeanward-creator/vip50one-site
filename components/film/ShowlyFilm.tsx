"use client";

import Showcase from "./Showcase.tsx";
import { SHOWLY_STEPS } from "@/lib/showcase.ts";

// Showly showcase (Parry, 30 Sep). Every feature shown is in showly main
// (read 30 Sep): Your tours, capturing a home (the listing sheet read
// automatically, photos, a voice note with consent, liked / concerned chips,
// the drafted write-up the agent reads before sending), the recap sent by
// text, the buyer answering Yes / Maybe / No with a note, "Since you sent",
// "What they're telling you", "What they're approved to", pre-approval
// letters from the lender, and the lender card.


const P = "#9b6ce0";

export default function ShowlyFilm({ record = false, slow = 1 }: { record?: boolean; slow?: number }) {
  return (
    <Showcase
      name="Showly"
      accent={P}
      steps={SHOWLY_STEPS}
      outro={["Showly.", "Every buyer tour.", "Part of ONE."]}
      record={record}
      slow={slow}
      render={(s) => <ShowlyScreen id={s.screen} />}
    />
  );
}

const HOMES: [string, string, string, string][] = [
  ["1180 Birch St", "$612,000 · 4 bd · 3 ba", "Yes", "Great yard"],
  ["56 Canyon Rd", "$589,000 · 3 bd · 2 ba", "Yes", ""],
  ["903 Elm Ct", "$575,000 · 3 bd · 2 ba", "Maybe", "Busy road?"],
  ["15 Ridge View", "$675,000 · 4 bd · 3 ba", "No", "Too far from school"],
];

function ShowlyScreen({ id }: { id: string }) {
  switch (id) {
    case "splash":
      return (
        <div className="ga-splash">
          <div className="ga-logo" style={{ fontSize: 88 }}>
            <b style={{ color: P }}>SHOWLY</b>
          </div>
          <p>Buyer tours, captured.</p>
        </div>
      );
    case "tours":
      return (
        <div>
          <p className="ga-h1">Your tours</p>
          {[
            ["The Parkers", "Today · 3 homes", "In progress"],
            ["The Millers", "Tue · 4 homes", "Sent"],
            ["Alex Rivera", "Sat · 5 homes", "Sent"],
          ].map(([n, s, pill], k) => (
            <div key={n} className="sh-card" style={{ animationDelay: `calc(var(--s) * ${200 + k * 300}ms)` }}>
              <span className="ga-tk">
                <b>{n}</b>
                <small>{s}</small>
              </span>
              <span className={`sh-pill ${pill === "Sent" ? "sent" : ""}`}>{pill}</span>
            </div>
          ))}
          <div className="sh-new">+ New tour</div>
        </div>
      );
    case "sheet":
      return (
        <div>
          <p className="ga-sm">The Parkers · home 2 of 3</p>
          <p className="ga-h1">The listing sheet</p>
          <div className="sh-sheetimg">
            <div className="sh-scan" />
            <span>MLS sheet photo</span>
          </div>
          {[
            ["Address", "742 Willow Lane"],
            ["List price", "$598,000"],
            ["Beds · Baths", "4 · 2.5"],
            ["Sq ft", "2,340"],
          ].map(([l, v], k) => (
            <div key={l} className="sh-field">
              <span>{l}</span>
              <b className="op-type" style={{ animationDelay: `calc(var(--s) * ${1400 + k * 450}ms)` }}>{v}</b>
            </div>
          ))}
        </div>
      );
    case "voice":
      return (
        <div>
          <p className="ga-sm">742 Willow Lane</p>
          <p className="ga-h1">What happened</p>
          <div className="sh-rec">
            <span className="sh-dot" /> Recording · 0:42
            <div className="sh-wave">
              {Array.from({ length: 28 }, (_, k) => (
                <i key={k} style={{ height: `${10 + ((k * 37) % 30)}px`, animationDelay: `calc(var(--s) * ${k * 40}ms)` }} />
              ))}
            </div>
          </div>
          <p className="ga-sm" style={{ marginTop: 6 }}>They know — recording with their okay.</p>
          <p className="ga-sec" style={{ color: P }}>Liked · concerned about</p>
          <div className="sh-chips">
            {["Kitchen", "Big yard", "Quiet street", "School nearby"].map((c, k) => (
              <span key={c} className="like" style={{ animationDelay: `calc(var(--s) * ${1200 + k * 300}ms)` }}>{c}</span>
            ))}
            {["Small primary closet"].map((c) => (
              <span key={c} className="worry" style={{ animationDelay: "calc(var(--s) * 2600ms)" }}>{c}</span>
            ))}
          </div>
        </div>
      );
    case "draft":
      return (
        <div>
          <p className="ga-sm">742 Willow Lane</p>
          <p className="ga-h1">What you said</p>
          <p className="ga-sm">The client reads this.</p>
          <div className="sh-draft">
            <em>Drafted — read it before you send</em>
            <p className="op-type" style={{ animationDuration: "calc(var(--s) * 1800ms)", animationDelay: "calc(var(--s) * 500ms)" }}>
              You both lit up in the kitchen, and the yard is exactly the size you asked for. The street was quiet at 5pm. The one thing to weigh: the primary closet is small.
            </p>
          </div>
        </div>
      );
    case "recap":
      return (
        <div>
          <p className="ga-sm">Recap preview</p>
          <p className="ga-h1">Tuesday's tour, the Millers</p>
          {HOMES.slice(0, 3).map(([a, s]) => (
            <div key={a} className="sh-home">
              <div className="sh-photo" />
              <span className="ga-tk">
                <b>{a}</b>
                <small>{s}</small>
              </span>
            </div>
          ))}
          <div className="sh-send">Publish and send · Text it to the Millers</div>
        </div>
      );
    case "answer":
      return (
        <div className="sh-buyer">
          <p className="ga-sm">From Sarah · your tour recap</p>
          <div className="sh-photo big" />
          <p className="ga-h1" style={{ fontSize: 20 }}>1180 Birch St</p>
          <p className="ga-sm">Where does this one sit?</p>
          <div className="sh-yn">
            <span className="yes">Yes</span>
            <span>Maybe</span>
            <span>No</span>
          </div>
          <div className="sh-note">
            <small>Anything Sarah should know…</small>
            <b className="op-type" style={{ animationDelay: "calc(var(--s) * 2000ms)" }}>Love the yard. Can we see it again Saturday?</b>
          </div>
        </div>
      );
    case "back":
      return (
        <div>
          <p className="ga-h1">What came back</p>
          <p className="ga-sm">The Millers · opened 3 times</p>
          {HOMES.map(([a, , ans, note], k) => (
            <div key={a} className="sh-ans" style={{ animationDelay: `calc(var(--s) * ${300 + k * 350}ms)` }}>
              <span className="ga-tk">
                <b>{a}</b>
                {note && <small>"{note}"</small>}
              </span>
              <span className={`sh-a ${ans.toLowerCase()}`}>{ans}</span>
            </div>
          ))}
          <div className="sh-quiet">Alex Rivera hasn't opened Saturday's recap yet.</div>
        </div>
      );
    case "learn":
      return (
        <div>
          <p className="ga-h1">The Millers</p>
          <p className="ga-sec" style={{ color: P }}>What they're telling you</p>
          <div className="sh-learn">
            <span className="like">Yard: yes, every time</span>
            <span className="like">Updated kitchens</span>
            <span className="worry">Busy roads: no</span>
            <span className="worry">Long school drive: no</span>
          </div>
          <p className="ga-sec" style={{ color: P }}>What they're approved to</p>
          <div className="sh-approved">
            <b>$650,000</b>
            <small>Set by their lender</small>
            <span>15 Ridge View is $25,000 over</span>
          </div>
        </div>
      );
    case "letter":
    default:
      return (
        <div>
          <p className="ga-sm">1180 Birch St</p>
          <p className="ga-h1">Pre-approval letter</p>
          <div className="sh-letter">
            <span className="ga-av">DO</span>
            <span className="ga-tk">
              <b>Dana Ortiz</b>
              <small>Summit Home Loans</small>
            </span>
          </div>
          <div className="sh-step done">Asked Tue — waiting on Dana</div>
          <div className="sh-step ready">Letter ready — today, 10:14am</div>
          <div className="sh-open">Open the letter</div>
          <p className="ga-sm" style={{ marginTop: 14 }}>They see the addresses, your buyer's first name and the date. Never your notes, your voice memo, or what anyone marked.</p>
        </div>
      );
  }
}
