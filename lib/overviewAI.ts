import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { checkTold, mergeTold, readOverview, type Told } from "./overview.ts";

// Tell Pulse your day, read by Claude: any wording, any order. The answer is only the appointments the
// agent said, with times; lib/overview.ts checks every one and the local reading takes over on any failure.

const MODEL = "claude-opus-5-5";
const TIMEOUT_MS = 15_000;

const Schema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      start: z.string(),
      end: z.string(),
      where: z.enum(["out", "office", "phone", "unsure"]),
    }),
  ),
});

const SYSTEM = `You are Pulse, the assistant inside a real estate agent's ONE system. The agent tells you about their day in plain words, typed or spoken (speech-to-text, so expect typos and missing punctuation). List only the appointments and fixed commitments they mention that have a time.

For each:
- "title": short and plain, as the agent would write it in a calendar: "Doctor's appointment", "Meeting with Aaron", "Lunch with Marcus", "Showing on Oak Lane". Capitalise names.
- "start" and "end": 24-hour "HH:MM". If only a start is given, use the length they said, otherwise 60 minutes (45 for a showing, 30 for a call). "This morning" means am; hours 1 to 6 without am or pm mean pm; 7 to 11 mean am; 12 means noon.
- "where": "out" when they have to go somewhere (doctor, lunch, coffee, showing, listing appointment, closing, gym, school), "office" when it is at their office, "phone" for calls and video meetings, "unsure" when you cannot tell (for example "meeting with Aaron").

Never add anything they did not say. Never include the request itself ("plan my day around that"). If they mention no timed appointment, return no items.

When "Already planned today" is given, the agent is adding to or changing that day. Return the WHOLE day: everything already planned that they did not change, plus what they add. A new time for something already planned moves it (keep its title). Something they cancel or say is not happening is left out.`;

export async function readDayAI(text: string, current: Told[] = []): Promise<{ items: Told[]; source: "ai" | "rules" }> {
  const local = { items: current.length ? mergeTold(current, text) : readOverview(text), source: "rules" as const };
  const planned = current.length ? `Already planned today:\n${current.map((t) => `- ${t.start}-${t.end} ${t.title} (${t.where})`).join("\n")}\n\nThe agent now says:\n` : "";
  if (!process.env.ANTHROPIC_API_KEY) return local;
  try {
    const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
    const r = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Schema) },
      system: SYSTEM,
      messages: [{ role: "user", content: planned + text }],
    });
    const items = r.stop_reason === "refusal" ? null : checkTold(r.parsed_output?.items);
    return items ? { items, source: "ai" } : local;
  } catch (err) {
    console.error("day/read: failed", err instanceof Anthropic.APIError ? `${err.status}: ${err.message}` : err);
    return local;
  }
}
