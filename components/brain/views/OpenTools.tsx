"use client";

import { useEffect, useState } from "react";
import type { GraphNode, Stat } from "@/lib/graph/types.ts";
import { PRODUCT_COLOR, hex } from "@/lib/brain/theme.ts";
import {
  OPEN_HOUSES, OPEN_PROTOCOL, OPEN_QUESTIONS, OPEN_REPORT, OPEN_VISITORS, RATING_WORD, SAFETY_BUDDY, SAFETY_MINUTES,
  clockWords, currentPhase, dueWords, isExampleTool, minWords, protocolProgress, ratingCounts, type ProtocolStep, type Rating, type Visitor,
} from "@/lib/examples/open.ts";
import { doorHangersHref } from "@/lib/productTools.ts";
import ShowlyOpenShell, { HomeBlock, OpenToolButton, RealRows } from "./ShowlyOpenShell.tsx";

// ONE Open's tools in the Brain (Parry, 18 Oct): each side panel shows the example itself, and "Open ..." opens a full
// view inside the Brain where the actions work (rate a visitor, draft an answer, send the seller report, start a safety
// check-in, tick the protocol). Demo, or a tool with no data of the agent's own: the labelled example. Live with data:
// the agent's own rows, the same way. Nothing here sends anything.

export const OPEN_TOOL = /^open-tool-(open_houses|visitors|questions|reports|safety|scorecard)$/;
type Key = "open_houses" | "visitors" | "questions" | "reports" | "safety" | "scorecard";
const TABS: { key: Key; label: string }[] = [
  { key: "open_houses", label: "Open houses" },
  { key: "visitors", label: "Visitors" },
  { key: "questions", label: "Questions" },
  { key: "reports", label: "Reports" },
  { key: "safety", label: "Safety" },
  { key: "scorecard", label: "Scorecard" },
];
// Link-only tab (ONE Open's door hanger designer, vip-open#65): opens signed in, no view of its own here.
const SHELL_TABS = [...TABS, { key: "hangers", label: "Door hangers", href: doorHangersHref() }];
const COLOR = hex(PRODUCT_COLOR.open);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const NOT_SENT = "(Example: nothing was sent.)";
const PHASE_WORD: Record<string, string> = { plan: "Plan", prepare: "Prepare", host: "Host", follow_up: "Follow Up", done: "Done" };
const EXAMPLE_NUMBERS: Stat[] = [
  { label: "Open houses", value: "2" }, { label: "Sign-ins", value: "23" }, { label: "Contacts", value: "19" }, { label: "Appointments", value: "3" }, { label: "Clients", value: "1" },
];

interface Safety { start: number; minutes: number; safeAt: number | null }
interface State {
  ratings: Record<string, Rating>;
  drafts: Record<string, string>;
  answered: Record<string, string>;
  reportSent: string | null;
  steps: ProtocolStep[];
  safety: Safety | null;
  minutes: number;
}

function Rate({ v, value, onRate }: { v: Visitor; value: Rating; onRate: (r: Rating) => void }) {
  return (
    <span className="pso-rate" role="group" aria-label={`Rate ${v.name}`}>
      {(["hot", "warm", "cold"] as const).map((r) => (
        <button key={r} type="button" className={`pso-r ${r}`} aria-pressed={value === r} onClick={() => onRate(r)} aria-label={`${v.name}: ${RATING_WORD[r]}`}>
          {RATING_WORD[r]}
        </button>
      ))}
    </span>
  );
}

