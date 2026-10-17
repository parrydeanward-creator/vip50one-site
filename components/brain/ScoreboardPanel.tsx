"use client";

import { useEffect, useState } from "react";
import type { GraphNode } from "@/lib/graph/types.ts";
import { badgesUrl, readBadges, type Badges } from "@/lib/badges.ts";
import { partnerLine, type PartnersState } from "@/lib/partners.ts";
import { GROUP_TITLE, groupOf, weekWinsFrom, winHome, type WeekWinsLive, type WinHome, type Wins } from "@/lib/wins.ts";
import { COMING, leaderRows } from "@/lib/oneYou.ts";
import { missionDot, missionLine, scoreWeeks, streakXpLines, weeklyScoreLines, type ScoreboardLive, type ScoreWeek } from "@/lib/scoreboard.ts";
import type { Team } from "@/lib/team.ts";

// The Scoreboard in ONE YOU (Parry, 16 Oct: "yes on combining into Scoreboard"; walker 2026-10-16-1905 to -1938). One
// side panel, in Parry's order: Mission Control, Leaderboard, Your partners, Badges this week, Streak and XP, This week's
// wins. Every section reads what the Brain already reads (the team leaderboard §3u, partners §3s, my_weekly_badges() via
// /api/badges, wins §3t); the example agent's come from the demo graph. A section ONE MOVE does not answer to the Brain
// yet says so in one line, never an empty box. Nothing here is sent; Accept and Decline answer a partner invite only on
// the agent's tap.

type Act = { action: "respond" | "end" | "nudge"; pairId: string; accept?: boolean; kind?: string };

const kidsOf = (nodes: GraphNode[], id: string) => nodes.filter((n) => n.parentId === id);
const statOf = (n: GraphNode, label: string) => n.stats?.find((s) => s.label === label)?.value ?? null;

function Coming({ what }: { what: string }) {
  return (
    <p className="pm-empty sb-coming">
      {COMING}: {what}
    </p>
  );
}

