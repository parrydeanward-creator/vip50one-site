"use client";

import { useEffect, useRef, useState } from "react";
import { PULSE_COLOR } from "./PulseRing.tsx";
import PulseRing from "./PulseRing.tsx";
import { useSvgCamera } from "./useSvgCamera.ts";
import {
  KIND_LABEL,
  KIND_SHORT,
  MAX,
  COUNTED,
  NOTE_MAX,
  TEXT_MAX,
  checkBody,
  commitmentsUrl,
  dueLevel,
  dueWords,
  progressWords,
  reached,
  readCommitments,
  resultWord,
  setBody,
  starters,
  type Commitments,
  type Draft,
  type Item,
  type Kind,
  type Period,
  type Result,
} from "@/lib/commitments.ts";

// Commitments in ONE YOU (Parry, 6 Oct; VIP-SUMMARY §3n): the week's commitments as orbs round a core
// that fills as they are kept; Monday's set, Friday's check-in and the weekend in the panel. The agent
// sets and marks every one; counted ones fill from what MASTER logs.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 290;
const GOLD = "#f5c542";
const RES_COLOR: Record<Result, string> = { kept: "#3fbf7f", partly: "#e5b83a", missed: "#e4574a" };
const NOT_YET = "Commitments arrive with ONE MOVE's next update. Nothing was saved.";
const EXAMPLE = "Example agent: in your account this is saved and your coach sees it.";

type Mode = { kind: "view" } | { kind: "set"; period: Period } | { kind: "check"; period: Period };

function modeFor(c: Commitments): Mode {
  if (c.due === "set_week") return { kind: "set", period: "week" };
  if (c.due === "set_weekend") return { kind: "set", period: "weekend" };
  if (c.due === "check_week") return { kind: "check", period: "week" };
  if (c.due === "check_weekend") return { kind: "check", period: "weekend" };
  return { kind: "view" };
}