function useNow(on: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

export default function OpenTools({ node, kids, live }: { node: GraphNode; kids: GraphNode[]; live: boolean }) {
  const key = (OPEN_TOOL.exec(node.id)?.[1] ?? "open_houses") as Key;
  const example = !live || isExampleTool(node);
  const [open, setOpen] = useState<Key | null>(null);
  const [st, setSt] = useState<State>({
    ratings: Object.fromEntries(OPEN_VISITORS.map((v) => [v.id, v.rating])),
    drafts: Object.fromEntries(OPEN_QUESTIONS.map((q) => [q.id, q.draft])),
    answered: {},
    reportSent: null,
    steps: OPEN_PROTOCOL,
    safety: null,
    minutes: 120,
  });
  const now = useNow(!!st.safety && !st.safety.safeAt);
  const act = {
    rate: (id: string, r: Rating) => setSt((s) => ({ ...s, ratings: { ...s.ratings, [id]: r } })),
    draft: (id: string, t: string) => setSt((s) => ({ ...s, drafts: { ...s.drafts, [id]: t } })),
    answer: (id: string, who: string) => setSt((s) => ({ ...s, answered: { ...s.answered, [id]: `Answer sent to ${who}. ${NOT_SENT}` } })),
    sendReport: () => setSt((s) => ({ ...s, reportSent: `Seller report sent to ${OPEN_REPORT.seller}. ${NOT_SENT}` })),
    tick: (i: number) => setSt((s) => ({ ...s, steps: s.steps.map((x, k) => (k === i ? { ...x, done: !x.done } : x)) })),
    minutes: (m: number) => setSt((s) => ({ ...s, minutes: m })),
    start: () => setSt((s) => ({ ...s, safety: { start: Date.now(), minutes: s.minutes, safeAt: null } })),
    more: () => setSt((s) => (s.safety ? { ...s, safety: { ...s.safety, minutes: s.safety.minutes + 15 } } : s)),
    safe: () => setSt((s) => (s.safety ? { ...s, safety: { ...s.safety, safeAt: Date.now() } } : s)),
    reset: () => setSt((s) => ({ ...s, safety: null })),
  };
  const label = TABS.find((t) => t.key === key)!.label;
  const counts = ratingCounts(OPEN_VISITORS.map((v) => ({ rating: st.ratings[v.id] })));
  const numbers = node.id === "open-tool-scorecard" && node.stats?.length ? node.stats : EXAMPLE_NUMBERS;
  const realRows = kids.map((k) => ({ id: k.id, label: k.label, sub: k.secondaryLabel }));
  const ex = <span className="pso-ex">Example</span>;
  const lineOf: Record<Key, string> = {
    open_houses: "Upcoming and past open houses, each with its phase and visitors.",
    visitors: "Everyone who signed in, where they came from, and your rating.",
    questions: "Questions visitors asked, each with an answer drafted for you to send.",
    reports: "The seller report: who came, what they said, what is next.",
    safety: "A check-in timer while you host. Your buddy hears only if you do not check in.",
    scorecard: "The four phases of the Open House Protocol and your numbers.",
  };

  const panel = !example && key !== "scorecard" && key !== "safety" ? (
    <OpenToolButton label={label} line={`Your ${label.toLowerCase()} from ONE Open, in a full view.`} onOpen={() => setOpen(key)} />
  ) : (
    <>
      <OpenToolButton label={label} line={lineOf[key]} onOpen={() => setOpen(key)} />
      {key === "open_houses" && (
        <>
          <p className="pso-cap">{ex} 2 upcoming · 2 past</p>
          <ul className="pso-list">
            {OPEN_HOUSES.map((h) => (
              <li key={h.id} className="pso-row">
                <HomeBlock hue={h.hue} label={h.street} small />
                <span className="pso-row-b">
                  <b>{h.street}</b>
                  <small>{h.when}</small>
                </span>
                <span className="pso-pill">{h.upcoming ? PHASE_WORD[h.phase] : `${h.visitors} visitors`}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {key === "visitors" && (
        <>
          <p className="pso-cap">{ex} 14 visitors · 45 Sample Court · {counts.hot} Hot · {counts.warm} Warm · {counts.cold} Cold</p>
          <ul className="pso-list tight">
            {OPEN_VISITORS.map((v) => (
              <li key={v.id} className="pso-row wrap">
                <span className="pso-row-b">
                  <b>{v.name}</b>
                  <small>{cap(v.source.split(" · ").slice(-1)[0])}</small>
                </span>
                <Rate v={v} value={st.ratings[v.id]} onRate={(r) => act.rate(v.id, r)} />
              </li>
            ))}
          </ul>
        </>
      )}
      {key === "questions" && (
        <>
          <p className="pso-cap">{ex} {OPEN_QUESTIONS.length} questions from 45 Sample Court</p>
          <ul className="pso-list">
            {OPEN_QUESTIONS.map((q) => (
              <li key={q.id} className="pso-row top">
                <span className="pso-row-b">
                  <b>{q.question}</b>
                  <small>{q.who} · {q.room} · {st.answered[q.id] ? "answered" : "answer drafted"}</small>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {key === "reports" && (
        <ReportCard counts={counts} sent={st.reportSent} onSend={act.sendReport} compact />
      )}
      {key === "safety" && <SafetyCard st={st} now={now} act={act} compact />}
      {key === "scorecard" && <Phases steps={st.steps} />}
    </>
  );

  return (
    <div className="pso-panel">
      {panel}
      {open ? (
        <ShowlyOpenShell product="ONE Open" color={COLOR} title={TABS.find((t) => t.key === open)!.label} tabs={SHELL_TABS} tab={open} onTab={(k) => setOpen(k as Key)} example={example || open !== key} onClose={() => setOpen(null)}>
          {!example && open === key && key !== "scorecard" && key !== "safety" ? (
            <RealRows rows={realRows} empty={`Nothing in ${label} yet.`} />
          ) : (
            <OpenView tab={open} st={st} now={now} act={act} counts={counts} numbers={numbers} onTab={setOpen} />
          )}
        </ShowlyOpenShell>
      ) : null}
    </div>
  );
}

type Act = {
  rate: (id: string, r: Rating) => void; draft: (id: string, t: string) => void; answer: (id: string, who: string) => void; sendReport: () => void;
  tick: (i: number) => void; minutes: (m: number) => void; start: () => void; more: () => void; safe: () => void; reset: () => void;
};

function Phases({ steps, onTick }: { steps: ProtocolStep[]; onTick?: (i: number) => void }) {
  const prog = protocolProgress(steps);
  const cur = currentPhase(steps);
  return (
    <div className="pso-phases">
      <p className="pso-cap"><span className="pso-ex">Example</span> 123 Example Lane · now in {PHASE_WORD[cur]}</p>
      {prog.map((p) => (
        <div key={p.phase} className={`pso-phase${p.phase === cur ? " cur" : ""}`}>
          <p><b>{p.label}</b><small>{p.done} of {p.total}</small></p>
          <span className="pso-bar"><i style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} /></span>
          {onTick ? (
            <ul className="pso-checks">
              {steps.map((s, i) => (s.phase === p.phase ? (
                <li key={s.task}>
                  <button type="button" className={`pso-check${s.done ? " on" : ""}`} aria-pressed={s.done} onClick={() => onTick(i)}>
                    <i aria-hidden="true">{s.done ? "✓" : ""}</i><span>{s.task}</span>
                  </button>
                </li>
              ) : null))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ReportCard({ counts, sent, onSend, compact }: { counts: Record<Rating, number>; sent: string | null; onSend: () => void; compact?: boolean }) {
  const r = OPEN_REPORT;
  return (
    <div className="pso-card pso-report">
      <p className="pso-kick"><span className="pso-ex">Example</span> Seller report · {r.street} · {r.day}</p>
      <div className="pso-nums">
        <span><b>14</b><small>visitors</small></span>
        <span className="hot"><b>{counts.hot}</b><small>Hot</small></span>
        <span className="warm"><b>{counts.warm}</b><small>Warm</small></span>
        <span className="cold"><b>{counts.cold}</b><small>Cold</small></span>
      </div>
      <ul className="pso-fb">
        {(compact ? r.feedback.slice(0, 3) : r.feedback).map((f) => (
          <li key={f.what} className={f.kind}><b>{f.count}</b> {f.kind === "liked" ? "liked" : "mentioned"}: {f.what}</li>
        ))}
      </ul>
      {!compact ? <p className="pso-muted">Next: {r.next}</p> : null}
      <div className="pso-acts">
        {sent ? <span className="pso-done">Sent</span> : <button type="button" className="chip-btn primary" onClick={onSend}>Send to the seller</button>}
      </div>
      {sent ? <p className="pso-note" role="status">{sent}</p> : null}
    </div>
  );
}

function SafetyCard({ st, now, act, compact }: { st: State; now: number; act: Act; compact?: boolean }) {
  const s = st.safety;
  const left = s ? s.start + s.minutes * 60_000 - (s.safeAt ?? now) : 0;
  return (
    <div className="pso-card pso-safety">
      <p className="pso-kick"><span className="pso-ex">Example</span> 123 Example Lane · Sat 12:00-2:00 PM</p>
      {!s ? (
        <>
          <p className="pso-muted">Check-in contact: <b>{SAFETY_BUDDY.name}</b> · {SAFETY_BUDDY.phoneShown}</p>
          <div className="pso-seg" role="group" aria-label="How long">
            {SAFETY_MINUTES.map((m) => (
              <button key={m} type="button" className="chip-btn" aria-pressed={st.minutes === m} onClick={() => act.minutes(m)}>{minWords(m)}</button>
            ))}
          </div>
          <button type="button" className="chip-btn primary pso-cta" onClick={act.start}>Start safety check-in</button>
          {!compact ? <p className="pso-muted">If you do not tap "I'm safe" by the end, {SAFETY_BUDDY.name} gets a text with the address. You can add time while you host.</p> : null}
        </>
      ) : s.safeAt ? (
        <>
          <p className="pso-clock ok">Checked in safe</p>
          <p className="pso-note" role="status">You checked in safe at {dueWords(s.safeAt, 0)}. {SAFETY_BUDDY.name} was not texted. (Example: nothing was sent.)</p>
          <button type="button" className="chip-btn" onClick={act.reset}>Start another</button>
        </>
      ) : (
        <>
          <p className="pso-clock" aria-live="off">{clockWords(left / 1000)}</p>
          <p className="pso-muted">Check in by {dueWords(s.start, s.minutes)}. If you do not, {SAFETY_BUDDY.name} gets a text with the address. (Example: nothing is sent.)</p>
          <div className="pso-acts">
            <button type="button" className="chip-btn primary" onClick={act.safe}>I'm safe</button>
            <button type="button" className="chip-btn" onClick={act.more}>+15 min</button>
          </div>
        </>
      )}
    </div>
  );
}

function OpenView({ tab, st, now, act, counts, numbers, onTab }: { tab: Key; st: State; now: number; act: Act; counts: Record<Rating, number>; numbers: Stat[]; onTab: (k: Key) => void }) {
  const [filter, setFilter] = useState<Rating | "all">("all");
  if (tab === "open_houses")
    return (
      <section aria-label="Open houses">
        {[true, false].map((up) => (
          <div key={String(up)} className="pso-group">
            <h2>{up ? "Upcoming" : "Past"}</h2>
            <ul className="pso-homes">
              {OPEN_HOUSES.filter((h) => h.upcoming === up).map((h) => (
                <li key={h.id} className="pso-home">
                  <HomeBlock hue={h.hue} label={h.street} />
                  <div className="pso-home-b">
                    <p className="pso-home-t"><b>{h.street}</b><span className="pso-pill">{PHASE_WORD[h.phase]}</span></p>
                    <small>{h.city} · {h.when}</small>
                    <p className="pso-muted">{up ? `${h.tasksLeft} protocol tasks left` : `${h.visitors} visitors signed in${h.tasksLeft ? ` · ${h.tasksLeft} follow-ups left` : ""}`}</p>
                    {up ? (
                      <button type="button" className="pso-act" onClick={() => onTab("scorecard")}>See the protocol</button>
                    ) : h.id === "oh3" ? (
                      <button type="button" className="pso-act" onClick={() => onTab("visitors")}>See the 14 visitors</button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    );
  if (tab === "visitors") {
    const list = OPEN_VISITORS.filter((v) => filter === "all" || st.ratings[v.id] === filter);
    return (
      <section aria-label="Visitors">
        <p className="pso-cap">45 Sample Court · Sun 12 Oct · 14 signed in</p>
        <div className="pso-seg" role="group" aria-label="Show">
          {(["all", "hot", "warm", "cold"] as const).map((f) => (
            <button key={f} type="button" className="chip-btn" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All 14" : `${RATING_WORD[f]} ${counts[f]}`}
            </button>
          ))}
        </div>
        <ul className="pso-list">
          {list.map((v) => (
            <li key={v.id} className="pso-row wrap">
              <span className={`pso-dot ${st.ratings[v.id]}`} aria-hidden="true" />
              <span className="pso-row-b">
                <b>{v.name}{v.agent === "has agent" ? <em> · has an agent</em> : null}</b>
                <small>{v.source}</small>
                <small className="pso-quiet">{v.note}</small>
              </span>
              <Rate v={v} value={st.ratings[v.id]} onRate={(r) => act.rate(v.id, r)} />
            </li>
          ))}
        </ul>
        <p className="pso-muted">Visitors go to ONE MOVE tagged "Open house", never into your VIP-50 on their own. Rating changes stay here. (Example.)</p>
      </section>
    );
  }
  if (tab === "questions")
    return (
      <section aria-label="Questions" className="pso-grid2">
        {OPEN_QUESTIONS.map((q) => (
          <article key={q.id} className="pso-card">
            <p className="pso-kick">{q.who} · {q.room}</p>
            <p className="pso-qt">"{q.question}"</p>
            <label className="pso-lbl" htmlFor={`pso-d-${q.id}`}>Pulse drafted this answer</label>
            <textarea id={`pso-d-${q.id}`} className="pso-ta" rows={4} value={st.drafts[q.id]} onChange={(e) => act.draft(q.id, e.target.value)} disabled={!!st.answered[q.id]} />
            <div className="pso-acts">
              {st.answered[q.id] ? <span className="pso-done">Answered</span> : <button type="button" className="chip-btn primary" onClick={() => act.answer(q.id, q.who.split(" ")[0])}>Send answer</button>}
            </div>
            {st.answered[q.id] ? <p className="pso-note" role="status">{st.answered[q.id]}</p> : null}
          </article>
        ))}
      </section>
    );
  if (tab === "reports") return <ReportCard counts={counts} sent={st.reportSent} onSend={act.sendReport} />;
  if (tab === "safety") return <SafetyCard st={st} now={now} act={act} />;
  return (
    <section aria-label="Scorecard" className="pso-grid2">
      <div>
        <h2 className="pso-h2">Open House Protocol</h2>
        <Phases steps={st.steps} onTick={act.tick} />
      </div>
      <div>
        <h2 className="pso-h2">Your numbers, 90 days</h2>
        <div className="pso-nums big">
          {numbers.map((n) => (
            <span key={n.label}><b>{n.value}</b><small>{n.label}</small></span>
          ))}
        </div>
        <p className="pso-muted">Tick a task and its phase fills. (Example: ticks stay here.)</p>
      </div>
    </section>
  );
}

