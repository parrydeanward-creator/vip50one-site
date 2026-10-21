"use client";

import { useEffect, useState } from "react";
import { MOVE_URL } from "@/lib/host.ts";

// The team's deals from the team leader's reZEN (Parry, 21 Oct: "show my own on my goals, show the teams on teams
// page"). Deals the leader is on only as team leader never count toward their own goals; they show here: this goal
// year's team closings by agent, and the team's open deals. ONE MOVE GET /api/brain/team/rezen (owner and admin).

type TeamDeal = { id: string; agent: string; address: string | null; on: string | null; price: number | null; side: string | null };
type Answer = {
  connected: boolean; read_at?: string; from?: string; to?: string;
  closed?: TeamDeal[]; open?: TeamDeal[];
  year?: { closings: number; volume: number; gross: number };
  byAgent?: { agent: string; closings: number; volume: number }[];
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const day = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date yet");

export default function TeamRezenSection({ live }: { live: boolean }) {
  const [a, setA] = useState<Answer | null>(null);
  useEffect(() => {
    if (!live) return;
    fetch(`${MOVE_URL}/api/brain/team/rezen`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setA(j && typeof j === "object" ? (j as Answer) : null))
      .catch(() => {});
  }, [live]);
  if (!a?.connected || !a.year) return null;
  return (
    <section className="tr-sec" aria-label="Team deals from reZEN">
      <h2>Team deals from reZEN</h2>
      <p className="d-sum">
        {a.year.closings} team closing{a.year.closings === 1 ? "" : "s"} this goal year, {usd(a.year.volume)} in volume. These are your
        team&apos;s deals you are on as team leader; they don&apos;t count toward your own goals.
      </p>
      {a.byAgent?.length ? (
        <ul className="pm-list pm-compact">
          {a.byAgent.map((x) => (
            <li key={x.agent}><span className="pm-body"><b>{x.agent}</b><small>{x.closings} closing{x.closings === 1 ? "" : "s"} · {usd(x.volume)}</small></span></li>
          ))}
        </ul>
      ) : null}
      {a.open?.length ? (
        <>
          <h3>Under contract now</h3>
          <ul className="pm-list pm-compact">
            {a.open.map((d) => (
              <li key={d.id}><span className="pm-body"><b>{d.agent}{d.side ? ` · ${d.side}` : ""}</b><small>{d.address ?? "Address not given"}{d.price ? ` · ${usd(d.price)}` : ""} · {day(d.on)}</small></span></li>
            ))}
          </ul>
        </>
      ) : null}
      {a.closed?.length ? (
        <>
          <h3>Closed this goal year</h3>
          <ul className="pm-list pm-compact">
            {a.closed.slice(0, 12).map((d) => (
              <li key={d.id}><span className="pm-body"><b>{d.agent}{d.side ? ` · ${d.side}` : ""}</b><small>{d.address ?? "Address not given"}{d.price ? ` · ${usd(d.price)}` : ""} · {day(d.on)}</small></span></li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
