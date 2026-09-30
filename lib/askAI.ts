import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { describeGraph, rulesAnswer, validate, type AskAnswer } from "./ask.ts";
import type { GraphIndex } from "./graph/model.ts";

// Ask ONE with Claude. The graph goes in as data; what comes back is node ids
// and the facts behind each. lib/ask.ts checks every id exists and throws the
// answer away if it claims anything was done for the agent. Any failure falls
// back to the rules, so the bar always answers.

const MODEL = "claude-opus-5-5";
const TIMEOUT_MS = 20_000;

const AnswerSchema = z.object({
  answer: z.string(),
  results: z.array(z.object({ id: z.string(), reasons: z.array(z.string()) })),
});

const SYSTEM_PROMPT = `You are ONE, the intelligence inside a real estate agent's VIP-50 ONE dashboard. The agent asks a question about their business; you answer by pointing at the people, tasks and items that already exist in their business graph.

VIP-50 is a sphere-of-influence system: the agent keeps about 50 key relationships warm with regular touches and aims for 25 or more referral closings a year, with no cold calling and no bought leads.

Write in Parry Ward's voice: direct, plain, confident. Short sentences. No hype, no exclamation marks, no emojis. Talk to the agent as "you".

Rules:
- "answer" is 1 to 3 short sentences that answer the question directly.
- "results" lists up to 6 nodes that answer it, most important first, using only ids from the node list. Never invent an id, a person, a property, a number, a date or a task.
- Each result has 1 to 3 "reasons": short facts taken from that node's line (or the headline numbers) that explain why it is in the answer. Only facts you were given.
- Put people first when the question is about relationships or calls.
- Never say anything has been sent, called, texted, emailed, published, scheduled, approved or booked for the agent. You only point; the agent acts.
- If nothing in the graph answers the question, say so in "answer" and return no results.`;

const cache = new Map<string, AskAnswer>();

export async function askOne(question: string, ix: GraphIndex, cacheKey: string): Promise<AskAnswer> {
  const key = `${cacheKey}|${question.trim().toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;

  if (!process.env.ANTHROPIC_API_KEY) return rulesAnswer(question, ix);

  try {
    const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(AnswerSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Question: ${question}\n\n${describeGraph(ix)}` }],
    });
    const parsed = response.parsed_output;
    if (response.stop_reason === "refusal" || !parsed) {
      console.warn(`ask: no usable output (stop_reason ${response.stop_reason})`);
      return rulesAnswer(question, ix);
    }
    const checked = validate(parsed, question, ix, "ai");
    if (!checked) {
      console.warn("ask: AI answer failed the check; using rules");
      return rulesAnswer(question, ix);
    }
    if (cache.size > 500) cache.clear();
    cache.set(key, checked);
    return checked;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`ask: API error ${err.status ?? "network"}: ${err.message}`);
    } else {
      console.error("ask: failed", err);
    }
    return rulesAnswer(question, ix);
  }
}
