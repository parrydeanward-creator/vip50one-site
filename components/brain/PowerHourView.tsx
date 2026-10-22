"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import PulseRing, { PULSE_COLOR } from "./PulseRing.tsx";
import CallPrepCard from "./CallPrepCard.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { touchUrl } from "@/lib/contact.ts";
import { chimeOn, playChime } from "@/lib/chime.ts";
import { contactHref } from "@/lib/touchBlock.ts";
import { LENGTHS, LOGGED, OUTCOMES, TOUCH_WORD, bringUp, current, mmss, outcomeWord, remaining, touchesLine, wrap, type Call, type Outcome, type Session, type TouchKind } from "@/lib/powerHour.ts";

// Power Hour in ONE YOU (PULSE-ROADMAP "ONE YOU"; Parry approved, 6 Oct). The call now sits in the middle with
// the countdown round it; the rest of the line-up goes round them. Tap anyone and they come to the middle with
// their call in the side panel (Parry, 6 Oct, the rule for every orb). Call Prep comes first, then the agent
// says how it went. Only "Talked" and "Left a message" are logged, in ONE MOVE; nothing is sent to anyone.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 140;
const RING = 330;
const R = 54;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
// what each kind of touch is logged as in ONE MOVE (/api/brain/touch): the task, the month box and the Daily Tracker slot
const LOG_KIND: Record<TouchKind, string> = { call: "call", video_text: "video_text", text: "text", social: "social", note: "handwritten_note" };
const DETAIL: Record<Outcome, string> = { talked: "talked", message: "left a message", no_answer: "no answer", sent: "done", skipped: "skipped" };
const MARK: Record<TouchKind, string> = { call: "☎", video_text: "▶", text: "✉", social: "♥", note: "✎" };
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

