"use client";

import type { GraphNode } from "@/lib/graph/types.ts";
import type { Need } from "@/lib/needs.ts";
import { leaderRows } from "@/lib/oneYou.ts";
import { ONB_NODE, onbLine, onbNodeId, type OnbMember } from "@/lib/onboarding.ts";
import { ONB_RULE, TEAM_HUB, partLines } from "@/lib/teamHub.ts";
import { TEAM_NODE, type Team } from "@/lib/team.ts";
import { SLOW_MINUTES, WAR_NODE, agentLines, minutesWords, totals, type WarRoom } from "@/lib/warroom.ts";

const DOT: Record<string, string> = { now: "#ff5a6a", today: "#f5c542" };

// The Team orb's side panels (lib/teamHub.ts): the Team orb lists its three parts; each part shows what it holds
// (never a near-empty panel). Each row opens its orb exactly as a tap on the orb does.
export default function TeamHubPanel({ id, team, war, onb, removed, now, needs, openOrb }: {
  id: string;
  team: Team | null;
  war: WarRoom | null;
  onb: OnbMember[] | null;
  removed: string[];
  now: number;
  needs: Map<string, Need>;
  openOrb: (id: string) => void;
}) {
  const lines = partLines({ lead: true, team, war, onb, removed, now });
  const mark = (nid: string) => {
    const n = needs.get(nid);
    return n ? <em style={{ color: DOT[n.level] }}>{n.count}</em> : <em style={{ color: "#7ee2a8" }}>OK</em>;
  };
  if (id === TEAM_HUB) {
    const parts = [
      { id: TEAM_NODE, label: "Leaderboard", line: lines.leaderboard, what: "The week's ranking, full screen for the office TV." },
      { id: WAR_NODE, label: "War room", line: lines.war, what: "Team leads coming in, who has each and how fast they were reached." },
      { id: ONB_NODE, label: "Onboarding", line: lines.onboarding, what: "Each new member's Getting started list, day of 30, and a Nudge." },
    ];
    return (
      <div className="d-list">
        <h2>Your team, three parts</h2>
        <ul>
          {parts.map((p) => (
            <li key={p.id}>
              <button onClick={() => openOrb(p.id)}>
                <i style={{ background: needs.get(p.id) ? DOT[needs.get(p.id)!.level] : "#7ee2a8" }} />
                <span>
                  <b>{p.label}</b>
                  <small>{p.line}</small>
                  <small>{p.what}</small>
                </span>
                {mark(p.id)}
              </button>
            </li>
          ))}
        </ul>
        <p className="pf-sub">Only you and the team's admins see this. Your agents see their own place on the Scoreboard.</p>
      </div>
    );
  }
  if (id === TEAM_NODE) {
    const rows = team && team.agents.length ? leaderRows(team, 8) : [];
    return (
      <div className="d-list">
        <h2>This week</h2>
        {rows.length ? (
          <ol className="th-rank">
            {rows.map((r) => (
              <li key={`${r.place}-${r.name}`} className={r.me ? "me" : undefined}>
                <span>#{r.place}</span>
                <b>{r.name}</b>
                <small>{r.score >= (team?.minimum ?? 100) ? `${r.score}, at the ${team?.minimum ?? 100}` : `${r.score} of ${team?.minimum ?? 100}`}</small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="d-sum">The week's scores show here as soon as ONE MOVE answers. Each agent's daily and weekly tracker points add up to one weekly score; the standard is 100.</p>
        )}
        <p className="pf-sub">First names, photos and weekly scores only. Nothing about contacts, goals or commitments.</p>
      </div>
    );
  }
  if (id === WAR_NODE) {
    if (!war) {
      return (
        <div className="d-list">
          <h2>Team leads</h2>
          <p className="d-sum">No team leads in the last 7 days. When a lead comes in from the team site or an ad, it shows here: who has it, and whether they reached it within {SLOW_MINUTES} minutes.</p>
        </div>
      );
    }
    const t = totals(war, now);
    const people = agentLines(war, now).slice(0, 6);
    return (
      <div className="d-list">
        <h2>Right now</h2>
        <dl className="th-figs">
          <div><dt>Today</dt><dd>{t.today}</dd></div>
          <div className={t.late ? "now" : undefined}><dt>Late ({SLOW_MINUTES} min)</dt><dd>{t.late}</dd></div>
          <div className={t.waiting ? "today" : undefined}><dt>Waiting</dt><dd>{t.waiting}</dd></div>
          <div className={t.pond ? "today" : undefined}><dt>Lead pool</dt><dd>{t.pond}</dd></div>
          <div><dt>Typical reach</dt><dd>{minutesWords(t.median)}</dd></div>
          <div className={t.dueToday ? "today" : undefined}><dt>Deals under contract</dt><dd>{t.deals}</dd></div>
        </dl>
        <h2>Who has them</h2>
        <ul className="th-people">
          {people.map((a) => (
            <li key={a.id}>
              <b>{a.name}</b>
              <small>
                {a.leads ? `${a.leads} ${a.leads === 1 ? "lead" : "leads"}, ${a.reached} reached` : "No leads this week"}
                {a.late ? `, ${a.late} late` : a.waiting ? `, ${a.waiting} waiting` : ""}
              </small>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (id === ONB_NODE) {
    const ms = onb ?? [];
    return (
      <div className="d-list">
        <h2>Setting up</h2>
        {ms.length ? (
          <ul>
            {ms.map((m) => (
              <li key={m.id}>
                <button onClick={() => openOrb(onbNodeId(m.id))}>
                  <i style={{ background: m.urgency ? DOT[m.urgency] : "#7ee2a8" }} />
                  <span>
                    <b>{m.name}</b>
                    <small>{onbLine(m)}</small>
                    <small>{m.readyForLeads ? "Ready for leads" : "Not ready for leads yet"}</small>
                  </span>
                  <em style={{ color: m.urgency ? DOT[m.urgency] : "#7ee2a8" }}>Day {m.day} of 30</em>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="d-sum">No one is setting up right now. When you add someone to the team, their Getting started list shows here for their first 30 days.</p>
        )}
        <p className="pf-sub">{ONB_RULE}</p>
        {removed.length ? <p className="pf-sub">{removed.join(". ")}.</p> : null}
      </div>
    );
  }
  return null;
}

/** Whether the focused orb is the Team orb or one of its parts (the panel chip then says Team, not ONE YOU). */
export const isHubPart = (n: GraphNode) => n.id === TEAM_HUB || n.parentId === TEAM_HUB || n.id.startsWith(`${ONB_NODE}:`);
