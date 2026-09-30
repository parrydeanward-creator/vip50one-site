"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { GO_STEPS, GO_TASKS, type GoStep } from "@/lib/goAppFilm.ts";

// The ONE GO app film: a phone on a dark stage, the app running inside it,
// the caption beside it. Plain HTML and CSS (no canvas), so every word is
// real text. `slow` stretches every timer and animation for smooth recording.

const NOTE = "Example agent; people, businesses and addresses are invented.";

export default function GoAppFilm({ record = false, slow = 1 }: { record?: boolean; slow?: number }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const step = GO_STEPS[i];
  const last = i === GO_STEPS.length - 1;

  useEffect(() => {
    if (!playing || last) return;
    const t = setTimeout(() => setI((n) => n + 1), step.ms * slow);
    return () => clearTimeout(t);
  }, [i, playing, last, step, slow]);

  return (
    <div className="ga" style={{ ["--s" as string]: String(slow) } as CSSProperties}>
      <header className="bar">
        <a className="brand" href="/dashboard" aria-label="VIP-50 ONE, your dashboard" style={{ color: "var(--text)", textDecoration: "none" }}>
          VIP-50 <b>ONE</b>
        </a>
        <span className="crumbs" style={{ color: "var(--text)", fontWeight: 600 }}>ONE GO</span>
      </header>
      <div className="ga-stage">
        {step.screen === "brain" && step.image ? (
          <div className="ga-laptop" aria-hidden="true" key={step.id}>
            <div className="ga-lid">
              <img src={step.image} alt="" />
            </div>
            <div className="ga-base" />
          </div>
        ) : (
          <div className="ga-phone" aria-hidden="true">
            <div className="ga-notch" />
            <div className="ga-screen">
              <StatusBar />
              <Screen step={step} />
            </div>
          </div>
        )}

        <div className="ga-side" role="status" aria-live="polite">
          {!last ? (
            <div className="ga-cap pop" key={step.id} style={{ animationDuration: `${420 * slow}ms` }}>
              {step.kicker && <p className="ga-kicker">{step.kicker}</p>}
              <p className="ga-title">{step.title}</p>
              {step.line && <p className="ga-line">{step.line}</p>}
            </div>
          ) : (
            <div className="ga-cap ga-end pop" style={{ animationDuration: `${420 * slow}ms` }}>
              <p className="ga-tag">
                ONE GO.
                <br />
                Everything in the palm of your hand.
                <br />
                <b>Part of ONE.</b>
              </p>
              {!record && (
                <div className="watch-end-actions">
                  <button onClick={() => setI(0)}>↺ Watch again</button>
                  <a href="/dashboard">Explore my business</a>
                </div>
              )}
            </div>
          )}
          {!record && !last && (
            <div className="ga-ctl">
              <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
              <button onClick={() => setI(0)} aria-label="Start again">↺</button>
            </div>
          )}
          <p className="ga-note">{NOTE}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="ga-status">
      <span>9:41</span>
      <span className="ga-status-r">5G · 100%</span>
    </div>
  );
}

const TABS = [
  ["home", "Home"],
  ["calendar", "Calendar"],
  ["map", "Map"],
  ["lounge", "Lounge"],
  ["score", "Score"],
] as const;

function tabFor(s: GoStep["screen"]) {
  if (s === "calendar") return "calendar";
  if (s === "map") return "map";
  if (s === "lounge") return "lounge";
  if (s === "score") return "score";
  return "home";
}

function Screen({ step }: { step: GoStep }) {
  const s = step.screen;
  return (
    <>
      <div className="ga-body" key={s === "call" || s === "text" ? "home" : s === "refer" ? "rolodex" : s}>
        {s === "splash" && <Splash />}
        {(s === "home" || s === "call" || s === "text") && <Home step={step} />}
        {s === "calendar" && <Calendar />}
        {(s === "rolodex" || s === "refer") && <Rolodex />}
        {s === "hwc" && <HotWarmCold />}
        {s === "map" && <DropByMap />}
        {s === "lounge" && <Lounge />}
        {s === "score" && <Score />}
      </div>
      {s === "call" && <CallOverlay />}
      {s === "text" && <TextOverlay />}
      {s === "refer" && <ReferSheet />}
      {s !== "splash" && (
        <nav className="ga-tabs">
          {TABS.map(([k, label]) => (
            <span key={k} className={tabFor(s) === k ? "on" : undefined}>
              <i />
              {label}
            </span>
          ))}
        </nav>
      )}
    </>
  );
}

function Splash() {
  return (
    <div className="ga-splash">
      <div className="ga-logo">
        <span>ONE</span>
        <b>GO</b>
      </div>
      <p>Your day, in points.</p>
    </div>
  );
}

