"use client";

import { useEffect, useRef, useState } from "react";
import PulseRing, { PULSE_COLOR } from "./PulseRing.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import { WHY_TITLE, askNow, headline, referralRate, type Candidate, type Referrals, type Referrer } from "@/lib/referrals.ts";

// The Referral Scoreboard in ONE YOU (VIP-SUMMARY §3r; Parry, 7 Oct). The year's referrals against the goal in the
// middle; round it, the people who sent business (gold ring: how many) and the ones likely to send the next
// (yellow when worth asking now). Tap anyone and they come to the middle with their story in the side panel
// (Parry, 6 Oct, the rule for every orb); the middle orb brings the whole board back. "Ask" makes a task: the
// agent asks in their own words, and nothing is sent.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 130;
const RING = 320;
const GOLD = "#f5c542";
const GREEN = "#3fbf7f";
const MAX_REF = 6;
const MAX_CAND = 4;

type Seat = { kind: "ref"; r: Referrer } | { kind: "cand"; c: Candidate };
const seatId = (s: Seat) => (s.kind === "ref" ? `r:${s.r.id}` : `c:${s.c.id}`);
const seatName = (s: Seat) => (s.kind === "ref" ? s.r.name : s.c.name);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const ago = (d: string | null, today: string) => {
  if (!d) return null;
  const n = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${d}T12:00:00Z`)) / 86_400_000);
  return n <= 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
};
function arc(cx: number, cy: number, r: number, share: number): string {
  const a = Math.max(0.001, Math.min(0.9999, share)) * Math.PI * 2;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}`;
}

