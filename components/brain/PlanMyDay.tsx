"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PulseMark from "./PulseMark.tsx";
import { PULSE_COLOR } from "./PulseRing.tsx";
import { clock, duration, type DayItem } from "@/lib/day.ts";
import { todayIn } from "@/lib/hwc.ts";
import { firstPlan, planKey, planUrl, pointsLeft, putBody, readPlan, shift, suggest, timed, totalMinutes, PLAN_MAX, type Plan, type PlanItem } from "@/lib/plan.ts";

// Plan My Day (Parry, 5 Oct; VIP-SUMMARY §3l): plan on the desktop, do on the phone. Pulse lays
// out what is pulsing today; the agent orders it, cuts what will not happen and sends it to ONE GO.
// Until ONE MOVE's route answers, the plan is kept in this browser and the button says so.

const NAMES: Record<string, string> = { go: "ONE GO", move: "ONE MOVE", marquee: "Marquee", open: "ONE Open", showly: "Showly", one: "ONE" };
const SENT_LIVE = "Sent. ONE GO opens to this list, in this order.";
const SAVED_HERE = "Saved on this computer. Your phone gets it as soon as ONE GO's update is live.";
const EXAMPLE = "Example agent: in your account this goes to ONE GO on your phone.";

function dot(p: PlanItem): string {
  if (p.special) return "pm-dot pm-special";
  return "pm-dot";
}
function dotColor(p: PlanItem): string | undefined {
  if (p.special) return undefined;
  return p.urgency === "alert" ? PULSE_COLOR.now : p.urgency === "today" ? PULSE_COLOR.today : "rgba(255,255,255,0.35)";
}
function why(p: PlanItem): string {
  return p.special ? "Special day · " : p.urgency === "alert" ? "Overdue · " : p.urgency === "today" ? "Today · " : "";
}

