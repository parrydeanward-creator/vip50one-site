"use client";

import type { CSSProperties } from "react";
import Showcase from "./Showcase.tsx";
import { MOVE_STEPS } from "@/lib/showcase.ts";

// ONE MOVE showcase (Parry, 30 Sep): the web CRM on a laptop. Every screen is
// a feature in vip50-web-crm main (read 30 Sep): the AI Intelligence brief,
// "What's my next move?" with a Talk Track, the Relationships board, the Touch
// Audit, the Mixer Hub's AI invite designer, the Newsletter builder, Landing
// pages, Action Plans, calendar time blocks and the monthly market report.

const T = "#2fb7a3";
const G = "#f5a623";
const d = (ms: number): CSSProperties => ({ animationDelay: `calc(var(--s) * ${ms}ms)` });

export default function MoveFilm({ record = false, slow = 1 }: { record?: boolean; slow?: number }) {
  return (
    <Showcase
      name="ONE MOVE"
      accent={T}
      steps={MOVE_STEPS}
      outro={["ONE MOVE.", "Every relationship, working for you.", "Part of ONE."]}
      record={record}
      slow={slow}
      render={(s) => <MoveScreen id={s.screen} />}
    />
  );
}

const NAV = ["Dashboard", "Relationships", "Touch Audit", "Mixers", "Newsletter", "Pages", "Plans", "Calendar"];
const navFor: Record<string, number> = { brief: 0, next: 0, board: 1, touch: 2, mixer: 3, news: 4, pages: 5, plans: 6, calendar: 7, report: 4 };

function Shell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="mv">
      <aside className="mv-nav">
        <b>ONE <span style={{ color: T }}>MOVE</span></b>
        {NAV.map((n, k) => (
          <span key={n} className={navFor[id] === k ? "on" : undefined}>{n}</span>
        ))}
      </aside>
      <main className="mv-main">{children}</main>
    </div>
  );
}

const Gold = ({ children }: { children: React.ReactNode }) => <b style={{ color: G }}>{children}</b>;

function MoveScreen({ id }: { id: string }) {
  if (id === "splash")
    return (
      <div className="mv-splash">
        <div className="ga-logo" style={{ fontSize: 96 }}>
          ONE <b style={{ color: T }}>MOVE</b>
        </div>
        <p>Every relationship, working for you.</p>
      </div>
    );
  return <Shell id={id}>{body(id)}</Shell>;
}

