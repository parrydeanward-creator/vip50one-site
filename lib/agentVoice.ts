import { MOVE_URL } from "./host.ts";

// PROFILE.md §5c "Pulse knows me" (v1.8, agreed 16 Oct; Parry: "yes on pulse knows me"). How the agent sounds, kept
// once in MASTER (`agent_voice`) and read by every product's Pulse as style, never as facts or instructions. ONE MOVE's
// routes (vip50-web-crm#273) read and write it; the Brain shows the card in My Profile and asks. Nothing is saved
// before the agent taps Save, and the interview route saves nothing at all. Private: only the agent, and Pulse working
// for them, ever read it.

export const voiceUrl = `${MOVE_URL}/api/brain/voice`;
export const forgetUrl = (id: string) => `${voiceUrl}?id=${encodeURIComponent(id)}`;
export const interviewUrl = `${voiceUrl}/interview`;
export const learnUrl = `${voiceUrl}/learn`;

export const VOICE_FIELDS = ["sample", "never_say", "known_for", "serves", "sign_off"] as const;
export type VoiceField = (typeof VOICE_FIELDS)[number];
export type Voice = Record<VoiceField, string>;

/** §5c.1 sizes (M9): at or under Marquee's, so nothing copied is cut. */
export const VOICE_LIMITS: Record<VoiceField, number> = { sample: 12000, never_say: 6000, known_for: 6000, serves: 4000, sign_off: 300 };

export const VOICE_LABELS: Record<VoiceField, string> = {
  sample: "How you write (paste something you wrote)",
  never_say: "Words you never use",
  known_for: "What you are known for",
  serves: "Who you love working with",
  sign_off: "How you sign off",
};
export const VOICE_HINTS: Partial<Record<VoiceField, string>> = {
  sample: "Writing you produced yourself: a text, an email, a post. Not words about how you write.",
  never_say: "One per line.",
  known_for: "What people actually hire you for, so Pulse never makes it up.",
  serves: "By life stage and need, never by who people are (fair housing).",
};

/** The interview (§5c.2), used when ONE MOVE's answer has no questions; the route's own list is preferred. */
export const INTERVIEW = [
  "How would you invite a past client to your client party? Say it the way you would text it.",
  "How do you open a call with someone you have not talked to in a while?",
  "What words or phrases would you never use with a client?",
  "What do people hire you for? What do they say about you?",
  "Who do you love working with? Think life stage and what they need, not who they are.",
  "How do you usually end a text or an email?",
];

export const EMPTY_VOICE: Voice = { sample: "", never_say: "", known_for: "", serves: "", sign_off: "" };

export interface Learned { id: string; body: string; source: string; createdAt: string | null }
export interface VoiceState {
  voice: Voice;
  learnOn: boolean;
  updatedAt: string | null;
  learned: Learned[];
  questions: string[];
}

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** The five fields, each a string cut to its size; anything missing or not text is empty. */
export function readVoice(v: unknown): Voice {
  const r = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  return Object.fromEntries(VOICE_FIELDS.map((f) => [f, typeof r[f] === "string" ? (r[f] as string).slice(0, VOICE_LIMITS[f]) : ""])) as Voice;
}

/** GET /api/brain/voice, checked; null when it is not one. The switch is on unless it says false (on by default). */
export function readVoiceState(j: unknown): VoiceState | null {
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const r = j as Record<string, unknown>;
  if (!r.voice || typeof r.voice !== "object") return null;
  const learned: Learned[] = Array.isArray(r.learned)
    ? (r.learned as unknown[]).flatMap((x) => {
        if (!x || typeof x !== "object") return [];
        const o = x as Record<string, unknown>;
        const id = str(o.id, 80), body = str(o.body, 2200);
        return id && body ? [{ id, body, source: str(o.source, 60) ?? "", createdAt: str(o.created_at, 40) }] : [];
      }).slice(0, 20)
    : [];
  const questions = Array.isArray(r.questions) ? (r.questions as unknown[]).map((q) => str(q, 300)).filter((q): q is string => !!q).slice(0, 10) : [];
  return {
    voice: readVoice(r.voice),
    learnOn: r.learn_on !== false,
    updatedAt: str(r.updated_at, 40),
    learned,
    questions: questions.length ? questions : INTERVIEW,
  };
}

/** The Save body: every field trimmed and cut to size (ONE MOVE clamps too). */
export function saveBody(v: Voice): Voice {
  return Object.fromEntries(VOICE_FIELDS.map((f) => [f, (v[f] ?? "").trim().slice(0, VOICE_LIMITS[f])])) as Voice;
}

export const voiceChanged = (a: Voice, b: Voice) => VOICE_FIELDS.some((f) => (a[f] ?? "").trim() !== (b[f] ?? "").trim());

/** The interview body: each question with its answer, unanswered ones left out. Null when nothing was answered. */
export function interviewBody(questions: string[], answers: string[]): { answers: { q: string; a: string }[] } | null {
  const list = questions.flatMap((q, i) => {
    const a = (answers[i] ?? "").trim();
    return a ? [{ q, a: a.slice(0, 4000) }] : [];
  });
  return list.length ? { answers: list } : null;
}

