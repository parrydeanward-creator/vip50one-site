// "Ask AI about you" (PULSE-ROADMAP, Scout item 54, 12 Oct): once a month the agent checks whether AI answer engines
// name them. ONE never automates ChatGPT or any assistant (against their terms): each button opens the engine with
// the question already filled in, and the agent ticks "named" or "not named". Results stay in this browser for now.

/** The old orb id: no orb now (lib/youGroups.ts drops any graph that still carries one). */
export const ASK_AI_NODE = "go-ask-ai";
export type Engine = "chatgpt" | "perplexity" | "google";
export type Answer = "named" | "not_named";
export const ENGINES: { key: Engine; label: string }[] = [
  { key: "chatgpt", label: "ChatGPT" },
  { key: "perplexity", label: "Perplexity" },
  { key: "google", label: "Google" },
];

export interface Question { id: string; text: string }

/** The three questions, in the agent's own name and area. */
export function questions(name: string, area: string): Question[] {
  const who = name.trim() || "me";
  const where = area.trim() || "my area";
  return [
    { id: "who", text: `Who is ${who}, the real estate agent in ${where}?` },
    { id: "best", text: `Who are the best real estate agents in ${where}?` },
    { id: "recommend", text: `Which real estate agent in ${where} would you recommend to sell my home?` },
  ];
}

/** The engine's own page with the question filled in; nothing is sent until the agent presses Enter there. */
export function engineUrl(e: Engine, q: string): string {
  const s = encodeURIComponent(q);
  if (e === "chatgpt") return `https://chatgpt.com/?q=${s}`;
  if (e === "perplexity") return `https://www.perplexity.ai/search?q=${s}`;
  return `https://www.google.com/search?q=${s}`;
}

/** "2026-10" from "2026-10-12": one check per calendar month. */
export const monthOf = (today: string) => today.slice(0, 7);

export type Results = Record<string, Answer>; // `${question}:${engine}` -> answer
export const resultKey = (q: string, e: Engine) => `${q}:${e}`;

/** Keep only well-formed answers. */
export function readResults(raw: unknown): Results {
  if (!raw || typeof raw !== "object") return {};
  const out: Results = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^(who|best|recommend):(chatgpt|perplexity|google)$/.test(k) && (v === "named" || v === "not_named")) out[k] = v;
  }
  return out;
}

export function tally(r: Results): { asked: number; named: number } {
  const v = Object.values(r);
  return { asked: v.length, named: v.filter((x) => x === "named").length };
}

/** "Named in 4 of 9 answers". */
export function tallyLine(r: Results): string {
  const t = tally(r);
  return t.asked ? `Named in ${t.named} of ${t.asked} ${t.asked === 1 ? "answer" : "answers"}` : "Not checked yet this month";
}

/** What helps AI engines name an agent, from Scout's brief; plain things the agent can do. */
export const WHAT_HELPS: string[] = [
  "A complete Google Business Profile: hours, area served, photos, and a reply to every review.",
  "Reviews with your full name and town in them (ask after every closing; ONE MOVE sends the request).",
  "Your own website with a page for each area you serve.",
  "The same name, brokerage and phone everywhere you are listed.",
];

/** Ask AI about you's card on My Profile (Parry, 19 Oct: off the ONE YOU map, onto My Profile). It opens the same
 * Ask AI about you view the orb opened; `due` while this month's check is not done yet. No pulse. */
export function askAiCard(r: Results | null): { title: string; line: string; due: boolean } {
  const asked = r ? tally(r).asked : 0;
  return {
    title: "Ask AI about you",
    line: `Once a month: do ChatGPT, Perplexity and Google name you? ${r ? tallyLine(r) : "Not checked yet this month"}.`,
    due: asked === 0,
  };
}
