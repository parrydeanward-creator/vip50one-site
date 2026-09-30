import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SYSTEM_PROMPT, cleanCards, describeDay, rulesNote, type MorningNote } from "./note.ts";
import type { DashboardData, Item } from "./types.ts";

// Day-one AI (Parry, 30 Sep): the morning note is written by Claude from the
// items the products reported. Anything that goes wrong falls back to the
// rules-based note, so the dashboard never waits on or breaks because of it.

const MODEL = "claude-opus-5-5";
const TIMEOUT_MS = 20_000;

const NoteSchema = z.object({
  opening: z.string(),
  note: z.string(),
  cards: z.array(
    z.object({
      product: z.enum(["go", "move", "marquee", "open", "showly"]),
      line: z.string(),
    }),
  ),
});

// One note per agent per day. In-memory for now (per server instance); moves
// to MASTER storage when real data arrives.
const cache = new Map<string, MorningNote>();

export async function morningNote(data: DashboardData, ranked: Item[]): Promise<MorningNote> {
  const key = `${data.agent.email}|${data.agent.package}|${data.today}`;
  const hit = cache.get(key);
  if (hit) return hit;

  if (!process.env.ANTHROPIC_API_KEY) return rulesNote(data, ranked);

  try {
    const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(NoteSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: describeDay(data, ranked) }],
    });
    const parsed = response.parsed_output;
    if (response.stop_reason === "refusal" || !parsed) {
      console.warn(`morning note: no usable output (stop_reason ${response.stop_reason})`);
      return rulesNote(data, ranked);
    }
    const note: MorningNote = {
      opening: parsed.opening.trim(),
      note: parsed.note.trim(),
      cards: cleanCards(data, parsed.cards),
      source: "ai",
    };
    cache.set(key, note);
    return note;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`morning note: API error ${err.status ?? "network"}: ${err.message}`);
    } else {
      console.error("morning note: failed", err);
    }
    return rulesNote(data, ranked);
  }
}
