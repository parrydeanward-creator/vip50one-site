import { toMin, toTime, type Busy } from "./schedule.ts";

// Tell Pulse your day (Parry, 6 Oct): "Hey Pulse, I have a dr apt this morning from 8:00-9:00. I have a one
// hour meeting with aaron at 11:00 and a lunch apt at 12:30. plan my other duties or tasks around that".
// Pulse reads the appointments, asks only what it cannot know (where the agent goes after, how long the
// drive is, whether a meeting is at the office), adds the drives, and plans the work in what is left.
// Pure: Pulse on the server reads anything (app/api/day/read); this is the local reading and the rules.

export type Where = "out" | "office" | "phone" | "unsure";

export interface Told {
  id: string;
  title: string;
  start: string; // "HH:MM"
  end: string;
  where: Where;
}

export type To = "office" | "home" | "next" | "done";
export interface Answer {
  where?: "out" | "office" | "phone";
  after?: { to: To; min: number };
}
export type Answers = Record<string, Answer>;

export interface Question {
  id: string; // the told item it is about
  kind: "where" | "after";
  text: string;
  options: { label: string; answer: Answer }[];
}

const OUT = /\b(doctor|dentist|dr|orthodontist|physio|therapy|lunch|breakfast|dinner|coffee|showing|listing|closing|inspection|appraisal|walk-?through|gym|workout|school|pick-?up|drop-?off|open house|haircut|car)\b/i;
const OFFICE = /\b(call|zoom|phone|team meeting|office|webinar|training|admin|email|desk)\b/i;
const NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, half: 0.5 };

export function classify(title: string): Where {
  if (/\b(zoom|phone|call|webinar|virtual|online)\b/i.test(title)) return "phone";
  if (OUT.test(title)) return "out";
  if (OFFICE.test(title)) return "office";
  return "unsure";
}

/** Minutes said as words: "one hour", "90 minutes", "an hour and a half", "half an hour". */
export function minutesIn(text: string): number | null {
  const t = text.toLowerCase();
  if (/half an? hour/.test(t)) return 30;
  if (/hour and a half|1\.5 hours?|one and a half hours?/.test(t)) return 90;
  const m = /\b(\d+(?:\.\d+)?|an?|one|two|three|four)[\s-]*(hours?|hrs?|minutes?|mins?)\b/.exec(t);
  if (!m) return null;
  const n = NUM[m[1]] ?? Number(m[1]);
  return /^h/.test(m[2]) ? Math.round(n * 60) : Math.round(n);
}

function defaultLength(title: string): number {
  if (/\b(showing)\b/i.test(title)) return 45;
  if (/\b(call|zoom|phone)\b/i.test(title)) return 30;
  return 60;
}

