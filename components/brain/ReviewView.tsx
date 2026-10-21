"use client";

import { useEffect, useRef, useState } from "react";
import PulseRing, { PULSE_COLOR } from "./PulseRing.tsx";
import PulseMark from "./PulseMark.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import OrbWords, { orbR, useOrbPhone } from "./OrbWords.tsx";
import ContactPanel from "./ContactPanel.tsx";
import MoveExampleFetch from "./views/MoveExampleFetch.tsx";
import type { ExampleStore } from "@/lib/examples/move2.ts";
import { nextThings, type ContactRef, type Do, type Card, type Review, type ReviewKey, type Thing } from "@/lib/review.ts";
import { PART_DO, type Read as PulseRead, type ReadKey } from "@/lib/pulseCoach.ts";

// Weekly Review in ONE YOU: the week's score in the middle, its parts round it (VIP touches, who you haven't
// reached, commitments, goals). Tap one and it comes to the middle with its detail in the side panel; the
// Week orb brings the score back (Parry, 6 Oct, the rule for every orb). The side panel opens on Pulse's
// three things for the rest of the week (Mon-Thu) or next week (Fri-Sun). The number and its word sit inside each orb
// (audit 3.3.4). Facts only: nothing is sent and nothing is marked done from here.
// Three parts in the side panel (Parry, 16 Oct 13:41 MT, Pulse Coach folds in): 1 Your week, 2 Pulse's read on the last
// 8 weeks (what was Pulse Coach), 3 Three things for next week, Pulse's one focus first, each with "Make it a
// commitment": written only when the agent taps it.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 310;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";

