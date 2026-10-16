"use client";

import { useState } from "react";
import { GOAL_WORD, behindPace, fmtGoal, goalPace, goalValue, type GoalFacts, type GoalKey } from "@/lib/goals.ts";

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
}) {
  const [editing, setEditing] = useState<GoalKey | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = ORDER.map((k) => goals.find((g) => g.key === k) ?? { key: k, label: GOAL_WORD[k], value: null, max: null, pace: null }).filter((g) => !only || g.key === only);

  const start = (g: GoalFacts) => {
    setEditing(g.key);
    setText(g.max != null ? String(g.max) : "");
    setNote(null);
  };
  const submit = async (key: GoalKey) => {
    const v = goalValue(key, text);
    if (typeof v !== "number") return setNote({ ok: false, text: v.error });
    if (demo) return setNote({ ok: false, text: "Example agent: goals are not saved." });
    setBusy(true);
    const err = await onSave(key, v);
    setBusy(false);
    if (err) return setNote({ ok: false, text: err });
    setEditing(null);
    setNote({ ok: true, text: `${GOAL_WORD[key]} goal saved: ${fmtGoal(key, v)}.` });
  };

  const sources = !editOnly && (!only || only !== "referrals_goal");
  return (
    <div className="gl-panel">
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
                <form
                  className="gl-edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit(g.key);
                  }}
                >
                  <label>
                    <span>{GOAL_WORD[g.key]} goal for this goal year</span>
                    <span className="im-in">
                      {g.key === "gci_goal" ? <i>$</i> : null}
                      <input autoFocus inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} aria-label={`${GOAL_WORD[g.key]} goal`} />
                    </span>
                  </label>
                  <span className="gl-acts">
                    <button type="submit" className="vr-btn" disabled={busy}>{busy ? "Saving" : "Save"}</button>
                    <button type="button" className="vr-btn" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
                  </span>
                </form>
              ) : (
                <button className="link gl-change" onClick={() => start(g)} aria-label={`Change ${GOAL_WORD[g.key]} goal`}>
                  Change goal
                </button>
              )}
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
