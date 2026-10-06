"use client";

import { useEffect, useRef, useState } from "react";
import PulseMark from "./PulseMark.tsx";
import { useVoice, say } from "./useVoice.ts";
import { carryAnswers, checkTold, mergeTold, nextQuestion, readOverview, readReply, toldBusy, type Answer, type Answers, type Told } from "@/lib/overview.ts";
import { clock12, toMin } from "@/lib/schedule.ts";
import type { Day } from "./useDay.ts";

// Tell Pulse your day (Parry, 6 Oct): "give the user the ability to give pulse an over view of the day by
// talking to pulse or typing... if pulse is not sure then have it ask. where are you headed after dr and how
// long do you need to travel?" The agent says it once; Pulse reads the appointments, asks only what it
// cannot know, one question at a time, adds the drives, and the work fills the gaps on the clock.

const EXAMPLE = "Hey Pulse, I have a doctor's appointment this morning from 8 to 9, a one hour meeting with Aaron at 11 and lunch at 12:30. Plan my other tasks around that.";
const WHERE_WORD = { out: "out", office: "at the office", phone: "phone or Zoom", unsure: "where?" } as const;
const span = (t: { start: string; end: string }) => `${clock12(t.start)}-${clock12(t.end)}`;

export default function TellPulse({ day, live, initial, onNote }: { day: Day; live: boolean; initial?: string; onNote: (n: string) => void }) {
  const [text, setText] = useState(initial ?? "");
  const [draft, setDraft] = useState<{ text: string; items: Told[]; answers: Answers } | null>(null);
  const [reading, setReading] = useState(false);
  const [miss, setMiss] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [talking, setTalking] = useState(false); // the agent used the mic: Pulse answers out loud
  const [open, setOpen] = useState(!day.told);
  // Adding to or changing the day already told (Parry, 6 Oct: "later in the day if I need to add or adjust then
  // pulse will act accordingly"): what was told stays unless the agent changes or cancels it.
  const [adding, setAdding] = useState(false);
  const q = draft ? nextQuestion(draft.items, draft.answers) : null;
  const qRef = useRef(q);
  qRef.current = q;

  const voice = useVoice((heard) => {
    if (qRef.current) answer(heard);
    else {
      setText(heard);
      read(heard, true);
    }
  });

  // Asked from the Ask Pulse bar: read it straight away.
  const started = useRef(false);
  useEffect(() => {
    if (initial && !started.current) {
      started.current = true;
      read(initial, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const finish = (d: { text: string; items: Told[]; answers: Answers }, spoken: boolean) => {
    const saving = day.tell(d);
    setDraft(null);
    setOpen(false);
    const drives = toldBusy(d.items, d.answers, day.hours.start).filter((b) => b.source === "travel").length;
    const words = `Done. Your day is planned around ${d.items.length} ${d.items.length === 1 ? "appointment" : "appointments"}${drives ? ` and ${drives} ${drives === 1 ? "drive" : "drives"}` : ""}, with your work in the gaps.`;
    if (spoken) say(words);
    if (!live) return onNote(`${words} Example agent: in your account it goes to your calendar too.`);
    onNote(words);
    void saving.then((n) => n && onNote(`${words} ${n}`));
  };

  const ask = (d: { text: string; items: Told[]; answers: Answers }, spoken: boolean) => {
    const next = nextQuestion(d.items, d.answers);
    if (!next) return finish(d, spoken);
    if (spoken) say(next.text, () => voice.listen());
  };

  const read = async (t: string, spoken: boolean) => {
    const words = t.trim();
    if (!words) return;
    setTalking(spoken);
    setReading(true);
    setMiss(null);
    const before = adding && day.told ? day.told : null;
    let items: Told[] | null = null;
    try {
      const r = await fetch("/api/day/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: words.slice(0, 600), current: before?.items, demo: !live }) });
      items = r.ok ? checkTold(((await r.json()) as { items?: unknown }).items) : null;
    } catch {}
    items ??= before ? mergeTold(before.items, words) : readOverview(words);
    setReading(false);
    if (!items.length && !before) {
      const m = "Pulse didn't hear a time. Try \"Doctor 8 to 9, lunch at 12:30\".";
      setMiss(m);
      if (spoken) say(m);
      return;
    }
    const d = before
      ? { text: `${before.text}\n${words}`.slice(-600), items, answers: carryAnswers(before.items, before.answers, items) }
      : { text: words, items, answers: {} };
    setAdding(false);
    setDraft(d);
    ask(d, spoken);
  };

  const give = (a: Answer) => {
    if (!draft || !q) return;
    const d = { ...draft, answers: { ...draft.answers, [q.id]: { ...draft.answers[q.id], ...a } } };
    setDraft(d);
    setReply("");
    setMiss(null);
    ask(d, talking);
  };
  const answer = (t: string) => {
    if (!q) return;
    const a = readReply(q, t);
    if (a) return give(a);
    const m = q.kind === "where" ? "Say office, somewhere else, or phone." : "Say office, home or straight to the next one, and how many minutes.";
    setMiss(m);
    if (talking) say(m, () => voice.listen());
  };
  const drop = (id: string) => draft && setDraft({ ...draft, items: draft.items.filter((x) => x.id !== id) });

  if (!open && day.told) {
    return (
      <div className="tp tp-done">
        <p>
          <PulseMark label={false} /> <span>You told Pulse: {day.told.items.map((t) => `${t.title} ${clock12(t.start)}`).join(", ")}.</span>
        </p>
        <div className="tp-row">
          <button className="vr-btn" onClick={() => (setDraft({ ...day.told! }), setText(day.told!.text), setOpen(true))}>Change</button>
          <button className="vr-btn" onClick={() => (setAdding(true), setOpen(true), setText(""))}>Add or change</button>
          <button className="vr-btn" onClick={() => (day.tell(null), setOpen(true))}>Clear</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tp">
      <h2>
        <PulseMark label={false} /> {adding ? "Add to or change your day" : "Tell Pulse your day"}
      </h2>
      {!draft && (
        <>
          <div className="tp-say">
            <textarea
              value={voice.listening ? voice.heard || text : text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), read(text, false))}
              placeholder={adding ? "I also have a showing at 3, and move my meeting with Aaron to 1:30" : EXAMPLE}
              rows={4}
              maxLength={600}
              aria-label="Tell Pulse your day"
            />
            {voice.can && (
              <button className={`tp-mic${voice.listening ? " on" : ""}`} onClick={() => (voice.listening ? voice.stop() : voice.listen(true))} aria-pressed={voice.listening} aria-label={voice.listening ? "Done talking" : "Talk to Pulse"}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                  <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <div className="tp-row">
            <button className="pi-btn tp-go" onClick={() => read(text, false)} disabled={reading || !text.trim()}>
              {reading ? "Pulse is reading…" : "Plan around it"}
            </button>
            {!text && (
              <button className="vr-btn" onClick={() => setText(EXAMPLE)}>
                Try the example
              </button>
            )}
          </div>
          {voice.listening && <p className="tp-hint">Listening. Tell Pulse your whole day, then tap the mic when you're done.</p>}
          {voice.error && <p className="dc-miss">{voice.error}</p>}
        </>
      )}

      {draft && (
        <>
          <p className="tp-k">Pulse heard</p>
          <ul className="tp-heard">
            {draft.items.map((t) => {
              const w = draft.answers[t.id]?.where ?? t.where;
              return (
                <li key={t.id}>
                  <b>{span(t)}</b> {t.title} <i className={`tp-where tp-${w}`}>{WHERE_WORD[w]}</i>
                  <button onClick={() => drop(t.id)} aria-label={`Not this one: ${t.title}`}>×</button>
                </li>
              );
            })}
          </ul>
          {q ? (
            <div className="tp-q pop" role="status" aria-live="polite">
              <p>
                <PulseMark label={false} /> {q.text}
              </p>
              <div className="tp-opts">
                {q.options.map((o) => (
                  <button key={o.label} className="vr-btn" onClick={() => give(o.answer)}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="tp-say tp-reply">
                <input value={voice.listening ? voice.heard : reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && answer(reply)} placeholder={q.kind === "where" ? "Or say it: \"at their office\"" : "Or say it: \"back to the office, 20 minutes\""} aria-label="Answer Pulse" />
                {voice.can && (
                  <button className={`tp-mic${voice.listening ? " on" : ""}`} onClick={() => (voice.listening ? voice.stop() : (setTalking(true), voice.listen()))} aria-label="Answer by talking">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button className="pi-btn tp-go" onClick={() => finish(draft, talking)}>Plan my day</button>
          )}
          <button className="vr-classic" onClick={() => (setDraft(null), setMiss(null))}>Start again</button>
        </>
      )}
      {miss && <p className="dc-miss">{miss}</p>}
      {draft && draft.items.some((t) => toMin(t.start) < toMin(day.hours.start)) && <p className="tp-hint">Your day starts earlier today, so the clock does too.</p>}
    </div>
  );
}