export default function PlanMyDay({
  today,
  week,
  live,
  onClose,
  onGo,
  onSaved,
}: {
  today: DayItem[];
  week?: { score: number; minimum: number };
  live: boolean;
  onClose: () => void;
  onGo: (nodeId: string) => void;
  onSaved: (plan: Plan) => void;
}) {
  const date = useMemo(() => todayIn(), []);
  const pool = useMemo(() => suggest(today), [today]);
  const [items, setItems] = useState<PlanItem[]>(() => firstPlan(pool));
  const [start, setStart] = useState("08:00");
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // What the agent already planned today: ONE GO's copy first, else this browser's. Once, on
  // opening: the minute's fresh numbers must not undo the agent's edits.
  const poolRef = useRef(pool);
  useEffect(() => {
    const pool = poolRef.current;
    let gone = false;
    let local: Plan | null = null;
    try {
      local = readPlan(JSON.parse(localStorage.getItem(planKey(date)) ?? "null"), pool);
    } catch {}
    if (local && local.date === date) {
      setItems(local.items);
      setStart(local.start);
    }
    if (live) {
      fetch(planUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const p = readPlan(j, pool);
          if (gone || !p || p.date !== date || !p.sentAt) return;
          setItems(p.items);
          setStart(p.start);
          setSentAt(p.sentAt);
        })
        .catch(() => {});
    }
    return () => {
      gone = true;
    };
  }, [date, live]);

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

  const inPlan = new Set(items.map((p) => p.ref));
  const rest = pool.filter((p) => !inPlan.has(p.ref));
  const slots = timed(items, start);
  const minutes = totalMinutes(items);
  const left = pointsLeft(week);
  const edit = (next: PlanItem[]) => {
    setItems(next);
    setNote(null);
  };

  const send = async () => {
    const plan: Plan = { date, sentAt: new Date().toISOString(), start, items };
    try {
      localStorage.setItem(planKey(date), JSON.stringify({ date, sent_at: plan.sentAt, start, items: putBody(plan).items.map((x, i) => ({ ...x, done: items[i].done })) }));
    } catch {}
    onSaved(plan);
    if (!live) return setNote(EXAMPLE);
    setBusy(true);
    try {
      const r = await fetch(planUrl, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(putBody(plan)) });
      const j = await r.json().catch(() => null);
      const back = r.ok ? readPlan(j, pool) : null;
      if (back) {
        setSentAt(back.sentAt);
        onSaved(back);
        setNote(SENT_LIVE);
      } else if (r.status === 404 || r.status === 405) setNote(SAVED_HERE);
      else setNote((j as { error?: string } | null)?.error || "That didn't send. Your plan is kept on this computer.");
    } catch {
      // a route ONE MOVE hasn't shipped answers without CORS, so the fetch itself fails
      setNote(SAVED_HERE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pi-back" onClick={onClose}>
      <section className="pi pm pop" role="dialog" aria-modal="true" aria-labelledby="pm-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="pi-close" onClick={onClose} aria-label="Close">×</button>
        <header className="pi-head">
          <PulseMark />
          <h2 id="pm-title">Plan my day</h2>
          <p className="pi-lede">
            Pulse laid out what is pulsing today. Put it in your order, cut what won&apos;t happen, and send it to your phone. ONE GO opens to this list.
          </p>
          {left != null && (
            <p className={`pi-today ${left > 0 ? "pi-lvl-today" : ""}`}>
              {left > 0 ? `${left} points still needed for 100 this week` : "100 points reached this week"}
            </p>
          )}
        </header>

        <div className="pm-cols">
          <div className="pm-col">
            <h3>Your plan</h3>
            <label className="pm-start">
              Start at <input type="time" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
            </label>
            {slots.length ? (
              <ol className="pm-list">
                {slots.map((x, i) => (
                  <li key={x.ref} className={x.done ? "is-done" : undefined}>
                    <span className="pm-time">{clock(x.start)}</span>
                    <i className={dot(x)} style={{ background: dotColor(x) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{x.title}</b>
                      <small>
                        {why(x)}
                        {NAMES[x.product] ?? x.product} · {duration(x.minutes)}
                        {x.at ? ` · fixed at ${clock(x.at)}` : ""}
                        {x.done ? " · done" : ""}
                      </small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => edit(shift(items, i, -1))} disabled={i === 0} aria-label={`Move up: ${x.title}`}>↑</button>
                      <button onClick={() => edit(shift(items, i, 1))} disabled={i === slots.length - 1} aria-label={`Move down: ${x.title}`}>↓</button>
                      {x.nodeId && (
                        <button onClick={() => onGo(x.nodeId!)} aria-label={`Show on the map: ${x.title}`}>→</button>
                      )}
                      <button onClick={() => edit(items.filter((p) => p.ref !== x.ref))} aria-label={`Take off the plan: ${x.title}`}>×</button>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="pm-empty">Nothing planned yet. Add from Pulse suggests.</p>
            )}
          </div>

          <div className="pm-col">
            <h3>Pulse suggests</h3>
            {rest.length ? (
              <ul className="pm-list pm-pool">
                {rest.map((x) => (
                  <li key={x.ref}>
                    <i className={dot(x)} style={{ background: dotColor(x) }} aria-hidden="true" />
                    <span className="pm-body">
                      <b>{x.title}</b>
                      <small>
                        {why(x)}
                        {NAMES[x.product] ?? x.product} · {duration(x.minutes)}
                      </small>
                    </span>
                    <span className="pm-acts">
                      <button onClick={() => edit([...items, x])} disabled={items.length >= PLAN_MAX} aria-label={`Add to the plan: ${x.title}`}>+ Add</button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pm-empty">{pool.length ? "Everything Pulse found is on your plan." : "Nothing is pulsing today. A good day to call a VIP you haven't talked to in a while."}</p>
            )}
          </div>
        </div>

        <footer className="pm-foot">
          <p>
            {items.length} {items.length === 1 ? "thing" : "things"} · about {duration(minutes)}
            {slots.length ? ` · done by ${clock(slots[slots.length - 1].end)}` : ""}
            {sentAt ? " · sent to your phone" : ""}
          </p>
          <button className="pi-btn pm-send" onClick={send} disabled={busy || !items.length}>
            {busy ? "Sending…" : sentAt ? "Send the changes to my phone" : "Send to my phone"}
          </button>
          {note && (
            <p className="pm-note" role="status">
              {note}
            </p>
          )}
          <p className="pm-promise">Ticking a plan item is your check mark only. Nothing is texted, emailed or logged for you.</p>
        </footer>
      </section>
    </div>
  );
}
