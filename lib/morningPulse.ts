import { MOVE_URL } from "./host.ts";
import { OPP_NODE } from "./opportunities.ts";
import { LEADS_NODE } from "./newLeads.ts";
import { HEAT_NODE } from "./heat.ts";
import { DEALS_NODE } from "./deals.ts";
import { REFERRALS_NODE } from "./referrals.ts";
import { HOME_REPORTS_PATH } from "./homeReport.ts";
import { moveGroupId, movePageId } from "./moveMenu.ts";

// Morning Pulse (Parry, 16 Oct 21:14 MT: "yes"; 21:11: "watch pulse work is confusing and doesnt show really anything"):
// one voiced minute over the live graph that replaces "Watch Pulse work", "Watch ONE Work" and the note's Listen. What
// changed since yesterday (the camera flies to each orb as it is named), the three that matter today and why (a face and
// a button each), what Pulse got ready, then the plan with Looks good. After 5 pm Denver: how today went, then tomorrow.
// The words come from ONE MOVE's GET /api/brain/morning (GO/MOVE); this file turns that answer into beats. Pure.

export const morningUrl = `${MOVE_URL}/api/brain/morning`;
export const eveningUrl = `${MOVE_URL}/api/brain/morning?evening=1`;

export type OrbKey = "leads" | "looks_hot" | "deals" | "market_reports" | "referrals" | "events";
export type SinceKind = "new_lead" | "looks_hot" | "rsvp" | "deadline" | "market_report" | "referral";
export type Tool = "call" | "deal" | "task";
export type ReadyKind = "text_draft" | "newsletter" | "follow_up";

export interface Since { kind: SinceKind; count: number; firstNames: string[]; orb: OrbKey | null }
export interface Top { contactId: string; firstName: string; photoUrl: string | null; reason: string; tool: Tool }
export interface Ready { kind: ReadyKind; count: number }
export interface Sent { worker: string; count: number }
export interface Morning { since: Since[]; top3: Top[]; ready: Ready[]; autopilotSent: Sent[] }
export interface Evening { done: number; moved: number; wins: string[]; tomorrowTop3: Top[] }

/** The products a Morning Pulse speaks for, by the names agents see on the desktop (ONE YOU, never ONE GO). */
export const MP_PRODUCTS = ["ONE YOU", "ONE MOVE", "Marquee", "ONE Open", "Showly", "ONE Growth"] as const;
export type MpProduct = (typeof MP_PRODUCTS)[number];

/** The graph orbs each route orb name may be, best first (the first one on the agent's graph is used). */
export const ORB_IDS: Record<OrbKey, string[]> = {
  leads: [OPP_NODE, LEADS_NODE],
  looks_hot: [OPP_NODE, HEAT_NODE],
  deals: [DEALS_NODE],
  market_reports: [movePageId(HOME_REPORTS_PATH), moveGroupId("outreach")],
  referrals: [REFERRALS_NODE],
  events: [moveGroupId("events")],
};
export function orbFor(key: OrbKey | null, has: (id: string) => boolean): string | null {
  if (!key) return null;
  return ORB_IDS[key].find(has) ?? null;
}

// ---- reading the route ----------------------------------------------------------------------------------------------

const SINCE_KINDS: readonly SinceKind[] = ["new_lead", "looks_hot", "rsvp", "deadline", "market_report", "referral"];
const ORB_KEYS: readonly OrbKey[] = ["leads", "looks_hot", "deals", "market_reports", "referrals", "events"];
const TOOLS: readonly Tool[] = ["call", "deal", "task"];
const READY_KINDS: readonly ReadyKind[] = ["text_draft", "newsletter", "follow_up"];
/** The orb a kind belongs on when the route leaves it out. */
const KIND_ORB: Record<SinceKind, OrbKey> = { new_lead: "leads", looks_hot: "looks_hot", rsvp: "events", deadline: "deals", market_report: "market_reports", referral: "referrals" };

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const text = (v: unknown, max = 200): string | null => {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
};
const https = (v: unknown): string | null => (typeof v === "string" && /^https:\/\/\S+$/.test(v) ? v : null);

