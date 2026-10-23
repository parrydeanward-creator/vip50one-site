"use client";

import { mateOf, paceOf, teamPace } from "@/lib/teamPace.ts";
import type { Team } from "@/lib/team.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { setupLate, setupWords, teamSetup, type Coached, type Setup } from "@/lib/coach.ts";
import { KIND_LABEL, progressWords, reached, resultWord, type Item, type Result } from "@/lib/commitments.ts";
import { demoHistory, historyUrl, readHistory } from "@/lib/pulseCoach.ts";
import { activeLabel, barTone, buildBoard, cardLine, eightWeeks, keptDetail, keptLine, mondayOf, scoreLine, sparkOf, weekLabel, COLUMN_SHOW, NUDGE_WORDS, nudgeUrl, type BoardAgent, type Tone } from "@/lib/coachBoard.ts";

// The Coaching board (Parry, 22 Oct, picked option A: vip50-ecosystem research/mockups/coaching/coaching-a.png).
// The agents you coach in three columns (Needs you now, Slipping, Winning; rules in lib/coachBoard.ts), the week's
// five counts above them, each opening the agents behind it (rule 12), and the picked agent on the right: their
// weeks, this week, Pulse's read and one tap to act. A coach reads and nudges; only the agent sets and marks their
// commitments (§3n.4). Scores, keep rates and yes/no only: never a client or a contact's note.

const RES_COLOR: Record<Result, string> = { kept: "#3fbf7f", partly: "#e5b83a", missed: "#e4574a" };
const TONE: Record<Tone, string> = { red: "#ff5a5f", amber: "#f5c542", green: "#2fbf71", grey: "#8089a2" };
const BAR8: Record<Tone, string> = { green: "#f5c542", amber: "#5fb3f0", red: "#ff5a5f", grey: "rgba(169,176,189,0.25)" };
const pct = (r: number | null) => (r == null ? "not known yet" : `${Math.round(r * 100)}%`);
const firstOf = (b: BoardAgent) => b.short.split(/\s+/)[0];
/** The full name in the panel, unless the name we have is a handle; then the short one. */
const fullOf = (b: BoardAgent) => (/\s/.test(b.a.name) && !/[@\d]/.test(b.a.name) ? b.a.name : b.short);

type ListKey = "all" | "notSet" | "kept" | "down2" | "at100" | "now" | "slip" | "win";
type Weeks = { values: (number | null)[]; kind: "kept" | "score"; raw?: (number | null)[] } | "loading" | null;
/** What the latest activity was, in words (MASTER last_active_source). */
const SOURCE_WORDS: Record<string, string> = {
  app: "opened ONE", touch: "logged a touch", task: "finished a task", tracker: "ticked the tracker", commitment: "worked a commitment",
  plan: "ticked a plan step", habit: "ticked a habit", contact: "worked a contact", lounge: "posted in the Lounge",
};

function ItemRow({ i }: { i: Item }) {
  const on = i.result === "kept" || reached(i);
  return (
    <li className={i.result ? "is-done" : ""}>
      <i className="pm-dot" style={{ background: i.result ? RES_COLOR[i.result] : on ? "#f5c542" : "rgba(255,255,255,0.35)" }} aria-hidden="true" />
      <span className="pm-body">
        <b>{i.text}</b>
        <small>
          {i.kind === "yes_no" ? "Yes or no" : `${progressWords(i)} (${KIND_LABEL[i.kind].toLowerCase()})`}
          {i.result ? ` · ${resultWord(i.result)}` : ""}
          {i.note ? ` · "${i.note}"` : ""}
        </small>
      </span>
    </li>
  );
}

