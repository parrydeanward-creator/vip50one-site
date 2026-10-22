"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ClosingsFoundCard from "./ClosingsFoundCard.tsx";
import { GoalForm, YearForm, shortDay, yearStartOf, type GoalNote } from "./GoalForms.tsx";
import { GOAL_WORD, fmtGoal, money, referralNote, type GoalFacts, type GoalKey, type IncomeMap } from "@/lib/goals.ts";
import { monthWords, type ForecastPerson } from "@/lib/forecast.ts";
import { STATE_WORD, SIDE_SHORT, goalYear, likelyNext, pulseLine, ring, ringBig, weekMoves, weekOf, type Ring, type WeekMove } from "@/lib/goalsRings.ts";
import type { GoalsThree } from "@/lib/oneYou.ts";
import type { Deal } from "@/lib/deals.ts";
import type { Referrals } from "@/lib/referrals.ts";
import type { LooksPerson } from "@/lib/looksHot.ts";

// Goals, opened (Parry, 16 Oct 13:38 MT: "yes do that"; redrawn 22 Oct as "mix of A and C", vip50-ecosystem
// research/mockups/goals). The header with the goal year and "Change when it starts"; Pulse's line on how the goals
// stand; three ring cards (Closings, Referrals, GCI: gold is done, the faint arc and the white tick are where the agent
// would be by today); Likely next (the agent's own deals under contract and Hot people, soonest first); This week's
// moves (referral asks, Hot follow-ups, likely sellers), each opening the people behind it; then the next 3 months and
// the weekly numbers, as before. One goals list feeds it all (lib/oneYou.ts goalsThree, lib/goalsRings.ts). Nothing is
// sent from here.

