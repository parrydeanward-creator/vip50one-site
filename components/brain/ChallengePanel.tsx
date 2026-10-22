"use client";

import type { GraphNode } from "@/lib/graph/types.ts";
import { CHALLENGE, COMING, challengeDay } from "@/lib/oneYou.ts";
import { challengeLine, type LiveChallenge } from "@/lib/challenge.ts";

// The 90-Day Challenge orb's side panel. The challenge itself opens full screen (ChallengeView.tsx, Parry's approved
// page of 22 Oct: "yes on both"); this keeps what it is and the day at a glance, and every row opens that page (rule 12).

export default function ChallengePanel({ node, data, tour, onOpenView }: { node: GraphNode; data: LiveChallenge | null; tour: boolean; onOpenView: () => void }) {
  const on = data?.enrolled ? data : null;
  const day = on ? (on.day > 0 ? { day: on.day, of: on.of } : null) : challengeDay(node.stats);
  const line = on ? challengeLine(on) : null;
  const rows: { k: string; b: string; s: string }[] = on
    ? [
        { k: "Day", b: line ?? (day ? `Day ${day.day} of ${day.of}` : "Starting"), s: on.finished ? "Your finish line, certificate and a new 90." : `${Math.max(0, on.of - on.day)} days to go` },
        { k: "Today", b: `${on.today.points} / 100`, s: "Five arenas, 20 points each, 5 a box." },
        { k: "Streak", b: `${on.streak} ${on.streak === 1 ? "day" : "days"} in a row`, s: "Days in a row you scored your arenas." },
      ]
    : data
      ? []
      : [{ k: "Day", b: day ? `Day ${day.day} of ${day.of}` : COMING, s: "Your ring, today's boxes and the leaderboard." }];
  return (
    <div className="ch-panel">
      <p className="d-sum">
        {node.summary === CHALLENGE.what ? null : <b>{CHALLENGE.what} </b>}
        {CHALLENGE.why}
      </p>
      {rows.length ? (
        <ul className="pm-list pm-compact">
          {rows.map((r) => (
            <li key={r.k}>
              <span className="pm-time">{r.k}</span>
              <span className="pm-body">
                <b>{r.b}</b>
                <small>{r.s}</small>
              </span>
              {tour ? null : (
                <span className="pm-acts">
                  <button onClick={onOpenView} data-act="challenge-row" aria-label={`Open the 90-Day Challenge: ${r.k.toLowerCase()}`}>→</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {tour ? null : (
        <button className="pi-film pm-open" data-act="challenge-row" onClick={onOpenView}>
          <span className="pi-play" aria-hidden="true">↗</span>
          <span>
            <b>{data && !on ? "Start the Challenge" : "Open the 90-Day Challenge"}</b>
            <span>{data && !on ? "What it is, and the Day 1 setup in ONE MOVE." : "Your 90-day ring, today's boxes, the leaderboard and your finish line."}</span>
          </span>
        </button>
      )}
    </div>
  );
}
