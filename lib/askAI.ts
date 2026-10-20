import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { BetaContentBlock, BetaMessageParam, BetaToolResultBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { checkPeople, describeGraph, rulesAnswer, validate, type AskAnswer } from "./ask.ts";
import { ASK_TOOLS, isTool, type ToolPerson } from "./askTools.ts";
import { pickModel } from "./askModel.ts";
import type { GraphIndex } from "./graph/model.ts";
import { runTool, type AskCtx } from "./server/askData.ts";

// Ask ONE with Claude. The graph goes in as data; what comes back is node ids
// and the facts behind each. lib/ask.ts checks every id exists and throws the
// answer away if it claims anything was done for the agent. Any failure falls
// back to the rules, so the bar always answers.

// Sonnet 5.5 for longer writing and reasoning over the whole day or graph (Parry, 9 Oct: Haiku first, "stronger bot
// for harder tasks").
const MODEL = "claude-sonnet-5-5";
const TIMEOUT_MS = 20_000;

const AnswerSchema = z.object({
  answer: z.string(),
  results: z.array(z.object({ id: z.string(), reasons: z.array(z.string()) })),
});

const SYSTEM_PROMPT = `You are Pulse, the AI inside a real estate agent's VIP-50 ONE system (ONE Brain is the dashboard you live in). The agent asks a question about their business; you answer by pointing at the people, tasks and items that already exist in their business graph.

VIP-50 is a sphere-of-influence system: the agent keeps about 50 key relationships warm with regular touches and aims for 25 or more referral closings a year, with no cold calling and no bought leads.

Write in Parry Ward's voice: direct, plain, confident. Short sentences. No hype, no exclamation marks, no emojis. Talk to the agent as "you".

Rules:
- "answer" is 1 to 3 short sentences that answer the question directly.
- "results" lists up to 6 nodes that answer it, most important first, using only ids from the node list. Never invent an id, a person, a property, a number, a date or a task.
- Each result has 1 to 3 "reasons": short facts taken from that node's line (or the headline numbers) that explain why it is in the answer. Only facts you were given.
- Put people first when the question is about relationships or calls.
- Never say anything has been sent, called, texted, emailed, published, scheduled, approved or booked for the agent. You only point; the agent acts.
- If nothing in the graph answers the question, say so in "answer" and return no results.
- The Brain opens any place on the map for the agent. When the agent asks to go to, open or see a part of ONE (a page, tool or orb), put its id in "results" and say where it is ("Calendar is in ONE MOVE, under Events. Tap Go to Calendar."). Never say you cannot open it or that you are read-only.`;

// Ask Pulse about the whole business (walker 14 Oct): on a live account Pulse looks things up first with read-only
// tools over the agent's own MASTER rows, then answers. Haiku for one lookup, Sonnet when the question needs several or
// some reasoning (Parry, 9 Oct; lib/askModel.ts). The final answer comes through the "answer" tool, checked as before:
// people only from Pulse's own lookups, map items only ids that exist, nothing claimed as done.
const TOOL_PROMPT = `You are Pulse, the AI inside a real estate agent's VIP-50 ONE system. The agent asks about their business. You can look things up with read-only tools over the agent's own records (contacts, touches, special days, Hot/Warm/Cold, open house visitors, tasks, tracker, goals and referrals). You can never change or send anything.

VIP-50 is a sphere-of-influence system: the agent keeps about 50 key relationships warm with regular touches and aims for 25 or more referral closings a year.

Write in Parry Ward's voice: direct, plain, confident. Short sentences. No hype, no exclamation marks, no emojis. Talk to the agent as "you".

How to answer:
- Look it up first. Use the tools for anything about people, dates, counts or history; use the map list below only for what is on today's map. Call several tools if the question needs them.
- Then call "answer" once: "answer" is 1 to 3 short sentences with the real numbers and names; "people" lists up to 10 people from your lookups (contact_id exactly as returned) with 1 to 3 short reasons taken from the lookup facts; "results" lists up to 6 map ids from the node list when they help.
- Never invent a person, contact_id, number or date. If a lookup comes back empty, say so plainly ("You have no ... logged").
- Never say anything has been sent, called, texted, emailed, published, scheduled, approved or booked. You only point; the agent acts.
- The Brain opens any place on the map for the agent. When the agent asks to go to, open or see a part of ONE (a page, tool or orb), put its id in "results" (from the node list) and say where it is ("Calendar is in ONE MOVE, under Events. Tap Go to Calendar."). Never say you cannot open it or that you are read-only.`;

const ANSWER_TOOL = {
  name: "answer",
  description: "Give your final answer to the agent. Call this once, after your lookups.",
  input_schema: {
    type: "object" as const,
    properties: {
      answer: { type: "string" },
      people: { type: "array", items: { type: "object", properties: { contact_id: { type: "string" }, reasons: { type: "array", items: { type: "string" } } }, required: ["contact_id"] } },
      results: { type: "array", items: { type: "object", properties: { id: { type: "string" }, reasons: { type: "array", items: { type: "string" } } }, required: ["id"] } },
    },
    required: ["answer"],
  },
};
const ROUNDS = 5;

async function askWithTools(question: string, ix: GraphIndex, graph: string, ctx: AskCtx): Promise<AskAnswer | null> {
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  const model = pickModel(question);
  const found = new Map<string, ToolPerson>();
  const messages: BetaMessageParam[] = [{ role: "user", content: `Today is ${ctx.today}.\n\nQuestion: ${question}\n\n${graph}` }];
  for (let round = 0; round < ROUNDS; round++) {
    const res = await client.beta.messages.create({
      model,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: TOOL_PROMPT,
      tools: [...ASK_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as unknown as { type: "object" } })), ANSWER_TOOL],
      tool_choice: round === ROUNDS - 1 ? { type: "tool", name: "answer" } : { type: "any" },
      messages,
    });
    const uses = res.content.filter((b): b is Extract<BetaContentBlock, { type: "tool_use" }> => b.type === "tool_use");
    const fin = uses.find((u) => u.name === "answer");
    if (fin) {
      const raw = fin.input as { answer?: unknown; results?: unknown; people?: unknown };
      const checked = validate(raw, question, ix, "ai");
      if (!checked) return null;
      const people = checkPeople(raw.people, found);
      return people.length ? { ...checked, people } : checked;
    }
    if (!uses.length) return null;
    messages.push({ role: "assistant", content: res.content as BetaMessageParam["content"] });
    const results: BetaToolResultBlockParam[] = await Promise.all(
      uses.map(async (u): Promise<BetaToolResultBlockParam> => {
        if (!isTool(u.name)) return { type: "tool_result", tool_use_id: u.id, content: "There is no such lookup.", is_error: true };
        const r = await runTool(u.name, u.input, ctx).catch((e) => {
          console.error(`ask: ${u.name} failed`, e);
          return null;
        });
        for (const p of r?.people ?? []) found.set(p.contact_id, p);
        return { type: "tool_result", tool_use_id: u.id, content: r ? JSON.stringify(r) : "That lookup failed just now.", is_error: !r };
      }),
    );
    messages.push({ role: "user", content: results });
  }
  return null;
}

const cache = new Map<string, AskAnswer>();

export async function askOne(question: string, ix: GraphIndex, cacheKey: string, ctx?: AskCtx): Promise<AskAnswer> {
  // The answer is kept only while the agent's data is the same (Parry, 6 Oct: "pulse needs to see everything
  // and recognize that I already did what it suggested"): a touch logged or a task done changes the graph,
  // so the next ask is answered fresh.
  const graph = describeGraph(ix);
  const key = `${cacheKey}|${question.trim().toLowerCase()}|${createHash("sha256").update(graph).digest("hex").slice(0, 16)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  if (!process.env.ANTHROPIC_API_KEY) return rulesAnswer(question, ix);

  if (ctx) {
    try {
      const a = await askWithTools(question, ix, graph, ctx);
      if (a) {
        if (cache.size > 500) cache.clear();
        cache.set(key, a);
        return a;
      }
      console.warn("ask: no usable answer from the lookups; answering from the map");
    } catch (err) {
      console.error(`ask: lookups failed: ${err instanceof Anthropic.APIError ? `${err.status ?? "network"} ${err.message}` : String(err)}`);
    }
  }

  try {
    const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(AnswerSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Question: ${question}\n\n${graph}` }],
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
