"use client";

import type { GraphNode } from "@/lib/graph/types.ts";
import { CHALLENGE, COMING, challengeDay } from "@/lib/oneYou.ts";
import { groupLine, type LiveChallenge } from "@/lib/challenge.ts";

// The 90-Day Challenge in ONE YOU (Parry, 16 Oct 13:43 MT: "it needs to go much deeper into the 90 day challenge no one
// is going to know what it is for or does based on what is there...fix this"). What it is, the Day 1 setup, the five
// arenas at 20 points each, today's score out of 100, day N of 90, the streak and the group, and the letter and
// certificate on Day 90. For a signed-in agent the live numbers come from ONE MOVE's /api/brain/challenge
// (vip50-web-crm#277, lib/challenge.ts): today's score, each arena's points, the streak, the identity statement, the
// enemy and the group; "Coming from ONE MOVE" shows only while that route has not answered. The example agent's come
// from the demo graph. Joining is the agent's own tap, on ONE MOVE's own challenge page (the route's url).

const GREEN = "#3fbf7f";
const GOLD = "#f5c542";
const DIM = "rgba(160,175,210,0.45)";
const ARENA_NODE: Record<string, string> = { body: "ch-body", spirit: "ch-spirit", relationships: "ch-rel", business: "ch-biz", legacy: "ch-legacy" };

export default function ChallengePanel({ node, nodes, live, tour, data, onOpenPage }: { node: GraphNode; nodes: GraphNode[]; live: boolean; tour: boolean; data: LiveChallenge | null; onOpenPage: (url: string) => void }) {
  const byId = (id: string) => nodes.find((n) => n.id === id && n.parentId === node.id) ?? null;
  const stat = (label: string) => node.stats?.find((s) => s.label === label)?.value ?? null;
  const fromLabel = /Day (\d+)/.exec(node.secondaryLabel ?? "");
  // The live answer first; without it, the orb's own numbers (the demo's example agent, or challenge_day alone).
  const on = data?.enrolled ? data : null;
  const day = data ? (on && on.day > 0 ? { day: on.day, of: on.of } : null) : challengeDay(node.stats) ?? (fromLabel ? { day: Number(fromLabel[1]), of: 90 } : null);
  const today = on ? `${on.today.points} / 100` : stat("Today");
  const logged = on ? `${on.streak} ${on.streak === 1 ? "day" : "days"} in a row` : stat("Days logged") ? `${stat("Days logged")} days logged` : null;
  const group = byId("ch-group");
  const started = data ? !!on : !!day;
  const url = data?.url ?? CHALLENGE.pageUrl;

  return (
    <div className="ch-panel">
      <p className="d-sum">
        {node.summary === CHALLENGE.what ? null : <b>{CHALLENGE.what} </b>}
        {CHALLENGE.why}
      </p>

      {started ? (
        <ul className="pm-list pm-compact">
          <li>
            <span className="pm-time">Day</span>
            <span className="pm-body">
              <b>{day ? `Day ${day.day} of ${day.of}` : "Starting"}</b>
              <small>{on && on.status !== "active" ? `Status: ${on.status}` : day ? `${Math.max(0, day.of - day.day)} days to go` : "Day 1 begins on your start date."}</small>
            </span>
          </li>
          <li>
            <span className="pm-time">Today</span>
            <span className="pm-body">
              <b>{today ?? COMING}</b>
              <small>Out of 100: five arenas, 20 points each, 5 a box.</small>
            </span>
          </li>
          <li>
            <span className="pm-time">Streak</span>
            <span className="pm-body">
              <b>{logged ?? COMING}</b>
              <small>Days in a row you scored your arenas.</small>
            </span>
          </li>
        </ul>
      ) : (
        <div className="as-card ch-start">
          <b>You have not started yet.</b>
          <span>What you get: a daily score that keeps your body, spirit, relationships, business and legacy moving together, a group to do it with, and a certificate on Day 90.</span>
        </div>
      )}

      <h2>Every day: five arenas, 100 points</h2>
      <ul className="pm-list pm-compact">
        {CHALLENGE.arenas.map((a) => {
          const lv = on?.today.arenas.find((x) => x.key === a.key);
          if (lv)
            return (
              <li key={a.key}>
                <i className="pm-dot" style={{ background: lv.points >= 20 ? GREEN : lv.points > 0 ? GOLD : DIM }} aria-hidden="true" />
                <span className="pm-body">
                  <b>{`${lv.label}: ${lv.points} / 20`}</b>
                  <small>{`${lv.done} of ${lv.of} done today · ${a.items.join(" · ")}`}</small>
                </span>
              </li>
            );
          const n = byId(ARENA_NODE[a.key]);
          const got = n?.secondaryLabel ?? null;
          return (
            <li key={a.key}>
              <i className="pm-dot" style={{ background: !got ? DIM : n?.status === "attention" ? GOLD : GREEN }} aria-hidden="true" />
              <span className="pm-body">
                <b>{`${a.name}${got ? `: ${got}` : started && live && !data ? `: ${COMING.toLowerCase()}` : " · 20 points"}`}</b>
                <small>{a.items.join(" · ")}</small>
              </span>
            </li>
          );
        })}
      </ul>

      {on && (on.identity || on.enemy.length) ? (
        <>
          <h2>Who you are becoming</h2>
          <ul className="pm-list pm-compact">
            {on.identity ? (
              <li>
                <i className="pm-dot" style={{ background: GOLD }} aria-hidden="true" />
                <span className="pm-body">
                  <b>Your identity statement</b>
                  <small>{on.identity}</small>
                </span>
              </li>
            ) : null}
            {on.enemy.length ? (
              <li>
                <i className="pm-dot" style={{ background: DIM }} aria-hidden="true" />
                <span className="pm-body">
                  <b>The enemy</b>
                  <small>{on.enemy.join(" · ")}</small>
                </span>
              </li>
            ) : null}
          </ul>
        </>
      ) : null}

      <h2>Day 1: your setup</h2>
      <ul className="pm-list pm-compact">
        {CHALLENGE.day1.map((d) => (
          <li key={d.title}>
            <i className="pm-dot" style={{ background: d.title === "The sealed letter" ? GOLD : DIM }} aria-hidden="true" />
            <span className="pm-body">
              <b>{d.title}</b>
              <small>{d.title === "The sealed letter" && started ? `Sealed until Day ${day?.of ?? on?.of ?? 90}.` : d.line}</small>
            </span>
          </li>
        ))}
      </ul>

      <h2>Together</h2>
      <p className="d-sum">
        {CHALLENGE.together}
        {on ? (on.group ? null : " You are not in a group yet: join one on the challenge page.") : group?.secondaryLabel ? ` ${group.secondaryLabel}.` : started && live && !data ? ` ${COMING}: your group streak and buddy.` : ""}
      </p>
      {on?.group ? (
        <div className="as-card ch-group">
          <b>{groupLine(on.group)}</b>
          {on.group.names.length ? <span>{on.group.names.join(", ")}</span> : null}
        </div>
      ) : null}
      <p className="d-sum">{CHALLENGE.end}</p>

      {!tour ? (
        <button className="pi-film pm-open" onClick={() => onOpenPage(url)}>
          <span className="pi-play" aria-hidden="true">↗</span>
          <span>
            <b>{started ? "Open the 90-Day Challenge" : "Start the Challenge"}</b>
            <span>{started ? "Score today's arenas, see your group and the Results wall in ONE MOVE." : "Your tap: the Day 1 setup opens in ONE MOVE, the same sign-up as there."}</span>
          </span>
        </button>
      ) : null}
    </div>
  );
}
