import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { DRAFT_LABEL, MAX_CHARS, fairHousingFlags, rulesDraft, type Draft, type DraftFacts, type DraftKind } from "./drafts.ts";
import { neverSayHits, voiceBrief, type Voice } from "./voice.ts";

// Pulse Drafts with Claude (lib/drafts.ts). The facts go in as data; the draft comes back, is clipped, and passes the
// fair-housing words check. Any failure falls back to the plain-rules draft, so the button always gives the agent
// something to edit. Nothing is sent from here.
//
// In the agent's own voice (PROFILE §5c "Pulse knows me"; Parry, 20 Oct): what they wrote on My Profile > Pulse and
// the messages they edited before sending go in as quoted reference, and a draft that uses one of their "never say"
// words is written again once, else the plain-rules draft is given. Without a voice, Pulse drafts as before.

// Haiku 5.5 for quick, short jobs (Parry, 9 Oct: "yes on Haiku, with stronger bot for harder tasks"). It has no
// server-side refusal fallback, so a refusal falls back to the plain rules below.
const MODEL = "claude-haiku-5-5";
const TIMEOUT_MS = 20_000;

const DraftSchema = z.object({ subject: z.string().nullable(), body: z.string() });

const SYSTEM_PROMPT = `You are Pulse, the AI inside a real estate agent's VIP-50 ONE system. You draft one personal touch from the agent to one person in their sphere: a friend, past client or referral partner, never a stranger. The agent will read it, change it as they like, and send it themselves.

Write as the agent, in the first person, to the person by first name. Warm, plain, short sentences, the way a real person texts a friend. No sales pitch, no "just checking in on the market", no asking for referrals or business unless the agent asked for that. No exclamation marks except at most one in a video text script. No emojis. No hashtags.

Use only the facts you are given (last talk, family, favourites, dates coming up, open items). Never invent a fact, a memory, a date, a name, a number or a promise. If a fact is unclear, leave it out. Never mention ONE, Pulse, a CRM, notes or "my records".

Never describe who a home or area suits, never mention religion, ethnicity, disability or source of income, and never use words like safe, exclusive or desirable about an area.

Formats:
- text: one or two short sentences, at most 300 characters. subject is null.
- email: a short subject line and a body of 2 to 4 short paragraphs, signed with the agent's first name when given.
- video_text: a 20 to 40 second spoken script, said straight to camera. subject is null.
- note: a handwritten card, 2 to 4 short sentences, at most 60 words, signed with the agent's first name when given. subject is null.`;

export async function draftTouch(kind: DraftKind, facts: DraftFacts, agentFirst: string | null, ask: string | null, event: string | null = null, voice: Voice | null = null): Promise<Draft> {
  if (!process.env.ANTHROPIC_API_KEY) return rulesDraft(kind, facts, agentFirst, event);
  try {
    const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
    const lines = [
      `Kind: ${kind} (${DRAFT_LABEL[kind]})`,
      `To: ${facts.first}`,
      agentFirst ? `From (the agent): ${agentFirst}` : null,
      facts.lastTalk ? `Last talk: ${facts.lastTalk}` : null,
      facts.family.length ? `Family: ${facts.family.join("; ")}` : null,
      facts.favourites.length ? `Favourites: ${facts.favourites.join("; ")}` : null,
      facts.comingUp.length ? `Coming up: ${facts.comingUp.join("; ")}` : null,
      facts.openItems.length ? `Open items: ${facts.openItems.join("; ")}` : null,
      ask ? `The agent asked: ${ask}` : null,
      event ? `Life event the agent wrote about (the reason for this touch): ${event.replace("_", " ")}. No business, no home value, no favourites small talk.` : null,
    ].filter(Boolean);
    const system = SYSTEM_PROMPT + voiceBrief(voice);
    const write = async (extra: string | null) => {
      const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 2000,
        output_config: { effort: "low", format: betaZodOutputFormat(DraftSchema) },
        system,
        messages: [{ role: "user", content: [...lines, extra].filter(Boolean).join("\n") }],
      });
      if (response.stop_reason === "refusal") return null;
      const out = response.parsed_output;
      if (!out || !out.body.trim()) return null;
      const subject = kind === "email" && out.subject?.trim() ? out.subject.trim().slice(0, 120) : null;
      return { subject, body: out.body.trim().slice(0, MAX_CHARS[kind]) };
    };
    let d = await write(null);
    // The agent's "never say" words are checked on the finished draft: one more try, then the plain rules.
    const hits = d ? neverSayHits(`${d.subject ?? ""}\n${d.body}`, voice) : [];
    if (d && hits.length) {
      d = await write(`Do not use these words or phrases anywhere: ${hits.map((h) => `"${h}"`).join(", ")}.`);
      if (d && neverSayHits(`${d.subject ?? ""}\n${d.body}`, voice).length) d = null;
    }
    if (!d) return rulesDraft(kind, facts, agentFirst, event);
    return { kind, subject: d.subject, body: d.body, flags: fairHousingFlags(`${d.subject ?? ""} ${d.body}`), source: "pulse" };
  } catch {
    return rulesDraft(kind, facts, agentFirst, event);
  }
}
