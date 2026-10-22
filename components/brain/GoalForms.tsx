"use client";

import { useState } from "react";
import { GOAL_WORD, fmtGoal, goalValue, type GoalKey } from "@/lib/goals.ts";

// The two goal forms, shared by GoalsPanel (orb panel, Income Map) and GoalsView (the opened Goals page): change one
// goal (Parry, 16 Oct, audit 3.4.1) and choose when the goal year starts (Parry, 21 Oct). The demo agent's are never
// saved. Each answers through onNote (the panel's status line) and closes with onDone after a save.

export type GoalNote = { ok: boolean; text: string };
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDay = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

export function GoalForm({
  goalKey,
  initial,
  demo,
  onSave,
  onNote,
  onDone,
}: {
  goalKey: GoalKey;
  initial: number | null;
  demo: boolean;
  onSave: (key: GoalKey, value: number) => Promise<string | null>;
  onNote: (n: GoalNote | null) => void;
  /** Closes the form; saved: true after a save. */
  onDone: (saved: boolean) => void;
}) {
  const [text, setText] = useState(initial != null ? String(initial) : "");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const v = goalValue(goalKey, text);
    if (typeof v !== "number") return onNote({ ok: false, text: v.error });
    if (demo) return onNote({ ok: false, text: "Example agent: goals are not saved." });
    setBusy(true);
    const err = await onSave(goalKey, v);
    setBusy(false);
    if (err) return onNote({ ok: false, text: err });
    onDone(true);
    onNote({ ok: true, text: `${GOAL_WORD[goalKey]} goal saved: ${fmtGoal(goalKey, v)}.` });
  };
  return (
    <form
      className="gl-edit"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label>
        <span>{GOAL_WORD[goalKey]} goal for this goal year</span>
        <span className="im-in">
          {goalKey === "gci_goal" ? <i>$</i> : null}
          <input autoFocus inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} aria-label={`${GOAL_WORD[goalKey]} goal`} />
        </span>
      </label>
      <span className="gl-acts">
        <button type="submit" className="vr-btn" disabled={busy}>{busy ? "Saving" : "Save"}</button>
        <button type="button" className="vr-btn" onClick={() => onDone(false)} disabled={busy}>Cancel</button>
      </span>
    </form>
  );
}

/** The month and day the goal year starts on, from the year's first day (Jan 1 without one). */
export const yearStartOf = (from: string | undefined) => {
  const f = from ? new Date(`${from}T12:00:00Z`) : null;
  return { m: f ? f.getUTCMonth() + 1 : 1, d: f ? f.getUTCDate() : 1 };
};

export function YearForm({
  initial,
  demo,
  onSetStart,
  onNote,
  onDone,
}: {
  initial: { m: number; d: number };
  demo: boolean;
  onSetStart: (month: number, day: number) => Promise<string | null>;
  onNote: (n: GoalNote | null) => void;
  onDone: () => void;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (demo) return onNote({ ok: false, text: "Example agent: goals are not saved." });
    setBusy(true);
    const err = await onSetStart(v.m, v.d);
    setBusy(false);
    if (err) return onNote({ ok: false, text: err });
    onDone();
    onNote({ ok: true, text: `Your goal year now starts on ${MONTHS[v.m - 1]} ${v.d}.` });
  };
  return (
    <form className="gl-edit" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <label>
        <span>Your goal year starts on</span>
        <span className="gl-md">
          <select value={v.m} onChange={(e) => setV({ ...v, m: Number(e.target.value) })} aria-label="Month">
            {MONTHS.map((mo, i) => <option key={mo} value={i + 1}>{mo}</option>)}
          </select>
          <input inputMode="numeric" value={v.d} maxLength={2} aria-label="Day"
            onChange={(e) => setV({ ...v, d: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
        </span>
      </label>
      <small className="gl-src">Real agents: your cap year starts on your anniversary with Real.</small>
      <span className="gl-acts">
        <button type="submit" className="vr-btn" disabled={busy}>{busy ? "Saving" : "Save"}</button>
        <button type="button" className="vr-btn" onClick={onDone} disabled={busy}>Cancel</button>
      </span>
    </form>
  );
}