function readTop(raw: unknown): Top | null {
  const o = obj(raw);
  if (!o) return null;
  const contactId = text(o.contact_id, 80);
  const firstName = text(o.first_name, 40);
  const reason = text(o.reason_plain, 240);
  if (!contactId || !firstName || !reason) return null;
  const tool = TOOLS.includes(o.tool as Tool) ? (o.tool as Tool) : "call";
  return { contactId, firstName, photoUrl: https(o.photo_url), reason, tool };
}

/** GET /api/brain/morning, checked; null when it is not that answer (the Brain then says less from what it knows). */
export function readMorning(raw: unknown): Morning | null {
  const o = obj(raw);
  if (!o || !("since_yesterday" in o || "top3" in o)) return null;
  const since: Since[] = [];
  for (const r of arr(o.since_yesterday)) {
    const s = obj(r);
    if (!s || !SINCE_KINDS.includes(s.kind as SinceKind)) continue;
    const n = count(s.count);
    if (!n) continue;
    const kind = s.kind as SinceKind;
    const firstNames = arr(s.first_names).map((x) => text(x, 40)).filter((x): x is string => !!x).slice(0, 3);
    const orb = ORB_KEYS.includes(s.orb as OrbKey) ? (s.orb as OrbKey) : KIND_ORB[kind];
    since.push({ kind, count: n, firstNames, orb });
  }
  const top3 = arr(o.top3).map(readTop).filter((t): t is Top => !!t).slice(0, 3);
  const ready: Ready[] = [];
  for (const r of arr(o.ready)) {
    const x = obj(r);
    if (x && READY_KINDS.includes(x.kind as ReadyKind) && count(x.count)) ready.push({ kind: x.kind as ReadyKind, count: count(x.count) });
  }
  const autopilotSent: Sent[] = [];
  for (const r of arr(o.autopilot_sent)) {
    const x = obj(r);
    const worker = x ? text(x.worker, 60) : null;
    if (x && worker && count(x.count)) autopilotSent.push({ worker, count: count(x.count) });
  }
  return { since, top3, ready, autopilotSent };
}

/** GET /api/brain/morning?evening=1, checked; null when it is not that answer. */
export function readEvening(raw: unknown): Evening | null {
  const o = obj(raw);
  if (!o || !("done" in o || "tomorrow_top3" in o)) return null;
  const wins = arr(o.wins)
    .map((w) => text(w, 160) ?? (obj(w) ? text(obj(w)!.text, 160) ?? text(obj(w)!.title, 160) ?? text(obj(w)!.what, 160) : null))
    .filter((w): w is string => !!w)
    .slice(0, 3);
  return { done: count(o.done), moved: count(o.moved), wins, tomorrowTop3: arr(o.tomorrow_top3).map(readTop).filter((t): t is Top => !!t).slice(0, 3) };
}

// ---- the example agent (?demo=1): invented people, labelled "Example" on screen -----------------------------------

export function demoMorning(): Morning {
  return {
    since: [
      { kind: "new_lead", count: 2, firstNames: ["Rosa", "Ken"], orb: "leads" },
      { kind: "deadline", count: 1, firstNames: ["Ken"], orb: "deals" },
    ],
    top3: [
      { contactId: "demo-rosa", firstName: "Rosa", photoUrl: null, reason: "She asked about homes near Draper Park last night and has not heard back yet.", tool: "call" },
      { contactId: "demo-ken", firstName: "Ken", photoUrl: null, reason: "His inspection deadline is Thursday, and the repair list is still open.", tool: "deal" },
      { contactId: "demo-jen", firstName: "Jen", photoUrl: null, reason: "It's her birthday today, and she is one of your VIP-50.", tool: "task" },
    ],
    ready: [
      { kind: "text_draft", count: 3 },
      { kind: "newsletter", count: 1 },
    ],
    autopilotSent: [],
  };
}
export function demoEvening(): Evening {
  return {
    done: 7,
    moved: 2,
    wins: ["Rosa booked a showing for Saturday"],
    tomorrowTop3: [
      { contactId: "demo-ken", firstName: "Ken", photoUrl: null, reason: "His inspection deadline is tomorrow.", tool: "deal" },
      { contactId: "demo-amy", firstName: "Amy", photoUrl: null, reason: "You promised her a call back about pricing.", tool: "call" },
    ],
  };
}

