"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import { chimeOn, setChime, unlockChime } from "@/lib/chime.ts";
import { clock12, hm, nextLine, readBlock, toMin, toTime, type Block, type Busy } from "@/lib/schedule.ts";
import { faceAngle, faceArcs, faceTimeAt } from "@/lib/overview.ts";
import TellPulse from "./TellPulse.tsx";
import type { Day } from "./useDay.ts";

// The Day Clock (VIP-SUMMARY §3o.9; Parry, 6 Oct: "make this super smart so that the plan my day actually
// makes sense and they will do it. not just look good"). A real 12-hour clock with the morning on the inner
// ring and the afternoon on the outer ring ("have a morning and afternoon on the same clock"): appointments
// grey, drives dashed, Pulse's plan gold in the free gaps, the hour hand on now. Tell Pulse the day, tap a
// gap or type a block; Looks good keeps the day and sends it to ONE GO.

const SIZE = 1000;
const C = SIZE / 2;
const R_AM = 238;
const R_PM = 330;
const W = 70;
const CORE = 150;
const ringR = (pm: boolean) => (pm ? R_PM : R_AM);
const GOLD = "#f5c542";

const KIND_MARK: Record<Block["kind"], string> = { power_hour: "☎", texts: "✉", notes: "✎", approvals: "✓", in_person: "☕", task: "•", custom: "◆" };
const BUSY_WORD: Record<Busy["source"], string> = { calendar: "Busy", one_event: "Event", time_block: "Block", open_house: "Open house", showing: "Showing", listing_appointment: "Listing appointment", fixed: "Appointment", travel: "Drive" };

const polar = (a: number, r: number) => ({ x: C + r * Math.sin(a), y: C - r * Math.cos(a) });
function arc(a1: number, a2: number, r: number): string {
  const p1 = polar(a1, r);
  const p2 = polar(Math.max(a1 + 0.001, a2), r);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${p2.x} ${p2.y}`;
}
const range = (s: string, e: string) => `${clock12(s).replace(/(am|pm)$/, toMin(s) < 720 === toMin(e) < 720 ? "" : "$1")}-${clock12(e)}`;
// A few words that fit on an arc, cut at a word.
function short(t: string, n = 18): string {
  if (t.length <= n) return t;
  const cut = t.slice(0, n + 1).replace(/\s+\S*$/, "").replace(/\s+(with|to|at|the|and|for|on|of|a)$/i, "");
  return cut || t.slice(0, n);
}
const BUSY_SHORT: Record<Busy["source"], string> = { calendar: "Busy", one_event: "Event", time_block: "Block", open_house: "Open house", showing: "Showing", listing_appointment: "Listing appt", fixed: "Appointment", travel: "Drive" };
// What sits on an arc: the agent's own words for what they told Pulse, short kinds for the rest.
const busyLabel = (b: Busy) => (b.source === "travel" ? "Drive" : b.source === "calendar" || b.source === "time_block" || b.source === "fixed" ? short(b.title ?? BUSY_SHORT[b.source], 16) : BUSY_SHORT[b.source]);
// An arc as a path for text: clockwise on the top half, reversed on the bottom so words read upright.
function textArc(a1: number, a2: number, r: number): string {
  const mid = (a1 + a2) / 2;
  const flip = mid > Math.PI / 2 && mid < (3 * Math.PI) / 2;
  const [f, t] = flip ? [a2, a1] : [a1, a2];
  const p1 = polar(f, r), p2 = polar(t, r);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${Math.abs(a2 - a1) > Math.PI ? 1 : 0} ${flip ? 0 : 1} ${p2.x} ${p2.y}`;
}
const fits = (label: string, a1: number, a2: number, r: number) => (a2 - a1) * r > label.length * 7 + 8;
const BLOCK_SHORT: Partial<Record<Block["kind"], string>> = { power_hour: "Power Hour", texts: "Texts", notes: "Notes", approvals: "Approvals" };
const REPEAT_WORD = { none: "today only", weekdays: "every weekday", daily: "every day" } as const;