function arc(cx: number, cy: number, r: number, share: number): string {
  const a = Math.max(0.001, Math.min(0.9999, share)) * Math.PI * 2;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}`;
}

export default function PowerHourView({
  calls: all,
  session,
  live,
  onSession,
  onTick,
  onClose,
  contactCard,
}: {
  calls: Call[];
  session: Session;
  live: boolean;
  onSession: (s: Session) => void;
  /** The Power Hour's one tick (Brain tickTouch): ONE MOVE completes it; the error text, or null. */
  onTick: (ref: string, done: boolean) => Promise<string | null> | void;
  onClose: () => void;
  /** The person's full contact card (the Brain's PersonPanel), shown under the call when a name is picked. */
  contactCard?: (contactId: string, name: string) => ReactNode;
}) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [now, setNow] = useState(() => Date.now());
  const [pick, setPick] = useState<string | null>(null);
  const [prep, setPrep] = useState<Call | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const rang = useRef(false);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      clearInterval(t);
    };
  }, []);

  // the Power Hour ONE MOVE sent (and its follow-up): the same touches as the Day Clock's side panel
  const calls = all;
  const left = remaining(session, now);
  const timeUp = left === 0;
  // one chime when the hour is up, if the agent keeps chimes on (the Day Clock's switch)
  useEffect(() => {
    if (timeUp && !rang.current) {
      rang.current = true;
      if (chimeOn()) playChime(true);
    }
  }, [timeUp]);

  const nowCall = current(calls, session);
  const sel = calls.find((c) => c.id === pick) ?? nowCall;
  const w = wrap(calls, session);
  const finished = timeUp || !nowCall;
  const others = calls.filter((c) => c.id !== sel?.id);
  const seatAt = (k: number) => {
    const ang = (k / Math.max(others.length, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const seats = others.map((c, k) => ({ c, ...seatAt(k) }));

  // Tap a name, its orb or its arrow: that person comes to the middle and their full contact card opens in the
  // side panel (Parry, 19 Oct: "when you click a name it should open that contact in the right column with full
  // info"), and the drawer scrolls to it.
  const choose = (c: Call) => {
    setPick(c.id);
    if (!session.results[c.id]) onSession(bringUp(session, c.id));
    cam.reset();
    // the drawer goes to their card (the call, its buttons and the contact), not to the list row
    setTimeout(() => document.getElementById("ph-call")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });

  const start = (minutes: number) => onSession({ ...session, minutes, startedAt: Date.now() });
  const outcome = async (c: Call, o: Outcome) => {
    setBusy(true);
    let msg: string | null = null;
    if (LOGGED.includes(o)) {
      const word = outcomeWord(c.kind, o);
      if (!live) msg = `${word}: in your account this logs the ${TOUCH_WORD[c.kind].toLowerCase()} in ONE MOVE and ticks its boxes.`;
      else if (!c.contactId) msg = `${word}. ${c.name} isn't linked to a contact, so log it in ONE MOVE.`;
      else {
        try {
          const r = await fetch(touchUrl, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            // a call closes its task only when they talked; a text or social touch closes it when done
            body: JSON.stringify({ contact_id: c.contactId, kind: LOG_KIND[c.kind], detail: `Power Hour: ${DETAIL[o]}`, ...((o === "talked" || o === "sent") && c.taskId ? { task_id: c.taskId } : {}) }),
          });
          const j = await r.json().catch(() => ({}));
          msg = r.ok && j.ok ? `${TOUCH_WORD[c.kind]} logged for ${c.name}: its boxes are ticked.` : `Not logged: ${j.error ?? "ONE MOVE didn't take it"}. Try again from their card.`;
          if (!(r.ok && j.ok)) {
            setNote(msg);
            setBusy(false);
            return;
          }
        } catch {
          setNote("Not logged: ONE couldn't reach ONE MOVE. Try again.");
          setBusy(false);
          return;
        }
      }
      if (c.ref) {
        const err = await onTick(c.ref, true);
        if (err) msg = `${msg ? `${msg} ` : ""}${err}`;
      }
    }
    onSession({ ...session, results: { ...session.results, [c.id]: o } });
    setPick(null);
    setNote(msg);
    setBusy(false);
    cam.reset();
  };
  const undo = (c: Call) => {
    const results = { ...session.results };
    delete results[c.id];
    onSession(bringUp({ ...session, results }, c.id));
    setPick(null);
    if (c.ref && c.done) void onTick(c.ref, false);
  };
  // the list's box: tick it done (as the side panel's), or take the tick back
  const toggle = async (c: Call) => {
    if (session.results[c.id] || c.done) return undo(c);
    if (c.ref) setNote(await onTick(c.ref, true) ?? null);
  };

  const ringFor = (c: Call) => {
    const r = session.results[c.id];
    if (r) return LOGGED.includes(r) ? GREEN : "rgba(160,175,210,0.45)";
    return c.level === "now" ? PULSE_COLOR.now : c.level === "today" ? PULSE_COLOR.today : GOLD;
  };
  const share = left == null ? 1 : left / (session.minutes * 60_000);

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="ph-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Power Hour">
            <defs>
              <radialGradient id="ph-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ c, x, y }) => (
              <line key={`l-${c.id}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${TOUCH_WORD[sel.kind]}: ${sel.name}, in the middle. ${sel.why}`}>
                {!session.results[sel.id] && sel.level ? <PulseRing r={CORE} level={sel.level} x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#ph-glass)" stroke={ringFor(sel)} strokeWidth={3} />
                <path d={arc(C, C, CORE + 14, share)} fill="none" stroke={timeUp ? PULSE_COLOR.now : GOLD} strokeWidth={8} strokeLinecap="round" />
                <text className="dt-score" x={C} y={C - 14} textAnchor="middle" fontSize={56}>{initials(sel.name)}</text>
                <text className="dt-score-sub" x={C} y={C + 22} textAnchor="middle">{sel.name.toUpperCase().slice(0, 22)}</text>
                <text className="dt-score-sub" x={C} y={C + 56} textAnchor="middle" fontSize={22}>{left == null ? `${session.minutes}:00` : mmss(left)}</text>
              </g>
            ) : (
              <g aria-label="Nothing lined up">
                <circle cx={C} cy={C} r={CORE} fill="url(#ph-glass)" stroke="#ffd86a" strokeWidth={3} />
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">☎</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">ALL CAUGHT UP</text>
              </g>
            )}

            {seats.map(({ c, x, y }) => {
              const res = session.results[c.id];
              return (
                <g key={c.id} data-tap className={`pm-orb pm-plan${res ? " is-done" : ""}`} role="button" tabIndex={0} aria-label={`${TOUCH_WORD[c.kind]}: ${c.name}: ${res ? outcomeWord(c.kind, res) : c.why}`} {...tap(() => choose(c))}>
                  {!res && c.level ? <PulseRing r={R} level={c.level} x={x} y={y} /> : null}
                  <circle className="pm-disc" cx={x} cy={y} r={R} fill="url(#ph-glass)" stroke={ringFor(c)} strokeWidth={2.5} opacity={res ? 0.75 : 1} />
                  <text className="pm-mark" x={x} y={y} dy="0.36em" textAnchor="middle" fontSize={22}>{res ? (LOGGED.includes(res) ? "✓" : "–") : initials(c.name)}</text>
                  {!res ? <text className="pm-time-l" x={x + R * 0.72} y={y - R * 0.72} textAnchor="middle" fontSize={20} aria-hidden="true">{MARK[c.kind]}</text> : null}
                  <text className="pm-name-l" x={x} y={y + R + 22} textAnchor="middle">{c.name.replace(/^the\s+/i, "").split(/\s+/)[0]}</text>
                </g>
              );
            })}
          </svg>
          {note && (
            <div className="vr-bar pop" role="status">
              <span>{note}</span>
              <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
            </div>
          )}
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={cam.reset} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Power Hour">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          <h1 className="d-title" id="ph-title">Power Hour</h1>
          <p className="d-sub">
            {session.startedAt == null ? `Today's VIP touches: ${touchesLine(calls)}` : timeUp ? "Time is up" : `${mmss(left!)} left · ${w.left} to do`}
          </p>

          {session.startedAt == null && calls.length > 0 && (
            <div className="ph-start">
              <span>How long?</span>
              {LENGTHS.map((m) => (
                <button key={m} className={`vr-btn${session.minutes === m ? " on" : ""}`} aria-pressed={session.minutes === m} onClick={() => onSession({ ...session, minutes: m })}>
                  {m} min
                </button>
              ))}
              <button className="pi-btn pm-send" onClick={() => start(session.minutes)}>Start Power Hour</button>
            </div>
          )}

          {sel && !finished && (
            <div className="ph-call" id="ph-call">
              <h2>{`${TOUCH_WORD[sel.kind]}: ${sel.name}`}{!session.results[sel.id] && sel.id === nowCall?.id ? " (now)" : ""}</h2>
              <p className="d-sum">{sel.why}</p>
              {session.results[sel.id] ? (
                <p>
                  {outcomeWord(sel.kind, session.results[sel.id]!)}.{" "}
                  <button className="vr-btn" onClick={() => undo(sel)}>Undo</button>
                </p>
              ) : (
                <>
                  {sel.kind === "call" ? (
                    live && sel.contactId ? (
                      <button className="pi-btn" onClick={() => setPrep(sel)}>Call Prep, then call</button>
                    ) : (
                      <p className="pm-empty">{live ? "Not linked to a contact yet: call from your phone, then say how it went." : "Example agent: Call Prep opens here, then the call."}</p>
                    )
                  ) : (
                    <p className="pm-empty">{sel.kind === "social" ? "Like, comment or message them where they post, then tap Done." : sel.kind === "note" ? "Write it and put it in the mail, then tap Done." : "Send it from your phone (Text on their card below), then tap Sent."}</p>
                  )}
                  <div className="ph-outcomes" role="group" aria-label={`How the ${TOUCH_WORD[sel.kind].toLowerCase()} with ${sel.name} went`}>
                    {OUTCOMES[sel.kind].map((o) => (
                      <button key={o} className={`chip-btn${o === "talked" || o === "sent" ? " primary" : ""}`} disabled={busy} onClick={() => outcome(sel, o)}>
                        {outcomeWord(sel.kind, o)}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {/* The person's full card always sits under their touch, the one Pulse puts first included (Parry,
                  20 Oct: "power hour needs to open the full card when a contact is clicked"). */}
              {sel.contactId && live && contactCard ? (
                <div className="ph-contact" key={sel.id}>{contactCard(sel.contactId, sel.name)}</div>
              ) : pick === sel.id ? (
                <p className="pm-empty">{live ? `${sel.name} isn't linked to a contact yet, so there is no card to open.` : `Example agent: ${sel.name}'s full contact card opens here.`}</p>
              ) : null}
            </div>
          )}

          {(finished || Object.keys(session.results).length > 0) && (
            <>
              <h2>{finished ? "What got done" : "So far"}</h2>
              <p className="pi-today pi-lvl-today dc-next">{w.line}</p>
              {finished && w.talked > 0 && <p className="d-sum">Each conversation counts toward this week on your Income Map.</p>}
              {finished && w.left === 0 && <p className="d-sum">Every VIP touch for today is done.</p>}
            </>
          )}

          <h2>Today's VIP touches</h2>
          {calls.length ? (
            <ol className="pm-list pm-compact">
              {calls.map((c) => {
                const res = session.results[c.id];
                return (
                  <li key={c.id} id={`ph-row-${c.id}`} className={`${res ? "is-done" : ""}${sel?.id === c.id ? " picked" : ""}`}>
                    <i className="pm-dot" style={{ background: ringFor(c) }} aria-hidden="true" />
                    {c.ref ? (
                      <button className={`phx-box${res ? " on" : ""}`} role="checkbox" aria-checked={!!res} onClick={() => void toggle(c)} aria-label={`${res ? "Mark not done" : "Mark done"}: ${TOUCH_WORD[c.kind]}, ${c.name}`}>
                        {res ? "✓" : ""}
                      </button>
                    ) : null}
                    <span className="pm-body ph-name" {...(c.contactId ? {} : { role: "button", tabIndex: 0, "aria-label": `Open the call: ${c.name}`, ...tap(() => choose(c)) })}>
                      <b>
                        {`${TOUCH_WORD[c.kind]}: `}
                        {c.contactId ? (
                          <a
                            className="ph-link"
                            href={contactHref(c.contactId)!}
                            aria-label={`Open the contact card: ${c.name}`}
                            onClick={(e) => {
                              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                              e.preventDefault();
                              choose(c);
                            }}
                          >
                            {c.name}
                          </a>
                        ) : (
                          c.name
                        )}
                      </b>
                      <small>{res ? outcomeWord(c.kind, res) : c.why}</small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => choose(c)} aria-label={`Open the contact card: ${c.name}`}>→</button>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="pm-empty">No VIP touches in your Power Hour today.</p>
          )}
          <p className="pm-promise">{live ? "" : "Example agent. "}You make every call. Pulse never dials, texts or sends anything for you.</p>
        </aside>
      </div>
      {prep && prep.contactId && (
        <CallPrepCard
          contactId={prep.contactId}
          dialRef={prep.id !== prep.contactId ? prep.id : null}
          demo={!live}
          onClose={() => setPrep(null)}
          onDial={() => setPrep(null)}
        />
      )}
    </div>
  );
}
