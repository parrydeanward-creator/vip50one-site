import type { CallPrep } from "./callPrep.ts";

// Pulse Drafts (PULSE-ROADMAP #2): Pulse writes one touch for one person, in the agent's plain voice, from the facts
// Call Prep already holds; the agent edits it and sends it from their own phone or mail (Parry, 8 Oct: texts go from
// the agent's own phone). Nothing is ever sent by Pulse. Every draft passes the FAIR-HOUSING.md §1 words check
// before the agent sees it; the list moves to MASTER's `fair_housing_terms` when GO/MOVE serves it.

export type DraftKind = "text" | "email" | "video_text" | "note";
export const DRAFT_KINDS: DraftKind[] = ["text", "email", "video_text", "note"];
export const DRAFT_LABEL: Record<DraftKind, string> = { text: "Text", email: "Email", video_text: "Video text script", note: "Handwritten note" };
export const isDraftKind = (v: unknown): v is DraftKind => typeof v === "string" && (DRAFT_KINDS as string[]).includes(v);
/** Longest body the agent gets for each kind (a text that fits one or two bubbles, a note that fits a card). */
export const MAX_CHARS: Record<DraftKind, number> = { text: 320, email: 1200, video_text: 700, note: 420 };

export interface DraftFacts {
  first: string;
  lastTalk: string | null;
  family: string[];
  favourites: string[];
  comingUp: string[];
  openItems: string[];
}
export interface Draft {
  kind: DraftKind;
  subject: string | null;
  body: string;
  flags: string[];
  source: "pulse" | "rules";
}

const clip = (s: string, n: number) => s.trim().slice(0, n);
const clipAll = (xs: unknown, n: number, each = 120) => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, n).map((x) => clip(x, each)) : []);

/** The facts sent to the server: Call Prep's lines only, trimmed; never notes, phone numbers or emails. */
export function factsFrom(p: CallPrep): DraftFacts {
  return { first: clip(p.first || p.name, 40), lastTalk: p.lastTalk ? clip(p.lastTalk, 160) : null, family: p.family.slice(0, 4), favourites: p.favourites.slice(0, 6), comingUp: p.comingUp.slice(0, 3), openItems: p.openItems.slice(0, 3) };
}

/** The request body, checked on the server; null when it is not one. */
export function readDraftRequest(j: unknown): { kind: DraftKind; facts: DraftFacts; agentFirst: string | null; ask: string | null } | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const f = (r.facts && typeof r.facts === "object" ? r.facts : null) as Record<string, unknown> | null;
  if (!isDraftKind(r.kind) || !f || typeof f.first !== "string" || !f.first.trim()) return null;
  return {
    kind: r.kind,
    facts: {
      first: clip(f.first, 40),
      lastTalk: typeof f.lastTalk === "string" && f.lastTalk.trim() ? clip(f.lastTalk, 160) : null,
      family: clipAll(f.family, 4),
      favourites: clipAll(f.favourites, 6),
      comingUp: clipAll(f.comingUp, 3),
      openItems: clipAll(f.openItems, 3),
    },
    agentFirst: typeof r.agentFirst === "string" && r.agentFirst.trim() ? clip(r.agentFirst, 40) : null,
    ask: typeof r.ask === "string" && r.ask.trim() ? clip(r.ask, 200) : null,
  };
}

// FAIR-HOUSING.md §1, the words Pulse never writes (v0.1, 8 Oct). Kept equal to the contract until MASTER serves it.
const FH_TERMS: [RegExp, string][] = [
  [/\bperfect for (a )?famil(y|ies)\b|\bfamily[- ]friendly\b/i, "Describes who the home suits (families)"],
  [/\byoung professionals?\b|\bretirees?\b|\bempty[- ]nesters?\b|\bbachelor pad\b|\badults? only\b|\bno kids\b/i, "Describes who the home suits"],
  [/\b(close to|near) (the )?(church|churches|synagogue|temple|mosque)\b|\bchristian (neighbou?rhood|area|community)\b/i, "Mentions religion"],
  [/\bsafe (neighbou?rhood|area|street)\b|\bexclusive\b|\bestablished neighbou?rhood\b|\btraditional neighbou?rhood\b|\bgood area\b|\bup[- ]and[- ]coming\b|\bdesirable (area|neighbou?rhood)\b/i, "Uses a coded area word"],
  [/\bhandicapped\b|\bnot suitable for wheelchairs?\b/i, "Describes the buyer, not the feature"],
  [/\bno section 8\b|\bno vouchers?\b|\bcash only\b/i, "Turns away a lawful source of income"],
];
/** FAIR-HOUSING.md §1: a plain reason for each hit, none when clean. */
export function fairHousingFlags(text: string): string[] {
  return [...new Set(FH_TERMS.filter(([re]) => re.test(text)).map(([, why]) => why))];
}

/** The plain-rules draft, when Pulse's model is not available: short, true, from the facts only. */
export function rulesDraft(kind: DraftKind, f: DraftFacts, agentFirst: string | null): Draft {
  const hook = f.comingUp[0]
    ? f.comingUp[0].replace(/^Birthday/, "your birthday").replace(/^Anniversary/, "your anniversary").replace(/ in \d+ days?.*$| today.*$| tomorrow.*$/, " is coming up")
    : null;
  const fav = f.favourites[0]?.split(": ")[1] ?? null;
  const sign = agentFirst ? `\n${agentFirst}` : "";
  const line = hook ? `I saw ${hook} and wanted to say I'm thinking of you.` : "You crossed my mind today and I wanted to check in.";
  const extra = fav ? ` Still a ${fav} fan?` : "";
  let subject: string | null = null;
  let body: string;
  if (kind === "text") body = `Hi ${f.first}, ${line}${extra} How are you doing?`;
  else if (kind === "email") {
    subject = hook ? `Thinking of you, ${f.first}` : `Checking in, ${f.first}`;
    body = `Hi ${f.first},\n\n${line}${extra} I'd love to hear how things are going with you and yours.\n\nIf there is ever anything I can do for you, or anyone you know, I'm here.${sign ? `\n${sign}` : ""}`;
  } else if (kind === "video_text") body = `Hey ${f.first}! ${line}${extra} Nothing needed, I just wanted you to see my face and know I'm grateful for you. Talk soon.`;
  else body = `${f.first},\n${line} I'm grateful to have you in my life.${sign}`;
  body = body.slice(0, MAX_CHARS[kind]);
  return { kind, subject, body, flags: fairHousingFlags(`${subject ?? ""} ${body}`), source: "rules" };
}

/** sms: and mailto: links with the draft filled in; the agent's phone or mail does the sending. */
export function smsHref(phone: string, body: string, ios: boolean): string {
  return `sms:${phone}${ios ? "&" : "?"}body=${encodeURIComponent(body)}`;
}
export function mailHref(email: string, subject: string | null, body: string): string {
  const q = [subject ? `subject=${encodeURIComponent(subject)}` : null, `body=${encodeURIComponent(body)}`].filter(Boolean).join("&");
  return `mailto:${email}?${q}`;
}
