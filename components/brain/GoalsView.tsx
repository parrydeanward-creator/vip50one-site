"use client";

import { useEffect, useRef } from "react";
import GoalsPanel from "./GoalsPanel.tsx";
import ClosingsFoundCard from "./ClosingsFoundCard.tsx";
import { money, type GoalFacts, type GoalKey, type IncomeMap } from "@/lib/goals.ts";
import { monthWords } from "@/lib/forecast.ts";
import type { GoalsThree } from "@/lib/oneYou.ts";

// Goals, opened (Parry, 16 Oct 13:38 MT: "yes do that"): one place for money in ONE YOU, three parts in this order.
// 1 Closed so far (the goals with pace and "Change goal"), 2 Likely next 3 months (the income forecast month by month,
// who makes each month up, the gap against the goal), 3 What to do each week (the Income Map's weekly numbers). All
// three come from the one goals list (lib/oneYou.ts goalsThree), so they cannot disagree. The 12-month forecast and the
// Income Map's own numbers are one tap further. Nothing is sent from here.

const GOLD = "#f5c542";

export default function GoalsView({
  three,
  goals,
  map,
  today,
  demo,
  rezenConnected,
  onSaveGoal,
  onSetStart,
  onClosingLogged,
  onProfile,
  onReferrals,
  referralsLine,
  onPerson,
  onForecast,
  onIncomeMap,
  onPage,
  onClose,
}: {
  three: GoalsThree;
  goals: GoalFacts[];
  map: IncomeMap | null;
  today: string;
  demo: boolean;
  rezenConnected: boolean | null;
  onSaveGoal: (key: GoalKey, value: number) => Promise<string | null>;
  /** Choose when the goal year starts (month, day). */
  onSetStart?: (month: number, day: number) => Promise<string | null>;
  /** Reads the closed count again after a closing found in the MLS is logged. */
  onClosingLogged: () => Promise<unknown> | void;
  onProfile: () => void;
  onReferrals: () => void;
  /** "4 referrals this goal year", the Referrals orb's own count; tapping it opens the orb. */
  referralsLine?: string | null;
  onPerson: (contactId: string) => void;
  onForecast?: () => void;
  onIncomeMap?: () => void;
  /** A ONE MOVE page inside the Brain: Deals behind the closed count, the VIP-50 and Touch Audit behind the weekly numbers. */
  onPage?: (path: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // the forecast or the Income Map opened on top of Goals closes first
      if (document.querySelectorAll('[role="dialog"]').length > 1) return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  const likely = three.likely;
  const max = Math.max(1, ...(likely?.months.map((m) => m.total) ?? [0]));

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="gv-title">
      <div className="fc">
        <div className="fc-head">
          <button ref={closeRef} className="fc-back" onClick={onClose} aria-label="Back to the Brain">←</button>
          <div>
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
            <h1 className="d-title" id="gv-title">Goals</h1>
            <p className="d-sub">What you have closed, what is likely next, and what to do each week.</p>
          </div>
        </div>

        <h2 className="wr-h">1. Closed so far</h2>
        <p className="fc-tip">
          {three.closed.line}
          {onPage ? (
            <>
              {" "}
              <button className="link" data-act="goals-closed" onClick={() => onPage("/deals")}>Open your Deals</button>
            </>
          ) : null}
        </p>
        {referralsLine ? (
          <button className="link gl-refs" onClick={onReferrals} aria-label={`Open Referrals: ${referralsLine}`}>
            {`Referrals: ${referralsLine} →`}
          </button>
        ) : null}
        <GoalsPanel goals={goals} today={today} demo={demo} rezenConnected={rezenConnected} onSave={onSaveGoal} onProfile={onProfile} onReferrals={onReferrals} onSetStart={onSetStart} />
        <ClosingsFoundCard demo={demo} onLogged={onClosingLogged} />

        <h2 className="wr-h">2. Likely next 3 months</h2>
        {likely ? (
          <>
            <p className="fc-tip">{likely.gapLine ?? likely.line}</p>
            <ol className="fc-bars">
              {likely.months.map((m) => (
                <li key={m.month}>
                  <span className="fc-month">{monthWords(m.month)}</span>
                  <span className="fc-track">{m.total ? <span className="fc-bar" style={{ width: `${(m.total / max) * 100}%` }} /> : null}</span>
                  <span className="fc-val">{m.total ? money(m.total) : "–"}</span>
                </li>
              ))}
            </ol>
            <ul className="pm-list pm-compact gv-who">
              {likely.months.map((m) => (
                <li key={m.month}>
                  <span className="pm-time">{monthWords(m.month)}</span>
                  <span className="pm-body">
                    <b>{m.total ? `${money(m.total)} likely` : "Nothing expected yet"}</b>
                    <small>
                      {m.who.length
                        ? m.who.map((w, k) => (
                            <span key={`${w.name}-${k}`}>
                              {k ? ", " : ""}
                              {w.contactId ? (
                                <button className="link gv-person" onClick={() => onPerson(w.contactId!)} aria-label={`Open ${w.name}'s record`}>
                                  {w.name}
                                </button>
                              ) : (
                                w.name
                              )}
                              {w.why === "contract" ? " (under contract)" : w.why === "hot" ? " (Hot)" : ""}
                            </span>
                          ))
                        : m.warm
                          ? "Your Warm people, spread over the coming months"
                          : "No one under contract or Hot for this month"}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
            {onForecast ? (
              <button className="vr-classic" onClick={onForecast}>
                All 12 months, and how it is worked out
              </button>
            ) : null}
          </>
        ) : (
          <p className="pm-empty">Nothing to forecast yet: deals under contract and your Hot and Warm people in ONE MOVE make this up.</p>
        )}

        <h2 className="wr-h">3. What to do each week</h2>
        {three.weekly && map ? (
          <>
            <p className="fc-tip">{three.weekly.line}</p>
            <ul className="pm-list pm-compact">
              <li>
                <span className="pm-time">{three.weekly.conversations}</span>
                <span className="pm-body">
                  <b>Real conversations a week</b>
                  <small>A call that connects, a coffee, a drop-by that turns into a talk.</small>
                </span>
                {onPage ? <span className="pm-acts"><button data-act="goals-week-row" onClick={() => onPage("/contacts/vip")} aria-label="Open your VIP-50 to start a conversation">→</button></span> : null}
              </li>
              <li>
                <span className="pm-time">{three.weekly.touches}</span>
                <span className="pm-body">
                  <b>VIP touches a week</b>
                  <small>Calls, video texts, social, newsletters, mixer invites, face-to-faces, notes and drop-bys.</small>
                </span>
                {onPage ? <span className="pm-acts"><button data-act="goals-week-row" onClick={() => onPage("/contacts/audit")} aria-label="Open the Touch Audit to see who needs a touch">→</button></span> : null}
              </li>
              <li>
                <span className="pm-time">{three.weekly.closingsLeft}</span>
                <span className="pm-body">
                  <b>Closings to go</b>
                  <small>{`To reach ${money(map.goal)} in the ${map.weeksLeft} weeks left of your goal year, at ${money(map.avgGci.value)} GCI each.`}</small>
                </span>
                {onIncomeMap ? <span className="pm-acts"><button data-act="goals-week-row" onClick={onIncomeMap} aria-label="Open the numbers behind it">→</button></span> : null}
              </li>
            </ul>
            {onIncomeMap ? (
              <button className="vr-classic" onClick={onIncomeMap}>
                Change the numbers behind it
              </button>
            ) : null}
          </>
        ) : (
          <p className="pm-empty">Set a GCI or closings goal above and your weekly numbers show here.</p>
        )}
        <p className="pm-promise">{demo ? "Example agent. " : ""}One set of numbers for all three parts. A forecast, not a promise.</p>
      </div>
    </div>
  );
}