export default function CommitmentsView({
  initial,
  live,
  hour,
  onClose,
  onChanged,
}: {
  initial: Commitments;
  live: boolean;
  hour: number;
  onClose: () => void;
  onChanged: (c: Commitments) => void;
}) {
  const [c, setC] = useState(initial);
  const [mode, setMode] = useState<Mode>(() => modeFor(initial));
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [picks, setPicks] = useState<Record<string, { result: Result | null; note: string }>>({});
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const cam = useSvgCamera(SIZE);

  // Fill the set form from what is there, or Pulse's starters; the check form from the items.
  useEffect(() => {
    if (mode.kind === "set") {
      const cur = (mode.period === "week" ? c.week : c.weekend)?.items ?? [];
      setDrafts(cur.length ? cur.map((i) => ({ text: i.text, kind: i.kind, target: i.target })) : mode.period === "week" ? starters({ vipsUntouched: 12, faceToFaceLastWeek: 0, overdueFollowUps: 1 }) : [{ text: "", kind: "yes_no", target: null }]);
    }
    if (mode.kind === "check") {
      const cur = (mode.period === "week" ? c.week : c.weekend)?.items ?? [];
      setPicks(Object.fromEntries(cur.map((i) => [i.id, { result: i.result ?? (reached(i) ? "kept" : null), note: i.note ?? "" }])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const save = (next: Commitments) => {
    setC(next);
    onChanged(next);
  };
  const post = async (path: "set" | "check", body: unknown, local: () => Commitments) => {
    if (!live) {
      save(local());
      setMode({ kind: "view" });
      return setNote(EXAMPLE);
    }
    setBusy(true);
    try {
      const r = await fetch(`${commitmentsUrl}/${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => null);
      const next = r.ok ? readCommitments(j) : null;
      if (next) {
        save(next);
        setMode({ kind: "view" });
        setNote(path === "set" ? "Saved. Your coach sees them; ONE GO shows them on your phone." : "Checked in. Well done for looking at it honestly.");
      } else if (r.status === 404 || r.status === 405) setNote(NOT_YET);
      else setNote((j as { error?: string } | null)?.error || "That didn't save. Nothing was changed.");
    } catch {
      setNote(NOT_YET);
    } finally {
      setBusy(false);
    }
  };

  const doSet = (period: Period) => {
    const b = setBody(period, drafts);
    if ("error" in b) return setNote(b.error);
    post("set", b, () => {
      const items: Item[] = b.items.map((d, k) => ({ id: `local-${period}-${k}`, text: d.text, kind: d.kind, target: d.target, count: d.kind === "yes_no" ? null : 0, result: null, note: null }));
      const ps = { id: `local-${period}`, starts: c.today, setAt: new Date().toISOString(), checkedAt: null, items };
      return { ...c, [period]: ps, due: c.due === "set_week" && period === "week" ? null : c.due === "set_weekend" && period === "weekend" ? null : c.due };
    });
  };
  const doCheck = (period: Period) => {
    const items = (period === "week" ? c.week : c.weekend)?.items ?? [];
    const b = checkBody(period, items, picks);
    if ("error" in b) return setNote(b.error);
    post("check", b, () => {
      const p = period === "week" ? c.week : c.weekend;
      const next = p && { ...p, checkedAt: new Date().toISOString(), items: p.items.map((i) => ({ ...i, result: picks[i.id].result, note: picks[i.id].note.trim() || null })) };
      return { ...c, [period]: next, due: period === "week" ? "set_weekend" : "set_week" };
    });
  };

  const week = c.week?.items ?? [];
  const n = week.length;
  const seats = week.map((i, k) => {
    const step = (2 * Math.PI) / Math.max(n, 5);
    const a = -((n - 1) * step) / 2 + k * step;
    return { i, x: C + RING * Math.sin(a), y: C - RING * Math.cos(a), r: 52 };
  });
  const on = week.filter((i) => i.result === "kept" || reached(i)).length;
  const fill = n ? on / n : 0;
  const top = C + CORE - 2 * CORE * fill;
  const level = dueLevel(c.due, c.today, hour);
  const step = dueWords(c.due);

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="cm-title">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="This week's commitments">
            <defs>
              <radialGradient id="cm-glow">
                <stop offset="0.5" stopColor="#ffd86a" stopOpacity="0.34" />
                <stop offset="1" stopColor="#ffd86a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="cm-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffe08a" />
                <stop offset="0.5" stopColor="#e7b43a" />
                <stop offset="1" stopColor="#8a6514" />
              </linearGradient>
              <radialGradient id="cm-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#3a3013" />
              </radialGradient>
              <clipPath id="cm-core-clip">
                <circle cx={C} cy={C} r={CORE - 3} />
              </clipPath>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map((s) => (
              <line key={`l-${s.i.id}`} className="vr-link" x1={C} y1={C} x2={s.x} y2={s.y} />
            ))}
            <circle cx={C} cy={C} r={CORE * 1.75} fill="url(#cm-glow)" opacity={0.4 + 0.6 * fill} />
            <circle cx={C} cy={C} r={CORE} fill="url(#cm-glass)" />
            <g clipPath="url(#cm-core-clip)">
              <rect className="dt-fill" x={C - CORE} y={top} width={CORE * 2} height={C + CORE - top} fill="url(#cm-fill)" />
            </g>
            <circle cx={C} cy={C} r={CORE} fill="none" stroke="#ffd86a" strokeWidth={3} />
            {level && <PulseRing r={CORE} level={level} x={C} y={C} />}
            <text className="dt-score" x={C} y={C - 6} textAnchor="middle">{n ? `${on}/${n}` : "0"}</text>
            <text className="dt-score-sub" x={C} y={C + 24} textAnchor="middle">THIS WEEK</text>
            {c.keepRate8w != null && <text className="pm-core-end" x={C} y={C + 48} textAnchor="middle">{`${Math.round(c.keepRate8w * 100)}% kept, 8 weeks`}</text>}
            {seats.map(({ i, x, y, r }) => {
              const frac = i.kind === "yes_no" || !i.target ? (i.result === "kept" ? 1 : 0) : Math.min(1, (i.count ?? 0) / i.target);
              const col = i.result ? RES_COLOR[i.result] : reached(i) ? RES_COLOR.kept : GOLD;
              const ar = r + 10;
              const end = -Math.PI / 2 + frac * 2 * Math.PI;
              const big = frac > 0.5 ? 1 : 0;
              return (
                <g key={i.id} className="cm-orb" role="img" aria-label={`${i.text}. ${progressWords(i)}${i.result ? `. ${resultWord(i.result)}` : ""}`}>
                  <circle cx={x} cy={y} r={ar} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={5} />
                  {frac > 0 && frac < 1 && <path d={`M ${x} ${y - ar} A ${ar} ${ar} 0 ${big} 1 ${x + ar * Math.cos(end)} ${y + ar * Math.sin(end)}`} fill="none" stroke={col} strokeWidth={5} strokeLinecap="round" />}
                  {frac >= 1 && <circle cx={x} cy={y} r={ar} fill="none" stroke={col} strokeWidth={5} />}
                  <circle cx={x} cy={y} r={r} fill="url(#cm-glass)" stroke={col} strokeWidth={2.5} />
                  <text className="cm-orb-n" x={x} y={y - 2} textAnchor="middle">{i.kind === "yes_no" ? (i.result ? resultWord(i.result) : "Yes / no") : `${i.count ?? 0}/${i.target}`}</text>
                  <text className="cm-orb-k" x={x} y={y + 18} textAnchor="middle">{KIND_SHORT[i.kind]}</text>
                  <text className="pm-name-l" x={x} y={y + r + 28} textAnchor="middle">{i.text.length > 30 ? `${i.text.slice(0, 29)}…` : i.text}</text>
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
            <button onClick={cam.reset} aria-label="Centre on your week">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Commitments">
          <div className="d-head">
            <span className="chip" style={{ color: GOLD, borderColor: GOLD }}>ONE YOU</span>
            {level && <span className="cm-due" style={{ color: level === "now" ? PULSE_COLOR.now : PULSE_COLOR.today }}>● {step}</span>}
          </div>
          <h1 className="d-title" id="cm-title">This week</h1>
          <p className="d-sub">
            {c.keepRate8w != null ? `You keep ${Math.round(c.keepRate8w * 100)}% of your commitments` : "Set them Monday, check in Friday"}
            {c.streak ? ` · ${c.streak}-week streak` : ""}
          </p>
          <p className="d-sum">Monday you set up to {MAX.week}. Friday you check in on each one, then set up to {MAX.weekend} for the weekend. Your coach sees them; nobody else does. Counted ones fill as you work.</p>

          {mode.kind === "set" && (
            <section className="cm-form">
              <h2>{mode.period === "week" ? "This week I commit to" : "This weekend I commit to"}</h2>
              {drafts.map((d, k) => (
                <div key={k} className="cm-row">
                  <input aria-label={`Commitment ${k + 1}`} maxLength={TEXT_MAX} value={d.text} placeholder="What will you do?" onChange={(e) => setDrafts((all) => all.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)))} />
                  <div className="cm-row-2">
                    <select aria-label={`How it is measured, commitment ${k + 1}`} value={d.kind} onChange={(e) => setDrafts((all) => all.map((x, j) => (j === k ? { ...x, kind: e.target.value as Kind, target: e.target.value === "yes_no" ? null : x.target ?? 1 } : x)))}>
                      <option value="yes_no">{KIND_LABEL.yes_no}</option>
                      {COUNTED.map((kk) => (
                        <option key={kk} value={kk}>{`Count: ${KIND_LABEL[kk]}`}</option>
                      ))}
                    </select>
                    {d.kind !== "yes_no" && (
                      <input aria-label={`Number, commitment ${k + 1}`} type="number" min={1} max={100} value={d.target ?? 1} onChange={(e) => setDrafts((all) => all.map((x, j) => (j === k ? { ...x, target: Number(e.target.value) } : x)))} />
                    )}
                    <button className="cm-x" onClick={() => setDrafts((all) => all.filter((_, j) => j !== k))} aria-label={`Remove commitment ${k + 1}`}>×</button>
                  </div>
                </div>
              ))}
              {drafts.length < MAX[mode.period] && (
                <button className="vr-btn" onClick={() => setDrafts((all) => [...all, { text: "", kind: "yes_no", target: null }])}>+ Add one</button>
              )}
              <p className="pm-promise">Pulse suggested these from your week. Change them, or write your own.</p>
              <button className="pi-btn pm-send" disabled={busy} onClick={() => doSet(mode.period)}>{busy ? "Saving…" : mode.period === "week" ? "Commit to my week" : "Commit to my weekend"}</button>
            </section>
          )}

          {mode.kind === "check" && (
            <section className="cm-form">
              <h2>{mode.period === "week" ? "How did your week go?" : "How did your weekend go?"}</h2>
              {((mode.period === "week" ? c.week : c.weekend)?.items ?? []).map((i) => (
                <div key={i.id} className="cm-check">
                  <b>{i.text}</b>
                  <small>{progressWords(i)}{reached(i) ? " · reached" : ""}</small>
                  <div className="cm-results" role="radiogroup" aria-label={i.text}>
                    {(["kept", "partly", "missed"] as Result[]).map((r) => (
                      <button key={r} role="radio" aria-checked={picks[i.id]?.result === r} className={picks[i.id]?.result === r ? `on ${r}` : ""} onClick={() => setPicks((p) => ({ ...p, [i.id]: { note: p[i.id]?.note ?? "", result: r } }))}>
                        {resultWord(r)}
                      </button>
                    ))}
                  </div>
                  <input aria-label={`What worked or got in the way: ${i.text}`} maxLength={NOTE_MAX} placeholder="What worked, or what got in the way?" value={picks[i.id]?.note ?? ""} onChange={(e) => setPicks((p) => ({ ...p, [i.id]: { result: p[i.id]?.result ?? null, note: e.target.value } }))} />
                </div>
              ))}
              <button className="pi-btn pm-send" disabled={busy} onClick={() => doCheck(mode.period)}>{busy ? "Saving…" : "Check in"}</button>
            </section>
          )}

          {mode.kind === "view" && (
            <>
              <h2>This week</h2>
              {week.length ? (
                <ul className="pm-list pm-compact">
                  {week.map((i) => (
                    <li key={i.id}>
                      <i className="pm-dot" style={{ background: i.result ? RES_COLOR[i.result] : reached(i) ? RES_COLOR.kept : GOLD }} aria-hidden="true" />
                      <span className="pm-body">
                        <b>{i.text}</b>
                        <small>{progressWords(i)}{i.result ? ` · ${resultWord(i.result)}` : reached(i) ? " · reached" : ""}{i.note ? ` · ${i.note}` : ""}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pm-empty">No commitments this week yet.</p>
              )}
              {c.weekend && (
                <>
                  <h2>This weekend</h2>
                  <ul className="pm-list pm-compact">
                    {c.weekend.items.map((i) => (
                      <li key={i.id}>
                        <i className="pm-dot" style={{ background: i.result ? RES_COLOR[i.result] : GOLD }} aria-hidden="true" />
                        <span className="pm-body">
                          <b>{i.text}</b>
                          <small>{progressWords(i)}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {c.lastWeek && <p className="d-sum">Last week: {c.lastWeek.kept} kept, {c.lastWeek.partly} partly, {c.lastWeek.missed} missed.</p>}
              <div className="cm-actions">
                {!c.week?.checkedAt && <button className="vr-btn" onClick={() => setMode({ kind: "set", period: "week" })}>{week.length ? "Change this week's" : "Set this week's"}</button>}
                {week.length > 0 && !c.week?.checkedAt && <button className="vr-btn vr-gold" onClick={() => setMode({ kind: "check", period: "week" })}>Check in on my week</button>}
                {c.week?.checkedAt && !c.weekend && <button className="vr-btn vr-gold" onClick={() => setMode({ kind: "set", period: "weekend" })}>Set my weekend</button>}
                {c.weekend && !c.weekend.checkedAt && <button className="vr-btn" onClick={() => setMode({ kind: "check", period: "weekend" })}>Check in on my weekend</button>}
              </div>
            </>
          )}
          {mode.kind !== "view" && (
            <button className="vr-classic" onClick={() => setMode({ kind: "view" })}>Back to this week</button>
          )}
          <p className="pm-promise">Only you mark a commitment kept. No points: your keep rate shows beside your weekly score.</p>
        </aside>
      </div>
    </div>
  );
}
