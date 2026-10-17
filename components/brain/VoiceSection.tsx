"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { say, useVoice } from "./useVoice.ts";
import { fallbackLine, pickVoiceOf, readKind, readPulseVoice, saveKind, voiceKindBody, type VoiceKind } from "@/lib/voicePick.ts";
import { profileUrl } from "@/lib/profile.ts";
import { SIGN_IN_LINE, isSignInRefusal } from "@/lib/moveAuth.ts";
import {
  EMPTY_VOICE,
  VOICE_FIELDS,
  VOICE_HINTS,
  VOICE_LABELS,
  VOICE_LIMITS,
  demoVoiceState,
  fillFrom,
  forgetUrl,
  interviewBody,
  interviewUrl,
  plainFill,
  readVoiceState,
  saveBody,
  sourceWords,
  voiceChanged,
  voiceUrl,
  type Voice,
  type VoiceField,
  type VoiceState,
} from "@/lib/agentVoice.ts";

// PROFILE.md §5c "Pulse knows me" in the Brain's My Profile, the same card as Classic's (vip50-web-crm#273; hard rule
// 14 Oct: both profiles, two columns). Left: the five fields, filled by hand or by "Talk to Pulse" (answered out loud
// through the browser's own speech recognition, or typed); nothing is saved before Save. Right: "Learn from what I
// send" and every piece Pulse kept, each deletable. In the demo it runs on example data and nothing is called.

const day = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null);