/** The interview's answer laid over what is already in the form: a field the answers did not cover keeps its words. */
export function fillFrom(form: Voice, j: unknown): Voice | null {
  if (!j || typeof j !== "object" || !(j as { voice?: unknown }).voice) return null;
  const got = readVoice((j as { voice: unknown }).voice);
  return Object.fromEntries(VOICE_FIELDS.map((f) => [f, got[f].trim() ? got[f] : form[f]])) as Voice;
}

/** ONE MOVE's plain fallback, for the example agent (nothing is called): each answer goes to the field its question
 * is about (the first two make the sample). Fields with no answer keep their words. */
export function plainFill(form: Voice, answers: string[]): Voice {
  const a = (i: number) => (answers[i] ?? "").trim();
  return fillFrom(form, { voice: { sample: [a(0), a(1)].filter(Boolean).join("\n\n"), never_say: a(2), known_for: a(3), serves: a(4), sign_off: a(5) } }) ?? form;
}

const SOURCE_WORDS: Record<string, string> = { move: "ONE MOVE", go: "ONE GO", brain: "the Brain", open: "ONE Open", marquee: "Marquee", showly: "Showly", websites: "your website" };
const PIECE_WORDS: Record<string, string> = { text: "a text", email: "an email", video_text: "a video text script", note: "a handwritten note", plan: "a plan", blog: "a blog post", visitor_followup: "a visitor follow-up", feedback: "showing feedback", caption: "a caption" };

/** "A text from the Brain", "A visitor follow-up from ONE Open", "From Marquee". */
export function sourceWords(source: string): string {
  const [p, piece] = source.includes(":") ? source.split(":", 2) : source.includes("_") ? [source.split("_")[0], source.split("_").slice(1).join("_")] : [source, ""];
  const where = SOURCE_WORDS[p] ?? (p || "ONE");
  const what = piece ? PIECE_WORDS[piece] ?? piece.replace(/[_-]+/g, " ") : "";
  return what ? `${what[0].toUpperCase()}${what.slice(1)} from ${where}` : `From ${where}`;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
/** §5c.3 (V2): only a send the agent changed teaches anything. A draft sent as Pulse wrote it is Pulse's words. */
export const isEdited = (draft: string, final: string) => norm(final) !== "" && norm(draft) !== norm(final);

/** The learn body, or null when there is nothing to learn (unchanged, empty, or a source ONE MOVE would refuse). */
export function learnBody(draft: string, final: string, source: string, contactId?: string | null): { draft: string; final: string; source: string; contact_id?: string } | null {
  if (!isEdited(draft, final) || !/^brain:[a-z0-9_-]{1,40}$/.test(source)) return null;
  return { draft: draft.trim(), final: final.trim(), source, ...(contactId ? { contact_id: contactId } : {}) };
}

/**
 * §5c.3: after the agent sends a Pulse draft they changed, their final words go to ONE MOVE, which takes out the
 * contact's names, address, emails and phone numbers and keeps the newest 20 (or answers "off"). Fire and forget:
 * it never blocks or slows the send, and its answer is ignored.
 */
export function learnFromSend(draft: string, final: string, source: string, contactId?: string | null): void {
  const body = learnBody(draft, final, source, contactId);
  if (!body) return;
  try {
    void fetch(learnUrl, { method: "POST", credentials: "include", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  } catch {
    // never in the way of the send
  }
}

/** The example agent (?demo=1): nothing is called and nothing is saved. */
export function demoVoiceState(): VoiceState {
  return {
    voice: {
      sample: "Hi Jenna! We are doing our fall client party at the Hive on the 24th, 6 to 8. Bring the kids, there will be pumpkins and way too much food. Would love to see you two.\n\nHey Mark, it has been a minute. I was driving past your street and thought of you. How is the new deck holding up?",
      never_say: "Don't miss out\nAct now\nHot market\nDream home",
      known_for: "Straight answers and calm negotiating. People say I tell them when a house is wrong for them.",
      serves: "First-time buyers who want to understand every step, and families moving up after a few years in their first home.",
      sign_off: "Talk soon, Sarah",
    },
    learnOn: true,
    updatedAt: "2026-10-12T16:00:00Z",
    learned: [
      { id: "demo-l1", body: "Hi [name], so good to see you Saturday. Here are the three homes we talked about. No rush, just tell me which one you keep thinking about.", source: "brain:text", createdAt: "2026-10-15T18:20:00Z" },
      { id: "demo-l2", body: "Thanks for coming by [address] today. The sellers have had two showings since, so if it is on your list I would see it again this week.", source: "open:visitor_followup", createdAt: "2026-10-13T22:05:00Z" },
      { id: "demo-l3", body: "Happy home anniversary! Three years already. Still the best kitchen on the street.", source: "move:text", createdAt: "2026-10-09T15:40:00Z" },
    ],
    questions: INTERVIEW,
  };
}