// ---- the script -----------------------------------------------------------------------------------------------------

export type BeatPart = "hello" | "since" | "top" | "ready" | "away" | "plan" | "recap" | "tomorrow";
export interface Face { name: string; photo: string | null; initials: string }
export interface BeatTool { kind: Tool; contactId: string; label: string }
export interface Beat {
  id: string;
  part: BeatPart;
  /** The small line above the caption ("What changed", "1 of 3"). */
  kicker: string;
  /** Exactly what Pulse says; the caption shows these words. */
  words: string;
  /** The route's orb name to fly to and pulse, or null to stay where the camera is. */
  orb: OrbKey | null;
  /** "home": back to the whole view. */
  home?: boolean;
  face: Face | null;
  tool: BeatTool | null;
  product: MpProduct | null;
  /** How long the caption holds with the sound off (and the least it holds with sound). */
  ms: number;
}

/** What the Brain already knows, for when the route does not answer: today's plan and the top needs. */
export interface Known {
  planCount: number;
  needs: { label: string; why: string | null }[];
}

export interface ScriptInput {
  firstName: string;
  /** "Good morning" / "Good evening"; the agent's own day (Mountain time for now). */
  greeting: string;
  evening: boolean;
  morning: Morning | null;
  eveningAnswer: Evening | null;
  known: Known;
  /** The plan is already approved today (Looks good was tapped). */
  approved?: boolean;
}

const msFor = (words: string) => Math.max(2600, Math.round(words.split(/\s+/).length * 400));

/** "Rosa", "Rosa and Ken", "Rosa, Ken and Amy". */
export function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** One sentence for one change since yesterday. */
export function sinceSentence(s: Since): string {
  const n = s.count;
  const names = s.firstNames.slice(0, 3);
  // the names after a colon when they are all of them; "including" when there are more than the names given
  const who = names.length ? (names.length >= n ? `: ${nameList(names)}` : `, including ${nameList(names)}`) : "";
  switch (s.kind) {
    case "new_lead":
      return `${n} new ${plural(n, "lead", "leads")} came in${who}.`;
    case "looks_hot":
      return n === 1 && names.length ? `${names[0]} looks hot.` : `${n} ${plural(n, "person looks", "people look")} hot${who}.`;
    case "rsvp":
      return `${n} ${plural(n, "person", "people")} said yes to your event${who}.`;
    case "deadline":
      return n === 1 && names.length ? `A deal deadline is coming up, for ${names[0]}.` : `${n} deal ${plural(n, "deadline is", "deadlines are")} coming up${who}.`;
    case "market_report":
      return `${n} market ${plural(n, "report is", "reports are")} ready${who ? ` for ${nameList(names)}` : ""}.`;
    case "referral":
      return `${n} new ${plural(n, "referral", "referrals")} came in${who}.`;
  }
}

const READY_WORDS: Record<ReadyKind, (n: number) => string> = {
  text_draft: (n) => `${n} ${plural(n, "text is", "texts are")} waiting on your phone`,
  newsletter: (n) => (n === 1 ? "your newsletter draft is ready" : `${n} newsletter drafts are ready`),
  follow_up: (n) => `${n} ${plural(n, "follow-up is", "follow-ups are")} written for you to send`,
};
/** "3 texts are waiting on your phone; your newsletter draft is ready." */
export function readySentence(ready: Ready[]): string | null {
  if (!ready.length) return null;
  const s = ready.map((r) => READY_WORDS[r.kind](r.count)).join("; ");
  return `${s[0].toUpperCase()}${s.slice(1)}.`;
}