function Ring({ value, max, size = 64 }: { value: number; max: number; size?: number }) {
  const r = size / 2 - 6, c = 2 * Math.PI * r, p = Math.min(1, value / max);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ga-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f5a623" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function Home({ step }: { step: GoStep }) {
  const done = new Set(step.done);
  return (
    <div className="ga-home">
      <div className="ga-hi">
        <div>
          <p className="ga-sm">Wednesday</p>
          <p className="ga-h1">Good morning, Sarah</p>
        </div>
        <div className="ga-score">
          <Ring value={step.points} max={26} />
          <span>
            <b>{step.points}</b>/26
          </span>
        </div>
      </div>
      <p className="ga-sec">
        VIP-50 Daily Tasks <em>made for you by ONE</em>
      </p>
      <ul className="ga-tasks">
        {GO_TASKS.map((t) => {
          const d = done.has(t.id);
          return (
            <li key={t.id} className={d ? "done" : undefined}>
              <span className="ga-av">{t.initials}</span>
              <span className="ga-tk">
                <b>
                  {t.kind} {t.who}
                </b>
                <small>{d && t.auto ? "Logged from the app ✓" : t.why}</small>
              </span>
              <span className={`ga-kind k-${t.kind.replace(/\W/g, "").toLowerCase()}`}>{t.kind}</span>
              <span className="ga-box">{d ? "✓" : ""}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CallOverlay() {
  return (
    <div className="ga-over ga-call">
      <span className="ga-av big">JA</span>
      <p className="ga-callname">Jen Alvarez</p>
      <p className="ga-sm">calling… 0:12</p>
      <div className="ga-callbtns">
        <i />
        <i />
        <i className="end" />
      </div>
    </div>
  );
}

function TextOverlay() {
  return (
    <div className="ga-over ga-text">
      <p className="ga-sm">To: Marcus Lee</p>
      <div className="ga-video">
        <span>▶</span>
        <small>0:24 · video</small>
      </div>
      <div className="ga-bubble">Hey Marcus! Thinking of you. Lunch next week?</div>
      <p className="ga-sent">Sent ✓</p>
    </div>
  );
}

const BLOCKS: [string, string, number, number, string][] = [
  ["Power Hour", "Calls to your VIP-50", 8, 1, "rev"],
  ["Listing appointment", "88 Aspen Ct", 10, 1.5, "cli"],
  ["Lunch with Marcus", "Face-to-face", 12.5, 1, "cli"],
  ["Admin", "Paperwork, email", 14, 1, "adm"],
  ["Follow-ups", "4 in ONE MOVE", 15.5, 1, "rev"],
  ["Gym", "Personal", 17, 1, "per"],
];

function Calendar() {
  return (
    <div className="ga-cal">
      <p className="ga-h1">Today</p>
      <p className="ga-sm">Time blocks</p>
      <div className="ga-day">
        {Array.from({ length: 11 }, (_, k) => (
          <div key={k} className="ga-hour" style={{ top: `${k * 44}px` }}>
            <span>{((k + 7) % 12 || 12) + (k + 7 < 12 ? "a" : "p")}</span>
          </div>
        ))}
        {BLOCKS.map(([t, sub, at, len, cat], k) => (
          <div key={t} className={`ga-block c-${cat}`} style={{ top: `${(at - 7) * 44 + 2}px`, height: `${len * 44 - 4}px`, animationDelay: `calc(var(--s) * ${300 + k * 420}ms)` }}>
            <b>{t}</b>
            <small>{sub}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

const BIZ: [string, string, string, string][] = [
  ["DO", "Dana Ortiz", "Lender · Summit Home Loans", ""],
  ["SH", "Summit Home Inspections", "Inspector", "10% off for your clients"],
  ["AP", "Ace Plumbing", "Trades · Rick Alvarez", "Free first visit for your clients"],
  ["CT", "Canyon Title", "Title · Mia Chen", ""],
];

function Rolodex() {
  return (
    <div className="ga-rolo">
      <p className="ga-h1">Business Rolodex</p>
      <div className="ga-chips">
        {["All", "Lenders", "Inspectors", "Title", "Trades"].map((c, k) => (
          <span key={c} className={k === 0 ? "on" : undefined}>{c}</span>
        ))}
      </div>
      {BIZ.map(([ini, name, sub, offer]) => (
        <div key={name} className={`ga-biz${name === "Ace Plumbing" ? " hl" : ""}`}>
          <span className="ga-av sq">{ini}</span>
          <span className="ga-tk">
            <b>{name}</b>
            <small>{sub}</small>
            {offer && <em>{offer}</em>}
          </span>
          <span className="ga-refer">Refer</span>
        </div>
      ))}
    </div>
  );
}

function ReferSheet() {
  return (
    <div className="ga-sheet">
      <p className="ga-sm">Refer Ace Plumbing</p>
      <p className="ga-to">To: Jen Alvarez</p>
      <div className="ga-bubble ga-mine">
        Business: Ace Plumbing
        <br />
        Contact: Rick Alvarez
        <br />
        Special Offer: Free first visit for your clients
      </div>
      <div className="ga-send">Send</div>
    </div>
  );
}

function HotWarmCold() {
  const col = (name: string, sub: string, cls: string, people: string[], extra?: string) => (
    <div className={`ga-col ${cls}`}>
      <p>
        <b>{name}</b> <small>{sub}</small>
      </p>
      {extra && <span className="ga-person moved">{extra}</span>}
      {people.map((p) => (
        <span key={p} className="ga-person">{p}</span>
      ))}
    </div>
  );
  return (
    <div className="ga-hwc">
      <p className="ga-h1">Hot / Warm / Cold</p>
      <div className="ga-cols">
        {col("Hot", "1-3 mo", "hot", ["The Millers", "Luis Ortega", "Priya Shah"], "Kim Reyes")}
        {col("Warm", "3-12 mo", "warm", ["Sam Patel", "The Hendersons", "Rosa Diaz", "Jordan Lee"])}
        {col("Cold", "12+ mo", "cold", ["Alex Rivera", "Tom Reyes", "Nina Park"])}
      </div>
      <p className="ga-hint">Kim Reyes: "We're ready to list in the spring."</p>
    </div>
  );
}

function DropByMap() {
  const pins: [number, number, string, boolean][] = [
    [70, 120, "JA", true],
    [220, 90, "ML", false],
    [260, 230, "TR", true],
    [120, 300, "DK", false],
  ];
  return (
    <div className="ga-map">
      <svg viewBox="0 0 340 420" className="ga-mapsvg">
        <rect width="340" height="420" fill="#0d1733" />
        {[40, 110, 180, 250, 320, 390].map((y) => (
          <line key={`h${y}`} x1="0" x2="340" y1={y} y2={y} stroke="#1c2b55" strokeWidth={y === 180 ? 7 : 3} />
        ))}
        {[30, 100, 170, 240, 310].map((x) => (
          <line key={`v${x}`} y1="0" y2="420" x1={x} x2={x} stroke="#1c2b55" strokeWidth={x === 170 ? 7 : 3} />
        ))}
        <rect x="185" y="265" width="110" height="110" rx="12" fill="#11301f" />
        <path className="ga-route" d="M170 200 L70 120 L220 90 L260 230 L120 300" fill="none" stroke="#f5a623" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="170" cy="200" r="9" fill="#4f8cff" stroke="#fff" strokeWidth="3" />
        {pins.map(([x, y, t, due]) => (
          <g key={t}>
            <circle cx={x} cy={y} r="17" fill={due ? "#f5a623" : "#3ecf8e"} stroke="#0b0f1e" strokeWidth="3" />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0b0f1e">{t}</text>
          </g>
        ))}
      </svg>
      <div className="ga-mapcard">
        <b>4 VIPs within 5 miles</b>
        <small>Jen's birthday tomorrow · The Reyes' anniversary Friday</small>
        <span className="ga-refer">Plan route</span>
      </div>
    </div>
  );
}

function Lounge() {
  const posts: [string, string, string, string][] = [
    ["KB", "Kris B. · Denver", "Paired our fall mixer with a food-bank drive. 38 RSVPs, 3 listing conversations.", "24 ♥ · 9 comments"],
    ["TJ", "Tanya J. · Boise", "Video texts on birthdays are getting me 2 coffees a week. Keep them under 30 seconds.", "31 ♥ · 12 comments"],
  ];
  return (
    <div className="ga-lounge">
      <p className="ga-h1">The Lounge</p>
      <div className="ga-live">
        <b>LIVE</b> Coaching call · Thu 11:00am
      </div>
      {posts.map(([ini, who, txt, meta]) => (
        <div key={who} className="ga-post">
          <span className="ga-av">{ini}</span>
          <span className="ga-tk">
            <b>{who}</b>
            <span className="ga-ptxt">{txt}</span>
            <small>{meta}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function Score() {
  return (
    <div className="ga-scorescr">
      <p className="ga-h1">Scoreboard</p>
      <div className="ga-bigring">
        <Ring value={26} max={26} size={170} />
        <span>
          <b>26</b>/26
        </span>
      </div>
      <div className="ga-stats">
        <span>
          <b>13</b> day streak
        </span>
        <span>
          <b>#1</b> this week
        </span>
      </div>
      <ol className="ga-board">
        <li className="ga-mine">
          <em>👑</em> Sarah B. <b>412</b>
        </li>
        <li>
          <em>2</em> Tanya J. <b>398</b>
        </li>
        <li>
          <em>3</em> Kris B. <b>377</b>
        </li>
      </ol>
    </div>
  );
}