export default function DayClock({ day, live, tellText, onClose, onTick, onClassic }: { day: Day; live: boolean; tellText?: string; onClose: () => void; onTick: (refs: string[], done: boolean) => void; onClassic: () => void }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<{ title: string; start: string; end: string; repeat: "none" | "weekdays" | "daily" } | null>(null);
  const [miss, setMiss] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [chime, setChimeState] = useState(true);
  const [askNotice, setAskNotice] = useState(false);

  useEffect(() => {
    setChimeState(chimeOn());
    setAskNotice(typeof Notification !== "undefined" && Notification.permission === "default");
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const { hours, busy: taken, plan, approvedAt } = day;
  const now = day.now ?? hours.start;
  const blocks = plan.blocks;
  const nowPm = toMin(now) >= 720;
  const drives = taken.filter((b) => b.source === "travel").length;
  const appts = taken.length - drives;
  const line = nextLine(blocks, now);
  const doneN = blocks.filter((b) => b.done).length;
  const free = Math.max(0, plan.freeMin - plan.plannedMin);
  const picked = blocks.find((b) => b.id === pick);
  const customIds = new Set(day.customs.map((c) => `blk:${c.id}`));

  const read = () => {
    const r = readBlock(text);
    setMiss(!r);
    setDraft(r);
  };
  const tapGap = (e: React.MouseEvent) => {
    const m = cam.svgRef.current?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const start = faceTimeAt(p.x, p.y, C, C, (R_AM + R_PM) / 2);
    setDraft({ title: "", start, end: toTime(toMin(start) + 30), repeat: "none" });
    setMiss(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const save = async () => {
    if (!draft || !draft.title.trim() || toMin(draft.end) <= toMin(draft.start)) return;
    setBusy(true);
    setNote(await day.addBlock({ ...draft, title: draft.title.trim().slice(0, 80) }));
    setBusy(false);
    setDraft(null);
    setText("");
  };
  const approve = async () => {
    setBusy(true);
    setNote(await day.approve());
    setBusy(false);
  };
  const tick = (b: Block) => onTick(b.refs, !b.done);

  // A clock face: twelve hours round, 12 at the top.
  const marks = Array.from({ length: 12 }, (_, h) => ({ a: (h / 12) * Math.PI * 2, label: String(h || 12), major: h % 3 === 0 }));
  const rows: { busy?: Busy; block?: Block; at: number }[] = [...taken.map((b) => ({ busy: b, at: toMin(b.start) })), ...blocks.map((b) => ({ block: b, at: toMin(b.start) }))].sort((x, y) => x.at - y.at);

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="dc-title" onPointerDown={unlockChime}>
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Your day as a clock">
            <defs>
              <radialGradient id="dc-core" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.75" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
              <radialGradient id="dc-glow">
                <stop offset="0.5" stopColor="#ffd86a" stopOpacity="0.3" />
                <stop offset="1" stopColor="#ffd86a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="dc-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffe08a" />
                <stop offset="1" stopColor="#c8961f" />
              </linearGradient>
            </defs>

            <circle cx={C} cy={C} r={R_PM + 130} fill="url(#dc-glow)" opacity={0.35} />
            {/* the two rings, morning inside and afternoon outside; tap a gap to add a block there */}
            {[false, true].map((pm) => (
              <circle key={`track-${pm}`} data-tap className="dc-track" cx={C} cy={C} r={ringR(pm)} strokeWidth={W} onClick={tapGap} role="button" aria-label={`${pm ? "Afternoon" : "Morning"}: tap a free time to add a block`} />
            ))}
            {faceArcs(hours.start, hours.end).map((x, i) => (
              <path key={`hours-${i}`} className="dc-hours" d={arc(x.a1, x.a2, ringR(x.pm))} strokeWidth={W} pointerEvents="none" />
            ))}
            {marks.map((k) => {
              const a = polar(k.a, R_AM - W / 2);
              const b = polar(k.a, R_PM + W / 2 + (k.major ? 14 : 8));
              const t = polar(k.a, R_PM + W / 2 + 34);
              return (
                <g key={k.a} className="dc-mark" pointerEvents="none">
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={k.major ? "major" : ""} />
                  <text x={t.x} y={t.y} dy="0.35em" textAnchor="middle">{k.label}</text>
                </g>
              );
            })}

            {taken.map((b, i) =>
              faceArcs(b.start, b.end).map((x, j) => {
                const r = ringR(x.pm);
                const label = busyLabel(b);
                const id = `dc-tb-${i}-${j}`;
                return (
                  <g key={id} className={`dc-busy${b.source === "travel" ? " dc-drive" : ""}${b.source === "fixed" ? " dc-told" : ""}`}>
                    <path d={arc(x.a1 + 0.003, x.a2 - 0.003, r)} strokeWidth={b.source === "travel" ? W * 0.42 : W} />
                    <title>{`${range(b.start, b.end)} ${b.title ?? BUSY_WORD[b.source]}`}</title>
                    {fits(label, x.a1, x.a2, r) && (
                      <>
                        <path id={id} d={textArc(x.a1, x.a2, r)} fill="none" stroke="none" />
                        <text dy="0.35em" pointerEvents="none">
                          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{label}</textPath>
                        </text>
                      </>
                    )}
                  </g>
                );
              }),
            )}
            {blocks.map((b) => {
              const isNow = !b.done && toMin(b.start) <= toMin(now) && toMin(now) < toMin(b.end);
              const label = b.done ? "Done" : BLOCK_SHORT[b.kind] ?? short(b.title, 16);
              return (
                <g
                  key={b.id}
                  data-tap
                  className={`dc-block${b.done ? " done" : ""}${pick === b.id ? " picked" : ""}${isNow ? " now" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${range(b.start, b.end)}: ${b.title}${b.done ? ", done" : ""}`}
                  onClick={() => setPick((x) => (x === b.id ? null : b.id))}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    setPick((x) => (x === b.id ? null : b.id));
                  }}
                >
                  {faceArcs(b.start, b.end).map((x, j) => {
                    const r = ringR(x.pm);
                    const id = `dc-bl-${b.id.replace(/[^a-z0-9]/gi, "")}-${j}`;
                    const m = polar((x.a1 + x.a2) / 2, r);
                    return (
                      <g key={id}>
                        <path d={arc(x.a1 + 0.004, x.a2 - 0.004, r)} strokeWidth={W} stroke={b.done ? "url(#dc-gold)" : undefined} />
                        {fits(label, x.a1, x.a2, r) ? (
                          <>
                            <path id={id} d={textArc(x.a1, x.a2, r)} fill="none" stroke="none" />
                            <text className="dc-label" dy="0.35em" pointerEvents="none">
                              <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{label}</textPath>
                            </text>
                          </>
                        ) : (
                          <text className="dc-icon" x={m.x} y={m.y} dy="0.36em" textAnchor="middle">{b.done ? "✓" : KIND_MARK[b.kind]}</text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {day.now && (() => {
              const a = faceAngle(toMin(now));
              const tip = polar(a, ringR(nowPm) + W / 2 + 6);
              const base = polar(a, CORE + 6);
              return (
                <g className="dc-hand" pointerEvents="none">
                  <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} />
                  <circle cx={tip.x} cy={tip.y} r={7} />
                </g>
              );
            })()}

            <circle cx={C} cy={C} r={CORE} fill="url(#dc-core)" stroke="#ffd86a" strokeWidth={3} />
            <text className="dc-core-big" x={C} y={C - 22} textAnchor="middle">{hm(plan.plannedMin)}</text>
            <text className="dc-core-small" x={C} y={C + 10} textAnchor="middle">OF WORK</text>
            <text className="dc-core-free" x={C} y={C + 44} textAnchor="middle">{`${hm(free)} free · ${doneN}/${blocks.length} done`}</text>
            <text className="dc-core-now" x={C} y={C + 74} textAnchor="middle">{clock12(now)}</text>
            <text className="dc-ring-tag" x={C} y={C + 106} textAnchor="middle">AM INSIDE · PM OUTSIDE</text>
          </svg>

          {(picked || note) && (
            <div className="vr-bar pop" role="status">
              {note ? (
                <>
                  <span>{note}</span>
                  <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
                </>
              ) : (
                <>
                  <span>
                    <b>{range(picked!.start, picked!.end)}</b> {picked!.title}. {picked!.why}
                  </span>
                  <button className="chip-btn" onClick={() => tick(picked!)}>{picked!.done ? "Undo" : "Done"}</button>
                </>
              )}
            </div>
          )}
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={cam.reset} aria-label="Centre on your day">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Your day">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          <h1 className="d-title" id="dc-title">Your day</h1>
          <p className="d-sub">
            {hm(plan.plannedMin)} of work · {hm(free)} free
            {appts ? ` · ${appts} ${appts === 1 ? "appointment" : "appointments"}` : ""}
            {drives ? ` · ${drives} ${drives === 1 ? "drive" : "drives"}` : ""}
          </p>
          {line && <p className="pi-today pi-lvl-today dc-next">{line}</p>}

          <TellPulse day={day} live={live} initial={tellText} onNote={setNote} />

          <p className="d-sum">
            Pulse plans round your appointments and drives: calls in a Power Hour when people pick up, texts and notes in one sitting each, never more than 85% of your free time.
          </p>

          {approvedAt ? (
            <div className="dc-approved">
              <span>Looks good, {clock12(new Date(approvedAt).toLocaleTimeString("en-GB", { timeZone: "America/Denver", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }))}.</span>
              <button className="vr-btn" onClick={day.replan}>Plan it again</button>
            </div>
          ) : (
            <button className="pi-btn pm-send" onClick={approve} disabled={busy || !blocks.length}>
              {busy ? "Saving…" : "Looks good"}
            </button>
          )}

          <h2>Add a block</h2>
          <div className="dc-add">
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setMiss(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && read()}
              placeholder="Gym 6 to 7 every weekday"
              aria-label="A block in plain words"
              maxLength={80}
            />
            <button className="vr-btn" onClick={read} disabled={!text.trim()}>Add</button>
          </div>
          {miss && <p className="dc-miss">Pulse needs a time. Try &quot;Lunch with Marcus 12:30&quot; or &quot;School pickup 3:15 to 3:45&quot;.</p>}
          {draft && (
            <div className="dc-confirm pop">
              <p>
                <input ref={inputRef} className="dc-title-in" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="What is it?" aria-label="What the block is" maxLength={80} />
                <span>
                  <input type="time" value={draft.start} onChange={(e) => e.target.value && setDraft({ ...draft, start: e.target.value })} aria-label="Starts" /> to{" "}
                  <input type="time" value={draft.end} onChange={(e) => e.target.value && setDraft({ ...draft, end: e.target.value })} aria-label="Ends" />
                </span>
                <select value={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.value as typeof draft.repeat })} aria-label="Repeats">
                  {(["none", "weekdays", "daily"] as const).map((r) => (
                    <option key={r} value={r}>{REPEAT_WORD[r]}</option>
                  ))}
                </select>
              </p>
              <div className="decide-btns">
                <button className="btn" disabled={busy || !draft.title.trim() || toMin(draft.end) <= toMin(draft.start)} onClick={save}>Add it</button>
                <button className="btn ghost-btn" onClick={() => setDraft(null)}>Cancel</button>
              </div>
              <small>Pulse plans round it{live ? " and puts it on your calendar" : ""}. It is your time: no one is invited.</small>
            </div>
          )}

          <h2>The plan</h2>
          {rows.length ? (
            <ol className="pm-list pm-compact dc-list">
              {rows.map((r, i) =>
                r.busy ? (
                  <li key={`b${i}`} className="dc-row-busy">
                    <span className="pm-time">{clock12(r.busy.start)}</span>
                    <i className="pm-dot" style={{ background: "rgba(160,175,210,0.5)" }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{r.busy.title ?? BUSY_WORD[r.busy.source]}</b>
                      <small>
                        {range(r.busy.start, r.busy.end)} · {r.busy.source === "travel" ? "Drive time Pulse added" : r.busy.source === "fixed" ? "You told Pulse" : `${BUSY_WORD[r.busy.source]} · Pulse keeps 10 minutes clear either side`}
                      </small>
                    </span>
                  </li>
                ) : r.block ? (
                  <li key={r.block.id} className={`${r.block.done ? "is-done" : ""}${pick === r.block.id ? " picked" : ""}`}>
                    <span className="pm-time">{clock12(r.block.start)}</span>
                    <i className="pm-dot" style={{ background: GOLD }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{r.block.title}</b>
                      <small>{range(r.block.start, r.block.end)} · {r.block.why}</small>
                    </span>
                    <span className="pm-acts">
                      <button className={`pm-tick${r.block.done ? " on" : ""}`} aria-pressed={r.block.done} onClick={() => tick(r.block!)} aria-label={r.block.done ? `Done: ${r.block.title}. Tap to undo.` : `Mark done: ${r.block.title}`}>✓</button>
                      {r.block.refs.some((x) => customIds.has(x)) && (
                        <button onClick={() => day.removeBlock(r.block!.refs[0].replace(/^blk:/, ""))} aria-label={`Remove the block: ${r.block.title}`}>×</button>
                      )}
                    </span>
                  </li>
                ) : null,
              )}
            </ol>
          ) : (
            <p className="pm-empty">Nothing to plan yet. A good day to call a VIP you haven&apos;t talked to in a while.</p>
          )}

          {plan.later.length > 0 && (
            <>
              <h2>Moves to tomorrow</h2>
              <ul className="pm-list pm-compact pm-pool">
                {plan.later.map(({ item, why }) => (
                  <li key={item.ref}>
                    <i className="pm-dot" style={{ background: "rgba(255,255,255,0.35)" }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{item.title}</b>
                      <small>{why}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2>Chimes</h2>
          <label className="dc-switch">
            <input
              type="checkbox"
              checked={chime}
              onChange={(e) => {
                setChime(e.target.checked);
                setChimeState(e.target.checked);
              }}
            />
            Chime 5 minutes before and at the start of each block, while this page is open
          </label>
          {askNotice && (
            <button
              className="vr-btn"
              onClick={() => {
                Notification.requestPermission().finally(() => setAskNotice(false));
              }}
            >
              Show a desktop notice too
            </button>
          )}

          <button className="vr-classic" onClick={onClassic}>Put today in order by hand</button>
          <p className="pm-promise">Blocks are your own time. Nothing is sent to a client, and no one is invited or booked.</p>
        </aside>
      </div>
    </div>
  );
}
