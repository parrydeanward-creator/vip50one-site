"use client";

import { useState } from "react";
import LogReferral from "./LogReferral.tsx";
import { GoalForm, YearForm, shortDay, yearStartOf, type GoalNote } from "./GoalForms.tsx";
import { GOAL_WORD, behindPace, fmtGoal, goalPace, type GoalFacts, type GoalKey } from "@/lib/goals.ts";

// Goals on the desktop, the same list the phone shows (Parry, 16 Oct, audit 3.4.4): Closings, Referrals and GCI, each
// with its pace and "Change goal" (audit 3.4.1), saved to MASTER agent_goals through /api/goals. Closings and GCI come
// in by themselves from reZEN and the MLS (Parry, 16 Oct: "sold homes data will come from the MLS and reZen"), so they
// are never typed here; until a source is connected the panel says so with the way to connect it. Referrals are
// counted from the Referrals scoreboard. The demo agent's goals are never saved.

const ORDER: GoalKey[] = ["closings_goal", "referrals_goal", "gci_goal"];

export default function GoalsPanel({
  goals,
  today,
  demo,
  rezenConnected,
  only,
  editOnly,
  onSave,
  onProfile,
  onReferrals,
  onReferralLogged,
  onSetStart,
}: {
  goals: GoalFacts[];
  today: string;
  demo: boolean;
  /** reZEN connected in My Profile; null while unknown. */
  rezenConnected: boolean | null;
  /** One goal's own panel (a goal orb). */
  only?: GoalKey;
  /** Just the goals and "Change goal" (the Income Map); no pace or sources. */
  editOnly?: boolean;
  onSave: (key: GoalKey, value: number) => Promise<string | null>;
  onProfile: () => void;
  onReferrals?: () => void;
  /** After a referral is logged here: reload the counts. */
  onReferralLogged?: () => void;
  /** The agent chooses when their goal year starts (month and day); answers an error line or null. */
  onSetStart?: (month: number, day: number) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState<GoalKey | null>(null);
  const [note, setNote] = useState<GoalNote | null>(null);
  const shown = ORDER.map((k) => goals.find((g) => g.key === k) ?? { key: k, label: GOAL_WORD[k], value: null, max: null, pace: null }).filter((g) => !only || g.key === only);

  const sources = !editOnly && (!only || only !== "referrals_goal");
  // The goal year, and when it starts (Parry, 21 Oct: "we need a way for each agent to choose when their year starts").
  const year = goals.find((g) => g.from && g.to);
  const [yearEdit, setYearEdit] = useState(false);
  return (
    <div className="gl-panel">
      {!editOnly && onSetStart ? (
        <div className="gl-year">
          {yearEdit ? (
            <YearForm initial={yearStartOf(year?.from)} demo={demo} onSetStart={onSetStart} onNote={setNote} onDone={() => setYearEdit(false)} />
          ) : (
            <p className="gl-src">
              {year ? `Goal year: ${shortDay(year.from!)} to ${shortDay(year.to!)}. ` : "Your goal year starts the day you set your goals. "}
              <button className="link" onClick={() => {
                setYearEdit(true);
                setNote(null);
              }}>Change when it starts</button>
            </p>
          )}
        </div>
      ) : null}
      <ul className="gl-list">
        {shown.map((g) => {
          const f = (n: number) => fmtGoal(g.key, n);
          const p = g.max != null ? goalPace(g, today) : undefined;
          const behind = behindPace(g, today);
          return (
            <li key={g.key} className={behind ? "gl-behind" : undefined}>
              <p className="gl-head">
                <b>{GOAL_WORD[g.key]}</b>
                <span>{g.max != null ? `${f(Math.max(0, g.value ?? 0))} of ${f(g.max)}` : "No goal set"}</span>
              </p>
              {!editOnly && p ? (
                <p className="gl-pace">
                  {behind ? "Behind pace. " : ""}
                  {p.headline}. {p.detail}
                </p>
              ) : null}
              {editing === g.key ? (
                <GoalForm goalKey={g.key} initial={g.max} demo={demo} onSave={onSave} onNote={setNote} onDone={() => setEditing(null)} />
              ) : (
                <button className="link gl-change" onClick={() => { setEditing(g.key); setNote(null); }} aria-label={`Change ${GOAL_WORD[g.key]} goal`}>
                  Change goal
                </button>
              )}
              {!editOnly && g.key === "referrals_goal" && onReferralLogged ? <LogReferral demo={demo} onLogged={onReferralLogged} /> : null}
              {!editOnly && g.key === "referrals_goal" ? (
                <p className="gl-src">
                  Counted from your Referrals scoreboard.{" "}
                  {onReferrals ? (
                    <button className="link" onClick={onReferrals}>
                      Open Referrals →
                    </button>
                  ) : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {note ? <p className={`pf-note${note.ok ? "" : " bad"}`} role="status">{note.text}</p> : null}
      {sources ? (
        <div className="gl-src gl-sources">
          <p>Closings and GCI come in by themselves from reZEN and the MLS. You never type them.</p>
          <p>
            reZEN: {rezenConnected ? "connected" : "not connected yet"}.{" "}
            {!rezenConnected ? (
              <button className="link" onClick={onProfile}>
                Connect reZEN in My Profile →
              </button>
            ) : null}
          </p>
          <p>MLS: coming.</p>
        </div>
      ) : null}
    </div>
  );
}