const GOLD = "#f5c542";
const ORDER: GoalKey[] = ["closings_goal", "referrals_goal", "gci_goal"];
const TICKS = "one.goals.week";

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
  deals,
  hot,
  refs,
  looks,
  avgGci,
  onAddDeal,
  onLooksHot,
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
  /** The agent's deals (ONE MOVE's, the example agent's in the demo): Likely next. */
  deals?: Deal[] | null;
  /** The agent's Hot people: Likely next and a move. */
  hot?: ForecastPerson[] | null;
  /** The Referrals scoreboard: who is ready to ask. */
  refs?: Referrals | null;
  /** Looks Hot: likely sellers. */
  looks?: LooksPerson[] | null;
  /** GCI per closing (the Income Map's), for a deal or a Hot person with no GCI of its own. */
  avgGci?: number;
  /** "Add a deal": the Deals entry. */
  onAddDeal?: () => void;
  /** Opens the Looks Hot orb. */
  onLooksHot?: () => void;
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

  const [editing, setEditing] = useState<GoalKey | null>(null);
  const [yearEdit, setYearEdit] = useState(false);
  const [note, setNote] = useState<GoalNote | null>(null);

  const facts = ORDER.map((k) => goals.find((g) => g.key === k) ?? { key: k, label: GOAL_WORD[k], value: null, max: null, pace: null });
  const rings = facts.map((g) => ring(g, today));
  const year = goalYear(goals, today);
  const yearAny = goals.find((g) => g.from);
  const pulse = pulseLine(rings);
  const likelyRows = useMemo(() => likelyNext(deals ?? null, hot ?? null, avgGci ?? map?.avgGci.value ?? 10_000, today), [deals, hot, avgGci, map, today]);
  const moves = useMemo(() => weekMoves(refs ?? null, hot ?? null, looks ?? null), [refs, hot, looks]);

  // Ticked moves are kept in this browser for the week (they clear on Monday). Nothing is sent.
  const week = weekOf(today);
  const [ticked, setTicked] = useState<string[]>([]);
  useEffect(() => {
    try {
      const j = JSON.parse(localStorage.getItem(TICKS) ?? "null") as { week?: string; keys?: unknown } | null;
      setTicked(j && j.week === week && Array.isArray(j.keys) ? j.keys.filter((k): k is string => typeof k === "string") : []);
    } catch {}
  }, [week]);
  const tick = (key: string) =>
    setTicked((t) => {
      const next = t.includes(key) ? t.filter((k) => k !== key) : [...t, key];
      try {
        localStorage.setItem(TICKS, JSON.stringify({ week, keys: next }));
      } catch {}
      return next;
    });

  const weekRef = useRef<HTMLElement>(null);
  const numbersRef = useRef<HTMLElement>(null);
  const backOnPace = () => {
    const el = moves.length ? weekRef.current : numbersRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    el?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  };

  const openMove = (m: WeekMove) => {
    if (m.key === "ask") return onReferrals();
    if (m.key === "hot") return onPage?.("/hot-warm-cold");
    onLooksHot?.();
  };
  const primary = (r: Ring): { label: string; act: () => void } | null => {
    if (r.key === "closings_goal") return onPage ? { label: "Open your Deals", act: () => onPage("/deals") } : null;
    if (r.key === "referrals_goal") return { label: "Open Referrals", act: onReferrals };
    return onIncomeMap ? { label: "Open Income Map", act: onIncomeMap } : null;
  };

  const likely = three.likely;
  const max = Math.max(1, ...(likely?.months.map((m) => m.total) ?? [0]));

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="gv-title">
      <div className="fc gr">
        <div className="gr-top">
          <div className="fc-head">
            <button ref={closeRef} className="fc-back" onClick={onClose} aria-label="Back to the Brain">←</button>
            <div>
              <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
              <h1 className="d-title gr-title" id="gv-title">Goals</h1>
              <p className="d-sub">What you have closed, what is likely next, and what to do each week.</p>
            </div>
          </div>
          <div className="gr-year">
            <span className="gr-yearchip">
              {year ? (
                <>
                  Goal year <b>{`${shortDay(year.from)} – ${shortDay(year.to)}`}</b>
                  {` · week ${year.week} of ${year.weeks}`}
                </>
              ) : yearAny?.from ? (
                <>Goal year from <b>{shortDay(yearAny.from)}</b></>
              ) : (
                "Your goal year starts the day you set your goals"
              )}
            </span>
            {onSetStart && !yearEdit ? (
              <button className="link gr-yearlink" onClick={() => { setYearEdit(true); setNote(null); }}>Change when it starts</button>
            ) : null}
          </div>
        </div>
        {yearEdit && onSetStart ? (
          <div className="gr-yearform">
            <YearForm initial={yearStartOf(yearAny?.from)} demo={demo} onSetStart={onSetStart} onNote={setNote} onDone={() => setYearEdit(false)} />
          </div>
        ) : null}

        {pulse ? (
          <div className={`gr-pulse${pulse.behind ? "" : " ok"}`}>
            <span className="gr-dot" aria-hidden="true" />
            <p>
              <b>{pulse.lead}</b> {pulse.rest}
            </p>
            {moves.length || (three.weekly && map) ? (
              <button className="chip-btn primary gr-cta" onClick={backOnPace}>{pulse.behind ? "Get back on pace →" : "This week's moves →"}</button>
            ) : null}
          </div>
        ) : (
          <p className="fc-tip">{three.closed.line}</p>
        )}
        {note ? <p className={`pf-note${note.ok ? "" : " bad"}`} role="status">{note.text}</p> : null}

        <ul className="gr-rings" aria-label="Your three goals">
          {rings.map((r, i) => {
            const g = facts[i];
            const f = (n: number) => fmtGoal(r.key, n);
            const p = primary(r);
            const extra = referralNote(g);
            return (
              <li key={r.key} className={`gr-card st-${r.state}`}>
                <div className="gr-card-head">
                  <h2>{r.word}</h2>
                  <span className="gr-state"><i aria-hidden="true" />{STATE_WORD[r.state]}</span>
                </div>
                <RingSvg r={r} />
                <dl className="gr-rows">
                  <div><dt>By today you&apos;d be at</dt><dd>{r.byToday != null ? f(r.byToday) : "–"}</dd></div>
                  <div><dt>On pace to finish at</dt><dd>{r.finish != null ? f(r.finish) : r.state === "reached" ? f(r.value) : r.state === "early" ? "Too early to tell" : "–"}</dd></div>
                  <div><dt>To get there</dt><dd>{r.toGetThere ?? "Set a goal"}</dd></div>
                </dl>
                {extra ? <p className="gl-src">{extra}</p> : null}
                {r.key === "referrals_goal" ? (
                  <p className="gl-src gr-fact">
                    Counted from your Referrals scoreboard.
                    {referralsLine ? (
                      <>
                        {" "}
                        <button className="link gl-refs-in" onClick={onReferrals} aria-label={`Open Referrals: ${referralsLine}`}>{`${referralsLine} →`}</button>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {editing === r.key ? (
                  <GoalForm goalKey={r.key} initial={g.max} demo={demo} onSave={onSaveGoal} onNote={setNote} onDone={() => setEditing(null)} />
                ) : (
                  <div className="gr-btns">
                    {p && r.key === "closings_goal" ? (
                      <button className="chip-btn primary" data-act="goals-closed" onClick={p.act}>{`${p.label} →`}</button>
                    ) : p ? (
                      <button className="chip-btn primary" data-act="goals-open" onClick={p.act}>{`${p.label} →`}</button>
                    ) : null}
                    <button className="chip-btn gr-change" onClick={() => { setEditing(r.key); setNote(null); }} aria-label={`Change ${r.word} goal`}>
                      {r.max == null ? "Set goal" : "Change goal"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <section className="gr-sec" aria-labelledby="gv-likely">
          <div className="gr-sec-head">
            <h2 className="gr-h" id="gv-likely">Likely next</h2>
            <span>Deals that close the gap, soonest first</span>
          </div>
          {likelyRows.length ? (
            <ul className="gr-likely">
              {likelyRows.map((row) => {
                const open = row.contactId ? () => onPerson(row.contactId!) : row.kind === "contract" ? () => onPage?.("/deals") : () => onPage?.("/hot-warm-cold");
                return (
                  <li key={row.id}>
                    <span className="gr-av" aria-hidden="true">{initials(row.name)}</span>
                    <span className="gr-who-b">
                      <span className="gr-name">
                        <b>{row.name}</b>
                        {row.side ? ` · ${SIDE_SHORT[row.side]}` : null}
                      </span>
                      <small>{row.stage}</small>
                    </span>
                    <span className={`gr-pill ${row.kind}`} title={row.est ? "Expected GCI (an estimate)" : "Expected GCI"}>{money(row.gci)}</span>
                    <button className="link gr-open" data-act="goals-likely" onClick={open} aria-label={`Open ${row.name}`}>Open →</button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="gr-empty">
              <p>No deals under contract or Hot people yet. Add a deal and it shows here with what it brings in.</p>
              {onAddDeal ? <button className="chip-btn primary" data-act="goals-add-deal" onClick={onAddDeal}>Add a deal →</button> : null}
            </div>
          )}
        </section>

        {moves.length ? (
          <section className="gr-sec" aria-labelledby="gv-week" ref={weekRef}>
            <div className="gr-sec-head">
              <h2 className="gr-h" id="gv-week">This week, to get back on pace</h2>
              <span>Tick each one as you go.</span>
            </div>
            <ul className="gr-moves">
              {moves.map((m) => {
                const on = ticked.includes(m.key);
                return (
                  <li key={m.key} className={on ? "done" : undefined}>
                    <button className="gr-tick" role="checkbox" aria-checked={on} onClick={() => tick(m.key)} aria-label={`${on ? "Done" : "Not done"}: ${m.title}`}>
                      {on ? "✓" : ""}
                    </button>
                    <span className="gr-move-b">
                      <b>{m.title}</b>
                      <small>
                        {m.people.map((p, k) => (
                          <span key={`${p.name}-${k}`}>
                            {k ? ", " : ""}
                            {p.contactId ? (
                              <button className="link gv-person" onClick={() => onPerson(p.contactId!)} aria-label={`Open ${p.name}'s record`}>{p.name}</button>
                            ) : (
                              p.name
                            )}
                          </span>
                        ))}
                        {m.people.length ? " · " : ""}
                        {m.sub}
                      </small>
                    </span>
                    <button className="gr-go" data-act="goals-week-move" onClick={() => openMove(m)} aria-label={m.sub}>→</button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="gr-more">
          <section className="gr-panel" aria-labelledby="gv-3m">
            <h2 className="gr-h sm" id="gv-3m">Next 3 months</h2>
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
          </section>

          <section className="gr-panel" aria-labelledby="gv-nums" ref={numbersRef}>
            <h2 className="gr-h sm" id="gv-nums">What to do each week</h2>
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
          </section>
        </div>

        <div className="gr-foot">
          <span className={`gr-src ${rezenConnected ? "on" : "off"}`}>
            <i aria-hidden="true" />
            {rezenConnected ? "reZEN connected · closings and GCI come in by themselves" : "reZEN not connected yet"}
            {!rezenConnected ? (
              <>
                {" · "}
                <button className="link" onClick={onProfile}>Connect reZEN in My Profile →</button>
              </>
            ) : null}
          </span>
          <span className="gr-src off"><i aria-hidden="true" />MLS coming</span>
        </div>
        <p className="gl-src gr-never">Closings and GCI come in by themselves from reZEN and the MLS. You never type them.</p>
        <ClosingsFoundCard demo={demo} onLogged={onClosingLogged} />
        <p className="pm-promise">{demo ? "Example agent. " : ""}One set of numbers for every part. A forecast, not a promise.</p>
      </div>
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/[\s,]+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "•";

/** The ring: faint track, the faint "by today" arc, the gold "done" arc and a white tick at today's mark. */
function RingSvg({ r }: { r: Ring }) {
  const R = 88, C = 2 * Math.PI * R, W = 16;
  const done = Math.max(r.done, r.value > 0 ? 0.02 : 0);
  const tick = r.mark != null ? r.mark * 360 - 90 : null;
  const rad = tick != null ? (tick * Math.PI) / 180 : 0;
  const ti = R - W / 2 - 2, to = R + W / 2 + 2;
  return (
    <div className="gr-ring">
      <svg viewBox="0 0 220 220" role="img" aria-label={r.max != null ? `${fmtGoal(r.key, r.value)} of ${fmtGoal(r.key, r.max)}${r.byToday != null ? `; by today you'd be at ${fmtGoal(r.key, r.byToday)}` : ""}` : "No goal set"}>
        <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={W} />
        {r.mark != null ? (
          <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={W} strokeDasharray={`${r.mark * C} ${C}`} transform="rotate(-90 110 110)" />
        ) : null}
        {done > 0 ? (
          <circle className="gr-arc" cx="110" cy="110" r={R} fill="none" stroke={GOLD} strokeWidth={W} strokeLinecap="round" strokeDasharray={`${done * C} ${C}`} transform="rotate(-90 110 110)" />
        ) : null}
        {tick != null && r.mark! < 1 ? (
          <line x1={110 + ti * Math.cos(rad)} y1={110 + ti * Math.sin(rad)} x2={110 + to * Math.cos(rad)} y2={110 + to * Math.sin(rad)} stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        ) : null}
      </svg>
      <span className="gr-big">
        <b>{ringBig(r.key, r.value)}</b>
        <small>{r.max != null ? `of ${ringBig(r.key, r.max)}` : "No goal set"}</small>
      </span>
    </div>
  );
}