export default function VoiceSection({ demo = false, pulseVoice }: { demo?: boolean; pulseVoice?: VoiceKind }) {
  const [s, setS] = useState<VoiceState | null>(null);
  const [form, setForm] = useState<Voice>(EMPTY_VOICE);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // ONE MOVE did not take the sign-in (401/403): say so instead of hiding the card or showing empty fields.
  const [refused, setRefused] = useState(false);
  // The interview
  const [talking, setTalking] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const heardFor = useRef(0);
  const voice = useVoice((text) => {
    const i = heardFor.current;
    setAnswers((a) => {
      const n = [...a];
      n[i] = [n[i]?.trim(), text].filter(Boolean).join(" ");
      return n;
    });
  });

  const load = useCallback(async () => {
    if (demo) {
      const d = demoVoiceState();
      setS(d);
      setForm(d.voice);
      return;
    }
    const r = await fetch(voiceUrl, { credentials: "include", cache: "no-store" }).catch(() => null);
    setRefused(!!r && isSignInRefusal(r.status));
    const j = r?.ok ? await r.json().catch(() => null) : null;
    const next = readVoiceState(j);
    setS(next);
    if (next) setForm(next.voice);
  }, [demo]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!s)
    return refused ? (
      <section className="pf-card pf-span vc" aria-label="Pulse knows me">
        <h2>Pulse knows me</h2>
        <small className="pf-sub warn" role="status">{SIGN_IN_LINE}</small>
      </section>
    ) : null;
  const dirty = voiceChanged(s.voice, form);
  const setField = (f: VoiceField, v: string) => {
    setForm({ ...form, [f]: v });
    setMsg(null);
  };

  /** One write to ONE MOVE; true when it went through. In the demo nothing is called. */
  const send = async (method: "POST" | "DELETE", url: string, body: object | null): Promise<Record<string, unknown> | null> => {
    if (demo) return { ok: true };
    const r = await fetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    const j = r ? ((await r.json().catch(() => null)) as Record<string, unknown> | null) : null;
    if (r && isSignInRefusal(r.status)) throw new Error(SIGN_IN_LINE);
    if (!r || !r.ok) throw new Error(typeof j?.error === "string" ? j.error : "That didn't save. Nothing was changed.");
    return j ?? { ok: true };
  };

  const save = async () => {
    if (busy || !dirty) return;
    setBusy(true);
    setMsg(null);
    try {
      const body = saveBody(form);
      const j = await send("POST", voiceUrl, body);
      const at = typeof j?.updated_at === "string" ? j.updated_at : new Date().toISOString();
      setS({ ...s, voice: body, updatedAt: at });
      setForm(body);
      setMsg({ ok: true, text: demo ? "Example agent. Nothing is saved." : "Saved. Every Pulse in ONE now writes with this." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "That didn't save. Nothing was changed." });
    } finally {
      setBusy(false);
    }
  };

  const setLearn = async (on: boolean) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await send("POST", voiceUrl, { learn_on: on });
      setS({ ...s, learnOn: on });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "That didn't save. Nothing was changed." });
    } finally {
      setBusy(false);
    }
  };

  const forget = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await send("DELETE", forgetUrl(id), null);
      setS({ ...s, learned: s.learned.filter((x) => x.id !== id) });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "That didn't delete. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const startTalk = () => {
    setTalking(true);
    setStep(0);
    setAnswers([]);
    setMsg(null);
  };
  const go = (to: number) => {
    voice.stop();
    setStep(to);
  };
  const mic = () => {
    if (voice.listening) return voice.stop();
    heardFor.current = step;
    voice.listen(true);
  };
  const finish = async () => {
    voice.stop();
    const body = interviewBody(s.questions, answers);
    if (!body) return setMsg({ ok: false, text: "Answer at least one question first." });
    setBusy(true);
    setMsg(null);
    try {
      let next: Voice | null;
      if (demo) next = plainFill(form, answers);
      else {
        const r = await fetch(interviewUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
        const j = r ? await r.json().catch(() => null) : null;
        if (r && isSignInRefusal(r.status)) throw new Error(SIGN_IN_LINE);
        if (!r || !r.ok) throw new Error((j as { error?: string } | null)?.error || "Pulse couldn't write it just now. Try again.");
        next = fillFrom(form, j);
      }
      if (!next) throw new Error("Pulse couldn't write it just now. Try again.");
      setForm(next);
      setTalking(false);
      setStep(0);
      setAnswers([]);
      setMsg({ ok: true, text: "Read it, change anything, then tap Save. Nothing is saved until you do." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Pulse couldn't write it just now. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const last = s.questions.length - 1;
  const shownAnswer = voice.listening && heardFor.current === step ? [answers[step]?.trim(), voice.heard].filter(Boolean).join(" ") : answers[step] ?? "";

  return (
    <section className="pf-card pf-span vc" aria-label="Pulse knows me">
      <h2>Pulse knows me</h2>
      <small className="pf-sub">How you sound, kept once and used by every Pulse in ONE: your texts and emails, Marquee, ONE Open, Showly and your website.</small>
      <small className="pf-sub">Private: only you, and Pulse working for you, ever read this.</small>
      {demo ? <small className="pf-sub warn">Example agent. Nothing is saved.</small> : null}
      <div className="vc-cols">
        <div className="vc-col">
          {talking ? (
            <div className="vc-talk" role="group" aria-label="Talk to Pulse">
              <small className="pf-sub">Question {step + 1} of {s.questions.length}</small>
              <b>{s.questions[step]}</b>
              <label className="pf-field">
                <span>Your answer</span>
                <textarea
                  rows={4}
                  value={shownAnswer}
                  readOnly={voice.listening}
                  placeholder={voice.can ? "Tap the mic and answer out loud, or type here." : "Type your answer here."}
                  onChange={(e) => setAnswers((a) => { const n = [...a]; n[step] = e.target.value; return n; })}
                />
              </label>
              {voice.listening ? <small className="pf-sub" role="status">Listening. Take your time, then tap Done talking.</small> : null}
              {voice.error ? <small className="pf-sub warn">{voice.error}</small> : null}
              <div className="pf-btns">
                {voice.can ? (
                  <button type="button" className={`chip-btn${voice.listening ? " primary" : ""}`} aria-pressed={voice.listening} onClick={mic}>
                    {voice.listening ? "Done talking" : "Answer out loud"}
                  </button>
                ) : null}
                {step > 0 ? <button type="button" className="chip-btn" onClick={() => go(step - 1)}>Back</button> : null}
                {step < last ? (
                  <button type="button" className="chip-btn primary" onClick={() => go(step + 1)}>Next</button>
                ) : (
                  <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void finish()}>{busy ? "Pulse is writing…" : "Done: Pulse fills it in"}</button>
                )}
                <button type="button" className="chip-btn" onClick={() => { voice.stop(); setTalking(false); }}>Cancel</button>
              </div>
              <small className="pf-sub">Skip any question you like. Nothing is saved until you tap Save.</small>
            </div>
          ) : (
            <>
              {VOICE_FIELDS.map((f) => (
                <label key={f} className="pf-field">
                  <span>{VOICE_LABELS[f]}</span>
                  {f === "sign_off" ? (
                    <input value={form[f]} maxLength={VOICE_LIMITS[f]} onChange={(e) => setField(f, e.target.value)} />
                  ) : (
                    <textarea value={form[f]} maxLength={VOICE_LIMITS[f]} rows={f === "sample" ? 6 : 3} onChange={(e) => setField(f, e.target.value)} />
                  )}
                  {VOICE_HINTS[f] ? <small>{VOICE_HINTS[f]}</small> : null}
                </label>
              ))}
              <div className="pf-btns">
                <button type="button" className="chip-btn primary" disabled={busy || !dirty} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button>
                {dirty ? <button type="button" className="chip-btn" disabled={busy} onClick={() => { setForm(s.voice); setMsg(null); }}>Undo changes</button> : null}
                <button type="button" className="chip-btn" disabled={busy} onClick={startTalk}>Talk to Pulse</button>
              </div>
              {day(s.updatedAt) ? <small className="pf-sub">Last saved {day(s.updatedAt)}.</small> : null}
            </>
          )}
          {msg ? <small className={`pf-sub${msg.ok ? "" : " warn"}`} role="status">{msg.text}</small> : null}
        </div>
        <div className="vc-col">
          <PulseVoicePick demo={demo} master={pulseVoice} />
          <label className="dc-switch">
            <input type="checkbox" checked={s.learnOn} disabled={busy} onChange={(e) => void setLearn(e.target.checked)} />
            <span>
              Learn from what I send
              <small>When you change a Pulse draft and send it, your version is kept here: the newest 20 pieces, with names and addresses taken out.</small>
            </span>
          </label>
          <h3 className="vc-h">What Pulse learned ({s.learned.length})</h3>
          {s.learned.length ? (
            <ul className="vc-list">
              {s.learned.map((x) => (
                <li key={x.id}>
                  <p>{x.body}</p>
                  <div className="vc-row">
                    <small>{[sourceWords(x.source), day(x.createdAt)].filter(Boolean).join(" · ")}</small>
                    <button type="button" className="chip-btn" disabled={busy} onClick={() => void forget(x.id)} aria-label={`Delete: ${x.body.slice(0, 40)}`}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <small className="pf-sub">Nothing yet. It fills in as you change and send Pulse drafts.</small>
          )}
        </div>
      </div>
    </section>
  );
}

// Pulse's spoken voice: Man or Woman (Parry, 16 Oct: "can we let the user pick which voice they want man or woman?").
// Default Man. Free: the best natural voice this device already has of that kind. MASTER keeps the choice
// (user_profiles.pulse_voice, vip50-web-crm#277): the picker shows MASTER's value from the profile answer and saves
// through ONE MOVE's /api/brain/profile; the local copy is written at once so say() uses it. In the demo only the
// local copy changes and nothing is sent.
function PulseVoicePick({ demo, master }: { demo: boolean; master?: VoiceKind }) {
  const [kind, setKind] = useState<VoiceKind>("man");
  const [fell, setFell] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setKind(master ?? readKind());
  }, [master]);
  useEffect(() => {
    const check = () => {
      try {
        const vs = window.speechSynthesis?.getVoices() ?? [];
        setFell(vs.length > 0 && pickVoiceOf(vs, kind).fellBack);
      } catch { /* no voices */ }
    };
    check();
    try { window.speechSynthesis?.addEventListener?.("voiceschanged", check); } catch { /* old browser */ }
    return () => { try { window.speechSynthesis?.removeEventListener?.("voiceschanged", check); } catch { /* gone */ } };
  }, [kind]);
  const choose = async (k: VoiceKind) => {
    if (busy || k === kind) return;
    const was = kind;
    setKind(k);
    saveKind(k);
    setErr(null);
    if (demo) return;
    setBusy(true);
    try {
      const r = await fetch(profileUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(voiceKindBody(k)) });
      if (isSignInRefusal(r.status)) throw new Error(SIGN_IN_LINE);
      if (!r.ok) throw new Error();
      const back = readPulseVoice(await r.json().catch(() => null));
      if (back && back !== k) {
        setKind(back);
        saveKind(back);
      }
    } catch (e) {
      setKind(was);
      saveKind(was);
      setErr(e instanceof Error && e.message === SIGN_IN_LINE ? SIGN_IN_LINE : "That didn't save. Pulse's voice is unchanged.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="vc-voice">
      <b>Pulse&apos;s voice</b>
      <div className="pm-modes" role="radiogroup" aria-label="Pulse's voice">
        {(["man", "woman"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} disabled={busy} className={`chip-btn${kind === k ? " on" : ""}`} onClick={() => void choose(k)}>
            {k === "man" ? "Man" : "Woman"}
          </button>
        ))}
        <button type="button" className="chip-btn" onClick={() => say("Good morning. Here is what needs you today.")}>Hear it</button>
      </div>
      <small className="pf-sub">{fell ? fallbackLine(kind) : demo ? "Free: the most natural voice this device already has. Example agent: kept on this device only." : "Free: the most natural voice this device already has. Kept with your profile, so every device uses it."}</small>
      {err ? <small className="pf-sub warn" role="status">{err}</small> : null}
    </div>
  );
}