function body(id: string) {
  switch (id) {
    case "brief":
      return (
        <>
          <p className="mv-h">Good morning, Sarah</p>
          <div className="mv-card mv-brief">
            <div className="mv-row">
              <span className="mv-lbl" style={{ color: T }}>AI Intelligence brief</span>
              <span className="mv-btn sc-in" style={d(0)}>Generate my brief</span>
            </div>
            <p className="mv-think sc-flash" style={d(500)}>Thinking…</p>
            <p className="sc-in" style={d(1500)}>
              <Gold>Amy Chen</Gold> sent you her second referral this year; thank her today. <Gold>Kim Patel</Gold> opened your newsletter three times and asked about schools. She is warming up.
            </p>
            <p className="sc-in" style={d(2400)}>
              <Gold>Dave Kim</Gold> has gone 94 days without a note. Call <Gold>Jen Alvarez</Gold> first: her birthday is tomorrow.
            </p>
          </div>
        </>
      );
    case "next":
      return (
        <>
          <p className="mv-h">Kim Patel</p>
          <p className="mv-sm">Biz VIP · last touch 12 days ago · opened 3 newsletters</p>
          <div className="mv-ask sc-in" style={d(0)}>What's my next move?</div>
          <div className="mv-card sc-in" style={d(900)}>
            <span className="mv-lbl" style={{ color: T }}>Next move</span>
            <p>Text her the school ratings for Willow Creek, then invite her to Thursday's mixer.</p>
          </div>
          <div className="mv-card mv-talk sc-in" style={d(1900)}>
            <span className="mv-lbl" style={{ color: T }}>Talk Track · text</span>
            <p className="op-type" style={{ animationDuration: "calc(var(--s) * 1400ms)", animationDelay: "calc(var(--s) * 2300ms)" }}>
              "Hi Kim! You asked about schools. Willow Creek Elementary is rated 9/10. Want me to send the homes near it?"
            </p>
            <div className="mv-row" style={{ justifyContent: "flex-start", gap: 8 }}>
              <span className="mv-btn ghost">Copy</span>
              <span className="mv-btn sc-in" style={d(3800)}>I sent this — log it</span>
            </div>
          </div>
        </>
      );
    case "board": {
      const cols: [string, string[]][] = [
        ["New Connection", ["Ray Ortiz", "Mia Stone"]],
        ["Rising VIP", ["Kim Patel"]],
        ["Biz VIP", ["Tom Nash", "Lena Brooks"]],
        ["VIP-50", ["Jen Alvarez", "Marcus Lee"]],
        ["Champion", ["Dave Kim"]],
        ["Ambassador", ["Amy Chen"]],
      ];
      return (
        <>
          <div className="mv-row">
            <p className="mv-h">Relationships</p>
            <span className="mv-sm">Mayor's Circle · 3 of 20</span>
          </div>
          <div className="mv-board">
            {cols.map(([c, people], k) => (
              <div key={c} className={`mv-col ${c === "VIP-50" ? "vip" : ""}`}>
                <span className="mv-colh">{c}</span>
                {people.map((p) => (
                  <span key={p} className="mv-pc">{p}</span>
                ))}
                {c === "VIP-50" && <span className="mv-pc mv-drop sc-drop" style={d(600)}>Kim Patel</span>}
                {k === 1 && <span className="mv-ghost sc-fade" style={d(600)} />}
              </div>
            ))}
          </div>
          <div className="mv-toast sc-in" style={d(2200)}>Kim Patel is now a VIP-50. Her onboarding plan has started.</div>
        </>
      );
    }
    case "touch": {
      const rows: [string, number, number][] = [
        ["Jen Alvarez", 5, 2],
        ["Marcus Lee", 4, 3],
        ["Amy Chen", 5, 3],
        ["Dave Kim", 2, 1],
        ["Kim Patel", 3, 0],
      ];
      return (
        <>
          <div className="mv-row">
            <p className="mv-h">Touch Audit · September</p>
            <span className="mv-sm">Monthly: call, video text, social, newsletter, mixer · Quarterly: face-to-face, note, drop-by</span>
          </div>
          <div className="mv-table">
            {rows.map(([n, m, q], k) => (
              <div key={n} className="mv-tr sc-in" style={d(200 + k * 180)}>
                <b>{n}</b>
                <span className="mv-dots">
                  {Array.from({ length: 5 }, (_, j) => (
                    <i key={j} className={j < m || (n === "Dave Kim" && j === 2) ? "on" : ""} style={n === "Dave Kim" && j === 2 ? { ...d(2200), animation: "mv-on calc(var(--s) * 400ms) both" } : undefined} />
                  ))}
                </span>
                <span className="mv-num">{n === "Dave Kim" ? <><s className="sc-out" style={d(2200)}>2</s><em className="sc-in" style={d(2300)}>3</em></> : m}/5</span>
                <span className="mv-dots q">
                  {Array.from({ length: 3 }, (_, j) => (
                    <i key={j} className={j < q ? "on" : ""} />
                  ))}
                </span>
                <span className="mv-num">{q}/3</span>
              </div>
            ))}
          </div>
          <div className="mv-toast sc-in" style={d(2400)}>✓ Touch logged · Dave Kim · call</div>
        </>
      );
    }
    case "mixer":
      return (
        <>
          <div className="mv-row">
            <p className="mv-h">Fall Client Mixer · Thu 6pm</p>
            <span className="mv-btn">Refine with AI</span>
          </div>
          <p className="mv-sm">AI Invite Designer · 3 concepts</p>
          <div className="mv-concepts">
            {[
              ["#1d3b5c", "#f5a623", "Harvest Evening", "Wine, bites and good people."],
              ["#2b1d3f", "#e08ab5", "Porch Lights", "An evening with neighbors."],
              ["#0f3b36", T, "Thank-You Night", "For the people who make it all work."],
            ].map(([bg, fg, t, s], k) => (
              <div key={t} className={`mv-inv sc-in ${k === 0 ? "pick" : ""}`} style={{ background: bg, ...d(300 + k * 350) }}>
                <small style={{ color: fg }}>YOU'RE INVITED</small>
                <b>{t}</b>
                <span>{s}</span>
                <em>Thu Oct 8 · 6pm</em>
              </div>
            ))}
          </div>
          <div className="mv-row" style={{ marginTop: 12 }}>
            <span className="mv-sm">Send by text or email · Instagram story · Print</span>
            <span className="mv-rsvp sc-in" style={d(2000)}>
              RSVPs <b className="sc-count">24</b> yes · 6 maybe
            </span>
          </div>
        </>
      );
    case "news":
      return (
        <div className="mv-news">
          <div className="mv-blocks">
            <span className="mv-lbl">Blocks</span>
            {["Header", "Market Pulse", "Featured home", "Local event", "Tip", "Footer"].map((b) => (
              <span key={b}>{b}</span>
            ))}
          </div>
          <div className="mv-paper">
            <b className="mv-ph">The Willow Creek Letter · October</b>
            <div className="mv-pulse sc-in" style={d(300)}>
              <span className="mv-lbl" style={{ color: T }}>Market Pulse</span>
              <div>
                <span><b>$598K</b> median price</span>
                <span><b>21</b> days on market</span>
                <span><b>+3.1%</b> this year</span>
              </div>
            </div>
            <span className="mv-btn sc-in" style={{ ...d(900), alignSelf: "flex-start" }}>Fill with AI</span>
            <p className="op-type" style={{ animationDuration: "calc(var(--s) * 1400ms)", animationDelay: "calc(var(--s) * 1300ms)" }}>
              Fall is here, and so are the buyers. Homes near Willow Creek are selling in three weeks. Here's what that means for you…
            </p>
            <div className="mv-toast sc-in" style={{ ...d(3200), position: "static", marginTop: 10 }}>✅ Sent to 42 contacts!</div>
          </div>
        </div>
      );
    case "pages":
      return (
        <>
          <p className="mv-h">Landing pages</p>
          <div className="mv-pages">
            {[
              ["Home Value", "What's my home worth?", "18 leads"],
              ["Buyer Guide", "Buying in Willow Creek", "9 leads"],
              ["Open House Sign-In", "742 Willow Lane", "31 leads"],
              ["Meet the Agent", "Sarah Mitchell", "6 leads"],
            ].map(([t, s, n], k) => (
              <div key={t} className="mv-page sc-in" style={d(200 + k * 250)}>
                <div className="mv-thumb" />
                <b>{t}</b>
                <small>{s}</small>
                <em style={{ color: T }}>{n}</em>
              </div>
            ))}
          </div>
          <div className="mv-toast sc-in" style={d(2000)}>New lead · Ray Ortiz · Home Value · tagged and on the Seller plan</div>
        </>
      );
    case "plans":
      return (
        <>
          <p className="mv-h">Action Plans</p>
          <p className="mv-sm">New Seller Lead · starts when a lead comes from Home Value</p>
          <div className="mv-plan">
            {[
              ["Day 0", "Email", "Your home value report"],
              ["Day 1", "Task", "Call to walk through it"],
              ["Day 3", "Text", "Any questions about the numbers?"],
              ["Day 7", "Email", "What sold near you this week"],
              ["Day 14", "Task", "Invite to the next mixer"],
              ["Day 30", "Email", "Your market report"],
            ].map(([day, kind, what], k) => (
              <div key={day} className="mv-pstep sc-in" style={d(200 + k * 260)}>
                <span className="mv-day">{day}</span>
                <span className={`mv-kind ${kind.toLowerCase()}`}>{kind}</span>
                <span>{what}</span>
              </div>
            ))}
          </div>
        </>
      );
    case "calendar": {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      const blocks: [number, number, number, string, boolean][] = [
        [0, 0, 2, "Power Hour", true],
        [1, 0, 2, "Power Hour", true],
        [2, 0, 2, "Power Hour", true],
        [3, 0, 2, "Power Hour", true],
        [4, 0, 2, "Power Hour", true],
        [0, 3, 2, "Listing appt", true],
        [2, 3, 3, "Showings", true],
        [1, 3, 1, "Admin", false],
        [3, 4, 2, "Mixer prep", false],
        [4, 3, 2, "Drop-bys", true],
      ];
      return (
        <div className="mv-cal">
          <div className="mv-week">
            {days.map((dd, k) => (
              <div key={dd} className="mv-day2">
                <span>{dd}</span>
                {blocks
                  .filter((b) => b[0] === k)
                  .map(([, top, h, t, gold], j) => (
                    <i key={j} className={`sc-in ${gold ? "gold" : ""}`} style={{ top: 26 + top * 44, height: h * 44 - 6, ...d(100 + k * 120 + j * 60) }}>
                      {t}
                    </i>
                  ))}
              </div>
            ))}
          </div>
          <div className="mv-ana sc-in" style={d(1500)}>
            <span className="mv-lbl" style={{ color: G }}>This week</span>
            <b>
              <span className="sc-count">18</span> hrs
            </b>
            <small>revenue time</small>
            <div className="mv-bar">
              <i style={{ width: "72%" }} />
            </div>
            <small>72% of your blocked time</small>
            <p>Gold = revenue time = money time</p>
          </div>
        </div>
      );
    }
    case "report":
    default:
      return (
        <div className="mv-report">
          <div className="mv-paper">
            <small style={{ color: T }}>MONTHLY MARKET REPORT · OCTOBER 1</small>
            <b className="mv-ph">Willow Creek, this month</b>
            <div className="mv-stats">
              {[
                ["42", "homes sold"],
                ["$598K", "median price"],
                ["21", "days on market"],
                ["98.6%", "of list price"],
              ].map(([n, l], k) => (
                <span key={l} className="sc-in" style={d(300 + k * 250)}>
                  <b>{n}</b>
                  {l}
                </span>
              ))}
            </div>
            <div className="mv-spark">
              {[40, 46, 44, 52, 58, 55, 61, 66, 64, 70, 74, 78].map((h, k) => (
                <i key={k} className="sc-grow" style={{ height: h, ...d(1200 + k * 70) }} />
              ))}
            </div>
            <p className="mv-sm">Subscribed: Jen Alvarez, Willow Creek. Sent on the 1st, from you.</p>
          </div>
        </div>
      );
  }
}