const workerName = (w: string) => w.replace(/[_-]+/g, " ").trim().toLowerCase();
/** "While you were away I sent 4 messages for speed to lead and 2 for seller signals." */
export function awaySentence(sent: Sent[]): string | null {
  if (!sent.length) return null;
  const parts = sent.map((s, i) => `${s.count}${i === 0 ? ` ${plural(s.count, "message", "messages")}` : ""} for ${workerName(s.worker)}`);
  return `While you were away I sent ${nameList(parts)}.`;
}

const ORDINAL = ["First", "Next", "And"];
const toolLabel = (t: Top): string => (t.tool === "call" ? `Call ${t.firstName}` : t.tool === "deal" ? "Open Deals" : "Open the task");
const faceOf = (t: Top): Face => ({ name: t.firstName, photo: t.photoUrl, initials: t.firstName.slice(0, 1).toUpperCase() });
const SINCE_PRODUCT: Record<SinceKind, MpProduct> = { new_lead: "ONE MOVE", looks_hot: "ONE MOVE", rsvp: "ONE MOVE", deadline: "ONE MOVE", market_report: "ONE MOVE", referral: "ONE YOU" };

function beat(b: Omit<Beat, "ms" | "face" | "tool" | "orb" | "product"> & Partial<Pick<Beat, "face" | "tool" | "orb" | "product">>): Beat {
  return { face: null, tool: null, orb: null, product: null, ...b, ms: msFor(b.words) };
}

function topBeats(tops: Top[], prefix: string, kicker: string): Beat[] {
  return tops.map((t, i) =>
    beat({
      id: `${prefix}-${i}`,
      part: prefix === "tomorrow" ? "tomorrow" : "top",
      kicker: `${kicker} · ${i + 1} of ${tops.length}`,
      words: `${ORDINAL[Math.min(i, 2)]}, ${t.firstName}. ${/[.!?]$/.test(t.reason) ? t.reason : `${t.reason}.`}`,
      face: faceOf(t),
      tool: { kind: t.tool, contactId: t.contactId, label: toolLabel(t) },
      orb: t.tool === "deal" ? "deals" : null,
      product: "ONE MOVE",
    }),
  );
}

/**
 * The Morning Pulse script: the route's answer as a list of beats, each with its words, the orb to fly to and the face
 * to show. Never empty: without the route it says less, from what the Brain already knows, and still ends on the plan.
 */