export default function ReferralsView({ data, today, demo, onClose, onAsk }: { data: Referrals; today: string; demo: boolean; onClose: () => void; onAsk?: (contactId: string) => Promise<string> }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pick, setPick] = useState<string | null>(null);
  const [asked, setAsked] = useState<Record<string, string>>({});
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

  const now = new Set(askNow(data).map((c) => c.id));
  const seats: Seat[] = [
    ...data.referrers.slice(0, MAX_REF).map((r) => ({ kind: "ref" as const, r })),
    ...data.candidates.filter((c) => !data.referrers.slice(0, MAX_REF).some((r) => r.id === c.id)).slice(0, MAX_CAND).map((c) => ({ kind: "cand" as const, c })),
  ];
  const sel = seats.find((s) => seatId(s) === pick) ?? null;
  const round = seats.filter((s) => s !== sel);
  const m = round.length + (sel ? 1 : 0);
  const r = Math.max(42, Math.min(66, 460 / Math.max(m, 4)));
  const seatAt = (k: number) => {
    const ang = (k / Math.max(m, 1)) * Math.PI * 2;
    return { x: C + RING * Math.sin(ang), y: C - RING * Math.cos(ang) };
  };
  const homeSeat = sel ? seatAt(0) : null;
  const placed = round.map((s, k) => ({ s, ...seatAt(k + (sel ? 1 : 0)) }));
  const maxTotal = Math.max(1, ...data.referrers.map((x) => x.total));
  const rate = referralRate(data);
  const goalShare = data.goal ? data.count / data.goal : null;
  const candidateFor = (id: string) => data.candidates.find((c) => c.id === id) ?? null;

  const open = (id: string | null) => {
    setPick(id);
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
  const ask = async (id: string, name: string) => {
    if (demo || !onAsk) return setAsked((a) => ({ ...a, [id]: `Example agent: this would add "Ask ${name} for a referral" to today's tasks.` }));
    setAsked((a) => ({ ...a, [id]: "Adding…" }));
    const words = await onAsk(id);
    setAsked((a) => ({ ...a, [id]: words }));
  };
  // Worth asking now pulses yellow, whether they sit as a referrer (a quiet past referrer) or as likely next.
  const askable = (s: Seat) => now.has(s.kind === "ref" ? s.r.id : s.c.id);
  const ring = (s: Seat) => (askable(s) ? PULSE_COLOR.today : s.kind === "ref" ? GOLD : "rgba(160,175,210,0.45)");
  const level = (s: Seat) => (askable(s) ? ("today" as const) : null);

  const askButton = (id: string, name: string) => (
    <>
      {asked[id] ? (
        <p className="pm-empty">{asked[id]}</p>
      ) : (
        <div className="decide-btns">
          <button type="button" className="chip-btn primary" onClick={() => ask(id, name)}>
            Ask {name.split(/\s+/)[0]} for a referral
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="rf-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Referral Scoreboard">
            <defs>
              <radialGradient id="rf-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {placed.map(({ s, x, y }) => (
              <line key={`l-${seatId(s)}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            {homeSeat && <line className="vr-link" x1={C} y1={C} x2={homeSeat.x} y2={homeSeat.y} />}

            {sel ? (
              <g className="pm-orb picked" aria-label={`${seatName(sel)}, in the middle`}>
                {level(sel) ? <PulseRing r={CORE} level="today" x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#rf-glass)" stroke={ring(sel)} strokeWidth={3} />
                {sel.kind === "ref" && <path d={arc(C, C, CORE + 9, sel.r.total / maxTotal)} fill="none" stroke={GOLD} strokeWidth={6} strokeLinecap="round" />}
                <text className="pm-mark" x={C} y={C - 18} dy="0.36em" textAnchor="middle" fontSize={54}>{initials(seatName(sel))}</text>
                <text className="dt-score-sub" x={C} y={C + 30} textAnchor="middle">{seatName(sel).split(/\s+/)[0].toUpperCase()}</text>
                <text className="pm-core-end" x={C} y={C + 54} textAnchor="middle">
                  {sel.kind === "ref" ? `${sel.r.total} ${sel.r.total === 1 ? "referral" : "referrals"}` : "Likely next"}
                </text>
              </g>
            ) : (
              <g aria-label={`Referrals: ${headline(data)}`}>
                {now.size ? <PulseRing r={CORE} level="today" x={C} y={C} /> : null}
                <circle cx={C} cy={C} r={CORE} fill="url(#rf-glass)" stroke="#ffd86a" strokeWidth={3} />
                {goalShare != null && <path d={arc(C, C, CORE + 9, goalShare)} fill="none" stroke={goalShare >= 1 ? GREEN : GOLD} strokeWidth={6} strokeLinecap="round" />}
                <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{data.goal ? `${data.count}/${data.goal}` : data.count}</text>
                <text className="dt-score-sub" x={C} y={C + 28} textAnchor="middle">REFERRALS</text>
                {rate != null && <text className="pm-core-end" x={C} y={C + 52} textAnchor="middle">{`${Math.round(rate * 100)}% of VIPs refer`}</text>}
              </g>
            )}

            {homeSeat && (
              <g data-tap className="pm-orb pm-plan" role="button" tabIndex={0} aria-label="Back to the whole scoreboard" {...tap(() => open(null))}>
                <circle className="pm-disc" cx={homeSeat.x} cy={homeSeat.y} r={r} fill="url(#rf-glass)" stroke="#ffd86a" strokeWidth={2.5} />
                <text className="pm-mark" x={homeSeat.x} y={homeSeat.y} dy="0.36em" textAnchor="middle" fontSize={Math.max(14, r * 0.42)}>{data.goal ? `${data.count}/${data.goal}` : data.count}</text>
                <text className="pm-name-l" x={homeSeat.x} y={homeSeat.y + r + 24} textAnchor="middle">Scoreboard</text>
              </g>
            )}

            {placed.map(({ s, x, y }) => (
              <g
                key={seatId(s)}
                data-tap
                className="pm-orb pm-plan"
                role="button"
                tabIndex={0}
                aria-label={s.kind === "ref" ? `${s.r.name}: ${s.r.total} referrals, ${s.r.closed} closed.` : `${s.c.name}: likely next. ${s.c.words}.`}
                {...tap(() => open(seatId(s)))}
              >
                {level(s) ? <PulseRing r={r} level="today" x={x} y={y} /> : null}
                <circle className="pm-disc" cx={x} cy={y} r={r} fill="url(#rf-glass)" stroke={ring(s)} strokeWidth={2.5} strokeDasharray={s.kind === "cand" ? "6 6" : undefined} />
                {s.kind === "ref" && <path d={arc(x, y, r + 7, s.r.total / maxTotal)} fill="none" stroke={GOLD} strokeWidth={4} strokeLinecap="round" />}
                <text className="pm-mark" x={x} y={y} dy="0.36em" textAnchor="middle" fontSize={Math.max(14, r * 0.5)}>{initials(seatName(s))}</text>
                <text className="pm-name-l" x={x} y={y + r + 24} textAnchor="middle">{seatName(s).split(/\s+/)[0]}</text>
                <text className="pm-time-l" x={x} y={y + r + 42} textAnchor="middle">{s.kind === "ref" ? `${s.r.total} sent` : "Likely next"}</text>
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

        <aside className="drawer vr-drawer pm-drawer" aria-label="Referral Scoreboard">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
          </div>
          {sel && sel.kind === "ref" ? (
            <>
              <h1 className="d-title" id="rf-title">{sel.r.name}</h1>
              <p className="d-sub">
                {sel.r.total} {sel.r.total === 1 ? "referral" : "referrals"} · {sel.r.thisYear} this goal year · {sel.r.closed} closed
              </p>
              <ul className="pm-list pm-compact">
                {sel.r.value ? (
                  <li>
                    <i className="pm-dot" style={{ background: GREEN }} aria-hidden="true" />
                    <span className="pm-body"><b>{money(sel.r.value)} in closed business</b></span>
                  </li>
                ) : null}
                <li>
                  <i className="pm-dot" style={{ background: GOLD }} aria-hidden="true" />
                  <span className="pm-body"><b>Last referral {ago(sel.r.lastAt, today) ?? "not dated"}</b></span>
                </li>
                <li>
                  <i className="pm-dot" style={{ background: "rgba(255,255,255,0.35)" }} aria-hidden="true" />
                  <span className="pm-body"><b>Last touch {ago(sel.r.lastTouchAt, today) ?? "not logged"}</b></span>
                </li>
                {data.recent.filter((x) => x.by === sel.r.id).map((x) => (
                  <li key={x.id}>
                    <i className="pm-dot" style={{ background: x.closed ? GREEN : GOLD }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>Sent you {x.name}</b>
                      <small>{ago(x.at, today)}{x.closed ? ` · closed${x.value ? ` at ${money(x.value)}` : ""}` : ""}</small>
                    </span>
                  </li>
                ))}
              </ul>
              {candidateFor(sel.r.id) ? <p className="d-sum">{candidateFor(sel.r.id)!.words}. A thank-you and an ask go well together.</p> : <p className="d-sum">Thank them. People who have referred once are the likeliest to refer again.</p>}
              {askButton(sel.r.id, sel.r.name)}
              <button className="vr-classic" onClick={() => open(null)}>The whole scoreboard</button>
            </>
          ) : sel && sel.kind === "cand" ? (
            <>
              <h1 className="d-title" id="rf-title">{sel.c.name}</h1>
              <p className="d-sub">{WHY_TITLE[sel.c.why]}</p>
              <p className="d-sum">{sel.c.words}.</p>
              {askButton(sel.c.id, sel.c.name)}
              <button className="vr-classic" onClick={() => open(null)}>The whole scoreboard</button>
            </>
          ) : (
            <>
              <h1 className="d-title" id="rf-title">Referrals</h1>
              <p className="d-sub">{headline(data)}</p>
              {rate != null ? (
                <p className="d-sum">
                  {data.vips.thisYear} of your {data.vips.count} VIPs have referred this goal year ({Math.round(rate * 100)}%); {data.vips.ever} ever.
                </p>
              ) : null}
              {data.candidates.length ? (
                <>
                  <h2>Likely next</h2>
                  <ul className="pm-list pm-compact">
                    {data.candidates.map((c) => (
                      <li key={c.id}>
                        <i className="pm-dot" style={{ background: now.has(c.id) ? PULSE_COLOR.today : "rgba(255,255,255,0.35)" }} aria-hidden="true" />
                        <span className="pm-body">
                          <b>{c.name}</b>
                          <small>{c.words}</small>
                        </span>
                        {seats.some((s) => seatId(s) === `c:${c.id}` || seatId(s) === `r:${c.id}`) ? (
                          <span className="pm-acts">
                            <button onClick={() => open(seats.some((s) => seatId(s) === `c:${c.id}`) ? `c:${c.id}` : `r:${c.id}`)} aria-label={`Open ${c.name}`}>→</button>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <h2>Who sent you business</h2>
              {data.referrers.length ? (
                <ul className="pm-list pm-compact">
                  {data.referrers.map((x) => (
                    <li key={x.id}>
                      <i className="pm-dot" style={{ background: GOLD }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>{x.name}: {x.total}</b>
                        <small>{x.thisYear} this goal year · {x.closed} closed{x.value ? ` · ${money(x.value)}` : ""}</small>
                      </span>
                      {seats.some((s) => seatId(s) === `r:${x.id}`) ? (
                        <span className="pm-acts">
                          <button onClick={() => open(`r:${x.id}`)} aria-label={`Open ${x.name}`}>→</button>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pm-empty">No referrals logged yet. Log one on the contact in ONE MOVE and it shows here.</p>
              )}
            </>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}From your own records only. Nothing is sent: an ask is a task you do in your own words.</p>
        </aside>
      </div>
    </div>
  );
}