function arc(cx: number, cy: number, r: number, share: number): string {
  const a = Math.max(0.001, Math.min(0.9999, share)) * Math.PI * 2;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}`;
}
const ringColor = (c: { level: Card["level"]; good: boolean }) => (c.level === "now" ? PULSE_COLOR.now : c.level === "today" ? PULSE_COLOR.today : c.good ? GREEN : "rgba(160,175,210,0.45)");

export default function ReviewView({
  review,
  read,
  week,
  demo,
  onClose,
  onCommit,
  onChanged,
  onAction,
  demoStore,
}: {
  review: Review;
  read?: PulseRead | null;
  week: { score: number; minimum: number } | null;
  demo: boolean;
  onClose: () => void;
  onCommit?: (t: Thing) => Promise<{ ok: boolean; text: string }>;
  /** A touch was logged or a box ticked on a contact opened here: the Brain refetches the roster, so the review follows. */
  onChanged?: () => void;
  /** A card's action that leaves the review: an existing ONE MOVE page, or the Goals, Commitments or Wins view. */
  onAction?: (d: Extract<Do, { kind: "page" | "view" }>) => void;
  /** The example agent: the example ONE MOVE that answers the contact panel (nothing leaves the browser). */
  demoStore?: ExampleStore | null;
}) {
  const cam = useSvgCamera(SIZE);
  const phone = useOrbPhone();
  const R = orbR(phone);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<ReviewKey | null>(null);
  // A name in the review opens that contact in the side panel, with its boxes and Call / Text / Email (Parry, 19 Oct:
  // "click the name and have it open that contact so they can do something about it"). Back returns to the review.
  type Who = ContactRef & { touch?: string };
  const [who, setWho] = useState<Who | null>(null);
  // Work through a list: "Not reached", or the VIP-50 who still need one monthly touch. It steps to the next person who
  // still needs it; whoever was touched has already left the list (the roster is read again after a touch).
  const [queue, setQueue] = useState<{ list: string; label: string; seen: string[] } | null>(null);
  const [touchPick, setTouchPick] = useState<string | null>(null);
  const whoRef = useRef(who);
  whoRef.current = who;
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const backFromContact = () => {
    setWho(null);
    setQueue(null);
    onChangedRef.current?.(); // a tick or a logged call may still be on its way; the review refetches either way
  };
  const backRef = useRef(backFromContact);
  backRef.current = backFromContact;
  const [readPick, setReadPick] = useState<ReadKey | null>(null);
  const [made, setMade] = useState<Record<number, { ok: boolean; text: string }>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const things = nextThings(review, read?.focus ?? null);
  const readParts = read ? read.parts.filter((p) => p.key !== "focus") : [];
  const readSel = readParts.find((p) => p.key === readPick) ?? null;
  const commit = async (k: number) => {
    if (!onCommit || busy != null) return;
    setBusy(k);
    const r = await onCommit(things[k]);
    setBusy(null);
    setMade((m) => ({ ...m, [k]: r }));
  };
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (whoRef.current) backRef.current();
      else onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const peopleFor = (list: string): ContactRef[] =>
    list === "untouched"
      ? review.cards.find((c) => c.key === "untouched")?.rows.filter((r) => r.contact).map((r) => ({ id: r.contact!, name: r.name ?? r.text })) ?? []
      : review.cards.find((c) => c.key === "touches")?.rows.find((r) => r.touch === list)?.people ?? [];
  const startQueue = (list: string, label: string) => {
    const first = peopleFor(list)[0];
    if (!first) return;
    setQueue({ list, label, seen: [first.id] });
    setWho({ ...first, touch: list === "untouched" ? undefined : list });
  };
  const queueLeft = queue ? peopleFor(queue.list).filter((c) => !queue.seen.includes(c.id)) : [];
  const stepNext = () => {
    if (!queue) return;
    const nxt = queueLeft[0];
    if (!nxt) return backFromContact();
    setQueue({ ...queue, seen: [...queue.seen, nxt.id] });
    setWho({ ...nxt, touch: queue.list === "untouched" ? undefined : queue.list });
  };
  const run = (d: Do) => {
    if (d.kind === "queue") startQueue(d.list, d.label);
    else if (d.kind === "contact") setWho({ id: d.id, name: d.name });
    else onAction?.(d);
  };
  const open = (k: ReviewKey | null) => {
    setPick(k);
    setTouchPick(null);
    setReadPick(null);
    cam.reset();
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });

  const nameOf = (c: ContactRef, label = c.name) => (
    <button type="button" className="ta-name rv-name" onClick={() => setWho(touchPick ? { ...c, touch: touchPick } : c)} aria-label={`Open ${c.name}`}>
      {label}
    </button>
  );
  const touchLabel = (key: string) => review.cards.find((c) => c.key === "touches")?.rows.find((r) => r.touch === key)?.text.split(":")[0] ?? key;
  const sel = review.cards.find((c) => c.key === pick) ?? null;
  const touchRow = sel?.key === "touches" ? sel.rows.find((r) => r.touch === touchPick) ?? null : null;
  // The one picked sits in the middle; the rest, and the Week orb, go round it.
  // The score is the middle (or the Week orb when a part is picked), so it is never a ring orb as well.
  const round = review.cards.filter((c) => c.key !== "score" && c.key !== sel?.key);
  const m = round.length + (sel ? 1 : 0);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const weekSeat = sel ? seatAt(0) : null;
  const seats = round.map((c, k) => ({ c, ...seatAt(k + (sel ? 1 : 0)) }));
  const fill = week ? Math.min(1, week.score / Math.max(1, week.minimum)) : null;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="rv-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg ow-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Your week">
            <defs>
              <radialGradient id="rv-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ c, x, y }) => (
              <line key={`l-${c.key}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {weekSeat && <line className="vr-link" x1={C} y1={C} x2={weekSeat.x} y2={weekSeat.y} />}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${sel.title}, in the middle`}>
                {sel.level ? <PulseRing r={CORE} level={sel.level} x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#rv-glass)" stroke={ringColor(sel)} strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{sel.big}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{sel.title.toUpperCase()}</text>
                {sel.tag ? <text className="dt-score-sub" x={C} y={C + 56} textAnchor="middle">{sel.tag}</text> : null}
              </g>
            ) : (
              <g aria-label={week ? `Weekly score ${week.score} of ${week.minimum}` : "Your week"}>
                <circle cx={C} cy={C} r={CORE} fill="url(#rv-glass)" stroke="#ffd86a" strokeWidth={3} />
                {fill != null && <path d={arc(C, C, CORE + 10, fill)} fill="none" stroke={fill >= 1 ? GREEN : GOLD} strokeWidth={8} strokeLinecap="round" />}
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{week ? week.score : "–"}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">{week ? `OF ${week.minimum} THIS WEEK` : "THIS WEEK"}</text>
              </g>
            )}

            {weekSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Your week: back to the score" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={weekSeat.x} cy={weekSeat.y} r={R} fill="url(#rv-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <OrbWords x={weekSeat.x} y={weekSeat.y} r={R} big={week ? String(week.score) : "–"} word="Week" tag="SCORE" phone={phone} />
              </g>
            )}

            {seats.map(({ c, x, y }) => (
              <g key={c.key} data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label={`${c.title}: ${c.big}${c.tag ? ` ${c.tag.toLowerCase()}` : ""}. ${c.line}`} {...tap(() => open(c.key))}>
                {c.level ? <PulseRing r={R} level={c.level} x={x} y={y} /> : null}
                <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#rv-glass)" stroke={ringColor(c)} strokeWidth={2.5} />
                <OrbWords x={x} y={y} r={R} big={c.big} word={c.word} tag={c.tag} phone={phone} />
              </g>
            ))}
          </svg>
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={cam.reset} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Weekly Review">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          {who ? (
            <>
              {demoStore ? <MoveExampleFetch store={demoStore} /> : null}
              <h1 className="d-title" id="rv-title">{who.name}</h1>
              {queue ? (
                <p className="d-sub" role="status">
                  {queue.label}: {queueLeft.length ? `${queueLeft.length} more after ${who.name.split(" ")[0]}` : "this is the last one"}
                </p>
              ) : null}
              <div className="rv-step">
                {queue ? (
                  <button type="button" className="rv-commit" onClick={stepNext}>
                    {queueLeft.length ? `Next: ${queueLeft[0].name}` : "Done, back to the review"}
                  </button>
                ) : null}
                <button type="button" className="vr-classic" onClick={backFromContact}>Back to Weekly Review</button>
              </div>
              <ContactPanel
                key={who.id}
                contactId={who.id}
                touch={who.touch ? { key: who.touch, label: touchLabel(who.touch), onPage: (path) => onAction?.({ kind: "page", path }) } : undefined}
                onLogged={() => onChangedRef.current?.()}
              />
            </>
          ) : readSel ? (
            <>
              <h1 className="d-title" id="rv-title">{readSel.title}</h1>
              <p className="d-sub">{readSel.line}</p>
              <ul className="pm-list pm-compact">
                {readSel.rows.map((r, k) => (
                  <li key={k}>
                    <i className="pm-dot" style={{ background: ringColor(readSel) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{r.text}</b>
                      {r.sub ? <small>{r.sub}</small> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {readSel.key !== "focus" ? (
                <div className="decide-btns">
                  <button type="button" className="chip-btn primary" data-act="read-part" onClick={() => run(PART_DO[readSel.key as Exclude<ReadKey, "focus">].do as Do)}>
                    {PART_DO[readSel.key as Exclude<ReadKey, "focus">].label}
                  </button>
                </div>
              ) : null}
              <button className="vr-classic" onClick={() => setReadPick(null)}>Whole review</button>
            </>
          ) : sel && touchRow ? (
            <>
              <h1 className="d-title" id="rv-title">{touchLabel(touchRow.touch!)}</h1>
              <p className="d-sub">{touchRow.people?.length ? `${touchRow.people.length} of your VIP-50 still need one this month` : "Every VIP-50 has this one this month. Well done."}</p>
              {touchRow.people?.length ? (
                <>
                  <ul className="pm-list pm-compact">
                    {touchRow.people.map((c) => (
                      <li key={c.id}>
                        <i className="pm-dot" style={{ background: ringColor(sel) }} aria-hidden="true" />
                        <span className="pm-body"><b>{nameOf({ ...c })}</b></span>
                      </li>
                    ))}
                  </ul>
                  <button className="rv-commit rv-act" onClick={() => startQueue(touchRow.touch!, touchLabel(touchRow.touch!))}>Work through them</button>
                </>
              ) : null}
              <button className="vr-classic" onClick={() => setTouchPick(null)}>Back to VIP touches</button>
            </>
          ) : sel ? (
            <>
              <h1 className="d-title" id="rv-title">{sel.title}</h1>
              <p className="d-sub">{sel.line}</p>
              {sel.rows.length ? (
                <ul className="pm-list pm-compact">
                  {sel.rows.map((r, k) => (
                    <li key={k}>
                      <i className="pm-dot" style={{ background: ringColor(sel) }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>
                          {r.contact ? nameOf({ id: r.contact, name: r.name ?? r.text }, r.text) : r.touch ? (
                            <button type="button" className="ta-name rv-name" onClick={() => setTouchPick(r.touch!)} aria-label={`Who still needs ${touchLabel(r.touch)}`}>{r.text}</button>
                          ) : r.text}
                        </b>
                        {r.sub ? <small>{r.sub}</small> : null}
                      </span>
                      {r.touch && r.people?.length ? (
                        <span className="pm-acts">
                          <button className="rv-commit" onClick={() => startQueue(r.touch!, touchLabel(r.touch!))}>Work through them</button>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pm-empty">Nothing here this week.</p>
              )}
              <button className="rv-commit rv-act" onClick={() => run(sel.action.do)}>{sel.action.label}</button>
              <button className="vr-classic" onClick={() => open(null)}>Whole week</button>
            </>
          ) : (
            <>
              <h1 className="d-title" id="rv-title">Weekly Review</h1>
              <p className="d-sub">{week ? `${week.score} of ${week.minimum} this week` : "Your week"}</p>
              <h2>1. Your week</h2>
              <ul className="pm-list pm-compact">
                {review.cards.map((c) => (
                  <li key={c.key}>
                    <i className="pm-dot" style={{ background: ringColor(c) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>
                        {c.title}: {c.big}
                        {c.tag ? ` ${c.tag.toLowerCase()}` : ""}
                      </b>
                      <small>{c.line}</small>
                    </span>
                    <span className="pm-acts">
                      <button className="rv-commit" onClick={() => run(c.action.do)}>{c.action.label}</button>
                      <button onClick={() => open(c.key)} aria-label={`Open ${c.title}`}>→</button>
                    </span>
                  </li>
                ))}
              </ul>
              <h2>
                <PulseMark label={false} /> 2. Pulse&apos;s read on the last 8 weeks
              </h2>
              {read ? (
                <>
                  <p className="d-sum">{read.headline}</p>
                  <ul className="pm-list pm-compact">
                    {readParts.map((p) => (
                      <li key={p.key}>
                        <i className="pm-dot" style={{ background: ringColor(p) }} aria-hidden="true" />
                        <span className="pm-body">
                          <b>
                            {p.title}: {p.big}
                          </b>
                          <small>{p.line}</small>
                        </span>
                        <span className="pm-acts">
                          <button onClick={() => setReadPick(p.key)} aria-label={`Open ${p.title}`}>→</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="pm-empty">Pulse reads your weeks once one full week is in ONE MOVE.</p>
              )}
              <h2>
                <PulseMark label={false} /> 3. {review.nextTitle}
              </h2>
              <ol className="pm-list pm-compact rv-next">
                {things.map((t, k) => (
                  <li key={k}>
                    <span className="pm-time">{t.focus ? "Focus" : k + 1}</span>
                    <span className="pm-body">
                      <b>{t.text}</b>
                      {t.people?.length ? <small className="rv-people">Open: {t.people.map((c, j) => <span key={c.id}>{j ? ", " : ""}{nameOf(c)}</span>)}</small> : null}
                      {t.why ? <small>{t.why}</small> : null}
                      {made[k] ? <small className={made[k].ok ? "rv-made" : "rv-made bad"} role="status">{made[k].text}</small> : null}
                    </span>
                    {onCommit && !made[k]?.ok ? (
                      <span className="pm-acts">
                        <button className="rv-commit" disabled={busy != null} onClick={() => void commit(k)}>
                          {busy === k ? "Saving…" : "Make it a commitment"}
                        </button>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}Facts from your own numbers only. Pulse never sends anything, marks anything done or sets a commitment for you.</p>
        </aside>
      </div>
    </div>
  );
}