function Face({ b, big }: { b: BoardAgent; big?: boolean }) {
  return (
    <span className={`cb-av${big ? " big" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {b.photo ? <img src={b.photo} alt="" /> : b.initials}
    </span>
  );
}

function Spark({ b }: { b: BoardAgent }) {
  const s = sparkOf(b);
  if (!s.values.length) return <span className="cb-spark" aria-hidden="true" />;
  return (
    <span className="cb-spark" role="img" aria-label={`Last ${s.values.length} weeks, ${s.kind === "kept" ? "share kept" : "weekly score"}`}>
      {s.values.map((v, k) => (
        <i key={k} style={{ height: v == null ? 3 : Math.max(4, Math.min(1, v) * 22), background: TONE[barTone(v)] }} />
      ))}
    </span>
  );
}

function Card({ b, sel, onOpen }: { b: BoardAgent; sel: boolean; onOpen: () => void }) {
  return (
    <button type="button" className={`cb-card${sel ? " sel" : ""}`} onClick={onOpen} aria-label={`${b.short}: ${b.why}. ${cardLine(b)}. Open.`} aria-pressed={sel}>
      <Face b={b} />
      <span className="cb-who">
        <b>{b.short}</b>
        <small>{cardLine(b)}</small>
        <em style={{ color: TONE[b.tone] }}>{b.why}</em>
      </span>
      <Spark b={b} />
    </button>
  );
}

export default function CoachView({ agents, hour, demo, onClose, onPulse, squad, onBook }: { agents: Coached[]; hour: number; demo: boolean; onClose: () => void; onPulse?: (a: Coached) => Promise<string | null>; squad?: Team | null; /** Open the Day Clock's add-a-block, filled in. */ onBook?: (title: string) => void }) {
  void hour; // the board's rules are by the week; kept for the caller's signature
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const board = useMemo(() => buildBoard(agents, squad ?? null), [agents, squad]);
  const [pick, setPick] = useState<string | null>(null);
  const [list, setList] = useState<ListKey | null>(null);
  const listRef = useRef(list);
  listRef.current = list;
  const [sent, setSent] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [pulseNote, setPulseNote] = useState<string | null>(null);
  const [weekOpen, setWeekOpen] = useState(false);
  const [weeks, setWeeks] = useState<Record<string, Weeks>>({});

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (listRef.current) return setList(null);
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const today = agents[0]?.c.today ?? new Date().toISOString().slice(0, 10);
  const sel = board.agents.find((b) => b.id === pick) ?? board.now[0] ?? board.agents[0] ?? null;

  // The 8-week chart: MASTER's weekly scores (scores_by_week) or kept weeks when the coached route sends them, else the
  // weekly scores from the history route (§3q.2, coach).
  const selId = sel?.id ?? null;
  const selHasKept = sel ? eightWeeks(sel) != null : false;
  useEffect(() => {
    if (!selId || selHasKept || weeks[selId] !== undefined) return;
    const toWeeks = (h: ReturnType<typeof readHistory>): Weeks =>
      h ? { values: h.weeks.slice(-8).map((w) => (w.score == null ? null : w.score / (w.minimum || 100))), kind: "score" } : null;
    if (demo) {
      setWeeks((w) => ({ ...w, [selId]: toWeeks(demoHistory(today, board.agents.findIndex((b) => b.id === selId) + 1)) }));
      return;
    }
    setWeeks((w) => ({ ...w, [selId]: "loading" }));
    fetch(historyUrl(8, selId), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setWeeks((w) => ({ ...w, [selId]: toWeeks(j ? readHistory(j) : null) })))
      .catch(() => setWeeks((w) => ({ ...w, [selId]: null })));
  }, [selId, selHasKept, demo, today, weeks, board.agents]);

  const open = (id: string) => {
    setPick(id);
    setPulseNote(null);
    setWeekOpen(false);
  };

  /** ONE MOVE's coach nudge, one agent at a time (preset words; ONE sends it to the agent's own ONE notifications). */
  const nudge = async (ids: string[]) => {
    setBusy(true);
    const out: Record<string, string> = {};
    for (const id of ids) {
      if (demo) {
        out[id] = "Nudge sent (example)";
        continue;
      }
      try {
        const r = await fetch(nudgeUrl(id, "push"), { method: "POST", credentials: "include" });
        out[id] = r.ok ? "Nudge sent" : r.status === 403 ? "Only an admin can send a nudge from ONE yet" : r.status === 401 ? "Please sign in again" : "Could not send it";
      } catch {
        out[id] = "Could not send it";
      }
    }
    setSent((s) => ({ ...s, ...out }));
    setBusy(false);
    setConfirm(null);
  };
  const notYet = board.kpi.notSet.filter((b) => !sent[b.id]?.startsWith("Nudge sent"));

  const LISTS: Record<ListKey, { title: string; people: BoardAgent[]; line?: string }> = {
    all: { title: "Everyone you coach", people: board.kpi.all },
    notSet: { title: "Haven't set this week", people: board.kpi.notSet, line: "Their commitments for this week are not set yet." },
    kept: { title: "Commitments kept, 8 weeks", people: board.kpi.keptList, line: "Lowest keep rate first. The team figure is the average of these." },
    down2: { title: "Slipping two weeks running", people: board.kpi.down2, line: "Kept % or weekly score down two finished weeks in a row." },
    at100: { title: `At ${squad?.minimum ?? 100} this week`, people: board.kpi.at100, line: "A good week to say so." },
    now: { title: "Needs you now", people: board.now, line: "Not set this week, nothing kept two weeks or more, or gone quiet." },
    slip: { title: "Slipping", people: board.slip, line: `Down two weeks running, or under ${squad?.minimum ?? 100} last week.` },
    win: { title: "Winning", people: board.win, line: "Everyone else, at or above pace." },
  };

  const kpis: { key: ListKey; value: string; label: string; act: string; tone?: Tone }[] = [
    { key: "all", value: String(board.kpi.all.length), label: board.kpi.all.length === 1 ? "agent you coach" : "agents you coach", act: "All" },
    { key: "notSet", value: String(board.kpi.notSet.length), label: "haven't set this week", act: "Nudge", tone: board.kpi.notSet.length ? "red" : undefined },
    { key: "kept", value: board.kpi.teamKept == null ? "–" : `${Math.round(board.kpi.teamKept * 100)}%`, label: "commitments kept, team", act: "See", tone: board.kpi.teamKept == null ? undefined : barTone(board.kpi.teamKept) },
    { key: "down2", value: String(board.kpi.down2.length), label: "slipping two weeks running", act: "Open", tone: board.kpi.down2.length ? "amber" : undefined },
    { key: "at100", value: String(board.kpi.at100.length), label: `at ${squad?.minimum ?? 100} this week`, act: "Celebrate", tone: board.kpi.at100.length ? "green" : undefined },
  ];
  const cols: { key: "now" | "slip" | "win"; title: string; tone: Tone; people: BoardAgent[]; empty: string }[] = [
    { key: "now", title: "Needs you now", tone: "red", people: board.now, empty: "No one needs you right now." },
    { key: "slip", title: "Slipping", tone: "amber", people: board.slip, empty: "No one is slipping." },
    { key: "win", title: "Winning", tone: "green", people: board.win, empty: "No one at pace yet this week." },
  ];

  const ts = teamSetup(agents);
  const tp = squad ? teamPace(squad, new Set(agents.map((a) => a.id))) : null;
  const week = weekLabel(squad?.weekStart ?? mondayOf(today));

  const ConfirmBox = confirm ? (
    <div className="cb-confirm pop" role="alertdialog" aria-labelledby="cb-confirm-q">
      <p id="cb-confirm-q">
        <b>Nudge {confirm.length} {confirm.length === 1 ? "agent" : "agents"} who haven&apos;t set this week?</b>
        <small>Each gets one ONE notification: &ldquo;{NUDGE_WORDS}&rdquo;</small>
      </p>
      <div className="decide-btns">
        <button type="button" className="chip-btn primary" disabled={busy} onClick={() => nudge(confirm)}>{busy ? "Sending…" : `Send to ${confirm.length}`}</button>
        <button type="button" className="chip-btn" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
      </div>
    </div>
  ) : null;

  return (
    <div className="pm-full pop cb" role="dialog" aria-modal="true" aria-labelledby="cv-title">
      <div className="cb-scroll">
        <header className="cb-top">
          <div className="cb-head">
            <button ref={closeRef} className="cb-back" onClick={onClose} aria-label="Back to the Brain">←</button>
            <div>
              <span className="cb-tag">ONE YOU · COACHING</span>
              <h1 className="cb-h1" id="cv-title">Your agents this week</h1>
              <p className="cb-sub">Who needs you now, who&apos;s slipping, who&apos;s winning. One tap to act.</p>
            </div>
          </div>
          <div className="cb-top-acts">
            <span className="cb-btn">{week}</span>
            <button type="button" className="cb-btn solid" disabled={!notYet.length || busy} onClick={() => setConfirm(notYet.map((b) => b.id))}>
              {notYet.length ? `Nudge everyone who hasn't set (${notYet.length})` : board.kpi.notSet.length ? "Everyone not set is nudged" : "Everyone has set the week"}
            </button>
          </div>
        </header>
        {ConfirmBox}

        <div className="cb-kpis">
          {kpis.map((k) => (
            <button key={k.key} type="button" className={`cb-kpi${list === k.key ? " on" : ""}`} onClick={() => setList(list === k.key ? null : k.key)} aria-label={`${k.value} ${k.label}. ${k.act}.`}>
              <b style={k.tone ? { color: TONE[k.tone] } : undefined}>{k.value}</b>
              <span>{k.label}</span>
              <em>{k.act} →</em>
            </button>
          ))}
        </div>

        <div className="cb-main">
          <div className="cb-board">
            {list ? (
              <section className="cb-list" aria-label={LISTS[list].title}>
                <div className="cb-list-head">
                  <h2>
                    {LISTS[list].title} <small>{LISTS[list].people.length}</small>
                  </h2>
                  <div className="cb-list-acts">
                    {list === "notSet" && notYet.length ? (
                      <button type="button" className="chip-btn primary" onClick={() => setConfirm(notYet.map((b) => b.id))}>Nudge all {notYet.length}</button>
                    ) : null}
                    <button type="button" className="chip-btn" onClick={() => setList(null)}>Back to the board</button>
                  </div>
                </div>
                {LISTS[list].line ? <p className="cb-list-line">{LISTS[list].line}</p> : null}
                {list === "all" ? (
                  <p className="cb-list-line">
                    Team keep rate {pct(board.kpi.teamKept)}
                    {ts ? ` · ${ts.full} of ${ts.of} fully set up` : ""}
                    {tp ? ` · team pace: ${tp.average != null ? `average ${tp.average} this week; ${tp.atMinimum} of ${tp.counted} at ${squad!.minimum} so far` : "no scores this week yet"}` : ""}.
                  </p>
                ) : null}
                {list === "all" && tp?.help.length ? (
                  <p className="cb-list-line">
                    May need help:{" "}
                    {tp.help.map(({ mate, words }, k) => (
                      <span key={mate.id}>
                        {k ? "; " : ""}
                        {agents.some((a) => a.id === mate.id) ? (
                          <button type="button" className="cb-link" onClick={() => open(mate.id)}>{board.agents.find((b) => b.id === mate.id)?.short ?? mate.name}</button>
                        ) : (
                          mate.name
                        )}{" "}
                        ({words.toLowerCase()})
                      </span>
                    ))}
                  </p>
                ) : null}
                {LISTS[list].people.length ? (
                  <div className="cb-grid">
                    {LISTS[list].people.map((b) => (
                      <div key={b.id} className="cb-row">
                        <Card b={b} sel={sel?.id === b.id} onOpen={() => open(b.id)} />
                        {list === "notSet" || list === "at100" ? (
                          <span className="cb-row-act">{sent[b.id] ?? (list === "notSet" ? <button type="button" className="cb-link" disabled={busy} onClick={() => nudge([b.id])}>Nudge {firstOf(b)}</button> : null)}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pm-empty">No one here this week.</p>
                )}
              </section>
            ) : (
              <div className="cb-cols">
                {cols.map((c) => (
                  <section key={c.key} className="cb-col" aria-label={c.title}>
                    <h2>
                      <i style={{ background: TONE[c.tone], boxShadow: `0 0 10px ${TONE[c.tone]}` }} aria-hidden="true" />
                      <button type="button" className="cb-col-t" onClick={() => setList(c.key)} aria-label={`${c.title}: ${c.people.length}. Open the list.`}>
                        {c.title} <small>{c.people.length}</small>
                      </button>
                    </h2>
                    {c.people.length ? c.people.slice(0, COLUMN_SHOW).map((b) => <Card key={b.id} b={b} sel={sel?.id === b.id} onOpen={() => open(b.id)} />) : <p className="pm-empty">{c.empty}</p>}
                    {c.people.length > COLUMN_SHOW ? (
                      <button type="button" className="cb-more" onClick={() => setList(c.key)}>+{c.people.length - COLUMN_SHOW} more →</button>
                    ) : null}
                  </section>
                ))}
              </div>
            )}
          </div>

          {sel ? (
            <aside className={`cb-detail${pick ? " is-open" : ""}`} aria-label={`${sel.short}, this week`}>
              <button type="button" className="cb-sheet-x" onClick={() => setPick(null)} aria-label="Close">×</button>
              <div className="cb-d-head">
                <Face b={sel} big />
                <div>
                  <h2>{fullOf(sel)}</h2>
                  <p className="cb-chip" style={{ color: TONE[sel.tone] }}>
                    <i style={{ background: TONE[sel.tone] }} aria-hidden="true" />
                    {sel.why}
                  </p>
                  <p className="cb-seen">
                    {activeLabel(sel.quietDays)}
                    {sel.quietDays != null && sel.a.lastActiveSource && SOURCE_WORDS[sel.a.lastActiveSource] ? ` · ${SOURCE_WORDS[sel.a.lastActiveSource]}` : ""}
                  </p>
                </div>
              </div>

              {(() => {
                // never padded: the weeks there are, oldest first (a week with nothing in it is an empty slot, not a 0 bar)
                const w: Weeks = eightWeeks(sel) ?? weeks[sel.id] ?? "loading";
                const n = w && w !== "loading" ? w.values.length : 8;
                return (
                  <>
                    <h3 className="cb-sec">Last {n} {n === 1 ? "week" : "weeks"} · {w && w !== "loading" && w.kind === "score" ? "weekly score" : "commitments kept"}</h3>
                    {w === "loading" ? (
                      <p className="pm-empty">Loading…</p>
                    ) : !w || !w.values.length ? (
                      <p className="pm-empty">No finished weeks yet.</p>
                    ) : (
                      <div className="cb-bars" role="img" aria-label={w.values.map((v, k) => `W${k + 1} ${v == null ? "none" : w.kind === "kept" ? `${Math.round(v * 100)}% kept` : `${w.raw?.[k] ?? Math.round(v * (sel.minimum || 100))}`}`).join(", ")}>
                        {w.values.map((v, k) => (
                          <div key={k} title={v == null ? "Nothing that week" : w.kind === "kept" ? `${Math.round(v * 100)}% kept` : `Score ${w.raw?.[k] ?? Math.round(v * (sel.minimum || 100))}`}>
                            {w.kind === "score" && w.raw?.[k] != null ? <b className="cb-bar-n">{w.raw[k]}</b> : null}
                            {v == null ? (
                              <i className="cb-slot" aria-hidden="true" />
                            ) : (
                              <i style={{ height: v === 0 ? 4 : Math.max(6, Math.min(1.1, v) * 66), background: v === 0 ? BAR8.red : BAR8[barTone(v)] }} />
                            )}
                            W{k + 1}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              <h3 className="cb-sec">This week</h3>
              <ul className="cb-checks">
                <li>
                  <span className={`cb-box${sel.set ? " d" : ""}`} aria-hidden="true">{sel.set ? "✓" : ""}</span>
                  <span>{sel.set ? `Commitments set: ${sel.a.c.week!.items.length}` : sel.away ? "Away this week" : "Commitments not set yet"}</span>
                  {!sel.set && !sel.away ? (
                    sent[sel.id] ? <small className="cb-sent">{sent[sel.id]}</small> : <button type="button" className="cb-link" disabled={busy} onClick={() => nudge([sel.id])}>Nudge</button>
                  ) : null}
                </li>
                {sel.a.scoreThisWeek != null ? (
                  <li>
                    <span className={`cb-box${sel.a.scoreThisWeek >= sel.minimum ? " d" : ""}`} aria-hidden="true">{sel.a.scoreThisWeek >= sel.minimum ? "✓" : ""}</span>
                    <span>{scoreLine(sel)}</span>
                  </li>
                ) : null}
                {(() => {
                  const m = mateOf(squad ?? null, sel.id);
                  if (!m || !squad || sel.a.scoreThisWeek != null) return null;
                  const p = paceOf(m, squad.minimum);
                  return (
                    <li>
                      <span className={`cb-box${m.score >= squad.minimum ? " d" : ""}`} aria-hidden="true">{m.score >= squad.minimum ? "✓" : ""}</span>
                      <span>
                        Score {p.line}
                        {p.help ? <small className="tp-help"> · {p.help}</small> : null}
                      </span>
                    </li>
                  );
                })()}
                {sel.a.setup ? (
                  <li>
                    <span className={`cb-box${sel.a.setup.done === sel.a.setup.of ? " d" : ""}`} aria-hidden="true">{sel.a.setup.done === sel.a.setup.of ? "✓" : ""}</span>
                    <span>
                      {sel.a.setup.steps.find((x) => !x.done)?.label ?? "Set up"} ({setupWords(sel.a.setup)})
                      {setupLate(sel.a.setup, sel.a.c.today) ? <small className="tp-help"> · under half after 14 days</small> : null}
                    </span>
                  </li>
                ) : null}
              </ul>

              <div className="cb-pulse">
                <p>
                  <b>Pulse:</b>{" "}
                  {sel.kept == null
                    ? `${firstOf(sel)}: ${keptLine(sel).toLowerCase()}.`
                    : `${firstOf(sel)} keeps ${Math.round(sel.kept * 100)}% of commitments over 8 weeks${sel.a.keptCounts?.set ? ` (${sel.a.keptCounts.set} set: ${keptDetail(sel)})` : ""}${sel.a.c.streak ? ` · ${sel.a.c.streak}-week streak` : ""}.`}
                  {sel.kept != null && sel.a.c.lastWeek ? ` Last week: ${sel.a.c.lastWeek.kept} kept, ${sel.a.c.lastWeek.partly} partly, ${sel.a.c.lastWeek.missed} missed.` : ""}
                </p>
                {onPulse ? (
                  <button type="button" className="cb-link" onClick={() => onPulse(sel.a).then(setPulseNote)}>
                    Pulse&apos;s read of {firstOf(sel)}&apos;s last 8 weeks →
                  </button>
                ) : null}
                {pulseNote ? <p className="pm-empty">{pulseNote}</p> : null}
              </div>

              <div className="cb-acts">
                <button type="button" className="cb-btn solid" disabled={busy || !!sent[sel.id]?.startsWith("Nudge sent")} onClick={() => nudge([sel.id])} title={NUDGE_WORDS}>
                  {sent[sel.id]?.startsWith("Nudge sent") ? "Nudged" : sel.set ? `Nudge ${firstOf(sel)}` : `Nudge ${firstOf(sel)} to set the week`}
                </button>
                {onBook ? (
                  <button type="button" className="cb-btn" onClick={() => onBook(`Coaching call with ${firstOf(sel)}`)}>Book a coaching call</button>
                ) : (
                  <a className="cb-btn" href="https://move.vip50one.com/calendar" target="_blank" rel="noopener">Book a coaching call</a>
                )}
                <button type="button" className="cb-btn wide" aria-expanded={weekOpen} onClick={() => setWeekOpen(!weekOpen)}>
                  {weekOpen ? `Close ${firstOf(sel)}'s week` : `Open ${firstOf(sel)}'s week →`}
                </button>
              </div>
              {sent[sel.id] ? <p className="cb-sent">{sent[sel.id]}</p> : null}

              {weekOpen ? (
                <div className="cb-week">
                  <h3 className="cb-sec">Commitments this week</h3>
                  {sel.a.c.week?.items.length ? <ul className="pm-list pm-compact">{sel.a.c.week.items.map((i) => <ItemRow key={i.id} i={i} />)}</ul> : <p className="pm-empty">Not set yet.</p>}
                  {sel.a.c.weekend?.items.length ? (
                    <>
                      <h3 className="cb-sec">Weekend</h3>
                      <ul className="pm-list pm-compact">{sel.a.c.weekend.items.map((i) => <ItemRow key={i.id} i={i} />)}</ul>
                    </>
                  ) : null}
                  {sel.a.setup ? <SetupBlock st={sel.a.setup} late={setupLate(sel.a.setup, sel.a.c.today)} /> : null}
                </div>
              ) : null}

              <p className="cb-promise">
                {demo ? "Example agents. " : ""}Coach view: commitments, scores and yes/no only, never a client. Only the agent sets and marks their commitments; nobody but the agent and their coach sees them.
              </p>
            </aside>
          ) : (
            <aside className="cb-detail">
              <p className="pm-empty">No agents linked to you yet.</p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

/** §3ag: setup progress for one agent: a bar, then the steps left with their counts. Facts only. */
function SetupBlock({ st, late }: { st: Setup; late: boolean }) {
  const left = st.steps.filter((x) => !x.done);
  return (
    <section className="cs" aria-label="Setup">
      <h3 className="cb-sec">Getting set up</h3>
      <div className="cs-bar" role="img" aria-label={setupWords(st)}>
        {st.steps.map((x) => <i key={x.key} className={x.done ? "on" : undefined} />)}
      </div>
      <p className="d-sum">{setupWords(st)}{late ? ` · under half after ${14} days` : ""}</p>
      {left.length ? (
        <ul className="pm-list pm-compact">
          {left.map((x) => (
            <li key={x.key}>
              <i className="pm-dot" style={{ background: "rgba(255,255,255,0.35)" }} aria-hidden="true" />
              <span className="pm-body">
                <b>{x.label}</b>
                {x.count != null ? <small>{x.count} so far</small> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