const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/** A clause's words as a title: "a lunch apt" -> "Lunch appointment", "meeting with aaron" -> "Meeting with Aaron". */
export function tidyTitle(raw: string): string {
  let t = ` ${raw} `
    .replace(/\b(dr\.?|doc)\s/gi, "doctor ")
    .replace(/\b(appt|apt)\b\.?/gi, "appointment")
    .replace(/\bmtg\b/gi, "meeting")
    .replace(/\b(hey|hi|ok|okay)\b,?\s*pulse,?/gi, " ")
    .replace(/\bpulse,?\s/gi, " ")
    .replace(/\b(i|we)\s+(also\s+|now\s+|still\s+)?(have|got|need)\b/gi, " ")
    .replace(/\b(i've got|i've|ive got|there is|there's|i am|i'm|got|also|now|add|added|new)\b/gi, " ")
    .replace(/\b(this|tomorrow|today'?s?)\s+(morning|afternoon|evening)\b/gi, " ")
    .replace(/\b(today|tonight)\b/gi, " ")
    .replace(/\b(from|form|until|till|at|for|starting|lasting|long)\s*$/gi, " ")
    .replace(/^\s*(a|an|my|the|then|and|also|plus|from|at)\s+/i, " ")
    .replace(/\s+(from|at|for|until|till|starting)\s*$/i, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  t = t.replace(/^(a|an|my|the|then|and|also)\s+/i, "").replace(/\s+(from|at|for)$/i, "");
  t = t.replace(/\bwith\s+([a-z])/gi, (_, c: string) => `with ${c.toUpperCase()}`);
  t = t.replace(/\s+(from|form|at|for)$/i, "");
  t = t.replace(/^(doctor|doctor appointment|doctor's|doctors)$/i, "Doctor's appointment").replace(/^(lunch|breakfast|dinner|coffee) appointment\b/i, "$1");
  return cap(t).slice(0, 60);
}

/** Pulse's quick reading of a day said in plain words. Clauses without a time are left out (they are
 * the asking: "plan my other duties around that"). */
export function readOverview(text: string): Told[] {
  const morning = /\bthis morning\b/i;
  const clauses = text
    .replace(/(\d)\.(\d)/g, "$1:$2")
    .split(/[.;!?\n,]+|\s+and\s+(?=(?:then\s+)?(?:a|an|my|i|then|lunch|coffee|breakfast|dinner|one|two|three|\d))|\bthen\b/i)
    .map((c) => c.trim())
    .filter(Boolean)
    // a piece with no time belongs to the next one ("Lunch with Marcus, Jen and Sam at 12")
    .reduce<string[]>((acc, c, i, all) => {
      const carry = acc.length && !/\d/.test(acc[acc.length - 1]) && !/\bplan\b/i.test(acc[acc.length - 1]) && i < all.length ? acc.pop()! + ", " : "";
      acc.push(carry + c);
      return acc;
    }, []);
  const time = String.raw`(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|noon)?`;
  const out: Told[] = [];
  for (const c of clauses) {
    if (/\bplan\b/i.test(c) && !/\d/.test(c)) continue;
    const range = new RegExp(`${time}\\s*(?:to|-|–|until|till)\\s*${time}`, "i").exec(c);
    const single = range ? null : new RegExp(`(?:at|@|from|by)?\\s*\\b${time}`, "i").exec(c);
    const m = range ?? single;
    if (!m || (!range && !/[:]|am|pm|noon|\bat\b|@/i.test(m[0]) && Number(m[1]) > 12)) continue;
    const am = morning.test(c) || /\bmorning\b/i.test(c);
    const pm = /\bafternoon|evening\b/i.test(c);
    const hour = (h: string, mm: string | undefined, ap: string | undefined, hint?: string) => {
      let x = Number(h) % 12;
      const a = (ap ?? hint ?? "").toLowerCase().replace(/\./g, "");
      if (a === "noon") return 12 * 60;
      if (a === "pm" || (!a && pm && x < 12) || (!a && !am && x >= 1 && x <= 6)) x += 12;
      if (!a && Number(h) === 12) x = 12;
      if (a === "am" && x === 12) x = 0;
      return x * 60 + Number(mm ?? 0);
    };
    let s: number, e: number;
    const dur = minutesIn(c);
    if (range) {
      e = hour(range[4], range[5], range[6]);
      s = hour(range[1], range[2], range[3] ?? range[6]);
      if (e <= s) e += 12 * 60;
    } else {
      s = hour(single![1], single![2], single![3]);
      e = s + (dur ?? defaultLength(c));
    }
    if (s < 0 || e > 24 * 60 || e <= s) continue;
    const words = c
      .replace(m[0], " ")
      .replace(/\b(\d+(?:\.\d+)?|an?|one|two|three|four|half an?)[\s-]*(hours?|hrs?|minutes?|mins?)( and a half)?\b/gi, " ")
      .replace(/\b(plan|schedule)\b.*$/i, " ");
    const title = tidyTitle(words);
    if (!title || title.length < 2) continue;
    out.push({ id: `t${out.length + 1}`, title, start: toTime(s), end: toTime(e), where: classify(title) });
  }
  return out.sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** The checks any reading must pass (Pulse on the server included): times, order, at most 12. */
export function checkTold(items: unknown): Told[] | null {
  if (!Array.isArray(items)) return null;
  const ok = /^([01]\d|2[0-3]):[0-5]\d$/;
  const out: Told[] = [];
  for (const x of items.slice(0, 12) as Record<string, unknown>[]) {
    if (!x || typeof x.title !== "string" || !x.title.trim() || typeof x.start !== "string" || typeof x.end !== "string") continue;
    if (!ok.test(x.start) || !ok.test(x.end) || x.end <= x.start) continue;
    const where: Where = x.where === "out" || x.where === "office" || x.where === "phone" ? x.where : classify(x.title);
    out.push({ id: `t${out.length + 1}`, title: cap(x.title.trim()).slice(0, 60), start: x.start, end: x.end, where });
  }
  return out.sort((a, b) => toMin(a.start) - toMin(b.start));
}

const lower = (t: string) => t.replace(/^(Doctor's|[A-Z])/, (w) => (w === "Doctor's" ? "the doctor" : w.toLowerCase()));
const whereNow = (t: Told, a: Answers): Where => a[t.id]?.where ?? t.where;

/** The next thing Pulse needs to ask, or null when it can plan. Pulse asks only what it cannot know. */
export function nextQuestion(told: Told[], answers: Answers): Question | null {
  for (let i = 0; i < told.length; i++) {
    const t = told[i];
    const a = answers[t.id] ?? {};
    if (whereNow(t, answers) === "unsure") {
      return {
        id: t.id,
        kind: "where",
        text: `Is your ${lower(t.title)} at your office or somewhere else?`,
        options: [
          { label: "At my office", answer: { where: "office" } },
          { label: "Somewhere else", answer: { where: "out" } },
          { label: "Phone or Zoom", answer: { where: "phone" } },
        ],
      };
    }
    if (whereNow(t, answers) === "out" && !a.after) {
      const next = told[i + 1];
      const opts: Question["options"] = [
        { label: "Office · 15 min", answer: { after: { to: "office", min: 15 } } },
        { label: "Office · 30 min", answer: { after: { to: "office", min: 30 } } },
        { label: "Home · 15 min", answer: { after: { to: "home", min: 15 } } },
      ];
      // a short gap before the next appointment: going straight there comes first
      if (next && toMin(next.start) - toMin(t.end) <= 120) {
        const straight = { label: `Straight to ${lower(next.title)} · 15 min`, answer: { after: { to: "next" as To, min: 15 } } };
        if (toMin(next.start) - toMin(t.end) <= 60) opts.unshift(straight);
        else opts.push(straight);
      }
      if (!next || toMin(t.end) >= 15 * 60) opts.push({ label: "Done for the day", answer: { after: { to: "done", min: 0 } } });
      return { id: t.id, kind: "after", text: `Where are you headed after ${t.title === "Doctor's appointment" ? "the doctor" : `your ${lower(t.title)}`}, and how long is the drive?`, options: opts };
    }
  }
  return null;
}

/** A spoken or typed answer to a question. Null when Pulse cannot tell. */
export function readReply(q: Question, text: string): Answer | null {
  const t = text.toLowerCase();
  if (q.kind === "where") {
    if (/\b(zoom|phone|call|virtual|online|teams)\b/.test(t)) return { where: "phone" };
    if (/\b(office|here|in house|in-house|my desk|brokerage)\b/.test(t)) return { where: "office" };
    if (/\b(else|out|their|his|her|restaurant|cafe|somewhere|away|offsite|off site)\b/.test(t)) return { where: "out" };
    return null;
  }
  if (/\b(done|finished|that's it|call it a day|end of (the )?day)\b/.test(t)) return { after: { to: "done", min: 0 } };
  const to: To | null = /\b(straight|next|directly|right to)\b/.test(t) ? "next" : /\b(office|work|desk|brokerage)\b/.test(t) ? "office" : /\b(home|house)\b/.test(t) ? "home" : null;
  const min = minutesIn(t) ?? (/\b(\d{1,3})\b/.test(t) ? Number(/\b(\d{1,3})\b/.exec(t)![1]) : null) ?? (/\bquarter\b/.test(t) ? 15 : null);
  if (!to || min == null || min > 180) return null;
  return { after: { to, min } };
}

/** The appointments as busy time, and the drives Pulse adds round them. The first thing of the day is
 * left for from home; a drive never runs into another appointment. */
export function toldBusy(told: Told[], answers: Answers, dayStart: string): Busy[] {
  const busy: Busy[] = told.map((t) => ({ start: t.start, end: t.end, title: t.title, source: "fixed" as const }));
  const drives: Busy[] = [];
  const taken = (s: number, e: number) => told.some((x) => toMin(x.start) < e && s < toMin(x.end));
  told.forEach((t, i) => {
    if (whereNow(t, answers) !== "out") return;
    const after = answers[t.id]?.after;
    const prev = told[i - 1];
    const fromPrev = prev && whereNow(prev, answers) === "out" && answers[prev.id]?.after?.to === "next";
    // getting there: the same drive as coming back, unless the day starts with it or the drive before covers it
    const there = after && after.to !== "done" && after.min ? after.min : 15;
    if (!fromPrev && toMin(t.start) > toMin(dayStart)) {
      let s = toMin(t.start) - there;
      while (s < toMin(t.start) && taken(s, s + 1)) s++;
      if (toMin(t.start) - s >= 5) drives.push({ start: toTime(s), end: t.start, title: `Drive to ${lower(t.title)}`, source: "travel" });
    }
    if (after && after.to !== "done" && after.min > 0) {
      let e = toMin(t.end) + after.min;
      while (e > toMin(t.end) && taken(e - 1, e)) e--;
      const next = told[i + 1];
      const to = after.to === "office" ? "Drive to the office" : after.to === "home" ? "Drive home" : `Drive to ${next ? lower(next.title) : "your next stop"}`;
      if (e - toMin(t.end) >= 5) drives.push({ start: t.end, end: toTime(e), title: to, source: "travel" });
    }
  });
  return [...busy, ...drives].sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** Does a question to Pulse sound like the agent telling it their day? (Ask Pulse sends it to the Day Clock.) */
export const soundsLikeDay = (q: string) => /\b(plan|schedule|around)\b/i.test(q) && (q.match(/\d{1,2}(:\d{2})?\s*(am|pm)?/gi) ?? []).length >= 1 && /\b(appointment|apt|appt|meeting|lunch|coffee|doctor|dr|showing|call|have)\b/i.test(q);

// ---- the 12-hour face: morning inside, afternoon outside (Parry, 6 Oct: "have a morning and afternoon
// on the same clock") ----------------------------------------------------------------------------------

/** Radians clockwise from 12 o'clock for a time on a 12-hour face. */
export const faceAngle = (m: number) => ((((m % 720) + 720) % 720) / 720) * Math.PI * 2;

/** A stretch of time as arcs: one on the morning ring, one on the afternoon ring when it crosses noon. */
export function faceArcs(start: string | number, end: string | number): { pm: boolean; a1: number; a2: number }[] {
  const s = typeof start === "number" ? start : toMin(start);
  const e = typeof end === "number" ? end : toMin(end);
  const out: { pm: boolean; a1: number; a2: number }[] = [];
  const cut = (lo: number, hi: number, pm: boolean) => {
    const a = Math.max(s, lo), b = Math.min(e, hi);
    if (b > a) out.push({ pm, a1: faceAngle(a), a2: b - lo === 720 ? Math.PI * 2 : faceAngle(b) });
  };
  cut(0, 720, false);
  cut(720, 1440, true);
  return out;
}

/** The time at a point on the face, to the quarter hour: the inner ring is morning, the outer afternoon. */
export function faceTimeAt(x: number, y: number, cx: number, cy: number, split: number): string {
  let a = Math.atan2(x - cx, cy - y);
  if (a < 0) a += Math.PI * 2;
  const pm = Math.hypot(x - cx, y - cy) > split;
  const m = Math.round(((a / (Math.PI * 2)) * 720) / 15) * 15;
  return toTime(Math.min(1425, (m % 720) + (pm ? 720 : 0)));
}

// ---- telling Pulse more later in the day (Parry, 6 Oct: "later in the day if I need to add or adjust then
// pulse will act accordingly") -------------------------------------------------------------------------

const STOP = new Set(["appointment", "appt", "apt", "meeting", "with", "the", "my", "a", "an", "at", "to", "for", "and", "of", "in", "on"]);
/** The words that name a thing ("Meeting with Aaron" -> aaron), for matching what the agent tells Pulse later. */
export function keyWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/'s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}
const same = (a: Told, b: Told) => {
  const ka = keyWords(a.title), kb = new Set(keyWords(b.title));
  return ka.length > 0 && ka.some((w) => kb.has(w));
};
const CANCEL = /\b(cancel+ed|cancel|no longer|not happening|called off|remove|delete|drop|skip|scratch)\b/i;

/** The day after the agent tells Pulse more: a new time for something already told moves it, a cancelled one
 * goes, anything else is added. What was told before and not mentioned stays. Pulse on the server does the
 * same with any wording; this is the local reading. */
export function mergeTold(current: Told[], text: string): Told[] {
  const out = current.map((t) => ({ ...t }));
  // cancellations: "cancel the meeting with Aaron", "lunch is cancelled"
  for (const clause of text.split(/[.;!?\n,]+|\s+and\s+/i)) {
    if (!CANCEL.test(clause)) continue;
    const words = new Set(keyWords(clause));
    for (let i = out.length - 1; i >= 0; i--) if (keyWords(out[i].title).some((w) => words.has(w))) out.splice(i, 1);
  }
  let n = Math.max(0, ...current.map((t) => Number(t.id.replace(/\D/g, "")) || 0));
  for (const t of readOverview(text.split(/[.;!?\n,]+|\s+and\s+/i).filter((c) => !CANCEL.test(c)).join(". "))) {
    const k = out.findIndex((x) => same(x, t));
    if (k >= 0) out[k] = { ...out[k], start: t.start, end: t.end };
    else out.push({ ...t, id: `t${++n}` });
  }
  return out.sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** Answers already given stay with the same appointment (matched by id, else by name); a moved appointment
 * keeps where it is and the drive after it. */
export function carryAnswers(prev: Told[], answers: Answers, next: Told[]): Answers {
  const out: Answers = {};
  for (const t of next) {
    const old = prev.find((p) => p.id === t.id && same(p, t)) ?? prev.find((p) => same(p, t));
    if (old && answers[old.id]) out[t.id] = answers[old.id];
  }
  return out;
}
