"use client";

import { useEffect, useRef, useState } from "react";
import { CHALLENGE } from "@/lib/oneYou.ts";
import { productLink } from "@/lib/productSignIn.ts";
import { SIGN_IN_LINE, isSignInRefusal } from "@/lib/moveAuth.ts";
import {
  TONE_HUE,
  applyTick,
  canTick,
  challengeCompleteUrl,
  challengeTickUrl,
  completedLine,
  groupLine,
  mountainToday,
  readChallenge,
  readComplete,
  ringOf,
  tickBody,
  tilesOf,
  todayWords,
  type Arena,
  type LiveChallenge,
  type Ring,
} from "@/lib/challenge.ts";

// The 90-Day Challenge, opened (Parry, 22 Oct: "yes on both"; vip50-ecosystem research/mockups/challenge, #page). The
// 90-segment ring (one segment a day, coloured by its score), the streak, average, perfect days and rank; who the agent
// is becoming; today's five arenas with their boxes; this week's leaderboard; and the finish line, which becomes the
// certificate and a new 90 once the days are done. Data: ONE MOVE's GET /api/brain/challenge (lib/challenge.ts), with
// VIP-SUMMARY §3ap's days, boxes, stats and leaderboard when ONE MOVE sends them and a plain fallback for each until then.
// Ticking a box posts to /api/brain/challenge/tick at once and rolls back if ONE MOVE does not take it. The example agent
// (demo) ticks in this screen only. Rule 12: every number and name opens something.

const ARENA_HUE: Record<string, string> = { body: "#2fbf71", spirit: "#5fb3f0", relationships: "#c58cff", business: "#f5c542", legacy: "#ff8a5f" };

/** The ring, drawn as the mockup: 90 wedges between radius 168 and 210 on a 510 x 470 box, scaled to its width. */
function RingSvg({ ring, finished }: { ring: Ring; finished: boolean }) {
  const cx = 255;
  const cy = 235;
  const R = 210;
  const r = 168;
  const N = ring.of;
  const p = (rr: number, a: number) => `${(cx + rr * Math.sin(a)).toFixed(2)} ${(cy - rr * Math.cos(a)).toFixed(2)}`;
  return (
    <svg viewBox="0 0 510 470" className="chv-ring" aria-hidden="true">
      {ring.segs.map((s, i) => {
        const a0 = (i / N) * 2 * Math.PI + 0.012;
        const a1 = ((i + 1) / N) * 2 * Math.PI - 0.012;
        return (
          <path
            key={s.day}
            d={`M${p(R, a0)} A${R} ${R} 0 0 1 ${p(R, a1)} L${p(r, a1)} A${r} ${r} 0 0 0 ${p(r, a0)}Z`}
            fill={TONE_HUE[s.tone]}
            stroke={s.today ? "#fff" : undefined}
            strokeWidth={s.today ? 2.5 : undefined}
            data-tone={s.tone}
          >
            <title>{`Day ${s.day}${s.score != null ? `: ${s.score}` : ""}`}</title>
          </path>
        );
      })}
      {[Math.round(N / 3), Math.round((2 * N) / 3)].map((d) => {
        const a = (d / N) * 2 * Math.PI;
        return (
          <text key={d} x={cx + (R + 18) * Math.sin(a)} y={cy - (R + 18) * Math.cos(a) + 4} textAnchor="middle" fill="#8089a2" fontSize="12" fontWeight="700" className="chv-ring-t">
            {d}
          </text>
        );
      })}
      <text x={cx} y={cy - 40} textAnchor="middle" fill="#a9b0bd" fontSize="14" letterSpacing="4" fontWeight="700" className="chv-ring-t">
        DAY
      </text>
      <text x={cx} y={cy + 40} textAnchor="middle" fill="#fff" fontSize="112" className="chv-ring-big">
        {ring.day}
      </text>
      <text x={cx} y={cy + 72} textAnchor="middle" fill="#a9b0bd" fontSize="16" className="chv-ring-t">
        {finished ? `of ${ring.of} · finished` : `of ${ring.of} · ${ring.toGo} to go`}
      </text>
    </svg>
  );
}