export function buildMorningPulse(input: ScriptInput): Beat[] {
  const first = input.firstName.trim();
  const hi = `${input.greeting}${first ? `, ${first}` : ""}.`;
  const out: Beat[] = [];

  if (input.evening) {
    const e = input.eveningAnswer;
    out.push(beat({ id: "hello", part: "hello", kicker: "Morning Pulse · this evening", words: `${hi} Here's how today went.`, home: true, product: "ONE YOU" }));
    if (e) {
      const moved = e.moved ? ` ${e.moved} ${plural(e.moved, "thing moves", "things move")} to tomorrow.` : " Nothing moves to tomorrow.";
      out.push(beat({ id: "recap", part: "recap", kicker: "How today went", words: `You got ${e.done} ${plural(e.done, "thing", "things")} done.${moved}`, product: "ONE YOU" }));
      if (e.wins.length) out.push(beat({ id: "wins", part: "recap", kicker: "Today's wins", words: `${e.wins.length === 1 ? "Your win today" : "Your wins today"}: ${e.wins.map((w) => w.replace(/[.!?]+$/, "")).join("; ")}.`, product: "ONE YOU" }));
      if (e.tomorrowTop3.length) {
        out.push(beat({ id: "tomorrow", part: "tomorrow", kicker: "Here's tomorrow", words: `Here's tomorrow: ${e.tomorrowTop3.length === 1 ? "the one thing that matters most" : `the ${e.tomorrowTop3.length} things that matter most`}.` }));
        out.push(...topBeats(e.tomorrowTop3, "tomorrow", "Tomorrow"));
      }
    } else {
      const n = input.known.planCount;
      out.push(beat({ id: "recap", part: "recap", kicker: "How today went", words: n ? `Today's plan had ${n} ${plural(n, "thing", "things")} in it. Tick what you finished and the rest moves to tomorrow.` : "I can't reach today's numbers just now.", product: "ONE YOU" }));
    }
    out.push(beat({ id: "plan", part: "plan", kicker: "Plan my day", words: "Tomorrow's plan is in Plan my day. Look it over when you're ready.", home: true, product: "ONE YOU" }));
    return out;
  }

  const m = input.morning;
  out.push(
    beat({
      id: "hello",
      part: "hello",
      kicker: "Morning Pulse",
      words: m ? `${hi} Here's your Morning Pulse: what changed, what matters today, and what I got ready.` : `${hi} Here's your Morning Pulse.`,
      home: true,
    }),
  );
  if (m) {
    if (m.since.length) {
      m.since.forEach((s, i) => out.push(beat({ id: `since-${i}`, part: "since", kicker: "Since yesterday", words: sinceSentence(s), orb: s.orb, product: SINCE_PRODUCT[s.kind] })));
    } else {
      out.push(beat({ id: "since-0", part: "since", kicker: "Since yesterday", words: "Nothing new came in since yesterday." }));
    }
    if (m.top3.length) {
      out.push(beat({ id: "top", part: "top", kicker: "What matters today", words: m.top3.length === 1 ? "Here's the most important thing today, and why." : `Here are the ${m.top3.length} most important things today, and why.`, home: true }));
      out.push(...topBeats(m.top3, "top", "Today"));
    }
    const ready = readySentence(m.ready);
    if (ready) out.push(beat({ id: "ready", part: "ready", kicker: "What I got ready", words: ready }));
    const away = awaySentence(m.autopilotSent);
    if (away) out.push(beat({ id: "away", part: "away", kicker: "Autopilot", words: away, product: "ONE Growth" }));
  } else {
    // The route did not answer: say less, from the Brain's own needs.
    const needs = input.known.needs.slice(0, 3);
    if (needs.length) {
      out.push(beat({ id: "top", part: "top", kicker: "What matters today", words: `${needs.length === 1 ? "One thing needs you" : `${needs.length} things need you`} today.`, home: true }));
      needs.forEach((n, i) =>
        out.push(beat({ id: `top-${i}`, part: "top", kicker: `Today · ${i + 1} of ${needs.length}`, words: `${ORDINAL[Math.min(i, 2)]}, ${n.label.replace(/[.!?]+$/, "")}.${n.why ? ` ${/[.!?]$/.test(n.why) ? n.why : `${n.why}.`}` : ""}` })),
      );
    }
  }
  const n = input.known.planCount;
  out.push(
    beat({
      id: "plan",
      part: "plan",
      kicker: "Plan my day",
      words: input.approved
        ? "Your plan for today is approved. Here it is."
        : n
          ? `Here's your plan: ${n} ${plural(n, "thing", "things")} round your calendar. Tap Looks good to approve your day.`
          : "Open Plan my day and I'll plan today round your calendar. Then tap Looks good.",
      home: true,
      product: "ONE YOU",
    }),
  );
  return out;
}

/** How long the whole script holds with the sound off, in ms (about a minute for a full morning). */
export const scriptMs = (beats: Beat[]) => beats.reduce((t, b) => t + b.ms, 0);

/** The Morning Pulse offer shows once a day on the morning note (this browser). */
export const OFFER_KEY = "one.morningPulse";