export default function ScoreboardPanel({
  node,
  nodes,
  live,
  today,
  team,
  partners,
  wins,
  weekWins,
  scoreboard,
  weekScores,
  onPartner,
  onOpenPartners,
  onOpenWins,
  onOpenTeam,
  onWhere,
}: {
  node: GraphNode;
  nodes: GraphNode[];
  live: boolean;
  today: string;
  team: Team | null;
  partners: PartnersState | null;
  wins: Wins | null;
  /** ONE MOVE's own count of this week (`/api/brain/wins?week=this`); the year's `wins` is the fallback and the demo. */
  weekWins?: WeekWinsLive | null;
  /** ONE MOVE's Mission Control, streak and XP (`/api/brain/scoreboard`, vip50-web-crm#281); the demo graph's otherwise. */
  scoreboard?: ScoreboardLive | null;
  /** The 100-standard weekly scores from ONE MOVE /api/brain/history (the Weekly Review's weeks): used only when the
   *  scoreboard route sends no `history` of its own (lib/scoreboard.ts scoreWeeks). */
  weekScores?: ScoreWeek[] | null;
  onPartner: (a: Act) => Promise<string | null>;
  onOpenPartners: () => void;
  onOpenWins: () => void;
  onOpenTeam?: () => void;
  onWhere: (w: WinHome) => void;
}) {
  const [badges, setBadges] = useState<Badges | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!live) return;
    fetch(badgesUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setBadges(readBadges(j)))
      .catch(() => {});
  }, [live]);

  const mission = kidsOf(nodes, "sc-mission");
  const demoBadges = kidsOf(nodes, "sc-badges");
  const streakNode = nodes.find((n) => n.id === "sc-streak");
  const xpNode = nodes.find((n) => n.id === "sc-xp");
  const leaderNode = nodes.find((n) => n.id === "sc-leader");
  const streak = streakNode?.secondaryLabel ?? statOf(node, "Streak");
  const rank = statOf(node, "Leaderboard");
  const rows = team ? leaderRows(team) : [];
  const week = weekWinsFrom(weekWins, wins?.wins, today)?.mine ?? null;
  const sx = scoreboard ? streakXpLines(scoreboard) : null;
  // One source: the scoreboard route's weeks (weekly_scores); the history route's only when it sends none.
  const ws = weeklyScoreLines(scoreWeeks(scoreboard, weekScores), today);
  const DOT = { healthy: "#3fbf7f", attention: "#f5c542", idle: "rgba(160,175,210,0.45)" };
  const earned = badges ? badges.weekly.filter((b) => b.earned) : null;

  const respond = async (pairId: string, accept: boolean) => {
    setBusy(true);
    setMsg(null);
    const err = await onPartner({ action: "respond", pairId, accept });
    setBusy(false);
    setMsg(err ?? (accept ? "Accepted. You now see each other's weekly score and streak." : "Declined. Nothing was shared."));
  };

  return (
    <div className="sb-panel">
      <h2>Mission Control</h2>
      {scoreboard && scoreboard.mission.length ? (
        <>
          <p className="d-sum">{`${missionLine(scoreboard.mission)} this week, the same as ONE GO.`}</p>
          <ul className="pm-list pm-compact">
            {scoreboard.mission.map((m) => (
              <li key={m.title}>
                <i className="pm-dot" style={{ background: DOT[missionDot(m.status)] }} aria-hidden="true" />
                <span className="pm-body">
                  <b>{m.title}</b>
                  <small>{`${m.status} · ${m.progressLabel}${m.earns ? ` · ${m.earns}` : ""}`}</small>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : mission.length ? (
        <ul className="pm-list pm-compact">
          {mission.map((m) => (
            <li key={m.id}>
              <i className="pm-dot" style={{ background: m.status === "healthy" ? "#3fbf7f" : m.status === "attention" ? "#f5c542" : "rgba(160,175,210,0.45)" }} aria-hidden="true" />
              <span className="pm-body">
                <b>{m.label}</b>
                {m.secondaryLabel ? <small>{m.secondaryLabel}</small> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Coming what="this week's targets (Agent Attraction, Set Up Open House, Daily Tracker, VIP-50 touches, Scheduled Tasks, Check-In Streak, Relationship Momentum), the same as ONE GO." />
      )}

      <h2>Leaderboard</h2>
      {rows.length ? (
        <>
          <ol className="pm-list pm-compact">
            {rows.map((r) => (
              <li key={`${r.place}-${r.name}`} className={r.me ? "picked" : undefined}>
                <span className="pm-time">#{r.place}</span>
                <span className="pm-body">
                  <b>{r.name}</b>
                  <small>{`${r.score} this week`}</small>
                </span>
              </li>
            ))}
          </ol>
          {onOpenTeam ? (
            <button className="link" onClick={onOpenTeam}>
              Full screen, for the office TV
            </button>
          ) : null}
        </>
      ) : leaderNode?.summary ? (
        <p className="d-sum">{leaderNode.summary}</p>
      ) : (
        <>
          {rank ? <p className="d-sum">{`You are ${rank} this week.`}</p> : null}
          <Coming what="the other agents on this week's leaderboard, by first name." />
        </>
      )}

      <h2>Your partners</h2>
      {partners ? (
        <>
          {partners.partners.length || partners.invitesIn.length ? (
            <ul className="pm-list pm-compact">
              {partners.partners.map((p) => (
                <li key={p.pairId}>
                  <i className="pm-dot" style={{ background: p.score != null && p.score >= p.minimum ? "#3fbf7f" : "#f5c542" }} aria-hidden="true" />
                  <span className="pm-body">
                    <b>{p.name}</b>
                    <small>{`${partnerLine(p)} · ${p.streak ? `${p.streak}-week streak` : "no streak yet"} · ${p.tickedToday ? "ticked today" : "not ticked today"}`}</small>
                  </span>
                </li>
              ))}
              {partners.invitesIn.map((i) => (
                <li key={i.pairId}>
                  <i className="pm-dot" style={{ background: "#f5c542" }} aria-hidden="true" />
                  <span className="pm-body">
                    <b>{`${i.name} wants to be your accountability partner`}</b>
                    <small>You would see each other's weekly score, last 4 weeks, streak and whether today was ticked. Nothing else.</small>
                  </span>
                  <span className="pm-acts">
                    <button disabled={busy} onClick={() => void respond(i.pairId, true)}>Accept</button>
                    <button disabled={busy} onClick={() => void respond(i.pairId, false)}>Decline</button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pm-empty">No accountability partner yet. Invite one from a member's card in the Lounge (up to 3).</p>
          )}
          {msg ? <p className="pm-note" role="status">{msg}</p> : null}
          {partners.partners.length ? (
            <button className="link" onClick={onOpenPartners}>
              Last 4 weeks, and send a nudge
            </button>
          ) : null}
        </>
      ) : (
        <Coming what="your accountability partners (up to 3): their weekly score against 100, streak, and whether today was ticked." />
      )}

      <h2>Badges this week</h2>
      {badges ? (
        <ul className="pm-list pm-compact">
          {badges.weekly.map((b) => (
            <li key={b.name}>
              <i className="pm-dot" style={{ background: b.earned ? "#3fbf7f" : "rgba(160,175,210,0.45)" }} aria-hidden="true" />
              <span className="pm-body">
                <b>{b.name}</b>
                <small>{b.earned ? "Earned this week" : `${b.count} of ${b.target}`}</small>
              </span>
            </li>
          ))}
        </ul>
      ) : demoBadges.length ? (
        <ul className="pm-list pm-compact">
          {demoBadges.map((b) => (
            <li key={b.id}>
              <i className="pm-dot" style={{ background: b.status === "healthy" ? "#3fbf7f" : "rgba(160,175,210,0.45)" }} aria-hidden="true" />
              <span className="pm-body">
                <b>{b.label}</b>
                {b.secondaryLabel ? <small>{b.secondaryLabel}</small> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Coming what="this week's badges (earned, never given)." />
      )}

      <h2>Streak and XP</h2>
      <ul className="pm-list pm-compact">
        <li>
          <span className="pm-time">Streak</span>
          <span className="pm-body">
            <b>{sx?.streak ?? streak ?? COMING}</b>
            <small>{sx ? "Days in a row with ONE GO opened. +10 XP each check-in." : streakNode?.summary ?? "Days in a row with ONE GO opened. +10 XP each check-in."}</small>
          </span>
        </li>
        {ws ? (
          <li>
            <span className="pm-time">Score</span>
            <span className="pm-body">
              <b>{`Weekly score: ${ws.big}`}</b>
              <small>{ws.note}</small>
            </span>
          </li>
        ) : null}
        <li>
          <span className="pm-time">XP</span>
          <span className="pm-body">
            <b>{sx?.xp ?? xpNode?.secondaryLabel ?? COMING}</b>
            <small>{sx?.xpNote ?? xpNode?.summary ?? "This week's XP and your total, the same numbers as ONE GO's Scoreboard."}</small>
          </span>
        </li>
      </ul>

      <h2>This week&apos;s wins</h2>
      {week ? (
        <>
          <ul className="pm-list pm-compact">
            {earned && earned.length ? (
              <li>
                <i className="pm-dot pm-special" aria-hidden="true" />
                <span className="pm-body">
                  <b>{`${earned.length} ${earned.length === 1 ? "badge" : "badges"} earned`}</b>
                  <small>{earned.map((b) => b.name).join(", ")}</small>
                </span>
                <span className="pm-acts">
                  <button onClick={() => onWhere("badges")} aria-label="Open your badges">→</button>
                </span>
              </li>
            ) : null}
            {week.filter((w) => !(earned && w.kind === "badge")).map((w, k) => (
              <li key={`${w.at}-${k}`}>
                <i className="pm-dot pm-special" aria-hidden="true" />
                <span className="pm-body">
                  <b>{w.title}</b>
                  <small>{`${GROUP_TITLE[groupOf(w.kind)]}${w.detail ? ` · ${w.detail}` : ""}`}</small>
                </span>
                <span className="pm-acts">
                  <button onClick={() => onWhere(winHome(w.kind))} aria-label={`Open ${GROUP_TITLE[groupOf(w.kind)]}`}>→</button>
                </span>
              </li>
            ))}
          </ul>
          {!week.length && !(earned && earned.length) ? <p className="pm-empty">None yet this week. A closing, a referral, a five-star review or a badge shows here.</p> : null}
          <button className="link" onClick={onOpenWins}>
            All your wins this year
          </button>
        </>
      ) : (
        <Coming what="this week's badges, five-star reviews, referrals and closings." />
      )}
    </div>
  );
}