/** An arena's small ring: one arc a box, the done ones in the arena's colour. */
function MiniRing({ a }: { a: Arena }) {
  const n = Math.max(1, a.of);
  const R = 30;
  const pt = (t: number) => `${(40 + R * Math.sin(t)).toFixed(2)} ${(40 - R * Math.cos(t)).toFixed(2)}`;
  return (
    <svg viewBox="0 0 80 80" className="chv-mini" aria-hidden="true">
      {Array.from({ length: n }, (_, k) => {
        const a0 = (k / n) * 2 * Math.PI + 0.08;
        const a1 = ((k + 1) / n) * 2 * Math.PI - 0.08;
        return <path key={k} d={`M${pt(a0)} A${R} ${R} 0 0 1 ${pt(a1)}`} fill="none" stroke={k < a.done ? ARENA_HUE[a.key] ?? "#f5c542" : "rgba(255,255,255,.1)"} strokeWidth="8" strokeLinecap="round" />;
      })}
      <text x="40" y="48" textAnchor="middle" fill="#fff" fontSize="24" className="chv-ring-big">
        {a.points}
      </text>
    </svg>
  );
}

const andList = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export default function ChallengeView({
  data,
  demo,
  onData,
  onOpenPage,
  onCompleted,
  onClose,
}: {
  /** The agent's own answer (null while it loads), or the example agent's on the demo (lib/challenge.ts challengeShown). */
  data: LiveChallenge | null;
  demo: boolean;
  /** ONE MOVE's newer answer (after a tick), so the orb and the rest of the Brain follow. */
  onData: (c: LiveChallenge) => void;
  /** The Brain's ONE MOVE opener: the page inside the Brain when it is in the menu, else a new tab. */
  onOpenPage: (url: string) => void;
  onCompleted?: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Ticks show at once (optimistic); ONE MOVE's answer replaces them, a refusal rolls the one box back.
  const [c, setC] = useState<LiveChallenge | null>(data);
  useEffect(() => setC(data), [data]);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const on = c?.enrolled ? c : null;
  const url = c?.url ?? CHALLENGE.pageUrl;
  const open = (what: string) => (demo ? setNote(`Example agent: signed in, this opens ${what} in ONE MOVE.`) : onOpenPage(url));

  const lowest = on ? (on.today.arenas.find((a) => a.done < a.of && a.done === Math.min(...on.today.arenas.map((x) => x.done))) ?? on.today.arenas[0]) : null;
  const [pick, setPick] = useState<string | null>(null);
  const arena = on ? (on.today.arenas.find((a) => a.key === pick) ?? lowest) : null;
  const todayRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const ticking = canTick(c);

  const tick = async (key: string, done: boolean) => {
    if (!c || pending.has(key)) return;
    setNote(null);
    setC((cur) => (cur ? applyTick(cur, key, done) : cur));
    if (demo) return;
    setPending((s) => new Set(s).add(key));
    let problem: string | null = null;
    try {
      const r = await fetch(challengeTickUrl, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: tickBody(key, done) });
      const fresh = r.ok ? readChallenge(await r.json().catch(() => null)) : null;
      if (!r.ok) problem = isSignInRefusal(r.status) ? SIGN_IN_LINE : "ONE MOVE did not take that box. Nothing was changed; try again.";
      else if (fresh?.enrolled) {
        setC(fresh);
        onData(fresh);
      }
    } catch {
      problem = "ONE MOVE could not be reached. Nothing was changed; try again.";
    }
    if (problem) {
      setC((cur) => (cur ? applyTick(cur, key, !done) : cur));
      setNote(problem);
    }
    setPending((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
  };

  // Day 90 and after: completing is the agent's own tap (vip50-web-crm#287), then the certificate.
  const [busy, setBusy] = useState(false);
  const [doneNow, setDoneNow] = useState<{ completedAt: string | null; certificateUrl: string | null } | null>(null);
  const [letterOpen, setLetterOpen] = useState(false);
  const complete = async () => {
    if (busy || demo) return;
    setBusy(true);
    setNote(null);
    let res: ReturnType<typeof readComplete>;
    try {
      const r = await fetch(challengeCompleteUrl, { method: "POST", credentials: "include" });
      res = readComplete(r.status, await r.json().catch(() => null));
    } catch {
      res = { kind: "error", words: "ONE MOVE could not be reached. Nothing was changed; try again." };
    }
    setBusy(false);
    if (res.kind === "done") {
      setDoneNow({ completedAt: res.completedAt, certificateUrl: res.certificateUrl });
      setNote(res.certificateUrl ? "Done: your 90 days are complete. Your certificate is ready." : "Done: your 90 days are complete.");
      onCompleted?.();
    } else if (res.kind === "elsewhere") {
      setNote("Complete it on the challenge page in ONE MOVE.");
      onOpenPage(url);
    } else setNote(res.words);
  };
  const completedAt = doneNow?.completedAt ?? on?.completedAt ?? null;
  const certificateUrl = doneNow?.certificateUrl ?? on?.certificateUrl ?? null;
  const completed = !!doneNow || !!on?.completedAt || /^completed?$/i.test(on?.status ?? "");
  // The certificate is on ONE MOVE, which shares the vip50one.com sign-in (ENTITLEMENT §6b); productLink sends any
  // address on another product through the one-sign-in hop.
  const openCert = () => {
    if (!certificateUrl) return open("your certificate");
    window.open(productLink(certificateUrl) as string, "_blank", "noopener,noreferrer");
  };

  const ring = on ? ringOf(on) : null;
  const tiles = on ? tilesOf(on) : [];
  const date = on?.today.date ?? mountainToday();

  const header = (
    <div className="chv-top">
      <div className="fc-head">
        <button ref={closeRef} className="fc-back" onClick={onClose} aria-label="Back to the Brain">←</button>
        <div>
          <span className="chip chv-tag">ONE YOU</span>
          <h1 className="d-title chv-title" id="chv-title">The 90-Day Challenge</h1>
          <p className="chv-sub">Five arenas, every day, for 90 days. Become who you said you&apos;d be.</p>
        </div>
      </div>
      {on ? (
        <div className="chv-btns">
          <button type="button" className="chv-btn" data-act="challenge-leaderboard" onClick={() => boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Leaderboard
          </button>
          {!on.finished ? (
            <button
              type="button"
              className="chv-btn solid"
              data-act="challenge-tick"
              onClick={() => {
                if (!ticking) return open("today's boxes");
                const next = on.today.arenas.find((a) => a.boxes?.some((b) => !b.done));
                if (next) setPick(next.key);
                todayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Tick today&apos;s boxes
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="chv-title">
      <div className="fc chv">
        {header}
        {note ? (
          <p className="chv-note" role="status">
            {note}
          </p>
        ) : null}

        {!c ? (
          <div className="chv-card chv-join">
            <b>Reading your challenge from ONE MOVE…</b>
            <button type="button" className="chv-btn" data-act="challenge-row" onClick={() => onOpenPage(url)}>
              Open the 90-Day Challenge
            </button>
          </div>
        ) : !on ? (
          <div className="chv-card chv-join">
            <h2 className="chv-h">You have not started yet</h2>
            <p>{CHALLENGE.what}</p>
            <p className="chv-muted">Every day you score yourself in five arenas, 20 points each, 100 a day. Day 1 is a short setup: who you are doing this for, who you are becoming, the enemy, and a letter you open on Day 90.</p>
            <ul className="chv-join-arenas">
              {CHALLENGE.arenas.map((a) => (
                <li key={a.key}>
                  <i style={{ background: ARENA_HUE[a.key] }} aria-hidden="true" />
                  <b>{a.name}</b>
                  <span>{a.items.join(" · ")}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="chv-btn solid" data-act="challenge-row" onClick={() => open("the Day 1 setup")}>
              Start the Challenge
            </button>
          </div>
        ) : (
          <>
            <div className="chv-grid">
              <div className="chv-col">
                <div className="chv-card chv-ringcard">
                  <button type="button" className="chv-ringbtn" data-act="challenge-row" onClick={() => open("your Results wall")} aria-label={`Day ${ring!.day} of ${ring!.of}: open your results in ONE MOVE`}>
                    <RingSvg ring={ring!} finished={!!on.finished} />
                  </button>
                  <div className="chv-legend">
                    {ring!.mode === "days" ? (
                      <>
                        <span><i style={{ background: TONE_HUE.perfect }} />100</span>
                        <span><i style={{ background: TONE_HUE.good }} />70+</span>
                        <span><i style={{ background: TONE_HUE.low }} />under 70</span>
                        <span><i style={{ background: TONE_HUE.missed }} />missed</span>
                        <span><i className="to-come" />to come</span>
                      </>
                    ) : (
                      <>
                        <span><i style={{ background: TONE_HUE.elapsed }} />days gone</span>
                        <span><i className="today" />today</span>
                        <span><i className="to-come" />to come</span>
                      </>
                    )}
                  </div>
                  {tiles.length ? (
                    <div className="chv-stats" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
                      {tiles.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          className="chv-stat"
                          data-act="challenge-stat"
                          onClick={() => (t.key === "rank" ? boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) : open(t.key === "streak" ? "your streak" : "your Results wall"))}
                        >
                          <b>{t.value}</b>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="chv-card chv-id">
                  <div className="chv-kick">Your identity</div>
                  {on.identity ? <p className="chv-quote">{on.identity}</p> : <p className="chv-muted">Write who you are becoming: &quot;I am becoming someone who…&quot;</p>}
                  <div className="chv-idfoot">
                    <span>
                      <b>Fighting for:</b> {on.enemy.length ? andList(on.enemy) : "name it on your challenge page"}
                    </span>
                    <button type="button" className="chv-link" data-act="challenge-row" onClick={() => open("your identity and enemy list")}>
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              <div className="chv-col">
                <div className="chv-card" ref={todayRef}>
                  <div className="chv-todayhead">
                    <div>
                      <h2 className="chv-h">{`Today · ${todayWords(date)}`}</h2>
                      <div className="chv-muted">5 points a box. 100 is a perfect day.</div>
                    </div>
                    <button type="button" className="chv-points" data-act="challenge-row" onClick={() => (ticking ? setPick(lowest?.key ?? null) : open("today's boxes"))} aria-label={`${on.today.points} of 100 today: see today's boxes`}>
                      {on.today.points}
                      <span> / 100</span>
                    </button>
                  </div>
                  <div className="chv-arenas" role="tablist" aria-label="Today's arenas">
                    {on.today.arenas.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        role="tab"
                        aria-selected={arena?.key === a.key}
                        className={`chv-arena${arena?.key === a.key ? " on" : ""}`}
                        data-act="challenge-arena"
                        onClick={() => setPick(a.key)}
                      >
                        <MiniRing a={a} />
                        <b>{a.label}</b>
                        <small>{`${a.done} of ${a.of}`}</small>
                      </button>
                    ))}
                  </div>
                  {arena ? (
                    <>
                      <div className="chv-boxhead">
                        <h3 className="chv-h sm">{`${arena.label} · ${arena.done} of ${arena.of}`}</h3>
                        <span className="chv-muted">Tap an arena to see its boxes</span>
                      </div>
                      {arena.boxes && !on.finished ? (
                        <div className="chv-boxes">
                          {arena.boxes.map((b) => (
                            <button
                              key={b.key}
                              type="button"
                              role="checkbox"
                              aria-checked={b.done}
                              className="chv-box"
                              data-act="challenge-box"
                              disabled={pending.has(b.key)}
                              onClick={() => void tick(b.key, !b.done)}
                            >
                              <span className={`chv-cb${b.done ? " done" : ""}`} aria-hidden="true">{b.done ? "✓" : ""}</span>
                              <span>
                                {b.label}
                                {b.sub ? <small>{b.sub}</small> : null}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="chv-nobox">
                          <p className="chv-muted">{CHALLENGE.arenas.find((x) => x.key === arena.key)?.items.join(" · ")}</p>
                          <button type="button" className="chv-btn" data-act="challenge-row" onClick={() => open(`your ${arena.label} boxes`)}>
                            Open in ONE MOVE
                          </button>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>

                <div className="chv-card chv-lb" ref={boardRef}>
                  <div className="chv-lbhead">
                    <h2 className="chv-h">Leaderboard · This week</h2>
                    <button type="button" className="chv-link" data-act="challenge-leader" onClick={() => open("the whole leaderboard")}>
                      See everyone →
                    </button>
                  </div>
                  {on.leaderboard ? (
                    <ol className="chv-rows">
                      {on.leaderboard.map((r) => (
                        <li key={`${r.userId ?? r.name}-${r.rank}`}>
                          <button type="button" className={`chv-row${r.me ? " is-me" : ""}`} data-act="challenge-leader" onClick={() => open(r.me ? "your week" : `${r.name}'s week`)} aria-label={`${r.rank}. ${r.name}: ${r.weekAvg} this week`}>
                            <span className={`chv-rank${r.rank === 1 ? " first" : ""}`}>{r.rank}</span>
                            {r.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className="chv-av" src={r.photo} alt="" />
                            ) : (
                              <span className={`chv-av${r.me ? " is-me" : ""}`}>{r.initials}</span>
                            )}
                            <span className="chv-who">
                              <b>{r.name}</b>
                              <span className="chv-muted">
                                {r.day != null ? ` · day ${r.day}` : ""}
                                {r.me && on.streak ? ` · ${on.streak}-day streak` : ""}
                              </span>
                            </span>
                            <b className="chv-score">{r.weekAvg}</b>
                          </button>
                        </li>
                      ))}
                    </ol>
                  ) : on.group ? (
                    <div className="chv-group">
                      <b>{groupLine(on.group)}</b>
                      {on.group.names.length ? <span className="chv-muted">{on.group.names.join(", ")}</span> : null}
                      <button type="button" className="chv-btn" data-act="challenge-row" onClick={() => open("your group")}>
                        Open your group
                      </button>
                    </div>
                  ) : (
                    <div className="chv-group">
                      <span className="chv-muted">You are not in a group yet. Join one and your week shows here next to theirs.</span>
                      <button type="button" className="chv-btn" data-act="challenge-row" onClick={() => open("the groups")}>
                        Join a group
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {completed ? (
              <div className="chv-finish done">
                <span className="chv-dot" aria-hidden="true" />
                <p>
                  <b>You finished your 90 days.</b> {completedAt ? `${completedLine(completedAt)}.` : on.finished?.label ? `Finished on ${on.finished.label}.` : ""}
                </p>
                <div className="chv-finbtns">
                  {on.letter ? (
                    <button type="button" className="chv-btn" onClick={() => setLetterOpen((o) => !o)} aria-expanded={letterOpen}>
                      Open your sealed letter
                    </button>
                  ) : null}
                  <button type="button" className="chv-btn solid" data-act="challenge-cert" onClick={openCert}>
                    View my certificate
                  </button>
                  <button type="button" className="chv-btn" data-act="challenge-row" onClick={() => open("a new Day 1 setup")}>
                    Start another 90
                  </button>
                </div>
              </div>
            ) : on.letterWaiting ? (
              <div className="chv-finish done">
                <span className="chv-dot" aria-hidden="true" />
                <p>
                  <b>Day 90: your sealed letter is open.</b> Read it, then complete your 90 days to make your certificate.
                </p>
                <div className="chv-finbtns">
                  <button type="button" className="chv-btn" onClick={() => (on.letter ? setLetterOpen((o) => !o) : open("your letter"))} aria-expanded={on.letter ? letterOpen : undefined}>
                    Open your sealed letter
                  </button>
                  <button type="button" className="chv-btn solid" data-act="challenge-complete" onClick={() => void complete()} disabled={busy}>
                    {busy ? "Completing…" : "Complete my 90 days"}
                  </button>
                </div>
              </div>
            ) : on.finished ? (
              <div className="chv-finish done">
                <span className="chv-dot" aria-hidden="true" />
                <p>
                  <b>{on.finished.label ? `Finished on ${on.finished.label}.` : "Finished."}</b> All {on.of} days are behind you.
                </p>
                <div className="chv-finbtns">
                  {certificateUrl ? (
                    <button type="button" className="chv-btn solid" data-act="challenge-cert" onClick={openCert}>
                      View my certificate
                    </button>
                  ) : null}
                  <button type="button" className="chv-btn" data-act="challenge-row" onClick={() => open("a new Day 1 setup")}>
                    Start another 90
                  </button>
                </div>
              </div>
            ) : (
              <div className="chv-finish">
                <span className="chv-dot" aria-hidden="true" />
                <p>
                  <b>When you finish day {on.of}</b> this becomes your finish line: your {on.of}-day ring, your numbers, and your certificate.
                </p>
                <button type="button" className="chv-btn" data-act="challenge-row" onClick={() => open("your challenge")}>
                  {ring!.toGo === 1 ? "1 day to go" : `${ring!.toGo} days to go`}
                </button>
              </div>
            )}
            {on.letter && letterOpen ? <p className="d-sum ch-letter chv-letter">{on.letter}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
