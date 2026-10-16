"use client";

import type { GraphNode } from "@/lib/graph/types.ts";
import { CHALLENGE, COMING, challengeDay } from "@/lib/oneYou.ts";

// The 90-Day Challenge in ONE YOU (Parry, 16 Oct 13:43 MT: "it needs to go much deeper into the 90 day challenge no one
// is going to know what it is for or does based on what is there...fix this"). What it is, the Day 1 setup, the five
// arenas at 20 points each, today's score out of 100, day N of 90, the streak and the group, and the letter and
// certificate on Day 90. Live numbers come from ONE MOVE's challenge_day today; the rest says "Coming from ONE MOVE"
// until GO/MOVE's route answers. The example agent's come from the demo graph. Joining is the agent's own tap, on
// ONE MOVE's own challenge page.

const GREEN = "#3fbf7f";
const GOLD = "#f5c542";
const DIM = "rgba(160,175,210,0.45)";
const ARENA_NODE: Record<string, string> = { body: "ch-body", spirit: "ch-spirit", relationships: "ch-rel", business: "ch-biz", legacy: "ch-legacy" };

export default function ChallengePanel({ node, nodes, live, tour, onOpenPage }: { node: GraphNode; nodes: GraphNode[]; live: boolean; tour: boolean; onOpenPage: () => void }) {
  const byId = (id: string) => nodes.find((n) => n.id === id && n.parentId === node.id) ?? null;
  const stat = (label: string) => node.stats?.find((s) => s.label === label)?.value ?? null;
  const fromLabel = /Day (\d+)/.exec(node.secondaryLabel ?? "");
  const day = challengeDay(node.stats) ?? (fromLabel ? { day: Number(fromLabel[1]), of: 90 } : null);
  const today = stat("Today");
  const logged = stat("Days logged");
  const group = byId("ch-group");
  const started = !!day;

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
              <b>{`Day ${day!.day} of ${day!.of}`}</b>
              <small>{`${Math.max(0, day!.of - day!.day)} days to go`}</small>
            </span>
          </li>
          <li>
            <span className="pm-time">Today</span>
            <span className="pm-body">
              <b>{today ?? COMING}</b>
              <small>Out of 100: five arenas, 20 points each.</small>
            </span>
          </li>
          <li>
            <span className="pm-time">Streak</span>
            <span className="pm-body">
              <b>{logged ? `${logged} days logged` : COMING}</b>
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
          const n = byId(ARENA_NODE[a.key]);
          const got = n?.secondaryLabel ?? null;
          return (
            <li key={a.key}>
              <i className="pm-dot" style={{ background: !got ? DIM : n?.status === "attention" ? GOLD : GREEN }} aria-hidden="true" />
              <span className="pm-body">
                <b>{`${a.name}${got ? `: ${got}` : started && live ? `: ${COMING.toLowerCase()}` : " · 20 points"}`}</b>
                <small>{a.items.join(" · ")}</small>
              </span>
            </li>
          );
        })}
      </ul>

      <h2>Day 1: your setup</h2>
      <ul className="pm-list pm-compact">
        {CHALLENGE.day1.map((d) => (
          <li key={d.title}>
            <i className="pm-dot" style={{ background: d.title === "The sealed letter" ? GOLD : DIM }} aria-hidden="true" />
            <span className="pm-body">
              <b>{d.title}</b>
              <small>{d.title === "The sealed letter" && started ? `Sealed until Day ${day!.of}.` : d.line}</small>
            </span>
          </li>
        ))}
      </ul>

      <h2>Together</h2>
      <p className="d-sum">
        {CHALLENGE.together}
        {group?.secondaryLabel ? ` ${group.secondaryLabel}.` : started && live ? ` ${COMING}: your group streak and buddy.` : ""}
      </p>
      <p className="d-sum">{CHALLENGE.end}</p>

      {!tour ? (
        <button className="pi-film pm-open" onClick={onOpenPage}>
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
